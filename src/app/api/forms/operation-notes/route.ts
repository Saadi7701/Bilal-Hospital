import { NextResponse } from "next/server";
import { hospitalFormsRepository } from "@/repositories/HospitalFormsRepository";
import { patientFileArchiveService } from "@/lib/patientFileArchiveService";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId") || undefined;
    const search = searchParams.get("q") || searchParams.get("search") || undefined;

    const forms = await hospitalFormsRepository.getOperationNotes({ patientId, search });
    return NextResponse.json({ forms }, { status: 200 });
  } catch (error: any) {
    console.error("[Operation Notes GET Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch operation notes." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.patientId || !body.surgeonName) {
      return NextResponse.json(
        { error: "Patient ID and Surgeon Name are required." },
        { status: 400 }
      );
    }

    const form = await hospitalFormsRepository.createOperationNote(body);

    // ── Phase 5: Auto-archive Operation Note ──
    if (form?.patient && body.admissionFormNumber) {
      patientFileArchiveService
        .onOperationNoteCreated({
          patient: {
            id: form.patient.id,
            mrNumber: form.patient.mrNumber,
            cnic: form.patient.cnic,
            fullName: form.patient.fullName,
            gender: form.patient.gender,
            age: form.patient.age,
            phone: form.patient.phone,
          },
          admissionFormNumber: body.admissionFormNumber,
          visitId: form.visitId ?? undefined,
          formNumber: form.formNumber,
          operationData: {
            formNumber: form.formNumber,
            operationDate: form.operationDate,
            surgeonName: form.surgeonName,
            anesthetistName: form.anesthetistName,
            anesthesiaType: form.anesthesiaType,
            findings: form.findings,
            procedureDetails: form.procedureDetails,
            conditionAtEnd: form.conditionAtEnd,
          },
          createdById: body.createdById,
        })
        .catch((err: any) =>
          console.error("[Archive] Operation Note archive error (non-fatal):", err?.message)
        );
    }

    return NextResponse.json({ message: "Operation note created successfully", form }, { status: 201 });
  } catch (error: any) {
    console.error("[Operation Note POST Error]:", error);
    return NextResponse.json(
      { error: `Failed to create operation note: ${error.message}` },
      { status: 500 }
    );
  }
}

