import { prisma } from "../lib/prisma";

function parseSafeDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d;
}

export class HospitalFormsRepository {
  private async resolveFormEntities(data: any) {
    let patientId = data.patientId ? data.patientId.toString() : "";
    let visitId: string | null = data.visitId ? data.visitId.toString() : null;
    let createdById: string | null = data.createdById ? data.createdById.toString() : null;

    let patientObj = await prisma.patient.findFirst({
      where: { OR: [{ id: patientId }, { legacyId: patientId }, { mrNumber: data.mrNumber || patientId }] },
    });

    if (!patientObj && (data.mrNumber || data.patientName || data.patient)) {
      const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
      const pName = data.patientName || (data.patient ? data.patient.fullName : "Patient");
      const pMrn = data.mrNumber || (data.patient ? data.patient.mrNumber : `MR-${Date.now()}`);
      const pPhone = data.phone || (data.patient ? data.patient.phone : "0000000000");
      const pCnic = data.cnic || (data.patient ? data.patient.cnic : null);

      patientObj = await prisma.patient.upsert({
        where: { mrNumber: pMrn },
        update: {},
        create: {
          mrNumber: pMrn,
          fullName: pName,
          age: Number(data.age || (data.patient ? data.patient.age : 30)) || 30,
          gender: (data.gender || (data.patient ? data.patient.gender : "MALE") || "MALE").toUpperCase(),
          phone: pPhone,
          cnic: pCnic,
          createdBy: adminUser?.id || "",
        },
      });
    }

    if (patientObj) {
      patientId = patientObj.id;
    }

    if (visitId) {
      const visitObj = await prisma.patientVisit.findFirst({
        where: { OR: [{ id: visitId }, { legacyId: visitId }, { visitNumber: visitId }] },
      });
      visitId = visitObj ? visitObj.id : null;
    }

    if (createdById) {
      const userObj = await prisma.user.findFirst({
        where: { OR: [{ id: createdById }, { legacyId: createdById }, { username: createdById }] },
      });
      createdById = userObj ? userObj.id : null;
    }

    return { patientId, visitId, createdById };
  }

  // --- REFERRAL FORM ---
  async createReferralForm(data: any) {
    const { patientId, visitId, createdById } = await this.resolveFormEntities(data);
    let formNumber = (data.formNumber || "").trim();
    if (!formNumber) {
      const count = await prisma.referralForm.count();
      formNumber = `REF-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
    }
    const existing = await prisma.referralForm.findUnique({ where: { formNumber } });
    if (existing) {
      formNumber = `REF-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
    }

    const medicines = Array.isArray(data.medicines) ? data.medicines : [];

    return await prisma.referralForm.create({
      data: {
        formNumber,
        patientId,
        visitId,
        formDate: data.formDate ? new Date(data.formDate) : new Date(),
        dateOfAdmission: data.dateOfAdmission ? new Date(data.dateOfAdmission) : null,
        presentingComplaint: data.presentingComplaint || null,
        provisionalDiagnosis: data.provisionalDiagnosis || null,
        briefHistoryExamination: data.briefHistoryExamination || null,
        investigationsResults: data.investigationsResults || null,
        diagnosis: data.diagnosis || null,
        procedureDone: data.procedureDone || null,
        conditionAtRefer: data.conditionAtRefer || null,
        referredHospitalName: data.referredHospitalName || null,
        reasonForReferral: data.reasonForReferral || null,
        doctorName: data.doctorName || null,
        signDate: data.signDate ? new Date(data.signDate) : null,
        signTime: data.signTime || null,
        status: data.status || "FINALIZED",
        createdById: data.createdById || null,
        medicines: {
          create: medicines.map((m: any, index: number) => ({
            srNo: index + 1,
            medicine: m.medicine || "",
            dose: m.dose || m.strength || null,
            route: m.route || null,
            frequency: m.frequency || null,
            timing: m.timing || null,
            duration: m.duration || null,
          })),
        },
      },
      include: {
        patient: true,
        visit: true,
        medicines: true,
      },
    });
  }

  async getReferralForms(query?: { patientId?: string; search?: string }) {
    try {
      const where: any = {};
      if (query?.patientId) {
        const pObj = await prisma.patient.findFirst({
          where: { OR: [{ id: query.patientId }, { legacyId: query.patientId }, { mrNumber: query.patientId }] },
        });
        where.patientId = pObj ? pObj.id : query.patientId;
      }
      if (query?.search) {
        const s = query.search.trim();
        where.OR = [
          { formNumber: { contains: s, mode: "insensitive" } },
          { referredHospitalName: { contains: s, mode: "insensitive" } },
          { patient: { fullName: { contains: s, mode: "insensitive" } } },
          { patient: { mrNumber: { contains: s, mode: "insensitive" } } },
        ];
      }
      return await prisma.referralForm.findMany({
        where,
        include: {
          patient: true,
          visit: true,
          medicines: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (err: any) {
      console.warn("[HospitalFormsRepository] getReferralForms fallback:", err?.message);
      return await prisma.referralForm.findMany({
        include: { patient: true, visit: true, medicines: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }).catch(() => []);
    }
  }

  async getReferralFormById(id: string) {
    return await prisma.referralForm.findFirst({
      where: { OR: [{ id }, { formNumber: id }] },
      include: {
        patient: true,
        visit: true,
        medicines: true,
      },
    });
  }

  async updateReferralForm(id: string, data: any) {
    const medicines = Array.isArray(data.medicines) ? data.medicines : null;
    
    if (medicines) {
      await prisma.referralFormMedicine.deleteMany({ where: { referralFormId: id } });
    }

    return await prisma.referralForm.update({
      where: { id },
      data: {
        dateOfAdmission: parseSafeDate(data.dateOfAdmission) ?? undefined,
        presentingComplaint: data.presentingComplaint,
        provisionalDiagnosis: data.provisionalDiagnosis,
        briefHistoryExamination: data.briefHistoryExamination,
        investigationsResults: data.investigationsResults,
        diagnosis: data.diagnosis,
        procedureDone: data.procedureDone,
        conditionAtRefer: data.conditionAtRefer,
        referredHospitalName: data.referredHospitalName,
        reasonForReferral: data.reasonForReferral,
        doctorName: data.doctorName,
        signDate: parseSafeDate(data.signDate) ?? undefined,
        signTime: data.signTime,
        status: data.status,
        ...(medicines
          ? {
              medicines: {
                create: medicines.map((m: any, index: number) => ({
                  srNo: index + 1,
                  medicine: m.medicine || "",
                  dose: m.dose || m.strength || null,
                  route: m.route || null,
                  frequency: m.frequency || null,
                  timing: m.timing || null,
                  duration: m.duration || null,
                })),
              },
            }
          : {}),
      },
      include: {
        patient: true,
        visit: true,
        medicines: true,
      },
    });
  }

  // --- DISCHARGE FORM ---
  async createDischargeForm(data: any) {
    const { patientId, visitId, createdById } = await this.resolveFormEntities(data);
    let formNumber = (data.formNumber || "").trim();
    if (!formNumber) {
      const count = await prisma.dischargeForm.count();
      formNumber = `DIS-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
    }
    const existing = await prisma.dischargeForm.findUnique({ where: { formNumber } });
    if (existing) {
      formNumber = `DIS-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
    }

    const medicines = Array.isArray(data.medicines) ? data.medicines : [];

    return await prisma.dischargeForm.create({
      data: {
        formNumber,
        patientId,
        visitId,
        formDate: parseSafeDate(data.formDate) || new Date(),
        dateOfAdmission: parseSafeDate(data.dateOfAdmission),
        presentingComplaint: data.presentingComplaint || null,
        briefHistoryExamination: data.briefHistoryExamination || null,
        diagnosticInvestigations: data.diagnosticInvestigations || null,
        diagnosis: data.diagnosis || null,
        procedureDone: data.procedureDone || null,
        outcome: data.outcome || null,
        dischargeAdvisedByDoctor: data.dischargeAdvisedByDoctor ?? true,
        isLAMA: data.isLAMA ?? false,
        dischargeDate: parseSafeDate(data.dischargeDate),
        dischargeCondition: data.dischargeCondition || null,
        followUpDate: parseSafeDate(data.followUpDate),
        followUpDepartment: data.followUpDepartment || null,
        dietaryInstructions: data.dietaryInstructions || null,
        doctorName: data.doctorName || null,
        signDate: parseSafeDate(data.signDate),
        signTime: data.signTime || null,
        status: data.status || "FINALIZED",
        createdById,
        medicines: {
          create: medicines.map((m: any, index: number) => ({
            srNo: index + 1,
            medicine: m.medicine || "",
            dose: m.dose || m.strength || null,
            route: m.route || null,
            frequency: m.frequency || null,
            timing: m.timing || null,
            duration: m.duration || null,
          })),
        },
      },
      include: {
        patient: true,
        visit: true,
        medicines: true,
      },
    });
  }

  async getDischargeForms(query?: { patientId?: string; search?: string }) {
    try {
      const where: any = {};
      if (query?.patientId) {
        const pObj = await prisma.patient.findFirst({
          where: { OR: [{ id: query.patientId }, { legacyId: query.patientId }, { mrNumber: query.patientId }] },
        });
        where.patientId = pObj ? pObj.id : query.patientId;
      }
      if (query?.search) {
        const s = query.search.trim();
        where.OR = [
          { formNumber: { contains: s, mode: "insensitive" } },
          { patient: { fullName: { contains: s, mode: "insensitive" } } },
          { patient: { mrNumber: { contains: s, mode: "insensitive" } } },
        ];
      }
      return await prisma.dischargeForm.findMany({
        where,
        include: {
          patient: true,
          visit: true,
          medicines: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (err: any) {
      console.warn("[HospitalFormsRepository] getDischargeForms fallback:", err?.message);
      return await prisma.dischargeForm.findMany({
        include: { patient: true, visit: true, medicines: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }).catch(() => []);
    }
  }

  async getDischargeFormById(id: string) {
    return await prisma.dischargeForm.findFirst({
      where: { OR: [{ id }, { formNumber: id }] },
      include: {
        patient: true,
        visit: true,
        medicines: true,
      },
    });
  }

  async updateDischargeForm(id: string, data: any) {
    const medicines = Array.isArray(data.medicines) ? data.medicines : null;
    
    if (medicines) {
      await prisma.dischargeFormMedicine.deleteMany({ where: { dischargeFormId: id } });
    }

    return await prisma.dischargeForm.update({
      where: { id },
      data: {
        dateOfAdmission: data.dateOfAdmission ? new Date(data.dateOfAdmission) : undefined,
        presentingComplaint: data.presentingComplaint,
        briefHistoryExamination: data.briefHistoryExamination,
        diagnosticInvestigations: data.diagnosticInvestigations,
        diagnosis: data.diagnosis,
        procedureDone: data.procedureDone,
        outcome: data.outcome,
        dischargeAdvisedByDoctor: data.dischargeAdvisedByDoctor,
        isLAMA: data.isLAMA,
        dischargeDate: data.dischargeDate ? new Date(data.dischargeDate) : undefined,
        dischargeCondition: data.dischargeCondition,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : undefined,
        followUpDepartment: data.followUpDepartment,
        dietaryInstructions: data.dietaryInstructions,
        doctorName: data.doctorName,
        signDate: data.signDate ? new Date(data.signDate) : undefined,
        signTime: data.signTime,
        status: data.status,
        ...(medicines
          ? {
              medicines: {
                create: medicines.map((m: any, index: number) => ({
                  srNo: index + 1,
                  medicine: m.medicine || "",
                  dose: m.dose || m.strength || null,
                  route: m.route || null,
                  frequency: m.frequency || null,
                  timing: m.timing || null,
                  duration: m.duration || null,
                })),
              },
            }
          : {}),
      },
      include: {
        patient: true,
        visit: true,
        medicines: true,
      },
    });
  }

  // --- ADMISSION FORM ---
  async createAdmissionForm(data: any) {
    const { patientId, visitId, createdById } = await this.resolveFormEntities(data);
    let formNumber = (data.formNumber || "").trim();
    if (!formNumber) {
      const count = await prisma.admissionForm.count();
      formNumber = `ADM-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
    }
    const existing = await prisma.admissionForm.findUnique({ where: { formNumber } });
    if (existing) {
      formNumber = `ADM-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
    }

    const doa = parseSafeDate(data.dateOfAdmission) || new Date();
    const dodr = parseSafeDate(data.dateOfDischargeRefer);

    return await prisma.admissionForm.create({
      data: {
        formNumber,
        patientId,
        visitId,
        phcRegNumber: data.phcRegNumber || null,
        dateOfAdmission: doa,
        timeOfAdmission: data.timeOfAdmission || null,
        maritalStatus: data.maritalStatus || null,
        cnic: data.cnic || null,
        provisionalDiagnosis: data.provisionalDiagnosis || null,
        finalDiagnosis: data.finalDiagnosis || null,
        admittedThrough: data.admittedThrough || null,
        opdErMrNo: data.opdErMrNo || null,
        dateOfDischargeRefer: dodr,
        timeOfDischargeRefer: data.timeOfDischargeRefer || null,
        consentName: data.consentName || null,
        consentRelation: data.consentRelation || null,
        consentSigned: data.consentSigned ?? true,
        status: data.status || "FINALIZED",
        createdById,
      },
      include: {
        patient: true,
        visit: true,
      },
    });
  }

  async getAdmissionForms(query?: { patientId?: string; search?: string }) {
    try {
      const where: any = {};
      if (query?.patientId) {
        const pObj = await prisma.patient.findFirst({
          where: { OR: [{ id: query.patientId }, { legacyId: query.patientId }, { mrNumber: query.patientId }] },
        });
        where.patientId = pObj ? pObj.id : query.patientId;
      }
      if (query?.search) {
        const s = query.search.trim();
        where.OR = [
          { formNumber: { contains: s, mode: "insensitive" } },
          { patient: { fullName: { contains: s, mode: "insensitive" } } },
          { patient: { mrNumber: { contains: s, mode: "insensitive" } } },
        ];
      }
      return await prisma.admissionForm.findMany({
        where,
        include: {
          patient: true,
          visit: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (err: any) {
      console.warn("[HospitalFormsRepository] getAdmissionForms fallback:", err?.message);
      return await prisma.admissionForm.findMany({
        include: { patient: true, visit: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }).catch(() => []);
    }
  }

  async getAdmissionFormById(id: string) {
    return await prisma.admissionForm.findFirst({
      where: { OR: [{ id }, { formNumber: id }] },
      include: {
        patient: true,
        visit: true,
      },
    });
  }

  async updateAdmissionForm(id: string, data: any) {
    return await prisma.admissionForm.update({
      where: { id },
      data: {
        phcRegNumber: data.phcRegNumber,
        dateOfAdmission: parseSafeDate(data.dateOfAdmission) ?? undefined,
        timeOfAdmission: data.timeOfAdmission,
        maritalStatus: data.maritalStatus,
        cnic: data.cnic,
        provisionalDiagnosis: data.provisionalDiagnosis,
        finalDiagnosis: data.finalDiagnosis,
        admittedThrough: data.admittedThrough,
        opdErMrNo: data.opdErMrNo,
        dateOfDischargeRefer: parseSafeDate(data.dateOfDischargeRefer) ?? undefined,
        timeOfDischargeRefer: data.timeOfDischargeRefer,
        consentName: data.consentName,
        consentRelation: data.consentRelation,
        consentSigned: data.consentSigned,
        status: data.status,
      },
      include: {
        patient: true,
        visit: true,
      },
    });
  }

  // --- OPERATION NOTES ---
  async createOperationNote(data: any) {
    const { patientId, visitId, createdById } = await this.resolveFormEntities(data);
    let formNumber = (data.formNumber || "").trim();
    if (!formNumber) {
      const count = await prisma.operationNote.count();
      formNumber = `OP-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
    }
    const existing = await prisma.operationNote.findUnique({ where: { formNumber } });
    if (existing) {
      formNumber = `OP-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
    }

    return await prisma.operationNote.create({
      data: {
        formNumber,
        patientId,
        visitId,
        operationDate: parseSafeDate(data.operationDate) || new Date(),
        operationTime: data.operationTime || null,
        surgeonName: data.surgeonName || "",
        assistantTeamName: data.assistantTeamName || null,
        anesthetistName: data.anesthetistName || null,
        anesthesiaType: data.anesthesiaType || null,
        incision: data.incision || null,
        procedureDetails: data.procedureDetails || null,
        findings: data.findings || null,
        drain: data.drain || null,
        specimenRemoved: data.specimenRemoved || null,
        histopathology: data.histopathology || null,
        bloodLoss: data.bloodLoss || null,
        transfusion: data.transfusion || null,
        uneventfulDevelopment: data.uneventfulDevelopment || null,
        conditionAtEnd: data.conditionAtEnd || null,
        postOpOrders: data.postOpOrders || null,
        signDate: parseSafeDate(data.signDate),
        signTime: data.signTime || null,
        status: data.status || "FINALIZED",
        createdById,
      },
      include: {
        patient: true,
        visit: true,
      },
    });
  }

  async getOperationNotes(query?: { patientId?: string; search?: string }) {
    try {
      const where: any = {};
      if (query?.patientId) {
        const pObj = await prisma.patient.findFirst({
          where: { OR: [{ id: query.patientId }, { legacyId: query.patientId }, { mrNumber: query.patientId }] },
        });
        where.patientId = pObj ? pObj.id : query.patientId;
      }
      if (query?.search) {
        const s = query.search.trim();
        where.OR = [
          { formNumber: { contains: s, mode: "insensitive" } },
          { surgeonName: { contains: s, mode: "insensitive" } },
          { patient: { fullName: { contains: s, mode: "insensitive" } } },
          { patient: { mrNumber: { contains: s, mode: "insensitive" } } },
        ];
      }
      return await prisma.operationNote.findMany({
        where,
        include: {
          patient: true,
          visit: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (err: any) {
      console.warn("[HospitalFormsRepository] getOperationNotes fallback:", err?.message);
      return await prisma.operationNote.findMany({
        include: { patient: true, visit: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }).catch(() => []);
    }
  }

  async getOperationNoteById(id: string) {
    return await prisma.operationNote.findFirst({
      where: { OR: [{ id }, { formNumber: id }] },
      include: {
        patient: true,
        visit: true,
      },
    });
  }

  async updateOperationNote(id: string, data: any) {
    return await prisma.operationNote.update({
      where: { id },
      data: {
        operationDate: parseSafeDate(data.operationDate) ?? undefined,
        operationTime: data.operationTime,
        surgeonName: data.surgeonName,
        assistantTeamName: data.assistantTeamName,
        anesthetistName: data.anesthetistName,
        anesthesiaType: data.anesthesiaType,
        incision: data.incision,
        procedureDetails: data.procedureDetails,
        findings: data.findings,
        drain: data.drain,
        specimenRemoved: data.specimenRemoved,
        histopathology: data.histopathology,
        bloodLoss: data.bloodLoss,
        transfusion: data.transfusion,
        uneventfulDevelopment: data.uneventfulDevelopment,
        conditionAtEnd: data.conditionAtEnd,
        postOpOrders: data.postOpOrders,
        signDate: parseSafeDate(data.signDate) ?? undefined,
        signTime: data.signTime,
        status: data.status,
      },
      include: {
        patient: true,
        visit: true,
      },
    });
  }

  // --- DOCTOR NOTES ---
  async createDoctorNote(data: any) {
    const { patientId, visitId, createdById } = await this.resolveFormEntities(data);
    let formNumber = (data.formNumber || "").trim();
    if (!formNumber) {
      const count = await prisma.doctorNote.count();
      formNumber = `DN-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
    }
    const existing = await prisma.doctorNote.findUnique({ where: { formNumber } });
    if (existing) {
      formNumber = `DN-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
    }

    return await prisma.doctorNote.create({
      data: {
        formNumber,
        patientId,
        visitId,
        noteDate: parseSafeDate(data.noteDate) || new Date(),
        noteTime: data.noteTime || null,
        notes: data.notes || "",
        doctorName: data.doctorName || "",
        signDate: parseSafeDate(data.signDate),
        signTime: data.signTime || null,
        status: data.status || "FINALIZED",
        createdById,
      },
      include: {
        patient: true,
        visit: true,
      },
    });
  }

  async getDoctorNotes(query?: { patientId?: string; doctorName?: string; search?: string }) {
    try {
      const where: any = {};
      if (query?.patientId) {
        const pObj = await prisma.patient.findFirst({
          where: { OR: [{ id: query.patientId }, { legacyId: query.patientId }, { mrNumber: query.patientId }] },
        });
        where.patientId = pObj ? pObj.id : query.patientId;
      }
      if (query?.doctorName) {
        where.doctorName = { contains: query.doctorName, mode: "insensitive" };
      }
      if (query?.search) {
        const s = query.search.trim();
        where.OR = [
          { formNumber: { contains: s, mode: "insensitive" } },
          { doctorName: { contains: s, mode: "insensitive" } },
          { patient: { fullName: { contains: s, mode: "insensitive" } } },
          { patient: { mrNumber: { contains: s, mode: "insensitive" } } },
        ];
      }
      return await prisma.doctorNote.findMany({
        where,
        include: {
          patient: true,
          visit: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (err: any) {
      console.warn("[HospitalFormsRepository] getDoctorNotes fallback:", err?.message);
      return await prisma.doctorNote.findMany({
        include: { patient: true, visit: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }).catch(() => []);
    }
  }

  async getDoctorNoteById(id: string) {
    return await prisma.doctorNote.findFirst({
      where: { OR: [{ id }, { formNumber: id }] },
      include: {
        patient: true,
        visit: true,
      },
    });
  }

  async updateDoctorNote(id: string, data: any) {
    return await prisma.doctorNote.update({
      where: { id },
      data: {
        noteDate: data.noteDate ? new Date(data.noteDate) : undefined,
        noteTime: data.noteTime,
        notes: data.notes,
        doctorName: data.doctorName,
        signDate: data.signDate ? new Date(data.signDate) : undefined,
        signTime: data.signTime,
        status: data.status,
      },
      include: {
        patient: true,
        visit: true,
      },
    });
  }
}

export const hospitalFormsRepository = new HospitalFormsRepository();
