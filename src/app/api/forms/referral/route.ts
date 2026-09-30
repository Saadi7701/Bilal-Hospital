import { NextResponse } from "next/server";
import { hospitalFormsRepository } from "@/repositories/HospitalFormsRepository";
import { patientFileArchiveService } from "@/lib/patientFileArchiveService";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId") || undefined;
    const search = searchParams.get("q") || searchParams.get("search") || undefined;

    const forms = await hospitalFormsRepository.getReferralForms({ patientId, search });
    return NextResponse.json({ forms }, { status: 200 });
  } catch (error: any) {
    console.error("[Referral Forms GET Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch referral forms." },
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

    const form = await hospitalFormsRepository.createReferralForm(body);

    // ── Phase 5: Auto-archive Referral Form ──
    if (form?.patient && body.admissionFormNumber) {
      patientFileArchiveService
        .onReferralFormCreated({
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
          referralData: {
            formNumber: form.formNumber,
            formDate: form.formDate,
            referredHospitalName: form.referredHospitalName,
            provisionalDiagnosis: form.provisionalDiagnosis,
            reasonForReferral: form.reasonForReferral,
            doctorName: form.doctorName,
          },
          createdById: body.createdById,
        })
        .catch((err: any) =>
          console.error("[Archive] Referral archive error (non-fatal):", err?.message)
        );
    }

    return NextResponse.json({ message: "Referral form created successfully", form }, { status: 201 });
  } catch (error: any) {
    console.error("[Referral Form POST Error]:", error);
    return NextResponse.json(
      { error: `Failed to create referral form: ${error.message}` },
      { status: 500 }
    );
  }
}

