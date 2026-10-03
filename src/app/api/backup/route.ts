import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [patients, visits, labOrders, ultrasoundOrders, prescriptions, medicines, cashTransactions, users] =
      await Promise.all([
        prisma.patient.findMany(),
        prisma.patientVisit.findMany(),
        prisma.labOrder.findMany(),
        prisma.ultrasoundOrder.findMany(),
        prisma.prescription.findMany({ include: { items: true } }),
        prisma.medicine.findMany(),
        prisma.cashTransaction.findMany(),
        prisma.user.findMany({ select: { id: true, username: true, email: true, fullName: true, role: true, isActive: true } }),
      ]);

    const backupPayload = {
      exportTimestamp: new Date().toISOString(),
      hospital: "BILAL HOSPITAL MANAGEMENT SYSTEM",
      database: "PostgreSQL (Supabase)",
      collections: {
        patientsCount: patients.length,
        visitsCount: visits.length,
        labOrdersCount: labOrders.length,
        ultrasoundOrdersCount: ultrasoundOrders.length,
        prescriptionsCount: prescriptions.length,
        medicinesCount: medicines.length,
        cashTransactionsCount: cashTransactions.length,
        usersCount: users.length,
      },
      data: {
        patients,
        visits,
        labOrders,
        ultrasoundOrders,
        prescriptions,
        medicines,
        cashTransactions,
        users,
      },
    };

    return new Response(JSON.stringify(backupPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="BHMS_Database_Dump_${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error: any) {
    console.error("[Database Backup Dump Error]:", error);
    return NextResponse.json(
      { error: "Failed to generate database backup dump: " + error.message },
      { status: 500 }
    );
  }
}

