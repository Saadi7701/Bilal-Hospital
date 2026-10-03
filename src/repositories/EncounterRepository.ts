import { prisma } from "../lib/prisma";

export type EncounterStatus =
  | "OPEN"
  | "WAITING_FOR_LAB"
  | "PARTIAL_LAB_RESULTS"
  | "LAB_RESULT_AVAILABLE"
  | "FOLLOW_UP_REQUIRED"
  | "COMPLETED";

export interface CreateEncounterInput {
  visitId: string;
  patientId: string;
  patientName?: string;
  mrNumber?: string;
  consultantId: string;
  consultantName?: string;
  chiefComplaint?: string;
  symptoms?: string;
  diagnosis?: string;
  bpSystolic?: number;
  bpDiastolic?: number;
  temperature?: number;
  pulse?: number;
  weight?: number;
  clinicalNotes?: string;
  advice?: string;
}

export class EncounterRepository {
  /**
   * Find or create an encounter for a given visit ID.
   * Ensures 1 active encounter per OPD visit (no duplicates).
   */
  async getOrCreateEncounter(input: CreateEncounterInput): Promise<any> {
    const existing = await prisma.encounter.findFirst({
      where: { visitId: input.visitId },
      include: {
        timelineEvents: { orderBy: { createdAt: "asc" } },
        labOrders: true,
        prescriptions: { include: { items: true } },
      },
    });

    if (existing) {
      return existing;
    }

    const count = await prisma.encounter.count();
    const encounterNumber = `ENC-2026-${String(count + 101).padStart(6, "0")}`;

    const encounter = await prisma.encounter.create({
      data: {
        encounterNumber,
        visitId: input.visitId,
        patientId: input.patientId,
        patientName: input.patientName,
        mrNumber: input.mrNumber,
        consultantId: input.consultantId,
        consultantName: input.consultantName,
        chiefComplaint: input.chiefComplaint,
        symptoms: input.symptoms,
        diagnosis: input.diagnosis,
        bpSystolic: input.bpSystolic,
        bpDiastolic: input.bpDiastolic,
        temperature: input.temperature,
        pulse: input.pulse,
        weight: input.weight,
        clinicalNotes: input.clinicalNotes,
        advice: input.advice,
        status: "OPEN",
      },
      include: {
        timelineEvents: true,
        labOrders: true,
        prescriptions: { include: { items: true } },
      },
    });

    // Add initial timeline event
    await this.addTimelineEvent(
      encounter.id,
      "ENCOUNTER_STARTED",
      "Consultation Started",
      `Encounter ${encounter.encounterNumber} opened by ${input.consultantName || "Doctor"}`,
      input.consultantName
    );

    return encounter;
  }

  async findById(id: string): Promise<any> {
    return prisma.encounter.findUnique({
      where: { id },
      include: {
        timelineEvents: { orderBy: { createdAt: "asc" } },
        labOrders: true,
        prescriptions: { include: { items: true } },
      },
    });
  }

  async findByVisitId(visitId: string): Promise<any> {
    return prisma.encounter.findFirst({
      where: { visitId },
      include: {
        timelineEvents: { orderBy: { createdAt: "asc" } },
        labOrders: true,
        prescriptions: { include: { items: true } },
      },
    });
  }

  async updateStatus(id: string, status: EncounterStatus, performedBy?: string): Promise<any> {
    const updated = await prisma.encounter.update({
      where: { id },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : undefined,
      },
    });

    await this.addTimelineEvent(
      id,
      `STATUS_${status}`,
      `Status changed to ${status.replace(/_/g, " ")}`,
      `Encounter status transitioned to ${status}`,
      performedBy
    );

    return updated;
  }

  async updateClinicalData(id: string, data: Partial<CreateEncounterInput>): Promise<any> {
    return prisma.encounter.update({
      where: { id },
      data: {
        chiefComplaint: data.chiefComplaint,
        symptoms: data.symptoms,
        diagnosis: data.diagnosis,
        bpSystolic: data.bpSystolic,
        bpDiastolic: data.bpDiastolic,
        temperature: data.temperature,
        pulse: data.pulse,
        weight: data.weight,
        clinicalNotes: data.clinicalNotes,
        advice: data.advice,
      },
    });
  }

  async addTimelineEvent(
    encounterId: string,
    eventType: string,
    title: string,
    description?: string,
    performedBy?: string
  ): Promise<any> {
    return prisma.encounterTimelineEvent.create({
      data: {
        encounterId,
        eventType,
        title,
        description,
        performedBy: performedBy || "System",
      },
    });
  }
}

export const encounterRepository = new EncounterRepository();
