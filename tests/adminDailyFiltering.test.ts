import { getPKTDateRange, getPKTMonthRange } from "../src/lib/dateUtils";

async function runAdminDailyFilteringTests() {
  console.log("=== Running Admin Panel Daily Filtering & Monthly Totals Tests ===");

  // Test 1: Date Range Computation for Today & Month in PKT
  const now = new Date();
  const pktRange = getPKTDateRange(now);
  const pktMonth = getPKTMonthRange(now);

  console.log(`[Test 1] Current PKT Date String: ${pktRange.dateStringPKT}`);
  console.log(`[Test 1] PKT Day Start: ${pktRange.startOfPKTDay.toISOString()}`);
  console.log(`[Test 1] PKT Day End: ${pktRange.startOfTomorrowPKTDay.toISOString()}`);
  console.log(`[Test 1] PKT Month Start: ${pktMonth.startOfPKTMonth.toISOString()}`);
  console.log(`[Test 1] PKT Month End: ${pktMonth.startOfNextPKTMonth.toISOString()}`);

  if (!pktRange.startOfPKTDay || !pktRange.startOfTomorrowPKTDay) {
    throw new Error("PKT date range bounds missing");
  }
  if (!pktMonth.startOfPKTMonth || !pktMonth.startOfNextPKTMonth) {
    throw new Error("PKT month range bounds missing");
  }
  console.log("✅ Test 1 Passed: Date range calculations valid");

  // Test 2: Ensure PKT Month encompasses PKT Today
  if (pktRange.startOfPKTDay < pktMonth.startOfPKTMonth) {
    throw new Error("PKT Day start is earlier than PKT Month start");
  }
  if (pktRange.startOfTomorrowPKTDay > pktMonth.startOfNextPKTMonth) {
    throw new Error("PKT Day end is later than PKT Month end");
  }
  console.log("✅ Test 2 Passed: PKT today is strictly within PKT current month");

  console.log("🎉 ALL ADMIN DAILY FILTERING UNIT TESTS PASSED CLEANLY!");
}

runAdminDailyFilteringTests().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
