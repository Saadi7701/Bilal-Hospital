import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllData() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   BILAL HOSPITAL HMS — FULL DATA RESET                   ║');
  console.log('║   Clears all patient/lab/admin records & resets MRN=0   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Delete in dependency order (children before parents)
  console.log('[1/20] Deleting LabReportVersions...');
  const lrv = await prisma.labReportVersion.deleteMany({});
  console.log(`       → ${lrv.count} deleted`);

  console.log('[2/20] Deleting LabRevisionRequests...');
  const lrr = await prisma.labRevisionRequest.deleteMany({});
  console.log(`       → ${lrr.count} deleted`);

  console.log('[3/20] Deleting LabReports...');
  const lr = await prisma.labReport.deleteMany({});
  console.log(`       → ${lr.count} deleted`);

  console.log('[4/20] Deleting LabOrderItems...');
  const loi = await prisma.labOrderItem.deleteMany({}).catch(() => ({ count: 0 }));
  console.log(`       → ${loi.count} deleted`);

  console.log('[5/20] Deleting LabOrders...');
  const lo = await prisma.labOrder.deleteMany({});
  console.log(`       → ${lo.count} deleted`);

  console.log('[6/20] Deleting UltrasoundReports...');
  const usr = await prisma.ultrasoundReport.deleteMany({});
  console.log(`       → ${usr.count} deleted`);

  console.log('[7/20] Deleting UltrasoundOrders...');
  const uso = await prisma.ultrasoundOrder.deleteMany({});
  console.log(`       → ${uso.count} deleted`);

  console.log('[8/20] Deleting PharmacyDispensings...');
  const pd = await prisma.pharmacyDispensing.deleteMany({});
  console.log(`       → ${pd.count} deleted`);

  console.log('[9/20] Deleting Prescriptions...');
  const rx = await prisma.prescription.deleteMany({});
  console.log(`       → ${rx.count} deleted`);

  console.log('[10/20] Deleting ReferralFormMedicines...');
  const rfm = await prisma.referralFormMedicine.deleteMany({}).catch(() => ({ count: 0 }));
  console.log(`        → ${rfm.count} deleted`);

  console.log('[11/20] Deleting DischargeFormMedicines...');
  const dfm = await prisma.dischargeFormMedicine.deleteMany({}).catch(() => ({ count: 0 }));
  console.log(`        → ${dfm.count} deleted`);

  console.log('[12/20] Deleting ReferralForms...');
  const rf = await prisma.referralForm.deleteMany({});
  console.log(`        → ${rf.count} deleted`);

  console.log('[13/20] Deleting DischargeForms...');
  const df = await prisma.dischargeForm.deleteMany({});
  console.log(`        → ${df.count} deleted`);

  console.log('[14/20] Deleting AdmissionForms...');
  const af = await prisma.admissionForm.deleteMany({});
  console.log(`        → ${af.count} deleted`);

  console.log('[15/20] Deleting OperationNotes...');
  const on2 = await prisma.operationNote.deleteMany({});
  console.log(`        → ${on2.count} deleted`);

  console.log('[16/20] Deleting DoctorNotes...');
  const dn = await prisma.doctorNote.deleteMany({});
  console.log(`        → ${dn.count} deleted`);

  console.log('[17/20] Deleting OTRecords...');
  const ot = await prisma.oTRecord.deleteMany({});
  console.log(`        → ${ot.count} deleted`);

  console.log('[18/20] Deleting GyneRecords...');
  const gyn = await prisma.gyneRecord.deleteMany({});
  console.log(`        → ${gyn.count} deleted`);

  console.log('[19/20] Deleting CashTransactions...');
  const cash = await prisma.cashTransaction.deleteMany({});
  console.log(`        → ${cash.count} deleted`);

  console.log('[20/20] Deleting Encounters...');
  const enc = await prisma.encounter.deleteMany({}).catch(() => ({ count: 0 }));
  console.log(`        → ${enc.count} deleted`);

  console.log('[21/21] Deleting PatientDocuments...');
  const pdoc = await prisma.patientDocument.deleteMany({}).catch(() => ({ count: 0 }));
  console.log(`        → ${pdoc.count} deleted`);

  console.log('[22/22] Deleting Consultations...');
  const cons = await prisma.consultation.deleteMany({}).catch(() => ({ count: 0 }));
  console.log(`        → ${cons.count} deleted`);

  console.log('[23/23] Deleting PatientVisits...');
  const pv = await prisma.patientVisit.deleteMany({});
  console.log(`        → ${pv.count} deleted`);

  console.log('[24/24] Deleting Patients...');
  const pts = await prisma.patient.deleteMany({});
  console.log(`        → ${pts.count} deleted`);

  console.log('\n[RESET] Resetting MrnCounter to lastMrn = 0...');
  await prisma.mrnCounter.upsert({
    where: { id: 'singleton' },
    update: { lastMrn: 0 },
    create: { id: 'singleton', lastMrn: 0 },
  });
  console.log('        → MrnCounter reset to 0. First patient will get MR-2026-0001\n');

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   ✅  ALL DATA CLEARED SUCCESSFULLY                      ║');
  console.log('║   Users, Consultants & Lab Templates preserved.          ║');
  console.log('║   Next patient MRN: MR-' + new Date().getFullYear() + '-0001                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  await prisma.$disconnect();
}

clearAllData().catch((e) => {
  console.error('\n[FATAL ERROR]:', e.message, '\n');
  console.error('Some tables may not exist yet — try running: npx prisma db push first.');
  prisma.$disconnect();
  process.exit(1);
});
