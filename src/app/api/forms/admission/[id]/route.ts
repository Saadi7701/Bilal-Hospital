import { NextResponse } from "next/server";
import { hospitalFormsRepository } from "@/repositories/HospitalFormsRepository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const form = await hospitalFormsRepository.getAdmissionFormById(params.id);
    if (!form) {
      return NextResponse.json({ error: "Admission form not found" }, { status: 404 });
    }
    return NextResponse.json({ form }, { status: 200 });
  } catch (error: any) {
    console.error("[Admission Form GET ID Error]:", error);
    return NextResponse.json(
      {
        error: `Failed to fetch admission form: ${error?.message || String(error)}`,
        details: error?.stack || error?.message || String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updated = await hospitalFormsRepository.updateAdmissionForm(params.id, body);
    return NextResponse.json({ message: "Admission form updated successfully", form: updated }, { status: 200 });
  } catch (error: any) {
    console.error("[Admission Form PUT Error]:", error);
    return NextResponse.json(
      {
        error: `Failed to update admission form: ${error?.message || String(error)}`,
        details: error?.stack || error?.message || String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

