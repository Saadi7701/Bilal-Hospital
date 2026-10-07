import { NextResponse } from "next/server";
import { patientRepository } from "@/repositories/PatientRepository";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cnic = searchParams.get("cnic") || undefined;
    const phone = searchParams.get("phone") || undefined;
    const fullName = searchParams.get("fullName") || searchParams.get("name") || undefined;

    const duplicates = await patientRepository.findDuplicates({ cnic, phone, fullName });
    return NextResponse.json({ duplicates, hasPotentialDuplicate: duplicates.length > 0 }, { status: 200 });
  } catch (error: any) {
    console.error("[Check Duplicates API Error]:", error);
    return NextResponse.json({ error: "Failed to check duplicates: " + error.message }, { status: 500 });
  }
}
