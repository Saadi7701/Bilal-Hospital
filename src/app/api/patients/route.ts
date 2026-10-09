import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { patientRepository } from "@/repositories/PatientRepository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const debug = searchParams.get("debug") === "1" || searchParams.get("debug") === "true";
    const query = searchParams.get("q") || "";

    if (debug) {
      let dbStatus = "connected";
      let dbError: string | null = null;
      let count = 0;
      try {
        count = await prisma.patient.count();
      } catch (e: any) {
        dbStatus = "error";
        dbError = e?.message || String(e);
      }
      return NextResponse.json({
        status: "debug_ok",
        route: "/api/patients",
        dbStatus,
        dbError,
        patientCount: count,
        query,
        timestamp: new Date().toISOString(),
      });
    }

    const patients = await patientRepository.searchPatients(query);
    return NextResponse.json({ patients: patients || [] }, { status: 200 });
  } catch (error: any) {
    console.error("[Patients API GET Error]:", error);
    return NextResponse.json(
      {
        error: `Failed to fetch patients records: ${error?.message || String(error)}`,
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

    if (!body.fullName || !body.phone) {
      return NextResponse.json(
        { error: "Full Name and Phone are required." },
        { status: 400 }
      );
    }

    let mrNumber = body.mrNumber || `MR-${Date.now().toString().slice(-6)}`;
    const existing = await patientRepository.findByMrNumber(mrNumber);
    if (existing) {
      mrNumber = `MR-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    }

    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const createdBy = adminUser ? adminUser.id : "";

    const newPatient = await patientRepository.createPatient({
      mrNumber,
      fullName: body.fullName,
      fatherHusbandName: body.fatherOrHusbandName || body.fatherHusbandName || "",
      age: Number(body.age) || 30,
      gender: body.gender || "MALE",
      phone: body.phone,
      cnic: body.cnic && body.cnic.trim() ? body.cnic.trim() : undefined,
      address: body.address || "",
      bloodGroup: body.bloodGroup || "UNKNOWN",
      createdBy,
    });

    console.log(`[Supabase PG Success] Patient ${newPatient.fullName} (${newPatient.mrNumber}) saved to PostgreSQL!`);

    return NextResponse.json(
      { message: "Patient registered successfully", patient: newPatient },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Patients API POST Error]:", error);
    return NextResponse.json(
      {
        error: `Failed to create patient record: ${error?.message || String(error)}`,
        details: error?.stack || error?.message || String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

