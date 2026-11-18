import "dotenv/config";
import { userRepository } from "../src/repositories/UserRepository";
import { patientRepository } from "../src/repositories/PatientRepository";
import { visitRepository } from "../src/repositories/VisitRepository";
import { prescriptionRepository } from "../src/repositories/PrescriptionRepository";
import { labRepository } from "../src/repositories/LabRepository";
import { cashRepository } from "../src/repositories/CashRepository";
import { calculateDailyCashSummary } from "../src/lib/aggregations";
import { validatePatientExists, validateVisitExists } from "../src/lib/relationshipGuards";

export interface ITestResult {
  suite: string;
  testName: string;
  passed: boolean;
  error?: string;
}

export async function runApplicationTests(): Promise<ITestResult[]> {
  console.log("=================================================");
  console.log("[Test Suite] Executing MongoDB Application Tests...");
  console.log("=================================================");

  const results: ITestResult[] = [];
  let testAdminId = "";
  let testPatient: any;
  let testVisit: any;

  const assert = async (suite: string, testName: string, fn: () => Promise<void>) => {
    try {
      await fn();
      results.push({ suite, testName, passed: true });
      console.log(`  ✓ [${suite}] ${testName}`);
    } catch (err: any) {
      results.push({ suite, testName, passed: false, error: err.message });
      console.error(`  ✗ [${suite}] ${testName}: ${err.message}`);
    }
  };

  // 1. Authentication & User Repository Tests
  await assert("Auth", "User creation & lookup by username", async () => {
    const testUsername = `test_admin_${Date.now()}`;
    const user = await userRepository.createUser({
      username: testUsername,
      email: `${testUsername}@bilalhospital.com`,
      passwordHash: "argon2_hashed_secret",
      fullName: "Test Admin User",
      role: "ADMIN",
      isActive: true,
    });
    testAdminId = user._id;
    if (!user._id) throw new Error("User _id was not generated.");

    const found = await userRepository.findByUsername(testUsername);
    if (!found || found.fullName !== "Test Admin User") {
      throw new Error("Failed to retrieve user by username.");
    }
  });

  // 2. Patient Registration & Search Tests
  await assert("Patients", "Patient registration & multi-field search", async () => {
    const patientName = `Test Patient ${Date.now()}`;
    const patient = await patientRepository.createPatient({
      fullName: patientName,
      gender: "Female",
      age: 29,
      phone: "03009998877",
      createdBy: testAdminId,
    });
    testPatient = patient;

    if (!patient._id) throw new Error("Patient _id was not generated.");

    const foundByMr = await patientRepository.findByMrNumber(patient.mrNumber);
    if (!foundByMr) throw new Error("Patient not found by MR number.");

    const searchResults = await patientRepository.searchPatients(patientName);
    if (searchResults.length === 0) throw new Error("Patient search returned zero results.");

    await validatePatientExists(patient._id.toString());
  });

  // 3. Visit Encounter Tests
  await assert("Visits", "Visit check-in & status updates", async () => {
    const visitNum = `VIS-TEST-${Date.now()}`;
    const visit = await visitRepository.createVisit({
      visitNumber: visitNum,
      patientId: testPatient._id,
      consultantId: "",
      department: "Cardiology",
      consultationFee: 2000,
      amountReceived: 2000,
      paymentMethod: "CASH",
      receptionistId: testAdminId,
      status: "REGISTERED",
    });
    testVisit = visit;

    if (!visit._id) throw new Error("Visit _id was not generated.");

    const updated = await visitRepository.updateStatus(visit._id.toString(), "WITH_CONSULTANT");
    if (!updated || updated.status !== "WITH_CONSULTANT") {
      throw new Error("Failed to update visit status.");
    }

    await validateVisitExists(visit._id.toString());
  });

  // 4. Digital Prescription Tests
  await assert("Prescriptions", "Issuing prescription with embedded line items", async () => {
    const rx = await prescriptionRepository.createPrescription({
      patientId: testPatient._id,
      visitId: testVisit._id,
      consultantId: testVisit.consultantId,
      diagnosis: "Essential Hypertension",
      isDispensed: false,
      items: [
        {
          medicineName: "Tab. Softavas 5mg",
          dosage: "5mg",
          frequency: "1-0-0",
          duration: "30 Days",
        },
      ],
    });

    if (!rx._id || rx.items.length !== 1) {
      throw new Error("Prescription embedding failed.");
    }
  });

  // 5. Diagnostic Lab Order & Versioned Report Tests
  await assert("Lab", "Creating lab order & adding versioned reports", async () => {
    const orderNum = `LAB-TEST-${Date.now()}`;
    const order = await labRepository.createLabOrder({
      orderNumber: orderNum,
      patientId: testPatient._id,
      visitId: testVisit._id,
      consultantId: testVisit.consultantId,
      testCategory: "Haematology",
      priority: "NORMAL",
      status: "ORDERED",
      totalFee: 1500,
      items: [{ testName: "CBC", testCode: "CBC-01", unitPrice: 1500 }],
    });

    if (!order._id) throw new Error("LabOrder _id was not generated.");

    const report = await labRepository.createOrUpdateLabReport({
      labOrderId: order._id as any,
      currentVersion: 1,
      isAccepted: false,
      versions: [
        {
          versionNumber: 1,
          structuredResult: JSON.stringify({ hb: "13.5 g/dL" }),
          performedBy: "Lab Tech 1",
          createdAt: new Date(),
        },
      ],
    });

    if (!report._id || report.versions.length !== 1) {
      throw new Error("LabReport versioning failed.");
    }
  });

  // 6. Financial Cash Ledger & Aggregations Tests
  await assert("Finance", "Cash transaction & daily closing aggregation pipeline", async () => {
    const txnNum = `TXN-TEST-${Date.now()}`;
    await cashRepository.createTransaction({
      transactionNumber: txnNum,
      transactionType: "INCOME",
      category: "Consultation Fee",
      department: "Cardiology",
      amount: 2500,
      paymentMethod: "CASH",
      description: "Test Cash Entry",
      createdById: testAdminId,
      transactionDate: new Date(),
    });

    const summary = await calculateDailyCashSummary(new Date());
    if (summary.totalIncome <= 0) {
      throw new Error("Financial aggregation pipeline failed to sum income.");
    }
  });

  console.log("=================================================");
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`[Test Results] ${passedCount}/${results.length} Test Suites PASSED.`);
  console.log("=================================================");

  return results;
}

if (require.main === module) {
  runApplicationTests()
    .then((results) => {
      if (results.some((result) => !result.passed)) process.exitCode = 1;
    })
    .catch((error) => {
      console.error("[Test Suite Error]:", error);
      process.exitCode = 1;
    });
}
