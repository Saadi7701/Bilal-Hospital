import { NextResponse } from "next/server";
import { encounterRepository } from "@/repositories/EncounterRepository";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const visitId = searchParams.get("visitId");
    const patientId = searchParams.get("patientId");
    const mrNumber = searchParams.get("mrNumber");

    if (visitId) {
      const encounter = await encounterRepository.findByVisitId(visitId);
      return NextResponse.json({ encounter }, { status: 200 });
    }

    if (patientId || mrNumber) {
      const encounters = await prisma.encounter.findMany({
        where: {
          OR: [
            { patientId: patientId || undefined },
            { mrNumber: mrNumber || undefined },
          ],
        },
        include: {
          timelineEvents: { orderBy: { createdAt: "asc" } },
          labOrders: true,
          prescriptions: { include: { items: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ encounters }, { status: 200 });
    }

    const encounters = await prisma.encounter.findMany({
      take: 100,
      include: {
        timelineEvents: { orderBy: { createdAt: "asc" } },
        labOrders: true,
        prescriptions: { include: { items: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ encounters }, { status: 200 });
  } catch (error: any) {
    console.error("[Encounters API GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch encounters: " + error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.visitId || !body.patientId || !body.consultantId) {
      return NextResponse.json({ error: "visitId, patientId, and consultantId are required." }, { status: 400 });
    }

    const encounter = await encounterRepository.getOrCreateEncounter({
      visitId: body.visitId,
      patientId: body.patientId,
      patientName: body.patientName,
      mrNumber: body.mrNumber,
      consultantId: body.consultantId,
      consultantName: body.consultantName,
      chiefComplaint: body.chiefComplaint,
      symptoms: body.symptoms,
      diagnosis: body.diagnosis,
      bpSystolic: body.bpSystolic ? Number(body.bpSystolic) : undefined,
      bpDiastolic: body.bpDiastolic ? Number(body.bpDiastolic) : undefined,
      temperature: body.temperature ? Number(body.temperature) : undefined,
      pulse: body.pulse ? Number(body.pulse) : undefined,
      weight: body.weight ? Number(body.weight) : undefined,
      clinicalNotes: body.clinicalNotes,
      advice: body.advice,
    });

    return NextResponse.json({ message: "Encounter initialized successfully", encounter }, { status: 200 });
  } catch (error: any) {
    console.error("[Encounters API POST Error]:", error);
    return NextResponse.json({ error: "Failed to create encounter: " + error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, status, clinicalData, performedBy, timelineEvent } = body;

    if (!id) {
      return NextResponse.json({ error: "Encounter ID is required." }, { status: 400 });
    }

    let updatedEncounter;
    if (status) {
      updatedEncounter = await encounterRepository.updateStatus(id, status, performedBy);
    }

    if (clinicalData) {
      updatedEncounter = await encounterRepository.updateClinicalData(id, clinicalData);
    }

    if (timelineEvent) {
      await encounterRepository.addTimelineEvent(
        id,
        timelineEvent.eventType,
        timelineEvent.title,
        timelineEvent.description,
        performedBy
      );
    }

    const finalEncounter = await encounterRepository.findById(id);
    return NextResponse.json({ message: "Encounter updated successfully", encounter: finalEncounter }, { status: 200 });
  } catch (error: any) {
    console.error("[Encounters API PUT Error]:", error);
    return NextResponse.json({ error: "Failed to update encounter: " + error.message }, { status: 500 });
  }
}
