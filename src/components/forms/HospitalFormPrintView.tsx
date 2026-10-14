import React from "react";

export interface PrintableFormProps {
  formType: "REFERRAL" | "DISCHARGE" | "ADMISSION" | "OPERATION" | "DOCTOR_NOTE";
  data: any;
  onClose?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// A4 PRINT CSS — injected into every print popup window
// ─────────────────────────────────────────────────────────────────────────────
const A4_PRINT_CSS = `
  @page { size: A4 portrait; margin: 8mm 10mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { width: 210mm; margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 9.5pt; color: #000; background: #fff; }
  .form-border { border: 1px solid #000; width: 100%; }
  .row { display: flex; }
  .row > div { flex: 1; }
  .row > div + div { border-left: 1px solid #000; }
  .cell { padding: 3px 5px; border-bottom: 1px solid #000; }
  .cell-nb { padding: 3px 5px; }
  .label { font-weight: 700; }
  .title-bar { padding: 4px; text-align: center; font-weight: 700; font-size: 10.5pt; background: #f1f1f1; border-bottom: 1px solid #000; text-transform: uppercase; letter-spacing: 0.05em; }
  .content-block { padding: 3px 5px; border-bottom: 1px solid #000; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  th, td { padding: 2px 4px; border-right: 1px solid #000; border-bottom: 1px solid #ccc; text-align: left; }
  th { background: #f5f5f5; font-weight: 700; border-bottom: 1px solid #000; }
  td:last-child, th:last-child { border-right: none; }
  .sig-row { display: grid; grid-template-columns: 1fr 1fr 1fr; }
  .sig-cell { padding: 4px 5px; border-right: 1px solid #000; border-top: 1px solid #000; }
  .sig-cell:last-child { border-right: none; }
  .sig-line { height: 20px; border-bottom: 1px dashed #999; margin-top: 4px; }
  .checkbox { display: inline-block; width: 10px; height: 10px; border: 1px solid #000; margin-right: 3px; text-align: center; line-height: 10px; font-size: 8pt; }
  .checked::after { content: '✓'; }
  .urdu { direction: rtl; text-align: right; font-family: 'Noto Nastaliq Urdu', serif; line-height: 1.8; }
`;

// Opens a clean popup and prints exactly one A4 page
function printInWindow(html: string) {
  const win = window.open("", "_blank", "width=860,height=1120,scrollbars=yes");
  if (!win) { alert("Please allow popups for this site to print."); return; }
  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><title>Bilal Hospital</title>
<style>${A4_PRINT_CSS}</style></head>
<body>${html}
<script>window.onload=function(){setTimeout(function(){window.print();window.close();},400);};<\/script>
</body></html>`);
  win.document.close();
}

export function printPrintableForm(formType: PrintableFormProps["formType"], data: any) {
  const patient = data?.patient || {};
  const medicines = data?.medicines || [];

  let html = "";
  if (formType === "REFERRAL") html = buildReferralHtml(data, patient, medicines);
  if (formType === "DISCHARGE") html = buildDischargeHtml(data, patient, medicines);
  if (formType === "ADMISSION") html = buildAdmissionHtml(data, patient);
  if (formType === "OPERATION") html = buildOperationHtml(data, patient);
  if (formType === "DOCTOR_NOTE") html = buildDoctorNoteHtml(data, patient);

  if (html) {
    printInWindow(html);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML Builders — one per form type
// ─────────────────────────────────────────────────────────────────────────────

function buildReferralHtml(data: any, patient: any, medicines: any[]): string {
  const meds = medicines.length > 0 ? medicines : [{}, {}, {}, {}];
  const rows = meds.map((m: any, i: number) => `
    <tr>
      ${i === 0 ? `<td rowspan="${meds.length}" style="text-align:center;font-weight:700;font-size:7.5pt;writing-mode:vertical-rl;transform:rotate(180deg);border-bottom:none">Treatment Given</td>` : ""}
      <td style="text-align:center;font-weight:700">${i + 1}</td>
      <td>${m.medicine || ""}</td><td>${m.dose || ""}</td><td>${m.route || ""}</td>
      <td>${m.frequency || ""}</td><td>${m.timing || ""}</td><td style="border-right:none">${m.duration || ""}</td>
    </tr>`).join("");
  return `<div class="form-border">
  <div class="title-bar">REFERRAL FORM (File Record Copy)</div>
  <div class="row"><div class="cell"><span class="label">MR Number:</span> ${patient.mrNumber||data.mrNumber||""}</div><div class="cell"><span class="label">Date:</span> ${data.formDate?new Date(data.formDate).toLocaleDateString():""}</div></div>
  <div class="row"><div class="cell"><span class="label">Patient Name:</span> ${patient.fullName||data.patientName||""}</div><div class="cell"><span class="label">Date of Admission:</span> ${data.dateOfAdmission?new Date(data.dateOfAdmission).toLocaleDateString():""}</div></div>
  <div class="row"><div class="cell"><span class="label">S/o, D/o, W/o:</span> ${patient.fatherHusbandName||""}</div><div class="cell"><span class="label">Age/Sex:</span> ${patient.age||""} Y / ${patient.gender||""}</div></div>
  <div class="content-block"><span class="label">Presenting Complaint:</span><br/>${data.presentingComplaint||""}</div>
  <div class="content-block"><span class="label">Provisional Diagnosis:</span><br/>${data.provisionalDiagnosis||""}</div>
  <div class="content-block"><span class="label">Brief History &amp; Examination:</span><br/>${data.briefHistoryExamination||""}</div>
  <div class="content-block"><span class="label">Investigations Results:</span><br/>${data.investigationsResults||""}</div>
  <div class="content-block"><span class="label">Diagnosis:</span><br/>${data.diagnosis||""}</div>
  <div class="row" style="border-bottom:1px solid #000">
    <div class="cell-nb"><span class="label">PROCEDURE DONE:</span> ${data.procedureDone||""}</div>
    <div class="cell-nb"><span class="label">Condition at Refer:</span>
      <span class="checkbox ${data.conditionAtRefer==='Satisfactory'?'checked':''}"></span>Satisfactory
      <span class="checkbox ${data.conditionAtRefer==='Fair'?'checked':''}"></span>Fair
      <span class="checkbox ${data.conditionAtRefer==='Poor'?'checked':''}"></span>Poor
    </div>
  </div>
  <div style="border-bottom:1px solid #000">
    <div style="padding:2px 5px;font-weight:700;background:#fafafa;border-bottom:1px solid #000">Referral Notes</div>
    <table><thead><tr><th style="width:28px"></th><th style="width:22px">Sr.</th><th>Medicine</th><th>Dose</th><th>Route</th><th>Frequency</th><th>Timing</th><th style="border-right:none">Duration</th></tr></thead><tbody>${rows}</tbody></table>
  </div>
  <div class="content-block"><span class="label">Hospital to be Referred:</span> ${data.referredHospitalName||""}</div>
  <div class="content-block"><span class="label">Reason of Refer:</span><br/>${data.reasonForReferral||""}</div>
  <div class="sig-row">
    <div class="sig-cell"><span class="label">Doctor Name:</span><div style="margin-top:4px">${data.doctorName||""}</div></div>
    <div class="sig-cell"><span class="label">Sign:</span><div class="sig-line"></div></div>
    <div class="sig-cell"><div style="display:flex;justify-content:space-between"><span class="label">Date:</span><span>${data.signDate?new Date(data.signDate).toLocaleDateString():new Date().toLocaleDateString()}</span></div><div style="display:flex;justify-content:space-between;margin-top:4px"><span class="label">Time:</span><span>${data.signTime||new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span></div></div>
  </div>
</div>`;
}

function buildDischargeHtml(data: any, patient: any, medicines: any[]): string {
  const meds = medicines.length > 0 ? medicines : [{},{},{},{},{}];
  const rows = meds.map((m: any, i: number) => `
    <tr><td style="text-align:center;font-weight:700">${i+1}</td><td>${m.medicine||""}</td><td>${m.dose||""}</td><td>${m.route||""}</td><td>${m.frequency||""}</td><td>${m.timing||""}</td><td style="border-right:none">${m.duration||""}</td></tr>`).join("");
  return `<div class="form-border">
  <div class="title-bar">DISCHARGE FORM (File Record Copy)</div>
  <div class="row"><div class="cell"><span class="label">MR Number:</span> ${patient.mrNumber||data.mrNumber||""}</div><div class="cell"><span class="label">Date:</span> ${data.formDate?new Date(data.formDate).toLocaleDateString():""}</div></div>
  <div class="row"><div class="cell"><span class="label">Patient Name:</span> ${patient.fullName||data.patientName||""}</div><div class="cell"><span class="label">Date of Admission:</span> ${data.dateOfAdmission?new Date(data.dateOfAdmission).toLocaleDateString():""}</div></div>
  <div class="row"><div class="cell"><span class="label">S/o, D/o, W/o:</span> ${patient.fatherHusbandName||""}</div><div class="cell"><span class="label">Age/Sex:</span> ${patient.age||""} Y / ${patient.gender||""}</div></div>
  <div class="content-block"><span class="label">Presenting Complaint:</span><br/>${data.presentingComplaint||""}</div>
  <div class="content-block"><span class="label">Brief History &amp; Examination:</span><br/>${data.briefHistoryExamination||""}</div>
  <div class="content-block"><span class="label">Diagnostic Investigations:</span><br/>${data.diagnosticInvestigations||""}</div>
  <div class="row" style="border-bottom:1px solid #000"><div class="cell-nb" style="padding:3px 5px"><span class="label">Diagnosis:</span><br/>${data.diagnosis||""}</div><div class="cell-nb" style="padding:3px 5px"><span class="label">Procedure / Outcome:</span><br/>${data.procedureDone||""} ${data.outcome?`(${data.outcome})`:""}</div></div>
  <div style="border-bottom:1px solid #000">
    <div class="title-bar" style="font-size:9pt">DISCHARGE NOTES</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;border-bottom:1px solid #000;padding:3px 5px;font-size:8.5pt">
      <div>
        <div><span class="checkbox ${data.dischargeAdvisedByDoctor?'checked':''}"></span><b>Discharge advised by Doctor</b></div>
        <div><span class="checkbox ${data.isLAMA?'checked':''}"></span><b>LAMA</b></div>
      </div>
      <div><b>Date of Discharge:</b><br/>${data.dischargeDate?new Date(data.dischargeDate).toLocaleDateString():"....... / ....... / ......."}</div>
      <div><b>Condition on Discharge:</b><br/>
        <span class="checkbox ${data.dischargeCondition==='Satisfactory'?'checked':''}"></span>Satisfactory
        <span class="checkbox ${data.dischargeCondition==='Fair'?'checked':''}"></span>Fair
        <span class="checkbox ${data.dischargeCondition==='Poor'?'checked':''}"></span>Poor
      </div>
    </div>
    <div style="padding:2px 5px;font-weight:700;background:#fafafa;border-bottom:1px solid #000;text-align:center">Medication Given on Discharge</div>
    <table><thead><tr><th style="width:22px">Sr.</th><th>Medicine</th><th>Dose</th><th>Route</th><th>Frequency</th><th>Timing</th><th style="border-right:none">Duration</th></tr></thead><tbody>${rows}</tbody></table>
  </div>
  <div style="padding:4px 5px;text-align:right;border-bottom:1px solid #000" class="urdu">
    <p style="font-size:8.5pt;font-weight:700;margin:2px 0">درج ذیل تاریخ کو ہسپتال ہذا کے درج ذیل ڈیپارٹمنٹ میں معائنہ کیلئے تشریف لائیے۔</p>
    <div style="display:flex;justify-content:space-between;font-size:8pt"><span><b>تاریخ معائنہ:</b> ${data.followUpDate?new Date(data.followUpDate).toLocaleDateString():"_________________"}</span><span><b>ڈیپارٹمنٹ:</b> ${data.followUpDepartment||"_________________"}</span></div>
    <div style="font-size:8pt;margin-top:2px"><b>ہدایات برائے خوراک:</b> ${data.dietaryInstructions||"____________________________________________________________________"}</div>
  </div>
  <div class="sig-row">
    <div class="sig-cell"><span class="label">Doctor Name:</span><div style="margin-top:4px">${data.doctorName||""}</div></div>
    <div class="sig-cell"><span class="label">Sign:</span><div class="sig-line"></div></div>
    <div class="sig-cell"><div style="display:flex;justify-content:space-between"><span class="label">Date:</span><span>${data.signDate?new Date(data.signDate).toLocaleDateString():new Date().toLocaleDateString()}</span></div><div style="display:flex;justify-content:space-between;margin-top:4px"><span class="label">Time:</span><span>${data.signTime||new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span></div></div>
  </div>
</div>`;
}

function buildAdmissionHtml(data: any, patient: any): string {
  return `<div class="form-border">
  <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 6px;border-bottom:1px solid #000;background:#fafafa">
    <strong style="font-size:10.5pt">BILAL HOSPITAL ADMISSION FORM</strong>
    <span>PHC Reg: # R-<u>${data.phcRegNumber||"________"}</u></span>
  </div>
  <div class="row"><div class="cell"><span class="label">Medical Record Number (MR):</span> <strong>${patient.mrNumber||data.mrNumber||""}</strong></div><div class="cell" style="display:flex;gap:10px;flex-wrap:wrap"><span><span class="label">DoA:</span> ${data.dateOfAdmission?new Date(data.dateOfAdmission).toLocaleDateString():""}</span><span><span class="label">ToA:</span> ${data.timeOfAdmission||""}</span></div></div>
  <div class="row"><div class="cell"><span class="label">Patient Name:</span> <strong>${patient.fullName||data.patientName||""}</strong></div><div class="cell"><span class="label">Age/Sex:</span> ${patient.age||""} Y / ${patient.gender||""}</div></div>
  <div class="row"><div class="cell"><span class="label">Marital Status:</span> ${data.maritalStatus||"Unspecified"}</div><div class="cell"><span class="label">CNIC:</span> <strong style="font-family:monospace;letter-spacing:1px">${patient.cnic||data.cnic||"_____ - _______ - _"}</strong></div></div>
  <div class="cell"><span class="label">S/o, D/o, W/o or Spouse Name:</span> ${patient.fatherHusbandName||""}</div>
  <div class="cell"><span class="label">Address:</span> ${patient.address||""}</div>
  <div class="cell"><span class="label">Contact: Mobile / Landline:</span> <span style="font-family:monospace">${patient.phone||""}</span></div>
  <div class="row"><div class="cell" style="min-height:30px"><span class="label">Provisional Diagnosis:</span><br/>${data.provisionalDiagnosis||""}</div><div class="cell" style="min-height:30px"><span class="label">Final Diagnosis:</span><br/>${data.finalDiagnosis||""}</div></div>
  <div class="row" style="border-bottom:1px solid #000">
    <div class="cell-nb" style="padding:3px 5px"><span class="label">Admitted through:</span><br/>
      <span class="checkbox ${data.admittedThrough==='OPD'?'checked':''}"></span>OPD
      <span class="checkbox ${data.admittedThrough==='Emergency'?'checked':''}"></span>Emergency<br/>
      <span style="font-size:8.5pt"><b>OPD/ER MR No.:</b> ${data.opdErMrNo||""}</span>
    </div>
    <div class="cell-nb" style="padding:3px 5px"><span class="label">Date of Discharge/Refer (DoD/R):</span> ${data.dateOfDischargeRefer?new Date(data.dateOfDischargeRefer).toLocaleDateString():"_______"}<br/><span class="label">Time (ToD/R):</span> ${data.timeOfDischargeRefer||"_______"}</div>
  </div>
  <div style="padding:5px 6px" class="urdu">
    <div style="border-bottom:1px solid #000;padding-bottom:3px;text-align:center"><h3 style="font-size:9.5pt;margin:2px 0;font-weight:700">رضامندی فارم منجانب مریضاں ولواحقین مع قواعد و ضوابط ہسپتال</h3></div>
    <p style="font-size:7.5pt;line-height:1.6;margin:3px 0">میں امیرامریض /علاج کی غرض سے ہسپتال ہذا میں آیا/آئی/لایا/لائی ہوں۔ اس سلسلے میں معائنے/تشخیص کے لیے درکار کارروائی اور داخلے کی اجازت دیتا/دیتی ہوں اور یہ کہ اس دوران کسی بھی قسم کی پیچیدگی پیش آنے کی صورت میں ہسپتال کا عملہ یا ڈاکٹر ہرگز ذمہ دار نہیں ہوگا۔ مجھے ہسپتال میں داخلے کی ضرورت کے بارے میں باقاعدہ طور پر آگاہ کر دیا گیا ہے۔ میں نے بیماری سے متعلق تمام مطلوبہ معلومات متعلقہ ہسپتال/معالج کو باضابطہ طور پر فراہم کر دی ہیں۔</p>
    <p style="font-size:7.5pt;line-height:1.6;margin:3px 0">مجھے علاج کے ممکنہ دورانیے اور تخمینے کے بارے میں بتا دیا گیا ہے۔ میں اس بات کی باقاعدہ اجازت دیتا/دیتی ہوں کہ میری بیماری سے متعلق معلومات ضرورت کے مطابق متعلقہ مجاز اداروں کو مہیا کی جا سکتی ہیں۔ میں ہسپتال کے قوانین کی پابندی کروں گا/گی۔</p>
    <div style="font-size:7.5pt;font-weight:700">
      <p style="margin:2px 0">٭ میں اپنی قیمتی اشیاء خصوصاً سونا، چاندی، موبائل وغیرہ کی حفاظت خود کروں گا/گی اور مشتبہ افراد سے ہوشیار رہوں گا/گی۔</p>
      <p style="margin:2px 0">٭ میں نہ ہی کسی دوسرے سے کوئی چیز لے کر کھاؤں گا/گی اور نہ ہی کوئی آتش گیر مادہ، اسلحہ وغیرہ لے کر آؤں گا/گی۔</p>
    </div>
    <div style="padding-top:8px;border-top:1px solid #999;display:flex;justify-content:space-between;font-size:8.5pt;font-weight:700">
      <span>نام مریض / قریبی رشتہ دار: <u>${data.consentName||patient.fullName||"________________________"}</u>${data.consentRelation?` (${data.consentRelation})`:""}</span>
      <span>دستخط: ____________________________________</span>
    </div>
  </div>
</div>`;
}

function buildOperationHtml(data: any, patient: any): string {
  return `<div class="form-border">
  <div class="row"><div class="cell"><span class="label">MR Number:</span> <strong>${patient.mrNumber||data.mrNumber||""}</strong></div><div class="cell"><span class="label">Date:</span> ${data.operationDate?new Date(data.operationDate).toLocaleDateString():""}</div></div>
  <div class="row"><div class="cell"><span class="label">Patient Name:</span> <strong>${patient.fullName||data.patientName||""}</strong></div><div class="cell"><span class="label">Time:</span> ${data.operationTime||""}</div></div>
  <div class="title-bar">OPERATION NOTES</div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;border-bottom:1px solid #000">
    <div class="cell"><span class="label">Surgeon:</span><br/>${data.surgeonName||""}</div>
    <div class="cell"><span class="label">Assistant / Team:</span><br/>${data.assistantTeamName||""}</div>
    <div class="cell"><span class="label">Anesthetist:</span><br/>${data.anesthetistName||""}</div>
    <div class="cell" style="border-right:none"><span class="label">Anesthesia Type:</span><br/>${data.anesthesiaType||""}</div>
  </div>
  <div class="content-block"><span class="label">Incision:</span> ${data.incision||""}</div>
  <div class="content-block"><span class="label">Procedure:</span><br/>${data.procedureDetails||""}</div>
  <div class="content-block"><span class="label">Findings:</span><br/>${data.findings||""}</div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;border-bottom:1px solid #000;font-size:8.5pt">
    <div class="cell"><span class="label">Drain:</span><br/>${data.drain||"-"}</div>
    <div class="cell"><span class="label">Specimen Removed:</span><br/>${data.specimenRemoved||"-"}</div>
    <div class="cell" style="border-right:none"><span class="label">Histopathology:</span><br/>${data.histopathology||"-"}</div>
    <div class="cell"><span class="label">Blood Loss:</span><br/>${data.bloodLoss||"-"}</div>
    <div class="cell"><span class="label">Transfusion:</span><br/>${data.transfusion||"N"}</div>
    <div class="cell" style="border-right:none"><span class="label">Uneventful Development:</span><br/>${data.uneventfulDevelopment||"-"}</div>
  </div>
  <div class="content-block"><span class="label">Condition at end of Surgery:</span> ${data.conditionAtEnd||""}</div>
  <div style="border-bottom:1px solid #000">
    <div class="title-bar" style="font-size:9pt">POST-OPERATIVE ORDER</div>
    <div style="padding:5px;white-space:pre-wrap;line-height:1.5;min-height:60px">${data.postOpOrders||""}</div>
  </div>
  <div class="sig-row">
    <div class="sig-cell"><span class="label">Surgeon Name:</span><div style="margin-top:4px">${data.surgeonName||""}</div></div>
    <div class="sig-cell"><span class="label">Sign:</span><div class="sig-line"></div></div>
    <div class="sig-cell"><div style="display:flex;justify-content:space-between"><span class="label">Date:</span><span>${data.signDate?new Date(data.signDate).toLocaleDateString():new Date().toLocaleDateString()}</span></div><div style="display:flex;justify-content:space-between;margin-top:4px"><span class="label">Time:</span><span>${data.signTime||new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span></div></div>
  </div>
</div>`;
}

function buildDoctorNoteHtml(data: any, patient: any): string {
  return `<div class="form-border" style="min-height:270mm;display:flex;flex-direction:column;justify-content:space-between">
  <div>
    <div class="row"><div class="cell"><span class="label">MR Number:</span> <strong>${patient.mrNumber||data.mrNumber||""}</strong></div><div class="cell"><span class="label">Date:</span> ${data.noteDate?new Date(data.noteDate).toLocaleDateString():""}</div></div>
    <div class="row"><div class="cell"><span class="label">Patient Name:</span> <strong>${patient.fullName||data.patientName||""}</strong></div><div class="cell"><span class="label">Time:</span> ${data.noteTime||""}</div></div>
    <div class="title-bar">CONSULTANT / MO / WMO — NOTES</div>
    <div style="padding:8px;font-family:Georgia,serif;font-size:10.5pt;line-height:1.9;white-space:pre-wrap">${data.notes||""}</div>
  </div>
  <div class="sig-row">
    <div class="sig-cell"><span class="label">Doctor Name:</span><div style="margin-top:4px">${data.doctorName||""}</div></div>
    <div class="sig-cell"><span class="label">Sign:</span><div class="sig-line"></div></div>
    <div class="sig-cell"><div style="display:flex;justify-content:space-between"><span class="label">Date:</span><span>${data.signDate?new Date(data.signDate).toLocaleDateString():new Date().toLocaleDateString()}</span></div><div style="display:flex;justify-content:space-between;margin-top:4px"><span class="label">Time:</span><span>${data.signTime||new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span></div></div>
  </div>
</div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const HospitalFormPrintView: React.FC<PrintableFormProps> = ({
  formType,
  data,
  onClose,
}) => {
  const patient = data?.patient || {};
  const medicines = data?.medicines || [];

  const handlePrint = () => {
    printPrintableForm(formType, data);
  };

  return (
    <div className="bg-white text-black font-sans">
      {onClose && (
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200 print:hidden">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Form Preview — {formType.replace("_", " ")}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md inline-flex items-center gap-2"
            >
              🖨️ Print / Save as PDF (Single A4 Page)
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* On-screen compact summary preview */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded bg-brand-100 text-brand-700 font-black text-[10px] uppercase">
            {formType.replace("_", " ")}
          </span>
          <span className="font-bold text-slate-900">{patient.fullName || data.patientName || "Patient"}</span>
          <span className="font-mono text-slate-500">{patient.mrNumber || data.mrNumber || ""}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
          {data.formDate && <div><span className="font-bold">Date:</span> {new Date(data.formDate).toLocaleDateString()}</div>}
          {data.dateOfAdmission && <div><span className="font-bold">Admission:</span> {new Date(data.dateOfAdmission).toLocaleDateString()}</div>}
          {data.doctorName && <div><span className="font-bold">Doctor:</span> {data.doctorName}</div>}
          {data.diagnosis && <div><span className="font-bold">Diagnosis:</span> {data.diagnosis}</div>}
        </div>
        <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-200">
          Click <strong>🖨️ Print / Save as PDF</strong> above to open a clean A4 print window (single page, no sidebars).
        </p>
      </div>
    </div>
  );
};
