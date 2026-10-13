import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/patients/next-mrn
 * Returns a preview of the next MRN that will be assigned.
 * READ-ONLY — does NOT consume or increment the counter.
 * Used by portals to auto-fill the MRN display field before registration.
 */
export async function GET() {
  try {
    const counter = await prisma.mrnCounter.findUnique({
      where: { id: "singleton" },
    });

    if (!counter) {
      return NextResponse.json(
        { error: "MrnCounter not initialised. Run: npx tsx scripts/seed-mrn-counter.ts" },
        { status: 500 }
      );
    }

    const nextNum = counter.lastMrn + 1;
    const year = new Date().getFullYear();
    const padded = String(nextNum).padStart(4, "0");
    const nextMrn = `MR-${year}-${padded}`;

    return NextResponse.json({ nextMrn, nextNum }, { status: 200 });
  } catch (error: any) {
    console.error("[Next MRN API Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch next MRN: " + error.message },
      { status: 500 }
    );
  }
}
