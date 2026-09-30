import { NextResponse } from "next/server";
import { patientDocumentRepository } from "@/repositories/PatientDocumentRepository";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/patient-files?patientId=<id>
 *
 * Returns the full organized Electronic Patient File index for an admitted patient.
 * Grouped by documentType for the Patient File viewer.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    if (!patientId) {
      return NextResponse.json(
        { error: "patientId query parameter is required." },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, mrNumber: true, cnic: true, fullName: true, gender: true, age: true, phone: true },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }

    // Verify this patient has at least one admission (strict rule: only admitted patients have files)
    const admissionCount = await prisma.admissionForm.count({ where: { patientId } });
    if (admissionCount === 0) {
      return NextResponse.json(
        {
          patient,
          isAdmitted: false,
          message: "This patient has not been admitted. No patient file exists.",
          documents: {},
          admissionHistory: [],
        },
        { status: 200 }
      );
    }

    // Get all admissions for this patient
    const admissions = await prisma.admissionForm.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        formNumber: true,
        dateOfAdmission: true,
        provisionalDiagnosis: true,
        status: true,
        createdAt: true,
      },
    });

    // Get grouped documents
    const groupedDocuments = await patientDocumentRepository.getPatientFileIndex(patientId);
    const admissionHistory = await patientDocumentRepository.getAdmissionHistory(patientId);

    return NextResponse.json(
      {
        patient,
        isAdmitted: true,
        admissions,
        admissionHistory,
        documents: groupedDocuments,
        totalDocuments: Object.values(groupedDocuments).reduce((sum, arr) => sum + arr.length, 0),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Patient File GET Error]:", error);
    return NextResponse.json(
      { error: "Failed to retrieve patient file." },
      { status: 500 }
    );
  }
}
