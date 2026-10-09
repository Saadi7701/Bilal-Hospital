import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ultrasoundRepository } from "@/repositories/UltrasoundRepository";
import { cashRepository } from "@/repositories/CashRepository";
import { getPKTDateRange } from "@/lib/dateUtils";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const period = searchParams.get("period") || "today"; // 'today' | 'all'
    const pktDateRange = getPKTDateRange(searchParams.get("date"));

    let orders;
    if (patientId) {
      orders = await ultrasoundRepository.findOrdersByPatient(patientId);
    } else {
      let whereClause: any = {};
      if (period === "today") {
        whereClause = {
          OR: [
            {
              requestDate: {
                gte: pktDateRange.startOfPKTDay,
                lt: pktDateRange.startOfTomorrowPKTDay,
              },
            },
            {
              status: {
                in: ["ORDERED", "IN_PROGRESS", "SUBMITTED_TO_CONSULTANT"],
              },
            },
          ],
        };
      }

      const records = await prisma.ultrasoundOrder.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: period === "all" ? 500 : 200,
        include: { reports: true },
      });
      orders = records.map((o) => ({ ...o, _id: o.id }));
    }

    return NextResponse.json({ ultrasoundOrders: orders }, { status: 200 });
  } catch (error: any) {
    console.error("[Ultrasound API GET Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch ultrasound orders." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const orderNumber = body.orderNumber || body.usOrderNumber || `US-${Date.now().toString().slice(-6)}`;
    if (!body.patientId || (!body.scanType && !body.requestedExam)) {
      return NextResponse.json(
        { error: "Patient ID and Scan Type are required." },
        { status: 400 }
      );
    }

    const fee = Number(body.fee) || Number(body.totalFee) || 0;

    const newOrder = await ultrasoundRepository.createOrder({
      orderNumber,
      patientId: body.patientId,
      patientName: body.patientName || "Patient",
      mrNumber: body.mrNumber || "MR-0000",
      visitId: body.visitId || "",
      consultantId: body.consultantId || "",
      consultantName: body.consultantName || "Doctor",
      requestedExam: body.scanType || body.requestedExam,
      clinicalIndication: body.clinicalIndication || "",
      priority: body.priority === "URGENT" ? "URGENT" : "NORMAL",
      status: "ORDERED",
      totalFee: fee,
      requestDate: new Date(),
    });

    if (fee > 0) {
      await cashRepository.createTransaction({
        transactionNumber: `TXN-US-${Date.now().toString().slice(-6)}`,
        transactionType: "INCOME",
        category: "ULTRASOUND_SCAN",
        department: "Ultrasound Department",
        amount: fee,
        paymentMethod: body.paymentMethod || "CASH",
        description: `Ultrasound scan fee for ${body.scanType || body.requestedExam}`,
        patientId: newOrder.patientId,
        visitId: newOrder.visitId,
        createdById: newOrder.consultantId,
        transactionDate: new Date(),
      });
    }

    return NextResponse.json(
      { message: "Ultrasound order created successfully", ultrasoundOrder: newOrder },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Ultrasound API POST Error]:", error);
    return NextResponse.json(
      { error: "Failed to create ultrasound order." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, action, findings, status, pdfFileName, imageBase64 } = body;

    if (!id) {
      return NextResponse.json({ error: "Ultrasound Order ID is required." }, { status: 400 });
    }

    let updatedOrder;
    if (action === "SUBMIT_REPORT") {
      const fields: Record<string, any> = {
        status: "SUBMITTED_TO_CONSULTANT",
        findingsV1: findings || "Scan performed",
        attachedFileName: pdfFileName || "ULTRASOUND_SCAN.pdf",
      };
      if (imageBase64) {
        fields.attachedImageBase64 = imageBase64;
      }
      updatedOrder = await ultrasoundRepository.updateOrderFields(id, fields);
    } else if (status) {
      updatedOrder = await ultrasoundRepository.updateOrderStatus(id, status);
    }

    return NextResponse.json(
      { message: "Ultrasound order updated successfully", ultrasoundOrder: updatedOrder },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Ultrasound API PUT Error]:", error);
    return NextResponse.json(
      { error: "Failed to update ultrasound order." },
      { status: 500 }
    );
  }
}
