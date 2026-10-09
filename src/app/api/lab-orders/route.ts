import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { labRepository } from "@/repositories/LabRepository";
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
      orders = await labRepository.findOrdersByPatient(patientId);
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
                in: ["ORDERED", "SAMPLE_COLLECTED", "PROCESSING", "REVISION_REQUESTED"],
              },
            },
          ],
        };
      }

      const records = await prisma.labOrder.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: period === "all" ? 500 : 200,
        include: { items: true, patient: { select: { cnic: true, age: true, gender: true } } },
      });
      orders = records.map((o: any) => ({
        ...o,
        cnic: o.cnic || (o.patient ? o.patient.cnic : ""),
        age: o.age || (o.patient ? o.patient.age : 35),
        gender: o.gender || (o.patient ? o.patient.gender : "Male"),
        _id: o.id,
      }));
    }

    return NextResponse.json({ labOrders: orders }, { status: 200 });
  } catch (error: any) {
    console.error("[Lab Orders API GET Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch lab orders." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    let orderNumber = body.orderNumber || body.labOrderNumber || `LAB-${Date.now().toString().slice(-6)}`;
    if (!body.patientId || (!body.testName && (!body.tests || body.tests.length === 0))) {
      return NextResponse.json(
        { error: "Patient ID and Test Name are required." },
        { status: 400 }
      );
    }

    const fee = Number(body.fee) || Number(body.totalFee) || 0;
    const testItems = Array.isArray(body.tests)
      ? body.tests.map((t: string, idx: number) => ({ testName: t, testCode: `TEST-${idx + 1}`, unitPrice: fee / body.tests.length }))
      : [{ testName: body.testName, testCode: body.testCode || "TEST-01", unitPrice: fee }];

    const newOrder = await labRepository.createLabOrder({
      orderNumber,
      patientId: body.patientId,
      patientName: body.patientName || "Patient",
      mrNumber: body.mrNumber || "MR-0000",
      visitId: body.visitId || "",
      consultantId: body.consultantId || "",
      consultantName: body.consultantName || "Doctor",
      testCategory: body.category || body.testCategory || "General Pathology",
      clinicalNotes: body.clinicalIndication || body.clinicalNotes || "",
      priority: body.priority === "URGENT" ? "URGENT" : "NORMAL",
      status: "ORDERED",
      totalFee: fee,
      requestDate: new Date(),
      items: testItems,
    });

    if (fee > 0) {
      await cashRepository.createTransaction({
        transactionNumber: `TXN-LAB-${Date.now().toString().slice(-6)}`,
        transactionType: "INCOME",
        category: "LAB_TEST",
        department: "Laboratory",
        amount: fee,
        paymentMethod: body.paymentMethod || "CASH",
        description: `Lab test fee for ${body.testName || (body.tests ? body.tests.join(', ') : 'Lab Order')}`,
        patientId: newOrder.patientId,
        visitId: newOrder.visitId,
        createdById: newOrder.consultantId,
        transactionDate: new Date(),
      });
    }

    return NextResponse.json(
      { message: "Lab order created successfully", labOrder: newOrder },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Lab Orders API POST Error]:", error);
    return NextResponse.json(
      { error: "Failed to create lab order." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, action, resultsJson, status, revisionReason, revisionComment, pdfFileName, imageBase64, isVersion2 } = body;

    if (!id) {
      return NextResponse.json({ error: "Lab Order ID is required." }, { status: 400 });
    }

    let updatedOrder;
    if (action === "SUBMIT_RESULTS") {
      const isV2 = Boolean(isVersion2);
      const fields: Record<string, any> = {
        status: isV2 ? "ACCEPTED" : "REPORT_PREPARED",
        attachedPdfName: pdfFileName || "LAB_REPORT.pdf",
      };
      if (imageBase64) fields.attachedImageBase64 = imageBase64;
      if (isV2) {
        fields.resultsV2 = resultsJson;
        fields.currentVersion = 2;
      } else {
        fields.resultsV1 = resultsJson;
        fields.currentVersion = 1;
      }
      updatedOrder = await labRepository.updateOrderFields(id, fields);

      if (updatedOrder && (updatedOrder.visitId || updatedOrder.mrNumber)) {
        try {
          if (updatedOrder.visitId) {
            await prisma.patientVisit.update({
              where: { id: updatedOrder.visitId },
              data: { status: "COMPLETED" },
            });
            if ((prisma as any).encounter) {
              await (prisma as any).encounter.updateMany({
                where: { visitId: updatedOrder.visitId, status: { not: "COMPLETED" } },
                data: { status: "LAB_RESULT_AVAILABLE" },
              });
            }
          }
          if (updatedOrder.mrNumber) {
            await prisma.patientVisit.updateMany({
              where: { mrNumber: updatedOrder.mrNumber, status: "LAB_REQUESTED" },
              data: { status: "COMPLETED" },
            });
          }
        } catch (vErr) {
          console.warn("[Lab Orders PUT API] Visit/Encounter status sync warning:", vErr);
        }
      }
    } else if (action === "ACCEPT") {
      updatedOrder = await labRepository.updateOrderStatus(id, "ACCEPTED");
    } else if (action === "REVISE") {
      const fields = {
        status: "REVISION_REQUESTED",
        revisionReason: revisionReason || "Review requested",
        revisionComment: revisionComment || "",
      };
      updatedOrder = await labRepository.updateOrderFields(id, fields);
    } else if (status) {
      updatedOrder = await labRepository.updateOrderStatus(id, status);
    }

    return NextResponse.json(
      { message: "Lab order updated successfully", labOrder: updatedOrder },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Lab Orders API PUT Error]:", error);
    return NextResponse.json(
      { error: "Failed to update lab order." },
      { status: 500 }
    );
  }
}
