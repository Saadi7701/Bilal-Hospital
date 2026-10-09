import { NextResponse } from "next/server";
import { hospitalFormsRepository } from "@/repositories/HospitalFormsRepository";
import { patientFileArchiveService } from "@/lib/patientFileArchiveService";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const debug = searchParams.get("debug") === "1" || searchParams.get("debug") === "true";
    const patientId = searchParams.get("patientId") || undefined;
    const search = searchParams.get("q") || searchParams.get("search") || undefined;

    if (debug) {
      let dbStatus = "connected";
      let dbError: string | null = null;
      let count = 0;
      try {
        count = await prisma.admissionForm.count();
      } catch (e: any) {
        dbStatus = "error";
        dbError = e?.message || String(e);
      }
      return NextResponse.json({
        status: "debug_ok",
        route: "/api/forms/admission",
        dbStatus,
        dbError,
        admissionFormCount: count,
        query: { patientId, search },
        timestamp: new Date().toISOString(),
      });
    }

    const forms = await hospitalFormsRepository.getAdmissionForms({ patientId, search });
    return NextResponse.json({ forms: forms || [] }, { status: 200 });
  } catch (error: any) {
    console.error("[Admission Forms GET Error]:", error);
    return NextResponse.json(
      {
        error: `Failed to fetch admission forms: ${error?.message || String(error)}`,
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

    if (!body.patientId) {
      return NextResponse.json(
        { error: "Patient ID is required." },
        { status: 400 }
      );
    }

    const form = await hospitalFormsRepository.createAdmissionForm(body);

    // ── Phase 4: Auto-create patient file directory + archive admission form ──
    // This is non-blocking: archive failure does not roll back the DB record.
    if (form?.patient) {
      patientFileArchiveService
        .onAdmissionCreated({
          patient: {
            id: form.patient.id,
            mrNumber: form.patient.mrNumber,
            cnic: form.patient.cnic,
            fullName: form.patient.fullName,
            gender: form.patient.gender,
            age: form.patient.age,
            phone: form.patient.phone,
          },
          admissionFormNumber: form.formNumber,
          visitId: form.visitId ?? undefined,
          formData: {
            formNumber: form.formNumber,
            dateOfAdmission: form.dateOfAdmission,
            provisionalDiagnosis: form.provisionalDiagnosis,
            wardName: body.wardName,
            bedNumber: body.bedNumber,
            admittedThrough: form.admittedThrough,
            consultantName: body.consultantName,
          },
          createdById: body.createdById,
        })
        .catch((err: any) =>
          console.error("[Archive] Admission archive error (non-fatal):", err?.message)
        );
    }

    return NextResponse.json({ message: "Admission form created successfully", form }, { status: 201 });
  } catch (error: any) {
    console.error("[Admission Form POST Error]:", error);
    return NextResponse.json(
      {
        error: `Failed to create admission form: ${error?.message || String(error)}`,
        details: error?.stack || error?.message || String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}


