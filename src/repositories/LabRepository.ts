import { prisma } from "../lib/prisma";

export class LabRepository {
  async createLabOrder(orderData: any): Promise<any> {
    let patientId = orderData.patientId ? orderData.patientId.toString() : "";
    let visitId: string | null = orderData.visitId || null;
    let consultantId: string | null = orderData.consultantId ? orderData.consultantId.toString() : null;

    // Look up patient by ID first, then fall back to MR number
    let patientObj = await prisma.patient.findFirst({
      where: { OR: [{ id: patientId }, { legacyId: patientId }, { mrNumber: orderData.mrNumber || patientId }] },
    });

    // If still not found (e.g. fake frontend ID like "pat-xxx"), upsert by MR number
    if (!patientObj && orderData.mrNumber) {
      const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
      patientObj = await prisma.patient.upsert({
        where: { mrNumber: orderData.mrNumber },
        update: {},
        create: {
          mrNumber: orderData.mrNumber,
          fullName: orderData.patientName || "Patient",
          age: Number(orderData.age) || 30,
          gender: (orderData.gender || "MALE").toUpperCase(),
          phone: "0000000000",
          createdBy: adminUser?.id || "",
        },
      });
    }

    if (patientObj) patientId = patientObj.id;

    if (visitId) {
      const visitObj = await prisma.patientVisit.findFirst({
        where: { OR: [{ id: visitId }, { legacyId: visitId }, { visitNumber: visitId }] },
      });
      // If the visitId can't be resolved to a real DB record, store null to avoid FK constraint failure
      visitId = visitObj ? visitObj.id : null;
    }

    // Resolve consultant FK — for direct lab requests, consultantId may legitimately be null
    if (consultantId) {
      const consultantObj = await prisma.consultant.findFirst({
        where: { OR: [{ id: consultantId }, { legacyId: consultantId }] },
      });
      if (consultantObj) {
        consultantId = consultantObj.id;
      } else {
        // Could not resolve — try any existing consultant as fallback, else null (direct lab request)
        const anyConsultant = await prisma.consultant.findFirst();
        consultantId = anyConsultant ? anyConsultant.id : null;
      }
    }

    const itemsToCreate = Array.isArray(orderData.items)
      ? orderData.items.map((i: any) => ({
          testName: i.testName || "Lab Test",
          testCode: i.testCode || "TEST-01",
          unitPrice: Number(i.unitPrice || orderData.totalFee || 0),
        }))
      : [{ testName: orderData.testName || "Lab Test", testCode: "TEST-01", unitPrice: Number(orderData.totalFee || 0) }];

    let finalOrderNumber = (orderData.orderNumber || "").trim();
    if (!finalOrderNumber) {
      finalOrderNumber = `LAB-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    } else {
      const existingOrder = await prisma.labOrder.findUnique({
        where: { orderNumber: finalOrderNumber },
      });
      if (existingOrder) {
        finalOrderNumber = `${finalOrderNumber}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    const order = await prisma.labOrder.create({
      data: {
        orderNumber: finalOrderNumber,
        patientId,
        patientName: orderData.patientName || (patientObj ? patientObj.fullName : "Patient"),
        mrNumber: orderData.mrNumber || (patientObj ? patientObj.mrNumber : "MR-0000"),
        ...(visitId ? { visitId } : {}),
        ...(consultantId ? { consultantId } : {}),
        consultantName: orderData.consultantName || "Direct Lab Request",
        testCategory: orderData.testCategory || "General Pathology",
        clinicalNotes: orderData.clinicalNotes || null,
        priority: orderData.priority || "NORMAL",
        status: orderData.status || "ORDERED",
        totalFee: Number(orderData.totalFee || 0),
        requestDate: orderData.requestDate || new Date(),
        items: {
          create: itemsToCreate,
        },
      },
      include: { items: true },
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

    const orders = await prisma.labOrder.findMany({
      where: whereClause,
      include: { items: true, reports: true },
      orderBy: { createdAt: "desc" },
    });

    return orders.map((o) => ({ ...o, _id: o.id }));
  }

  async findOrderById(id: string): Promise<any> {
    const order = await prisma.labOrder.findFirst({
      where: { OR: [{ id }, { legacyId: id }, { orderNumber: id }] },
      include: { items: true, reports: true },
    });
    if (!order) return null;
    return { ...order, _id: order.id };
  }

  async updateOrderStatus(id: string, status: string): Promise<any> {
    const existing = await this.findOrderById(id);
    if (!existing) return null;

    const updated = await prisma.labOrder.update({
      where: { id: existing.id },
      data: { status },
      include: { items: true, reports: true },
    });
    return { ...updated, _id: updated.id };
  }

  async updateOrderFields(id: string, fields: Record<string, any>): Promise<any> {
    const existing = await this.findOrderById(id);
    if (!existing) return null;

    const updated = await prisma.labOrder.update({
      where: { id: existing.id },
      data: fields,
      include: { items: true, reports: true },
    });
    return { ...updated, _id: updated.id };
  }

  async createOrUpdateLabReport(reportData: any): Promise<any> {
    let labOrderId = reportData.labOrderId ? reportData.labOrderId.toString() : "";
    const orderObj = await this.findOrderById(labOrderId);
    if (orderObj) labOrderId = orderObj.id;

    const existingReport = await prisma.labReport.findFirst({
      where: { labOrderId },
      include: { versions: true },
    });

    if (existingReport) {
      const versionsList = reportData.versions || [];
      for (const v of versionsList) {
        await prisma.labReportVersion.create({
          data: {
            labReportId: existingReport.id,
            versionNumber: v.versionNumber || existingReport.versions.length + 1,
            structuredResult: typeof v.structuredResult === "object" ? JSON.stringify(v.structuredResult) : String(v.structuredResult),
            summary: v.summary || null,
            performedBy: v.performedBy || "Lab Tech",
            pdfUrl: v.pdfUrl || null,
          },
        });
      }
      const updatedReport = await prisma.labReport.update({
        where: { id: existingReport.id },
        data: {
          currentVersion: existingReport.versions.length + versionsList.length,
          isAccepted: reportData.isAccepted !== undefined ? reportData.isAccepted : existingReport.isAccepted,
        },
        include: { versions: true },
      });
      return { ...updatedReport, _id: updatedReport.id };
    }

    const newReport = await prisma.labReport.create({
      data: {
        labOrderId,
        currentVersion: reportData.currentVersion || 1,
        isAccepted: Boolean(reportData.isAccepted),
        versions: {
          create: (reportData.versions || []).map((v: any) => ({
            versionNumber: v.versionNumber || 1,
            structuredResult: typeof v.structuredResult === "object" ? JSON.stringify(v.structuredResult) : String(v.structuredResult),
            summary: v.summary || null,
            performedBy: v.performedBy || "Lab Tech",
            pdfUrl: v.pdfUrl || null,
          })),
        },
      },
      include: { versions: true },
    });

    return { ...newReport, _id: newReport.id };
  }

  async findReportByOrderId(labOrderId: string): Promise<any> {
    const orderObj = await this.findOrderById(labOrderId);
    const targetOrderId = orderObj ? orderObj.id : labOrderId;

    const report = await prisma.labReport.findFirst({
      where: { labOrderId: targetOrderId },
      include: { versions: true },
    });
    if (!report) return null;
    return { ...report, _id: report.id };
  }

  async createRevisionRequest(reqData: any): Promise<any> {
    let labOrderId = reqData.labOrderId ? reqData.labOrderId.toString() : "";
    let labReportId = reqData.labReportId ? reqData.labReportId.toString() : "";
    let consultantId = reqData.consultantId ? reqData.consultantId.toString() : "";

    const orderObj = await this.findOrderById(labOrderId);
    if (orderObj) labOrderId = orderObj.id;

    const reportObj = await prisma.labReport.findFirst({
      where: { OR: [{ id: labReportId }, { legacyId: labReportId }, { labOrderId }] },
    });
    if (reportObj) labReportId = reportObj.id;

    const consultantObj = await prisma.consultant.findFirst({
      where: { OR: [{ id: consultantId }, { legacyId: consultantId }] },
    });
    if (consultantObj) consultantId = consultantObj.id;

    const req = await prisma.labRevisionRequest.create({
      data: {
        labOrderId,
        labReportId,
        consultantId,
        versionTarget: Number(reqData.versionTarget || 1),
        reason: reqData.reason,
        comment: reqData.comment,
        status: reqData.status || "PENDING",
      },
    });

    return { ...req, _id: req.id };
  }
}

export const labRepository = new LabRepository();
