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
        count = await prisma.dischargeForm.count();
      } catch (e: any) {
        dbStatus = "error";
        dbError = e?.message || String(e);
      }
      return NextResponse.json({
        status: "debug_ok",
        route: "/api/forms/discharge",
        dbStatus,
        dbError,
        dischargeFormCount: count,
        query: { patientId, search },
        timestamp: new Date().toISOString(),
      });
    }

    const forms = await hospitalFormsRepository.getDischargeForms({ patientId, search });
    return NextResponse.json({ forms: forms || [] }, { status: 200 });
  } catch (error: any) {
    console.error("[Discharge Forms GET Error]:", error);
    return NextResponse.json(
      {
        error: `Failed to fetch discharge forms: ${error?.message || String(error)}`,
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

    const form = await hospitalFormsRepository.createDischargeForm(body);

    // ── Phase 5: Auto-archive Discharge Form ──
    if (form?.patient && body.admissionFormNumber) {
      patientFileArchiveService
        .onDischargeFormCreated({
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
          dischargeData: {
            formNumber: form.formNumber,
            formDate: form.formDate,
            dischargeDate: form.dischargeDate,
            diagnosis: form.diagnosis,
            dischargeCondition: form.dischargeCondition,
            doctorName: form.doctorName,
            outcome: form.outcome,
          },
          createdById: body.createdById,
        })
        .catch((err: any) =>
          console.error("[Archive] Discharge archive error (non-fatal):", err?.message)
        );
    }

    return NextResponse.json({ message: "Discharge form created successfully", form }, { status: 201 });
  } catch (error: any) {
    console.error("[Discharge Form POST Error]:", error);
    return NextResponse.json(
      {
        error: `Failed to create discharge form: ${error?.message || String(error)}`,
        details: error?.stack || error?.message || String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}


