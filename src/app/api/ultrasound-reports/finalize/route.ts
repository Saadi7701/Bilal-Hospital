import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ultrasoundRepository } from "@/repositories/UltrasoundRepository";
import { localStorageService } from "@/lib/localStorageService";
import { generateUltrasoundPdf } from "@/lib/ultrasoundPdfReportGenerator";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderId = String(body.ultrasoundOrderId || body.orderId || "").trim();
    const impression = String(body.impression || "").trim();
    if (!orderId || !impression) {
      return NextResponse.json({ error: "Ultrasound order and diagnostic impression are required." }, { status: 400 });
    }

    const order = await prisma.ultrasoundOrder.findFirst({
      where: { OR: [{ id: orderId }, { legacyId: orderId }, { orderNumber: orderId }] },
    });
    if (!order) return NextResponse.json({ error: "Ultrasound order not found." }, { status: 404 });

    const patient = await prisma.patient.findUnique({ where: { id: order.patientId } });
    if (!patient) return NextResponse.json({ error: "Patient record not found for this ultrasound order." }, { status: 404 });

    const rawSections = body.sections && typeof body.sections === "object" && !Array.isArray(body.sections) ? body.sections : {};
    const sections = Object.entries(rawSections).map(([title, text]) => ({ title, text: String(text || "").trim() })).filter((item) => item.text);
    if (!sections.length && body.findings) sections.push({ title: "ULTRASOUND FINDINGS", text: String(body.findings).trim() });
    if (!sections.length) return NextResponse.json({ error: "Enter at least one ultrasound finding before submitting the report." }, { status: 400 });

    const existingReport = await ultrasoundRepository.findReportByOrderId(order.id);
    const versionNumber = existingReport ? (existingReport.currentVersion || 1) + 1 : 1;
    const reportId = `USREP-${order.orderNumber.replace(/[^a-zA-Z0-9-]/g, "")}-v${versionNumber}`;
    const reportData = {
      orderNumber: order.orderNumber,
      reportId,
      patientName: patient.fullName || order.patientName || "Patient",
      mrNumber: patient.mrNumber || order.mrNumber || "MR-0000",
      age: patient.age || 0,
      gender: patient.gender || "",
      cnic: patient.cnic || "",
      consultantName: order.consultantName || "Direct Ultrasound Request",
      examName: order.requestedExam,
      reportDate: new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", dateStyle: "medium" }).format(new Date()),
      versionNumber,
      sections,
      impression,
    };
    const pdfBuffer = generateUltrasoundPdf(reportData);
    const pdfFileName = `${reportData.mrNumber}_${order.orderNumber}_v${versionNumber}.pdf`;
    const patientIdentity = {
      id: patient.id,
      mrNumber: reportData.mrNumber,
      cnic: reportData.cnic,
      fullName: reportData.patientName,
      gender: reportData.gender,
      age: reportData.age,
      phone: patient.phone,
    };
    const savedPdf = localStorageService.saveDocument({
      patient: patientIdentity,
      admissionNumberOrId: order.visitId || "OPD",
      category: "ultrasound",
      fileName: pdfFileName,
      data: pdfBuffer,
      mimeType: "application/pdf",
    });
    const savedJson = localStorageService.saveDocument({
      patient: patientIdentity,
      admissionNumberOrId: order.visitId || "OPD",
      category: "ultrasound",
      fileName: `${reportId}.json`,
      data: JSON.stringify({ ...reportData, pdfPath: savedPdf.relativePath, finalizedAt: new Date().toISOString() }, null, 2),
      mimeType: "application/json",
    });

    await prisma.patientDocument.create({
      data: {
        patientId: patient.id,
        visitId: order.visitId || undefined,
        documentType: "ULTRASOUND",
        documentName: `${order.requestedExam} Report (${reportId})`,
        relativePath: savedPdf.relativePath,
        fileName: savedPdf.fileName,
        mimeType: "application/pdf",
        fileSize: savedPdf.fileSize,
        checksum: savedPdf.checksum,
        status: "VERIFIED",
      },
    });

    const structuredFindings = JSON.stringify({ templateCode: order.templateCode || body.templateCode || null, sections: rawSections });
    await ultrasoundRepository.createOrUpdateUltrasoundReport({
      ultrasoundOrderId: order.id,
      currentVersion: versionNumber,
      isAccepted: false,
      versions: [{
        versionNumber,
        findings: structuredFindings,
        impression,
        sonographerNotes: String(body.sonographerNotes || "").trim() || null,
        pdfUrl: savedPdf.relativePath,
        performedBy: String(body.performedBy || "Ultrasound Staff"),
      }],
    });

    const updateFields: Record<string, any> = {
      status: "SUBMITTED_TO_CONSULTANT",
      templateCode: order.templateCode || body.templateCode || null,
      attachedFileName: savedPdf.fileName,
      attachedPdfUrl: savedPdf.relativePath,
      currentVersion: versionNumber,
    };
    if (versionNumber > 1) {
      updateFields.findingsV2 = structuredFindings;
      updateFields.impressionV2 = impression;
    } else {
      updateFields.findingsV1 = structuredFindings;
      updateFields.impressionV1 = impression;
    }
    await ultrasoundRepository.updateOrderFields(order.id, updateFields);

    await prisma.auditLog.create({
      data: {
        action: "FINALIZED_ULTRASOUND_REPORT",
        entityType: "ULTRASOUND_REPORT",
        entityId: reportId,
        userName: String(body.performedBy || "Ultrasound Staff"),
        userRole: "ULTRASOUND_STAFF",
        description: `Finalized ${order.requestedExam} report for MRN ${reportData.mrNumber}`,
        status: "SUCCESS",
      },
    });

    return NextResponse.json({ message: "Ultrasound report saved and attached to the patient record.", reportId, versionNumber, pdfFileName: savedPdf.fileName, pdfPath: savedPdf.relativePath, jsonPath: savedJson.relativePath });
  } catch (error: any) {
    console.error("[Finalize Ultrasound Report API Error]:", error);
    return NextResponse.json({ error: `Failed to finalize ultrasound report: ${error?.message || String(error)}` }, { status: 500 });
  }
}
