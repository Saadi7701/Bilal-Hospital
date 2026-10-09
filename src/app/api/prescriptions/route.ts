import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prescriptionRepository } from "@/repositories/PrescriptionRepository";
import { getPKTDateRange } from "@/lib/dateUtils";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const period = searchParams.get("period") || "today"; // 'today' | 'all'
    const pktDateRange = getPKTDateRange(searchParams.get("date"));

    let prescriptions;
    if (patientId) {
      prescriptions = await prescriptionRepository.findByPatient(patientId);
    } else {
      let whereClause: any = {};
      if (period === "today") {
        whereClause = {
          OR: [
            {
              prescriptionDate: {
                gte: pktDateRange.startOfPKTDay,
                lt: pktDateRange.startOfTomorrowPKTDay,
              },
            },
            {
              isDispensed: false,
            },
          ],
        };
      }

      const records = await prisma.prescription.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: period === "all" ? 500 : 200,
        include: { items: true },
      });
      prescriptions = records.map((p) => ({ ...p, _id: p.id }));
    }

    return NextResponse.json({ prescriptions }, { status: 200 });
  } catch (error: any) {
    console.error("[Prescriptions API GET Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch prescriptions." },
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

    const itemsInput = (body.items || body.medicines || []).map((m: any) => ({
      medicineName: m.medicineName || m.name || "Medicine",
      dosage: m.dosage || "1-0-1",
      frequency: m.frequency || "BID",
      duration: m.duration || `${m.durationDays || 5} days`,
      instructions: m.instructions || "",
    }));

    const newPrescription = await prescriptionRepository.createPrescription({
      patientId: body.patientId,
      patientName: body.patientName || "Patient",
      mrNumber: body.mrNumber || "MR-0000",
      visitId: body.visitId || "",
      consultantId: body.consultantId,
      consultantName: body.consultantName || "Dr. Bilal Ahmad",
      diagnosis: body.diagnosis || "General Consultation",
      notes: body.notes || body.instructions || body.clinicalNotes || "",
      isDispensed: false,
      prescriptionDate: new Date(),
      items: itemsInput,
    });

    return NextResponse.json(
      { message: "Prescription created successfully", prescription: newPrescription },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Prescriptions API POST Error]:", error);
    return NextResponse.json(
      { error: "Failed to create prescription." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Prescription ID is required." }, { status: 400 });
    }

    const updated = await prescriptionRepository.markDispensed(id);

    return NextResponse.json(
      { message: "Prescription status updated successfully", prescription: updated },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Prescriptions API PUT Error]:", error);
    return NextResponse.json(
      { error: "Failed to update prescription status." },
      { status: 500 }
    );
  }
}
