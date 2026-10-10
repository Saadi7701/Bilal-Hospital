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
        <td class="py-2.5 px-3 border-b border-slate-200 font-medium text-slate-900">${r.name}</td>
        <td class="py-2.5 px-3 border-b border-slate-200 font-mono ${r.flag !== "NORMAL" ? "font-bold text-rose-600" : "font-bold text-slate-900"}">
          ${r.value || "-"} ${r.flag !== "NORMAL" ? `<span class="ml-1 text-[10px] px-1 py-0.5 rounded bg-rose-100 text-rose-800 font-bold uppercase">${r.flag}</span>` : ""}
        </td>
        <td class="py-2.5 px-3 border-b border-slate-200 font-mono text-slate-700">${r.unit || "-"}</td>
        <td class="py-2.5 px-3 border-b border-slate-200 font-mono text-slate-700 whitespace-pre-line">${r.referenceRange || "Normal"}</td>
      </tr>
    `
      )
      .join("");

    const sectionTitle =
      data.template.sections && data.template.sections.length > 0
        ? data.template.sections[0]
        : data.testCategory || "Heamatological Parameters";

    return `
      <div class="max-w-4xl mx-auto bg-white p-8 border border-slate-300 shadow-xl rounded-2xl text-slate-900 font-sans text-xs">
        <!-- TOP DEMOGRAPHICS HEADER (Matches Official Format) -->
        <div class="flex justify-between items-start border-b border-slate-300 pb-3 mb-4 text-xs leading-relaxed">
          <div class="space-y-1">
            <div><strong class="inline-block w-24 text-slate-800">Name:</strong> <span class="font-bold text-slate-900">${data.patientName}</span></div>
            <div><strong class="inline-block w-24 text-slate-800">Age:</strong> ${data.age} Years</div>
            <div><strong class="inline-block w-24 text-slate-800">Referred By:</strong> ${data.consultantName}</div>
          </div>
          <div class="space-y-1 text-right">
            <div><strong class="inline-block w-20 text-slate-800">Gender:</strong> ${data.gender}</div>
            <div><strong class="inline-block w-20 text-slate-800">Lab No:</strong> <span class="font-mono font-bold">${data.orderNumber}</span></div>
            <div><strong class="inline-block w-20 text-slate-800">Date:</strong> <span class="font-mono">${data.reportDate}</span></div>
          </div>
        </div>

        <!-- SECTION & TEST TITLE -->
        <div class="mt-4 mb-3">
          <div class="text-sm font-black text-slate-900 uppercase tracking-wide">${sectionTitle}</div>
          <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1 border-b border-slate-200 pb-0.5">Test Name</div>
          <div class="text-sm font-black text-slate-900 border-b-2 border-slate-900 py-1 underline font-sans">
            ${data.template.name || data.testName}
          </div>
        </div>

        <!-- PARAMETERS TABLE -->
        <table class="w-full text-left border-collapse my-3 text-xs">
          <thead>
            <tr class="border-b-2 border-slate-900 font-bold uppercase text-[11px] text-slate-900 bg-slate-50/80">
              <th class="py-2.5 px-3 border-b border-slate-300">Test Name</th>
              <th class="py-2.5 px-3 border-b border-slate-300">Result</th>
              <th class="py-2.5 px-3 border-b border-slate-300">Unit</th>
              <th class="py-2.5 px-3 border-b border-slate-300">Reference Ranges</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- REMARKS & INTERPRETATION -->
        ${
          data.remarks || data.template.interpretationNotes
            ? `
          <div class="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div class="font-bold text-slate-800 mb-1">Remarks / Clinical Interpretation:</div>
            <p class="text-slate-700 leading-relaxed">${data.remarks || data.template.interpretationNotes}</p>
          </div>
        `
            : ""
        }

        <!-- FOOTER NOTIFICATION -->
        <div class="mt-8 pt-4 border-t border-slate-300 text-[11px] text-slate-600 space-y-1">
          <div class="font-semibold text-slate-800">Note: This is a computer generated report duly verified by Pathologist. It does not need signature.</div>
          <div class="italic text-slate-500 text-[10px]">(This is a verified computer generated report, does not require signature.)</div>
        </div>
      </div>
    `;
  }
}

export const labPdfReportGenerator = new LabPdfReportGenerator();
