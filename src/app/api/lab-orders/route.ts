import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { labRepository } from "@/repositories/LabRepository";
import { cashRepository } from "@/repositories/CashRepository";
import { getPKTDateRange } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const debug = searchParams.get("debug") === "1" || searchParams.get("debug") === "true";
    const patientId = searchParams.get("patientId");
    const period = searchParams.get("period") || "today"; // 'today' | 'all'
    const pktDateRange = getPKTDateRange(searchParams.get("date"));

    if (debug) {
      let dbStatus = "connected";
      let dbError: string | null = null;
      let count = 0;
      try {
        count = await prisma.labOrder.count();
      } catch (e: any) {
        dbStatus = "error";
        dbError = e?.message || String(e);
      }
      return NextResponse.json({
        status: "debug_ok",
        route: "/api/lab-orders",
        dbStatus,
        dbError,
        labOrderCount: count,
        query: { patientId, period },
        timestamp: new Date().toISOString(),
      });
    }

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
              updatedAt: {
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

    return NextResponse.json({ labOrders: orders || [] }, { status: 200 });
  } catch (error: any) {
    console.error("[Lab Orders API GET Error]:", error);
    return NextResponse.json(
      {
        error: `Failed to fetch lab orders: ${error?.message || String(error)}`,
        details: error?.stack || error?.message || String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    let orderNumber = body.orderNumber || body.labOrderNumber || `LAB-${Date.now().toString().slice(-6)}`;
    if (!body.patientName && !body.mrNumber) {
      return NextResponse.json(
        { error: "Patient Name and MR Number are required." },
        { status: 400 }
      );
    }
    if (!body.testName && (!body.tests || body.tests.length === 0)) {
      return NextResponse.json(
        { error: "At least one test name is required." },
        { status: 400 }
      );
    }

    const fee = Number(body.fee) || Number(body.totalFee) || 0;
    const testItems = Array.isArray(body.tests)
      ? body.tests.map((t: string, idx: number) => ({ testName: t, testCode: `TEST-${idx + 1}`, unitPrice: fee / body.tests.length }))
      : [{ testName: body.testName, testCode: body.testCode || "TEST-01", unitPrice: fee }];

    // Skip fake visitIds generated on the frontend (vst-direct-xxx, pat-xxx etc)
    const isFakeVisitId = !body.visitId || body.visitId.startsWith("vst-direct-") || body.visitId.startsWith("vst-");

    const newOrder = await labRepository.createLabOrder({
      orderNumber,
      patientId: body.patientId,
      patientName: body.patientName || "Patient",
      mrNumber: body.mrNumber || "MR-0000",
      visitId: isFakeVisitId ? null : body.visitId,
      consultantId: body.consultantId || null,
      consultantName: body.consultantName || "Direct Lab Request",
      testCategory: body.category || body.testCategory || "General Pathology",
      clinicalNotes: body.clinicalIndication || body.clinicalNotes || "",
      priority: body.priority === "URGENT" ? "URGENT" : "NORMAL",
      status: "ORDERED",
      totalFee: fee,
      requestDate: new Date(),
      items: testItems,
      // Pass through for auto-upsert
      age: body.age || 30,
      gender: body.gender || "MALE",
      cnic: body.cnic || null,
    });

    if (fee > 0) {
      try {
        await cashRepository.createTransaction({
          transactionNumber: `TXN-LAB-${Date.now().toString().slice(-6)}`,
          transactionType: "INCOME",
          category: "LAB_TEST",
          department: "Laboratory",
          amount: fee,
          paymentMethod: body.paymentMethod || "CASH",
          description: `Lab test fee for ${body.testName || (body.tests ? body.tests.join(', ') : 'Lab Order')}`,
          patientId: newOrder.patientId,
          visitId: newOrder.visitId || null,
          createdById: newOrder.consultantId || "",
          transactionDate: new Date(),
        });
      } catch (cashErr: any) {
        // Non-fatal: log but don't fail the order creation
        console.warn("[Lab Orders POST] Cash transaction failed (non-fatal):", cashErr?.message);
      }
    }

    return NextResponse.json(
      { message: "Lab order created successfully", labOrder: newOrder },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Lab Orders API POST Error]:", error);
    return NextResponse.json(
      {
        error: `Failed to create lab order: ${error?.message || String(error)}`,
        details: error?.stack || error?.message || String(error),
        timestamp: new Date().toISOString(),
      },
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
      {
        error: `Failed to update lab order: ${error?.message || String(error)}`,
        details: error?.stack || error?.message || String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

