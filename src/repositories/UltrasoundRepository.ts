import { prisma } from "../lib/prisma";

export class UltrasoundRepository {
  async createOrder(orderData: any): Promise<any> {
    let patientId = orderData.patientId ? orderData.patientId.toString() : "";
    let visitId = orderData.visitId ? orderData.visitId.toString() : "";
    let consultantId = orderData.consultantId ? orderData.consultantId.toString() : "";

    const patientObj = await prisma.patient.findFirst({
      where: { OR: [{ id: patientId }, { legacyId: patientId }, { mrNumber: orderData.mrNumber || patientId }] },
    });
    if (patientObj) patientId = patientObj.id;

    const visitObj = await prisma.patientVisit.findFirst({
      where: { OR: [{ id: visitId }, { legacyId: visitId }, { visitNumber: visitId }] },
    });
    if (visitObj) visitId = visitObj.id;

    const consultantObj = await prisma.consultant.findFirst({
      where: { OR: [{ id: consultantId }, { legacyId: consultantId }] },
    });
    if (consultantObj) {
      consultantId = consultantObj.id;
    } else {
      const anyConsultant = await prisma.consultant.findFirst();
      if (anyConsultant) consultantId = anyConsultant.id;
    }

    let finalOrderNumber = (orderData.orderNumber || "").trim();
    if (!finalOrderNumber) {
      finalOrderNumber = `US-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    } else {
      const existingOrder = await prisma.ultrasoundOrder.findUnique({
        where: { orderNumber: finalOrderNumber },
      });
      if (existingOrder) {
        finalOrderNumber = `${finalOrderNumber}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    const order = await prisma.ultrasoundOrder.create({
      data: {
        orderNumber: finalOrderNumber,
        patientId,
        patientName: orderData.patientName || (patientObj ? patientObj.fullName : "Patient"),
        mrNumber: orderData.mrNumber || (patientObj ? patientObj.mrNumber : "MR-0000"),
        visitId,
        consultantId,
        consultantName: orderData.consultantName || "Doctor",
        requestedExam: orderData.requestedExam || orderData.scanType || "Ultrasound Scan",
        clinicalIndication: orderData.clinicalIndication || null,
        priority: orderData.priority || "NORMAL",
        status: orderData.status || "ORDERED",
        totalFee: Number(orderData.totalFee || 0),
        requestDate: orderData.requestDate || new Date(),
        attachedFileName: orderData.attachedFileName || null,
        attachedPdfUrl: orderData.attachedPdfUrl || null,
        attachedImageUrl: orderData.attachedImageUrl || null,
        attachedImageBase64: orderData.attachedImageBase64 || null,
        findingsV1: orderData.findingsV1 || null,
      },
    });

    return { ...order, _id: order.id };
  }

  async findOrdersByPatient(patientId: string): Promise<any[]> {
    const patientObj = await prisma.patient.findFirst({
      where: { OR: [{ id: patientId }, { legacyId: patientId }, { mrNumber: patientId }] },
    });

    const whereClause: any = patientObj
      ? { patientId: patientObj.id }
      : { OR: [{ mrNumber: patientId }, { legacyId: patientId }] };

    const orders = await prisma.ultrasoundOrder.findMany({
      where: whereClause,
      include: { reports: true },
      orderBy: { createdAt: "desc" },
    });

    return orders.map((o) => ({ ...o, _id: o.id }));
  }

  async updateOrderStatus(id: string, status: string): Promise<any> {
    const existing = await prisma.ultrasoundOrder.findFirst({
      where: { OR: [{ id }, { legacyId: id }, { orderNumber: id }] },
    });
    if (!existing) return null;

    const updated = await prisma.ultrasoundOrder.update({
      where: { id: existing.id },
      data: { status },
    });
    return { ...updated, _id: updated.id };
  }

  async updateOrderFields(id: string, fields: any): Promise<any> {
    const existing = await prisma.ultrasoundOrder.findFirst({
      where: { OR: [{ id }, { legacyId: id }, { orderNumber: id }] },
    });
    if (!existing) return null;

    const updated = await prisma.ultrasoundOrder.update({
      where: { id: existing.id },
      data: fields,
    });
    return { ...updated, _id: updated.id };
  }

  async findReportByOrderId(ultrasoundOrderId: string): Promise<any> {
    const orderObj = await prisma.ultrasoundOrder.findFirst({
      where: { OR: [{ id: ultrasoundOrderId }, { legacyId: ultrasoundOrderId }, { orderNumber: ultrasoundOrderId }] },
    });
    const targetOrderId = orderObj ? orderObj.id : ultrasoundOrderId;

    const report = await prisma.ultrasoundReport.findFirst({
      where: { ultrasoundOrderId: targetOrderId },
      include: { versions: true },
    });
    if (!report) return null;
    return { ...report, _id: report.id };
  }

  async createOrUpdateUltrasoundReport(reportData: any): Promise<any> {
    let ultrasoundOrderId = reportData.ultrasoundOrderId ? reportData.ultrasoundOrderId.toString() : "";
    const orderObj = await prisma.ultrasoundOrder.findFirst({
      where: { OR: [{ id: ultrasoundOrderId }, { legacyId: ultrasoundOrderId }] },
    });
    if (orderObj) ultrasoundOrderId = orderObj.id;

    const existingReport = await prisma.ultrasoundReport.findFirst({
      where: { ultrasoundOrderId },
      include: { versions: true },
    });

    if (existingReport) {
      const versionsList = reportData.versions || [];
      for (const v of versionsList) {
        await prisma.ultrasoundReportVersion.create({
          data: {
            ultrasoundReportId: existingReport.id,
            versionNumber: v.versionNumber || existingReport.versions.length + 1,
            findings: v.findings || "",
            impression: v.impression || "",
            sonographerNotes: v.sonographerNotes || null,
            imageUrl: v.imageUrl || null,
            pdfUrl: v.pdfUrl || null,
            performedBy: v.performedBy || "Sonologist",
          },
        });
      }
      const updated = await prisma.ultrasoundReport.update({
        where: { id: existingReport.id },
        data: {
          currentVersion: existingReport.versions.length + versionsList.length,
          isAccepted: reportData.isAccepted !== undefined ? reportData.isAccepted : existingReport.isAccepted,
        },
        include: { versions: true },
      });
      return { ...updated, _id: updated.id };
    }

    const newReport = await prisma.ultrasoundReport.create({
      data: {
        ultrasoundOrderId,
        currentVersion: reportData.currentVersion || 1,
        isAccepted: Boolean(reportData.isAccepted),
        versions: {
          create: (reportData.versions || []).map((v: any) => ({
            versionNumber: v.versionNumber || 1,
            findings: v.findings || "",
            impression: v.impression || "",
            sonographerNotes: v.sonographerNotes || null,
            imageUrl: v.imageUrl || null,
            pdfUrl: v.pdfUrl || null,
            performedBy: v.performedBy || "Sonologist",
          })),
        },
      },
      include: { versions: true },
    });
    return { ...newReport, _id: newReport.id };
  }
}

export const ultrasoundRepository = new UltrasoundRepository();
