import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { labRepository } from "@/repositories/LabRepository";
import { patientRepository } from "@/repositories/PatientRepository";
import { localStorageService } from "@/lib/localStorageService";
import { labTemplateEngine } from "@/lib/labTemplateEngine";
import { labPdfReportGenerator } from "@/lib/pdfReportGenerator";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { labOrderId, resultsJson, remarks, technicianName, isVersion2 } = body;

    if (!labOrderId || !resultsJson) {
      return NextResponse.json({ error: "Lab Order ID and Results JSON are required." }, { status: 400 });
    }

    // 1. Fetch Lab Order
    const order = await labRepository.findOrderById(labOrderId);
    if (!order) {
      return NextResponse.json({ error: `Lab Order not found for ID: ${labOrderId}` }, { status: 404 });
    }

    // 2. Fetch Patient & MRN
    const patient = await patientRepository.findById(order.patientId);
    if (!patient) {
      return NextResponse.json({ error: `Patient record not found for ID: ${order.patientId}` }, { status: 404 });
    }

    const mrNumber = patient.mrNumber || order.mrNumber || "MR-0000";
    const patientName = patient.fullName || order.patientName || "Patient";

    // 3. Resolve Lab Template
    const testCode = order.testCategory || (order.items && order.items[0] ? order.items[0].testName : "CBC");
    const template = (await labTemplateEngine.getTemplate(testCode)) || (await labTemplateEngine.getTemplate("CBC"));
    if (!template) {
      return NextResponse.json({ error: "Failed to load matching lab template." }, { status: 500 });
    }

    // Parse entered results JSON
    let parsedResults: Record<string, string> = {};
    try {
      parsedResults = typeof resultsJson === "string" ? JSON.parse(resultsJson) : resultsJson;
    } catch {
      parsedResults = { notes: String(resultsJson) };
    }

    // Evaluate results against ranges
    const evaluated = labTemplateEngine.evaluateAllResults(template, parsedResults);

    const versionNum = isVersion2 ? 2 : (order.currentVersion || 1);
    const reportId = `LABREP-${order.orderNumber.replace(/[^a-zA-Z0-9-]/g, "")}-${versionNum}`;

    // 4. Generate PDF Report Buffer
    const pdfBuffer = labPdfReportGenerator.generatePdfBuffer({
      reportId,
      orderNumber: order.orderNumber,
      patientName,
      mrNumber,
      age: patient.age || 30,
      gender: patient.gender || "Male",
      cnic: patient.cnic,
      phone: patient.phone,
      admissionId: order.visitId || "OPD",
      consultantName: order.consultantName || "Dr. Bilal Ahmad",
      testCategory: order.testCategory || template.category,
      testName: template.name,
      sampleDate: new Date().toLocaleDateString(),
      reportDate: new Date().toLocaleDateString(),
      technicianName: technicianName || "Lab Technologist",
      pathologistName: "Dr. Khalid Hassan (M.Phil, FCPS)",
      template,
      evaluatedResults: evaluated,
      remarks,
      versionNumber: versionNum,
    });

    const pdfFileName = `${mrNumber}_${template.code}_${reportId}_v${versionNum}.pdf`;

    // 5. Store PDF and JSON locally for admitted/all patients via localStorageService
    const patientInput = {
      id: patient.id,
      mrNumber,
      cnic: patient.cnic,
      fullName: patientName,
      gender: patient.gender,
      age: patient.age,
      phone: patient.phone,
    };

    const admissionId = order.visitId || "OPD-VISIT";

    const savedDoc = localStorageService.saveDocument({
      patient: patientInput,
      admissionNumberOrId: admissionId,
      category: "laboratory",
      fileName: pdfFileName,
      data: pdfBuffer,
      mimeType: "application/pdf",
    });

    // Write structured lab-report.json in local patient folder
    const metadataJson = JSON.stringify(
      {
        reportId,
        orderNumber: order.orderNumber,
        mrNumber,
        patientId: patient.id,
        patientName,
        admissionId,
        consultantName: order.consultantName,
        testCode: template.code,
        testName: template.name,
        evaluatedResults: evaluated,
        remarks,
        versionNumber: versionNum,
        pdfFileName: savedDoc.fileName,
        pdfPath: savedDoc.relativePath,
        checksum: savedDoc.checksum,
        finalizedAt: new Date().toISOString(),
      },
      null,
      2
    );

    localStorageService.saveDocument({
      patient: patientInput,
      admissionNumberOrId: admissionId,
      category: "laboratory",
      fileName: `${mrNumber}_${template.code}_${reportId}_v${versionNum}.json`,
      data: metadataJson,
      mimeType: "application/json",
    });

    // 6. Record metadata in PatientDocument model
    await prisma.patientDocument.create({
      data: {
        patientId: patient.id,
        visitId: order.visitId || undefined,
        documentType: "LABORATORY",
        documentName: `${template.name} Report (${reportId})`,
        relativePath: savedDoc.relativePath,
        fileName: savedDoc.fileName,
        mimeType: "application/pdf",
        fileSize: savedDoc.fileSize,
        checksum: savedDoc.checksum,
        status: "VERIFIED",
      },
    });

    // 7. Update LabOrder & LabReport in Database
    const updatedOrderFields: Record<string, any> = {
      status: isVersion2 ? "ACCEPTED" : "REPORT_PREPARED",
      attachedPdfName: savedDoc.fileName,
      attachedPdfUrl: savedDoc.relativePath,
      currentVersion: versionNum,
    };
    if (isVersion2) {
      updatedOrderFields.resultsV2 = JSON.stringify(evaluated);
    } else {
      updatedOrderFields.resultsV1 = JSON.stringify(evaluated);
    }

    await labRepository.updateOrderFields(order.id, updatedOrderFields);

    // Update associated PatientVisit & Encounter status to reflect report delivery
    if (order.visitId) {
      try {
        await prisma.encounter.updateMany({
          where: { visitId: order.visitId, status: { not: "COMPLETED" } },
          data: { status: "LAB_RESULT_AVAILABLE" },
        });
      } catch (err) {
        console.warn("[Finalize Route] Could not update encounter by visitId:", err);
      }
    }
    if (mrNumber) {
      try {
        await prisma.patientVisit.updateMany({
          where: { mrNumber, status: "LAB_REQUESTED" },
          data: { status: "COMPLETED" },
        });
        await prisma.encounter.updateMany({
          where: { mrNumber, status: { not: "COMPLETED" } },
          data: { status: "LAB_RESULT_AVAILABLE" },
        });
      } catch (err) {
        console.warn("[Finalize Route] Could not update visits/encounters by MRN:", err);
      }
    }

    await labRepository.createOrUpdateLabReport({
      labOrderId: order.id,
      isAccepted: true,
      versions: [
        {
          versionNumber: versionNum,
          structuredResult: JSON.stringify(evaluated),
          summary: remarks || `${template.name} report generated`,
          performedBy: technicianName || "Lab Technologist",
          pdfUrl: savedDoc.relativePath,
        },
      ],
    });

    // 8. Security Audit Log Entry
    await prisma.auditLog.create({
      data: {
        action: "FINALIZED_LAB_REPORT",
        entityType: "LAB_REPORT",
        entityId: reportId,
        userName: technicianName || "Lab Staff",
        userRole: "LAB_STAFF",
        description: `Finalized ${template.name} lab report ${reportId} for MRN ${mrNumber} (Patient: ${patientName})`,
        status: "SUCCESS",
      },
    });

    return NextResponse.json(
      {
        message: "Lab report finalized, stored locally, and attached to patient medical record successfully!",
        reportId,
        mrNumber,
        pdfFileName: savedDoc.fileName,
        relativePath: savedDoc.relativePath,
        evaluatedResults: evaluated,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Finalize Lab Report API Error]:", error);
    return NextResponse.json({ error: "Failed to finalize lab report: " + error.message }, { status: 500 });
  }
}
