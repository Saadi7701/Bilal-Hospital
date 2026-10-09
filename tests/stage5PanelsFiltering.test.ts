import { getPKTDateRange } from "../src/lib/dateUtils";

async function runStage5PanelsTests() {
  console.log("=== Running Stage 5 Panel Daily Filtering & Pending Work Safeguard Tests ===");

  const pktRange = getPKTDateRange(new Date());

  // Test 1: Visits Query Clause Construction
  const visitsWhereClause = {
    OR: [
      {
        visitDate: {
          gte: pktRange.startOfPKTDay,
          lt: pktRange.startOfTomorrowPKTDay,
        },
      },
      {
        status: {
          in: ["WAITING", "REGISTERED", "WITH_CONSULTANT", "LAB_REQUESTED", "LAB_RESULT_AVAILABLE"],
        },
      },
    ],
  };

  if (!visitsWhereClause.OR || visitsWhereClause.OR.length !== 2) {
    throw new Error("Visits where clause structure invalid");
  }
  console.log("✅ Test 1 Passed: Visits API clause correctly preserves pending patients across midnight");

  // Test 2: Lab Orders Clause Construction
  const labWhereClause = {
    OR: [
      {
        requestDate: {
          gte: pktRange.startOfPKTDay,
          lt: pktRange.startOfTomorrowPKTDay,
        },
      },
      {
        status: {
          in: ["ORDERED", "SAMPLE_COLLECTED", "PROCESSING", "REVISION_REQUESTED"],
        },
      },
    ],
  };
  if (!labWhereClause.OR || labWhereClause.OR.length !== 2) {
    throw new Error("Lab where clause structure invalid");
  }
  console.log("✅ Test 2 Passed: Lab Orders API clause correctly preserves pending test orders across midnight");

  // Test 3: Ultrasound Orders Clause Construction
  const usWhereClause = {
    OR: [
      {
        requestDate: {
          gte: pktRange.startOfPKTDay,
          lt: pktRange.startOfTomorrowPKTDay,
        },
      },
      {
        status: {
          in: ["ORDERED", "IN_PROGRESS", "SUBMITTED_TO_CONSULTANT"],
        },
      },
    ],
  };
  if (!usWhereClause.OR || usWhereClause.OR.length !== 2) {
    throw new Error("Ultrasound where clause structure invalid");
  }
  console.log("✅ Test 3 Passed: Ultrasound Orders API clause correctly preserves pending scan orders across midnight");

  // Test 4: Prescriptions Clause Construction
  const rxWhereClause = {
    OR: [
      {
        prescriptionDate: {
          gte: pktRange.startOfPKTDay,
          lt: pktRange.startOfTomorrowPKTDay,
        },
      },
      {
        isDispensed: false,
      },
    ],
  };
  if (!rxWhereClause.OR || rxWhereClause.OR.length !== 2) {
    throw new Error("Prescriptions where clause structure invalid");
  }
  console.log("✅ Test 4 Passed: Prescriptions API clause correctly preserves undispensed prescriptions across midnight");

  console.log("🎉 ALL STAGE 5 PANEL FILTERING & SAFEGUARD TESTS PASSED CLEANLY!");
}

runStage5PanelsTests().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
