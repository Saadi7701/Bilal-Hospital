import { jsPDF } from "jspdf";

export interface UltrasoundPdfData {
  orderNumber: string;
  reportId: string;
  patientName: string;
  mrNumber: string;
  age: number;
  gender: string;
  cnic?: string;
  consultantName: string;
  examName: string;
  reportDate: string;
  versionNumber: number;
  sections: Array<{ title: string; text: string }>;
  impression: string;
}

export function generateUltrasoundPdf(data: UltrasoundPdfData): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 13;
  const right = pageWidth - 13;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 27, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("BILAL HOSPITAL", left, 11);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("DIAGNOSTIC ULTRASOUND & SONOGRAPHY", left, 18);
  doc.setFontSize(7);
  doc.text(`REPORT  ${data.reportId}  |  VERSION ${data.versionNumber}`, right, 11, { align: "right" });
  doc.text(data.reportDate, right, 18, { align: "right" });

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(left, 31, pageWidth - 26, 24, 2, 2, "FD");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("PATIENT:", left + 3, 37);
  doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize(data.patientName, 70)[0] || "—", left + 20, 37);
  doc.setFont("helvetica", "bold");
  doc.text("MRN:", 118, 37);
  doc.setFont("helvetica", "normal");
  doc.text(data.mrNumber || "—", 132, 37);
  doc.setFont("helvetica", "bold");
  doc.text("AGE / SEX:", left + 3, 44);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.age || "—"} / ${data.gender || "—"}`, left + 23, 44);
  doc.setFont("helvetica", "bold");
  doc.text("REFERRED BY:", 82, 44);
  doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize(data.consultantName || "Direct Ultrasound Request", 60)[0] || "—", 106, 44);
  doc.setFont("helvetica", "bold");
  doc.text("CNIC:", left + 3, 51);
  doc.setFont("helvetica", "normal");
  doc.text(data.cnic || "—", left + 16, 51);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(190, 24, 93);
  doc.text(data.examName.toUpperCase(), pageWidth / 2, 64, { align: "center", maxWidth: pageWidth - 30 });
  doc.setDrawColor(244, 63, 94);
  doc.line(left, 67, right, 67);

  const content = data.sections.filter((item) => item.text.trim());
  if (data.impression.trim()) content.push({ title: "IMPRESSION", text: data.impression });
  const availableHeight = pageHeight - 37 - 72;
  const usableWidth = right - left;
  const estimateLineCount = (fontSize: number) => content.reduce((count, item) => {
    doc.setFontSize(fontSize);
    const titleLines = doc.splitTextToSize(item.title, usableWidth).length;
    const textLines = doc.splitTextToSize(item.text, usableWidth).length;
    return count + titleLines + textLines + 0.6;
  }, 0);
  const fontSize = Math.max(4.5, Math.min(8.5, availableHeight / Math.max(1, estimateLineCount(8.5) * 1.12)));
  const lineHeight = fontSize * 0.42;
  let y = 73;
  doc.setTextColor(30, 41, 59);
  for (const item of content) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize + 0.4);
    const heading = doc.splitTextToSize(item.title.toUpperCase(), usableWidth);
    for (const line of heading) {
      doc.text(line, left, y);
      y += lineHeight;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(item.text, usableWidth);
    for (const line of lines) {
      if (y > pageHeight - 19) break;
      doc.text(line, left, y);
      y += lineHeight;
    }
    y += lineHeight * 0.55;
  }

  const footerY = pageHeight - 12;
  doc.setDrawColor(203, 213, 225);
  doc.line(left, footerY - 5, right, footerY - 5);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Order: ${data.orderNumber}  |  Electronically generated ultrasound report`, left, footerY);
  doc.setFont("helvetica", "bold");
  doc.text("Sonologist", right, footerY, { align: "right" });

  return Buffer.from(doc.output("arraybuffer"));
}
