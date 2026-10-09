import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cashRepository } from "@/repositories/CashRepository";
import { getPKTDateRange, getPKTMonthRange } from "@/lib/dateUtils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "today"; // 'today' | 'month' | 'all'
    const dateParam = searchParams.get("date");

    const pktDateRange = getPKTDateRange(dateParam);
    const pktMonthRange = getPKTMonthRange(dateParam);

    let whereClause: any = {};
    if (period === "today") {
      whereClause = {
        transactionDate: {
          gte: pktDateRange.startOfPKTDay,
          lt: pktDateRange.startOfTomorrowPKTDay,
        },
      };
    } else if (period === "month") {
      whereClause = {
        transactionDate: {
          gte: pktMonthRange.startOfPKTMonth,
          lt: pktMonthRange.startOfNextPKTMonth,
        },
      };
    }

    const records = await prisma.cashTransaction.findMany({
      where: whereClause,
      orderBy: { transactionDate: "desc" },
      take: period === "all" || !period ? 500 : undefined,
    });
    const transactions = records.map((t) => ({ ...t, _id: t.id }));

    // Monthly Aggregation (Always calculates full month for dashboard totals)
    const monthRecords = await prisma.cashTransaction.findMany({
      where: {
        transactionDate: {
          gte: pktMonthRange.startOfPKTMonth,
          lt: pktMonthRange.startOfNextPKTMonth,
        },
      },
    });

    let monthlyIncome = 0;
    let monthlyExpense = 0;
    monthRecords.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (t.transactionType === "INCOME") monthlyIncome += amt;
      else if (t.transactionType === "EXPENSE") monthlyExpense += amt;
    });

    const todayClosing = await cashRepository.findDailyClosingByDate(new Date());

    return NextResponse.json(
      {
        transactions,
        dailyClosing: todayClosing,
        monthlyStats: {
          monthString: pktMonthRange.monthStringPKT,
          monthlyIncome,
          monthlyExpense,
          monthlyNetBalance: monthlyIncome - monthlyExpense,
          totalMonthTransactions: monthRecords.length,
        },
        pktDateRange: {
          dateStringPKT: pktDateRange.dateStringPKT,
          startOfPKTDay: pktDateRange.startOfPKTDay,
          startOfTomorrowPKTDay: pktDateRange.startOfTomorrowPKTDay,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Cash API GET Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch cash ledger transactions: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.type === "DAILY_CLOSING") {
      const newClosing = await cashRepository.recordDailyClosing({
        closingDate: new Date(),
        openingBalance: 0,
        totalIncome: Number(body.totalCollectedAmount) || Number(body.totalIncome) || 0,
        totalExpense: Number(body.totalExpense) || 0,
        expectedClosing: Number(body.totalCollectedAmount) || 0,
        actualCash: Number(body.totalCollectedAmount) || 0,
        difference: 0,
        closedBy: body.closedBy || "Admin Supervisor",
        notes: body.notes || "Daily cash closing completed",
        isClosed: true,
      });

      return NextResponse.json(
        { message: "Daily cash closing recorded successfully", dailyClosing: newClosing },
        { status: 201 }
      );
    }

    if (!body.category || !body.amount) {
      return NextResponse.json(
        { error: "Category and Amount are required." },
        { status: 400 }
      );
    }

    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const createdById = adminUser ? adminUser.id : "";

    const newTx = await cashRepository.createTransaction({
      transactionNumber: body.transactionNumber || body.receiptNumber || `TXN-${Date.now().toString().slice(-6)}`,
      transactionType: body.transactionType || "INCOME",
      category: body.category,
      department: body.department || "General Operations",
      amount: Number(body.amount),
      paymentMethod: body.paymentMode || body.paymentMethod || "CASH",
      description: body.description || `Cash transaction for ${body.category}`,
      createdById,
      transactionDate: new Date(),
    });

    return NextResponse.json(
      { message: "Cash transaction recorded successfully", transaction: newTx },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Cash API POST Error]:", error);
    return NextResponse.json(
      { error: "Failed to record cash transaction." },
      { status: 500 }
    );
  }
}
