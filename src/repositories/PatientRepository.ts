import { prisma } from "../lib/prisma";

export class PatientRepository {
  async findByMrNumber(mrNumber: string): Promise<any> {
    const patient = await prisma.patient.findFirst({
      where: { mrNumber: mrNumber.trim() },
    });
    if (!patient) return null;
    return { ...patient, _id: patient.id };
  }

  async findById(id: string): Promise<any> {
    const patient = await prisma.patient.findFirst({
      where: { OR: [{ id }, { legacyId: id }, { mrNumber: id }] },
    });
    if (!patient) return null;
    return { ...patient, _id: patient.id };
  }

  async createPatient(patientData: any): Promise<any> {
    let createdBy = patientData.createdBy ? patientData.createdBy.toString() : null;

    // Ensure createdBy references a valid user in PostgreSQL
    if (createdBy) {
      const validUser = await prisma.user.findFirst({
        where: { OR: [{ id: createdBy }, { legacyId: createdBy }] },
      });
      if (validUser) {
        createdBy = validUser.id;
      } else {
        const firstAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
        if (firstAdmin) {
          createdBy = firstAdmin.id;
        } else {
          const defaultAdmin = await prisma.user.create({
            data: {
              username: "system_admin",
              email: "admin@bilalhospital.com",
              passwordHash: "hashed",
              fullName: "System Admin",
              role: "ADMIN",
            },
          });
          createdBy = defaultAdmin.id;
        }
      }
    } else {
      const firstAdmin = await prisma.user.findFirst();
      createdBy = firstAdmin ? firstAdmin.id : null;
    }

    const patient = await prisma.patient.create({
      data: {
        mrNumber: patientData.mrNumber.trim(),
        fullName: patientData.fullName,
        fatherHusbandName: patientData.fatherHusbandName || null,
        gender: patientData.gender,
        dob: patientData.dob || null,
        age: Number(patientData.age || 0),
        phone: patientData.phone,
        address: patientData.address || null,
        cnic: patientData.cnic ? patientData.cnic.trim() : null,
        emergencyContact: patientData.emergencyContact || null,
        bloodGroup: patientData.bloodGroup || null,
        notes: patientData.notes || null,
        createdBy: createdBy || "",
      },
    });
    return { ...patient, _id: patient.id };
  }

  async searchPatients(query: string): Promise<any[]> {
    if (!query || query.trim() === "") {
      const patients = await prisma.patient.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return patients.map((p) => ({ ...p, _id: p.id }));
    }

    const q = query.trim();
    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { mrNumber: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
          { cnic: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return patients.map((p) => ({ ...p, _id: p.id }));
  }

  async updatePatient(id: string, updateData: any): Promise<any> {
    const patient = await prisma.patient.update({
      where: { id },
      data: updateData,
    });
    return { ...patient, _id: patient.id };
  }

  async findDuplicates(params: { cnic?: string; phone?: string; fullName?: string }): Promise<any[]> {
    const conditions: any[] = [];
    if (params.cnic && params.cnic.trim().length > 4) {
      conditions.push({ cnic: params.cnic.trim() });
    }
    if (params.phone && params.phone.trim().length > 4) {
      conditions.push({ phone: params.phone.trim() });
    }
    if (params.fullName && params.fullName.trim().length > 2) {
      conditions.push({ fullName: { contains: params.fullName.trim(), mode: "insensitive" } });
    }

    if (conditions.length === 0) return [];

    const matches = await prisma.patient.findMany({
      where: { OR: conditions },
      take: 10,
    });
    return matches.map((p) => ({ ...p, _id: p.id }));
  }
}

export const patientRepository = new PatientRepository();

