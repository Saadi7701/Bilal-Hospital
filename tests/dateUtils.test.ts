import {
  getPKTDateRange,
  getPKTMonthRange,
  toPKTDateString,
  formatPKTDateAndDay,
  isSamePKTDay,
} from "../src/lib/dateUtils";

async function runDateUtilsTests() {
  console.log("=========================================");
  console.log("  Running PKT Date Utility Unit Tests    ");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // Test 1: getPKTDateRange for explicit date
  const range = getPKTDateRange("2026-10-09T10:00:00.000Z");
  assert(range.dateStringPKT === "2026-10-09", "Correct PKT date string '2026-10-09'");
  
  // PKT is UTC+5, so 2026-10-09 00:00:00 PKT is 2026-10-08 19:00:00 UTC
  assert(range.startOfPKTDay.toISOString() === "2026-10-08T19:00:00.000Z", "Start of PKT day in UTC is 19:00 previous day");
  assert(range.startOfTomorrowPKTDay.toISOString() === "2026-10-09T19:00:00.000Z", "Start of tomorrow PKT day in UTC is 19:00 current day");

  // Test 2: Midnight boundary verification (PKT half-open interval)
  // 18:59:59.999 UTC (23:59:59.999 PKT previous day)
  const prevDayEnd = new Date("2026-10-08T18:59:59.999Z");
  assert(prevDayEnd < range.startOfPKTDay, "Timestamp 23:59:59.999 PKT previous day is BEFORE startOfPKTDay");

  // 19:00:00.000 UTC (00:00:00.000 PKT current day)
  const currentDayStart = new Date("2026-10-08T19:00:00.000Z");
  assert(currentDayStart >= range.startOfPKTDay && currentDayStart < range.startOfTomorrowPKTDay, "Timestamp 00:00:00 PKT is IN current PKT day");

  // 18:59:59.999 UTC next day (23:59:59.999 PKT current day)
  const currentDayEnd = new Date("2026-10-09T18:59:59.999Z");
  assert(currentDayEnd >= range.startOfPKTDay && currentDayEnd < range.startOfTomorrowPKTDay, "Timestamp 23:59:59.999 PKT is IN current PKT day");

  // Test 3: getPKTMonthRange for October 2026
  const monthRange = getPKTMonthRange("2026-10-15");
  assert(monthRange.monthStringPKT === "2026-10", "Month string is '2026-10'");
  assert(monthRange.startOfPKTMonth.toISOString() === "2026-09-30T19:00:00.000Z", "Oct 1 00:00:00 PKT is Sep 30 19:00:00 UTC");
  assert(monthRange.startOfNextPKTMonth.toISOString() === "2026-10-31T19:00:00.000Z", "Nov 1 00:00:00 PKT is Oct 31 19:00:00 UTC");

  // Test 4: isSamePKTDay check
  assert(isSamePKTDay("2026-10-09T01:00:00Z", "2026-10-09T15:00:00Z"), "Two timestamps on same PKT day return true");
  assert(!isSamePKTDay("2026-10-08T10:00:00Z", "2026-10-09T10:00:00Z"), "Different PKT days return false");

  // Test 5: formatPKTDateAndDay
  const formatted = formatPKTDateAndDay("2026-10-09T12:00:00Z");
  assert(formatted.includes("09 Oct 2026") && formatted.includes("Friday"), `Formatted string '${formatted}' contains date and day name`);

  console.log("\n-----------------------------------------");
  console.log(`Test Execution Summary: ${passed} Passed, ${failed} Failed`);
  console.log("-----------------------------------------");

  if (failed > 0) {
    process.exit(1);
  }
}

runDateUtilsTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
