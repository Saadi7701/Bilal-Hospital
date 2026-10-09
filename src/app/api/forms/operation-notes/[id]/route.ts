import { NextResponse } from "next/server";
import { hospitalFormsRepository } from "@/repositories/HospitalFormsRepository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const form = await hospitalFormsRepository.getOperationNoteById(params.id);
    if (!form) {
      return NextResponse.json({ error: "Operation note not found" }, { status: 404 });
    }
    return NextResponse.json({ form }, { status: 200 });
  } catch (error: any) {
    console.error("[Operation Note GET ID Error]:", error);
    return NextResponse.json(
      {
        error: `Failed to fetch operation note: ${error?.message || String(error)}`,
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
    const updated = await hospitalFormsRepository.updateOperationNote(params.id, body);
    return NextResponse.json({ message: "Operation note updated successfully", form: updated }, { status: 200 });
  } catch (error: any) {
    console.error("[Operation Note PUT Error]:", error);
    return NextResponse.json(
      {
        error: `Failed to update operation note: ${error?.message || String(error)}`,
        details: error?.stack || error?.message || String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

