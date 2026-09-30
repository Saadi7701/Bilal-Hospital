import { prisma } from "@/lib/prisma";

export interface CreatePatientDocumentInput {
  patientId: string;
  visitId?: string;
  admissionFormNumber?: string;
  documentType: string;
  documentName: string;
  relativePath: string;
  fileName: string;
  mimeType?: string;
  fileSize: number;
  checksum?: string;
  status?: string;
  errorMessage?: string;
  createdById?: string;
}

export class PatientDocumentRepository {
  /**
   * Creates a new patient document archive record.
   */
  async create(input: CreatePatientDocumentInput) {
    return prisma.patientDocument.create({
      data: {
        patientId: input.patientId,
        visitId: input.visitId || null,
        admissionFormNumber: input.admissionFormNumber || null,
        documentType: input.documentType,
        documentName: input.documentName,
        relativePath: input.relativePath,
        fileName: input.fileName,
        mimeType: input.mimeType || "application/json",
        fileSize: input.fileSize,
        checksum: input.checksum || null,
        status: input.status || "ARCHIVED",
        errorMessage: input.errorMessage || null,
        createdById: input.createdById || null,
      },
    });
  }

  /**
   * Gets all documents for a patient, organized newest first.
   */
  async findByPatient(patientId: string) {
    return prisma.patientDocument.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Gets all documents for a specific admission (by admissionFormNumber).
   */
  async findByAdmission(admissionFormNumber: string) {
    return prisma.patientDocument.findMany({
      where: { admissionFormNumber },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Gets all documents for a specific patient + admission combination.
   */
  async findByPatientAndAdmission(patientId: string, admissionFormNumber: string) {
    return prisma.patientDocument.findMany({
      where: { patientId, admissionFormNumber },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Finds a document by its ID, used for secure download streaming.
   */
  async findById(id: string) {
    return prisma.patientDocument.findUnique({ where: { id } });
  }

  /**
   * Marks a document record as ERROR (e.g., file not found on disk).
   */
  async markError(id: string, errorMessage: string) {
    return prisma.patientDocument.update({
      where: { id },
      data: { status: "ERROR", errorMessage },
    });
  }

  /**
   * Marks a document record as VERIFIED after checksum integrity check.
   */
  async markVerified(id: string) {
    return prisma.patientDocument.update({
      where: { id },
      data: { status: "VERIFIED" },
    });
  }

  /**
   * Returns full grouped document list for a patient, grouped by category (for Patient File viewer).
   */
  async getPatientFileIndex(patientId: string) {
    const docs = await prisma.patientDocument.findMany({
      where: { patientId, status: { not: "ERROR" } },
      orderBy: { createdAt: "desc" },
    });

    const grouped: Record<string, typeof docs> = {};
    for (const doc of docs) {
      if (!grouped[doc.documentType]) grouped[doc.documentType] = [];
      grouped[doc.documentType].push(doc);
    }
    return grouped;
  }

  /**
   * Returns all unique admission form numbers for a patient (for multi-admission history).
   */
  async getAdmissionHistory(patientId: string): Promise<string[]> {
    const docs = await prisma.patientDocument.findMany({
      where: { patientId, admissionFormNumber: { not: null } },
      select: { admissionFormNumber: true },
      distinct: ["admissionFormNumber"],
      orderBy: { createdAt: "desc" },
    });
    return docs.map((d) => d.admissionFormNumber as string);
  }
}

export const patientDocumentRepository = new PatientDocumentRepository();
