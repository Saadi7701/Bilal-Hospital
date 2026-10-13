import { prisma } from "./prisma";

/**
 * Atomically generates the next MRN for a new patient.
 *
 * Mechanism:
 *   - Uses a Prisma $transaction with SELECT ... FOR UPDATE row locking on the
 *     MrnCounter singleton, so concurrent calls are serialized at the DB level.
 *   - Safe with Supabase PgBouncer in transaction-mode pooling (port 6543).
 *   - If the patient creation that follows fails and the transaction rolls back,
 *     the counter also rolls back — no gaps are produced on failure.
 *
 * Format: MR-YYYY-NNNN  e.g.  "MR-2026-1015"
 *
 * IMPORTANT: This function MUST only be called from the backend (server-side).
 * Never import or call this from any frontend React component.
 */
export async function generateNextMrn(): Promise<string> {
  const nextNum = await prisma.$transaction(async (tx) => {
    // Lock the singleton row — concurrent callers block here until we commit
    const rows = await tx.$queryRaw<Array<{ lastMrn: number }>>`
      SELECT "lastMrn"
      FROM "MrnCounter"
      WHERE id = 'singleton'
      FOR UPDATE
    `;

    if (!rows || rows.length === 0) {
      throw new Error(
        "[generateNextMrn] MrnCounter singleton row is missing. " +
        "Run: npx tsx scripts/seed-mrn-counter.ts"
      );
    }

    const next = Number(rows[0].lastMrn) + 1;

    await tx.mrnCounter.update({
      where: { id: "singleton" },
      data: { lastMrn: next },
    });

    return next;
  });

  const year = new Date().getFullYear();
  const padded = String(nextNum).padStart(4, "0");
  return `MR-${year}-${padded}`;
}
