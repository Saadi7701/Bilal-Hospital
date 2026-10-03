import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { LabTemplateDef } from "./labTemplateRegistry";
import { EvaluatedParameterResult } from "./labTemplateEngine";

export interface LabReportPrintData {
  reportId: string;
  orderNumber: string;
  patientName: string;
  mrNumber: string;
  age: number;
  gender: string;
  cnic?: string;
  phone?: string;
  admissionId?: string;
  consultantName: string;
  testCategory: string;
  testName: string;
  sampleDate: string;
  reportDate: string;
  technicianName: string;
  pathologistName?: string;
  template: LabTemplateDef;
  evaluatedResults: EvaluatedParameterResult[];
  remarks?: string;
  interpretationNotes?: string;
  versionNumber: number;
}

export class LabPdfReportGenerator {
  /**
   * Generates a PDF buffer using jsPDF matching Bilal Hospital official format.
   */
  public generatePdfBuffer(data: LabReportPrintData): Buffer {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. HOSPITAL HEADER BANNER
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 28, "F");

    doc.setTextColor(245, 158, 11); // amber-500
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("BILAL HOSPITAL MANAGEMENT SYSTEM", 12, 10);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("PATHOLOGY & DIAGNOSTIC LABORATORY SERVICES", 12, 16);
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    doc.text("Main GT Road, Rawalpindi / Islamabad | Tel: (051) 111-555-999 | Web: bilalhospital.com", 12, 22);

    // Header Right Badge
    doc.setFillColor(245, 158, 11);
    doc.roundedRect(pageWidth - 55, 6, 45, 16, 2, 2, "F");
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("LABORATORY REPORT", pageWidth - 32.5, 13, { align: "center" });
    doc.setFontSize(7);
    doc.text(`VER. ${data.versionNumber} | ${data.reportId}`, pageWidth - 32.5, 18, { align: "center" });

    // 2. PATIENT DEMOGRAPHICS & ORDER BOX
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(10, 32, pageWidth - 20, 26, 2, 2, "FD");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);

    // Row 1
    doc.text("PATIENT NAME:", 14, 38);
    doc.setFont("helvetica", "normal");
    doc.text(data.patientName.toUpperCase(), 40, 38);

    doc.setFont("helvetica", "bold");
    doc.text("MRN (MEDICAL REC #):", 110, 38);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text(data.mrNumber, 152, 38);
    doc.setTextColor(15, 23, 42);

    // Row 2
    doc.setFont("helvetica", "bold");
    doc.text("AGE / GENDER:", 14, 44);
    doc.setFont("helvetica", "normal");
    doc.text(`${data.age} Yrs / ${data.gender}`, 40, 44);

    doc.setFont("helvetica", "bold");
    doc.text("ADMISSION NO / ID:", 110, 44);
    doc.setFont("helvetica", "normal");
    doc.text(data.admissionId || "OPD", 152, 44);

    // Row 3
    doc.setFont("helvetica", "bold");
    doc.text("CONSULTANT:", 14, 50);
    doc.setFont("helvetica", "normal");
    doc.text(data.consultantName, 40, 50);

    doc.setFont("helvetica", "bold");
    doc.text("LAB ORDER NO:", 110, 50);
    doc.setFont("helvetica", "normal");
    doc.text(data.orderNumber, 152, 50);

    // Row 4
    doc.setFont("helvetica", "bold");
    doc.text("SAMPLE DATE:", 14, 55);
    doc.setFont("helvetica", "normal");
    doc.text(data.sampleDate, 40, 55);

    doc.setFont("helvetica", "bold");
    doc.text("REPORT DATE:", 110, 55);
    doc.setFont("helvetica", "normal");
    doc.text(data.reportDate, 152, 55);

    // 3. TEST TITLE SECTION
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(data.testName.toUpperCase(), pageWidth / 2, 64, { align: "center" });

    doc.setLineWidth(0.5);
    doc.setDrawColor(245, 158, 11);
    doc.line(10, 66, pageWidth - 10, 66);

    // 4. PARAMETERS TABLE
    const tableRows = data.evaluatedResults.map((r) => [
      r.section ? `[${r.section}] ${r.name}` : r.name,
      r.flag !== "NORMAL" ? `${r.value} (${r.flag})` : r.value,
      r.unit || "-",
      r.referenceRange || "Normal",
    ]);

    autoTable(doc, {
      startY: 68,
      margin: { left: 10, right: 10 },
      head: [["Test Parameter", "Result / Value", "Unit", "Biological Reference Range"]],
      body: tableRows,
      theme: "grid",
      headStyles: {
        fillColor: [30, 41, 59], // slate-800
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [15, 23, 42],
      },
      didParseCell: (hookData) => {
        // Highlight abnormal rows
        if (hookData.section === "body" && hookData.column.index === 1) {
          const text = hookData.cell.text.join("");
          if (text.includes("HIGH") || text.includes("LOW") || text.includes("CRITICAL") || text.includes("ABNORMAL")) {
            hookData.cell.styles.textColor = [225, 29, 72]; // rose-600
            hookData.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;

    // 5. REMARKS & INTERPRETATION
    if (data.remarks || data.template.interpretationNotes) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("TECHNICIAN REMARKS & CLINICAL INTERPRETATION:", 10, finalY);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      const remarkText = data.remarks || data.template.interpretationNotes || "";
      const splitRemarks = doc.splitTextToSize(remarkText, pageWidth - 20);
      doc.text(splitRemarks, 10, finalY + 4);
    }

    // 6. FOOTER SIGNATURE & COMPUTER VERIFIED STAMP
    const footerY = 268;

    doc.setDrawColor(226, 232, 240);
    doc.line(10, footerY - 12, pageWidth - 10, footerY - 12);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 116, 139);
    doc.text("Note: This is an official computer generated laboratory report duly verified by Pathologist. Signature not required.", 10, footerY - 6);

    // Signatures
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    doc.text("Lab Technician", 15, footerY);
    doc.setFont("helvetica", "normal");
    doc.text(data.technicianName, 15, footerY + 4);

    doc.setFont("helvetica", "bold");
    doc.text("Consultant Pathologist", pageWidth - 60, footerY);
    doc.setFont("helvetica", "normal");
    doc.text(data.pathologistName || "Dr. Khalid Hassan (M.Phil, FCPS)", pageWidth - 60, footerY + 4);

    // Convert PDF to Node Buffer
    const arrayBuffer = doc.output("arraybuffer");
    return Buffer.from(arrayBuffer);
  }

  /**
   * Generates a clean HTML print preview representation.
   */
  public generateHtmlReport(data: LabReportPrintData): string {
    const rowsHtml = data.evaluatedResults
      .map(
        (r) => `
      <tr class="${r.flag !== "NORMAL" ? "bg-rose-50 font-semibold text-rose-700" : ""}">
        <td class="py-2 px-3 border border-slate-200">${r.section ? `<span class="text-slate-400 text-xs font-mono">[${r.section}]</span> ` : ""}${r.name}</td>
        <td class="py-2 px-3 border border-slate-200 font-mono ${r.flag !== "NORMAL" ? "font-bold text-rose-600" : "font-bold text-slate-900"}">
          ${r.value} ${r.flag !== "NORMAL" ? `<span class="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold uppercase">${r.flag}</span>` : ""}
        </td>
        <td class="py-2 px-3 border border-slate-200 text-slate-500 font-mono">${r.unit || "-"}</td>
        <td class="py-2 px-3 border border-slate-200 text-slate-600 font-mono">${r.referenceRange || "Normal"}</td>
      </tr>
    `
      )
      .join("");

    return `
      <div class="max-w-4xl mx-auto bg-white p-8 border border-slate-200 shadow-xl rounded-2xl text-slate-900 font-sans text-xs">
        <!-- HEADER -->
        <div class="flex justify-between items-start border-b-2 border-amber-500 pb-4 mb-4">
          <div>
            <div class="text-xs font-bold uppercase tracking-wider text-amber-600">Bilal Hospital Management System</div>
            <h1 class="text-2xl font-black text-slate-900">PATHOLOGY DIAGNOSTIC REPORT</h1>
            <p class="text-[11px] text-slate-500">Main GT Road, Rawalpindi / Islamabad | Tel: (051) 111-555-999</p>
          </div>
          <div class="text-right">
            <span class="inline-block px-3 py-1 bg-amber-500 text-slate-950 font-black rounded-lg text-xs tracking-wider">VERIFIED REPORT</span>
            <div class="text-[10px] font-mono text-slate-400 mt-1">ID: ${data.reportId} | Ver: v${data.versionNumber}</div>
          </div>
        </div>

        <!-- DEMOGRAPHICS BANNER -->
        <div class="grid grid-cols-2 gap-x-6 gap-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 font-mono text-[11px]">
          <div><span class="font-bold text-slate-500">PATIENT NAME:</span> <strong class="text-slate-900 font-sans text-sm">${data.patientName}</strong></div>
          <div><span class="font-bold text-slate-500">MRN (PATIENT ID):</span> <strong class="text-amber-600 font-bold">${data.mrNumber}</strong></div>
          <div><span class="font-bold text-slate-500">AGE / GENDER:</span> ${data.age} Yrs / ${data.gender}</div>
          <div><span class="font-bold text-slate-500">ADMISSION NO:</span> ${data.admissionId || "OPD"}</div>
          <div><span class="font-bold text-slate-500">CONSULTANT:</span> ${data.consultantName}</div>
          <div><span class="font-bold text-slate-500">LAB ORDER NO:</span> ${data.orderNumber}</div>
          <div><span class="font-bold text-slate-500">SAMPLE DATE:</span> ${data.sampleDate}</div>
          <div><span class="font-bold text-slate-500">REPORT DATE:</span> ${data.reportDate}</div>
        </div>

        <!-- TEST TITLE -->
        <div class="text-center font-black text-base text-slate-900 uppercase tracking-wide my-4 border-y border-amber-200 py-2 bg-amber-50/50">
          ${data.testName}
        </div>

        <!-- TABLE -->
        <table class="w-full text-left border-collapse my-4 border border-slate-200 text-xs">
          <thead>
            <tr class="bg-slate-900 text-white font-bold uppercase text-[10px]">
              <th class="py-2.5 px-3 border border-slate-800">Test Parameter</th>
              <th class="py-2.5 px-3 border border-slate-800">Observed Result</th>
              <th class="py-2.5 px-3 border border-slate-800">Unit</th>
              <th class="py-2.5 px-3 border border-slate-800">Biological Reference Interval</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- REMARKS -->
        ${
          data.remarks || data.template.interpretationNotes
            ? `
          <div class="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div class="font-bold text-slate-700 mb-1">Technician Remarks & Interpretation:</div>
            <p class="text-slate-600 leading-relaxed">${data.remarks || data.template.interpretationNotes}</p>
          </div>
        `
            : ""
        }

        <!-- FOOTER -->
        <div class="mt-8 pt-4 border-t border-slate-200 flex justify-between items-end text-slate-500 text-[10px]">
          <div>
            <div class="font-bold text-slate-800">Prepared By:</div>
            <div>${data.technicianName} (Lab Technologist)</div>
          </div>
          <div class="text-center italic text-slate-400">
            Computer generated verified report. Signature not required.
          </div>
          <div class="text-right">
            <div class="font-bold text-slate-800">Verified By:</div>
            <div>${data.pathologistName || "Dr. Khalid Hassan (FCPS Pathologist)"}</div>
          </div>
        </div>
      </div>
    `;
  }
}

export const labPdfReportGenerator = new LabPdfReportGenerator();
