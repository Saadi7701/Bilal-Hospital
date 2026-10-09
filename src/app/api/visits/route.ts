import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { visitRepository } from "@/repositories/VisitRepository";
import { cashRepository } from "@/repositories/CashRepository";
import { getPKTDateRange } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const debug = searchParams.get("debug") === "1" || searchParams.get("debug") === "true";
    const consultantId = searchParams.get("consultantId");
    const status = searchParams.get("status");
    const period = searchParams.get("period") || "today"; // 'today' | 'all'
    const pktDateRange = getPKTDateRange(searchParams.get("date"));

    if (debug) {
      let dbStatus = "connected";
      let dbError: string | null = null;
      let count = 0;
      try {
        count = await prisma.patientVisit.count();
      } catch (e: any) {
        dbStatus = "error";
        dbError = e?.message || String(e);
      }
      return NextResponse.json({
        status: "debug_ok",
        route: "/api/visits",
        dbStatus,
        dbError,
        visitCount: count,
        query: { consultantId, status, period },
        timestamp: new Date().toISOString(),
      });
    }

    let whereClause: any = {};

    if (period === "today") {
      whereClause.OR = [
        {
          visitDate: {
            gte: pktDateRange.startOfPKTDay,
            lt: pktDateRange.startOfTomorrowPKTDay,
          },
        },
        {
          status: {
            in: ["WAITING", "REGISTERED", "WITH_CONSULTANT", "LAB_REQUESTED", "LAB_RESULT_AVAILABLE"],
          },
        },
      ];
    }

    if (status) {
      // If a specific status is requested, enforce status
      whereClause.status = status;
    }

    if (consultantId) {
      whereClause.consultantId = consultantId;
    }

    const records = await prisma.patientVisit.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: period === "all" ? 500 : 200,
    });

    const visits = records.map((v) => ({ ...v, _id: v.id }));

    return NextResponse.json({ visits }, { status: 200 });
  } catch (error: any) {
    console.error("[Visits API GET Error]:", error);
    return NextResponse.json(
      {
        error: `Failed to fetch patient visits: ${error?.message || String(error)}`,
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

    if (!body.patientId || !body.consultantId) {
      return NextResponse.json(
        { error: "Patient ID and Consultant ID are required." },
        { status: 400 }
      );
    }

    // Auto-generate unique visitNumber if missing or duplicate
    let visitNumber = body.visitNumber || `VIS-${Date.now().toString().slice(-6)}`;
    const existing = await visitRepository.findByVisitNumber(visitNumber);
    if (existing) {
      visitNumber = `VIS-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    }

    const fee = Number(body.feeCharged) || Number(body.consultationFee) || 0;
    const received = Number(body.netCollectedAmount) || Number(body.amountReceived) || fee;

    const newVisit = await visitRepository.createVisit({
      visitNumber,
      patientId: body.patientId,
      patientName: body.patientName || "Patient",
      mrNumber: body.mrNumber || "MR-0000",
      consultantId: body.consultantId,
      consultantName: body.consultantName || "Dr. Bilal Ahmad",
      department: body.department || "OPD Reception",
      visitType: body.visitType || "OPD",
      reasonForVisit: body.reasonForVisit || "OPD Consultation",
      consultationFee: fee,
      amountReceived: received,
      paymentMethod: body.paymentMethod || "CASH",
      receptionistId: body.receptionistId || "admin",
      status: body.status || "WAITING",
      visitDate: new Date(),
      arrivalTime: new Date(),
    });

    if (received > 0) {
      await cashRepository.createTransaction({
        transactionNumber: `TXN-OPD-${Date.now().toString().slice(-6)}`,
        transactionType: "INCOME",
        category: "OPD_REGISTRATION",
        department: body.department || "OPD Reception",
        amount: received,
        paymentMethod: body.paymentMethod || "CASH",
        description: `OPD Fee collected for ${body.patientName || visitNumber}`,
        patientId: newVisit.patientId,
        visitId: newVisit._id,
        createdById: newVisit.receptionistId,
        transactionDate: new Date(),
      });
    }

    console.log(`[Supabase PG Success] Visit ${visitNumber} for ${body.patientName} saved to PostgreSQL!`);

    return NextResponse.json(
      { message: "Visit created successfully", visit: newVisit },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Visits API POST Error]:", error);
    return NextResponse.json(
      {
        error: `Failed to create patient visit: ${error?.message || String(error)}`,
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
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Visit ID and status are required." }, { status: 400 });
    }

    const updatedVisit = await visitRepository.updateStatus(id, status);

    return NextResponse.json(
      { message: "Visit status updated successfully", visit: updatedVisit },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Visits API PUT Error]:", error);
    return NextResponse.json(
      {
        error: `Failed to update visit status: ${error?.message || String(error)}`,
        details: error?.stack || error?.message || String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

