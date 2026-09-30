/**
 * PatientFileArchiveService
 *
 * Orchestrates automatic archiving of every HMS document type into the
 * local patient file system.  Database + filesystem writes are kept
 * transactional: a DB record is ONLY created after the file is
 * successfully written and verified.
 *
 * Storage layout (relative to PATIENT_FILES_ROOT):
 *   <CNIC_or_MR>/
 *     patient.json
 *     admissions/
 *       <ADM_FORM_NUMBER>/
 *         admission/
 *         doctor-notes/
 *         prescriptions/
 *         laboratory/
 *         ultrasound/
 *         operation/
 *         referral/
 *         discharge/
 *         other/
 */

import { localStorageService, PatientIdentityInput } from "./localStorageService";
import { patientDocumentRepository } from "@/repositories/PatientDocumentRepository";

// ─── helpers ───────────────────────────────────────────────────────────────

function isoDate(): string {
  return new Date().toISOString().split("T")[0]; // "2026-09-30"
}

function jsonBuffer(obj: unknown): Buffer {
  return Buffer.from(JSON.stringify(obj, null, 2), "utf-8");
}

// ─── main service ──────────────────────────────────────────────────────────

export class PatientFileArchiveService {
  /**
   * PHASE 4 — Called immediately after a successful AdmissionForm insert.
   *
   * 1. Creates the patient directory (CNIC / MR fallback).
   * 2. Creates the admission sub-directory tree.
   * 3. Archives the admission form data as JSON.
   * 4. Writes a PatientDocument DB record.
   *
   * If the patient has been admitted before the existing directory is reused.
   */
  async onAdmissionCreated(options: {
    patient: PatientIdentityInput;
    admissionFormNumber: string;
    visitId?: string;
    formData: Record<string, unknown>;
    createdById?: string;
  }): Promise<void> {
    const { patient, admissionFormNumber, visitId, formData, createdById } = options;

    try {
      // Build the admission directory (idempotent — safe to call multiple times)
      localStorageService.createAdmissionDirectory(patient, admissionFormNumber);

      const fileName = `admission-${localStorageService.sanitizeName(admissionFormNumber)}-${isoDate()}.json`;

      const saved = localStorageService.saveDocument({
        patient,
        admissionNumberOrId: admissionFormNumber,
        category: "admission",
        fileName,
        data: jsonBuffer(formData),
        mimeType: "application/json",
      });

      await patientDocumentRepository.create({
        patientId: patient.id,
        visitId,
        admissionFormNumber,
        documentType: "ADMISSION",
        documentName: `Admission Form – ${formData.dateOfAdmission ?? isoDate()}`,
        relativePath: saved.relativePath,
        fileName: saved.fileName,
        mimeType: saved.mimeType,
        fileSize: saved.fileSize,
        checksum: saved.checksum,
        status: "ARCHIVED",
        createdById,
      });
    } catch (err: any) {
      console.error("[PatientFileArchive] onAdmissionCreated failed:", err?.message ?? err);
      // Non-blocking — admission DB record already saved; archive failure is logged only
    }
  }

  /**
   * PHASE 5 — Archive a Doctor Note.
   */
  async onDoctorNoteCreated(options: {
    patient: PatientIdentityInput;
    admissionFormNumber: string;
    visitId?: string;
    noteId: string;
    formNumber: string;
    noteData: Record<string, unknown>;
    createdById?: string;
  }): Promise<void> {
    const { patient, admissionFormNumber, visitId, noteId, formNumber, noteData, createdById } = options;

    try {
      const fileName = `docnote-${localStorageService.sanitizeName(formNumber)}-${isoDate()}.json`;

      const saved = localStorageService.saveDocument({
        patient,
        admissionNumberOrId: admissionFormNumber,
        category: "doctor-notes",
        fileName,
        data: jsonBuffer(noteData),
        mimeType: "application/json",
      });

      await patientDocumentRepository.create({
        patientId: patient.id,
        visitId,
        admissionFormNumber,
        documentType: "DOCTOR_NOTE",
        documentName: `Doctor Note – ${formNumber} – ${isoDate()}`,
        relativePath: saved.relativePath,
        fileName: saved.fileName,
        mimeType: saved.mimeType,
        fileSize: saved.fileSize,
        checksum: saved.checksum,
        status: "ARCHIVED",
        createdById,
      });
    } catch (err: any) {
      console.error("[PatientFileArchive] onDoctorNoteCreated failed:", err?.message ?? err);
    }
  }

  /**
   * PHASE 5 — Archive a Prescription.
   */
  async onPrescriptionCreated(options: {
    patient: PatientIdentityInput;
    admissionFormNumber: string;
    visitId?: string;
    prescriptionId: string;
    prescriptionData: Record<string, unknown>;
    createdById?: string;
  }): Promise<void> {
    const { patient, admissionFormNumber, visitId, prescriptionId, prescriptionData, createdById } = options;

    try {
      const fileName = `rx-${localStorageService.sanitizeName(prescriptionId)}-${isoDate()}.json`;

      const saved = localStorageService.saveDocument({
        patient,
        admissionNumberOrId: admissionFormNumber,
        category: "prescriptions",
        fileName,
        data: jsonBuffer(prescriptionData),
        mimeType: "application/json",
      });

      await patientDocumentRepository.create({
        patientId: patient.id,
        visitId,
        admissionFormNumber,
        documentType: "PRESCRIPTION",
        documentName: `Prescription – ${isoDate()}`,
        relativePath: saved.relativePath,
        fileName: saved.fileName,
        mimeType: saved.mimeType,
        fileSize: saved.fileSize,
        checksum: saved.checksum,
        status: "ARCHIVED",
        createdById,
      });
    } catch (err: any) {
      console.error("[PatientFileArchive] onPrescriptionCreated failed:", err?.message ?? err);
    }
  }

  /**
   * PHASE 5 — Archive a Lab Report.
   */
  async onLabReportFinalized(options: {
    patient: PatientIdentityInput;
    admissionFormNumber: string;
    visitId?: string;
    orderNumber: string;
    reportData: Record<string, unknown>;
    imageBase64?: string | null;
    createdById?: string;
  }): Promise<void> {
    const { patient, admissionFormNumber, visitId, orderNumber, reportData, imageBase64, createdById } = options;

    try {
      const safeOrderNum = localStorageService.sanitizeName(orderNumber);
      const jsonFileName = `lab-${safeOrderNum}-${isoDate()}.json`;

      const savedJson = localStorageService.saveDocument({
        patient,
        admissionNumberOrId: admissionFormNumber,
        category: "laboratory",
        fileName: jsonFileName,
        data: jsonBuffer(reportData),
        mimeType: "application/json",
      });

      await patientDocumentRepository.create({
        patientId: patient.id,
        visitId,
        admissionFormNumber,
        documentType: "LABORATORY",
        documentName: `Lab Report – ${orderNumber} – ${isoDate()}`,
        relativePath: savedJson.relativePath,
        fileName: savedJson.fileName,
        mimeType: savedJson.mimeType,
        fileSize: savedJson.fileSize,
        checksum: savedJson.checksum,
        status: "ARCHIVED",
        createdById,
      });

      // If an image was attached, archive it separately
      if (imageBase64) {
        const imgData = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
        const imgFileName = `lab-${safeOrderNum}-${isoDate()}-image.jpg`;
        const savedImg = localStorageService.saveDocument({
          patient,
          admissionNumberOrId: admissionFormNumber,
          category: "laboratory",
          fileName: imgFileName,
          data: imgData,
          mimeType: "image/jpeg",
        });
        await patientDocumentRepository.create({
          patientId: patient.id,
          visitId,
          admissionFormNumber,
          documentType: "LABORATORY",
          documentName: `Lab Report Image – ${orderNumber} – ${isoDate()}`,
          relativePath: savedImg.relativePath,
          fileName: savedImg.fileName,
          mimeType: savedImg.mimeType,
          fileSize: savedImg.fileSize,
          checksum: savedImg.checksum,
          status: "ARCHIVED",
          createdById,
        });
      }
    } catch (err: any) {
      console.error("[PatientFileArchive] onLabReportFinalized failed:", err?.message ?? err);
    }
  }

  /**
   * PHASE 5 — Archive an Ultrasound Report.
   */
  async onUltrasoundReportFinalized(options: {
    patient: PatientIdentityInput;
    admissionFormNumber: string;
    visitId?: string;
    orderNumber: string;
    reportData: Record<string, unknown>;
    imageBase64?: string | null;
    createdById?: string;
  }): Promise<void> {
    const { patient, admissionFormNumber, visitId, orderNumber, reportData, imageBase64, createdById } = options;

    try {
      const safeOrderNum = localStorageService.sanitizeName(orderNumber);
      const jsonFileName = `usg-${safeOrderNum}-${isoDate()}.json`;

      const savedJson = localStorageService.saveDocument({
        patient,
        admissionNumberOrId: admissionFormNumber,
        category: "ultrasound",
        fileName: jsonFileName,
        data: jsonBuffer(reportData),
        mimeType: "application/json",
      });

      await patientDocumentRepository.create({
        patientId: patient.id,
        visitId,
        admissionFormNumber,
        documentType: "ULTRASOUND",
        documentName: `Ultrasound Report – ${orderNumber} – ${isoDate()}`,
        relativePath: savedJson.relativePath,
        fileName: savedJson.fileName,
        mimeType: savedJson.mimeType,
        fileSize: savedJson.fileSize,
        checksum: savedJson.checksum,
        status: "ARCHIVED",
        createdById,
      });

      if (imageBase64) {
        const imgData = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
        const imgFileName = `usg-${safeOrderNum}-${isoDate()}-image.jpg`;
        const savedImg = localStorageService.saveDocument({
          patient,
          admissionNumberOrId: admissionFormNumber,
          category: "ultrasound",
          fileName: imgFileName,
          data: imgData,
          mimeType: "image/jpeg",
        });
        await patientDocumentRepository.create({
          patientId: patient.id,
          visitId,
          admissionFormNumber,
          documentType: "ULTRASOUND",
          documentName: `Ultrasound Image – ${orderNumber} – ${isoDate()}`,
          relativePath: savedImg.relativePath,
          fileName: savedImg.fileName,
          mimeType: savedImg.mimeType,
          fileSize: savedImg.fileSize,
          checksum: savedImg.checksum,
          status: "ARCHIVED",
          createdById,
        });
      }
    } catch (err: any) {
      console.error("[PatientFileArchive] onUltrasoundReportFinalized failed:", err?.message ?? err);
    }
  }

  /**
   * PHASE 5 — Archive an Operation Note.
   */
  async onOperationNoteCreated(options: {
    patient: PatientIdentityInput;
    admissionFormNumber: string;
    visitId?: string;
    formNumber: string;
    operationData: Record<string, unknown>;
    createdById?: string;
  }): Promise<void> {
    const { patient, admissionFormNumber, visitId, formNumber, operationData, createdById } = options;

    try {
      const fileName = `opnote-${localStorageService.sanitizeName(formNumber)}-${isoDate()}.json`;

      const saved = localStorageService.saveDocument({
        patient,
        admissionNumberOrId: admissionFormNumber,
        category: "operation",
        fileName,
        data: jsonBuffer(operationData),
        mimeType: "application/json",
      });

      await patientDocumentRepository.create({
        patientId: patient.id,
        visitId,
        admissionFormNumber,
        documentType: "OPERATION",
        documentName: `Operation Note – ${formNumber} – ${isoDate()}`,
        relativePath: saved.relativePath,
        fileName: saved.fileName,
        mimeType: saved.mimeType,
        fileSize: saved.fileSize,
        checksum: saved.checksum,
        status: "ARCHIVED",
        createdById,
      });
    } catch (err: any) {
      console.error("[PatientFileArchive] onOperationNoteCreated failed:", err?.message ?? err);
    }
  }

  /**
   * PHASE 5 — Archive a Referral Form.
   */
  async onReferralFormCreated(options: {
    patient: PatientIdentityInput;
    admissionFormNumber: string;
    visitId?: string;
    formNumber: string;
    referralData: Record<string, unknown>;
    createdById?: string;
  }): Promise<void> {
    const { patient, admissionFormNumber, visitId, formNumber, referralData, createdById } = options;

    try {
      const fileName = `ref-${localStorageService.sanitizeName(formNumber)}-${isoDate()}.json`;

      const saved = localStorageService.saveDocument({
        patient,
        admissionNumberOrId: admissionFormNumber,
        category: "referral",
        fileName,
        data: jsonBuffer(referralData),
        mimeType: "application/json",
      });

      await patientDocumentRepository.create({
        patientId: patient.id,
        visitId,
        admissionFormNumber,
        documentType: "REFERRAL",
        documentName: `Referral Form – ${formNumber} – ${isoDate()}`,
        relativePath: saved.relativePath,
        fileName: saved.fileName,
        mimeType: saved.mimeType,
        fileSize: saved.fileSize,
        checksum: saved.checksum,
        status: "ARCHIVED",
        createdById,
      });
    } catch (err: any) {
      console.error("[PatientFileArchive] onReferralFormCreated failed:", err?.message ?? err);
    }
  }

  /**
   * PHASE 5 — Archive a Discharge Form.
   */
  async onDischargeFormCreated(options: {
    patient: PatientIdentityInput;
    admissionFormNumber: string;
    visitId?: string;
    formNumber: string;
    dischargeData: Record<string, unknown>;
    createdById?: string;
  }): Promise<void> {
    const { patient, admissionFormNumber, visitId, formNumber, dischargeData, createdById } = options;

    try {
      const fileName = `dis-${localStorageService.sanitizeName(formNumber)}-${isoDate()}.json`;

      const saved = localStorageService.saveDocument({
        patient,
        admissionNumberOrId: admissionFormNumber,
        category: "discharge",
        fileName,
        data: jsonBuffer(dischargeData),
        mimeType: "application/json",
      });

      await patientDocumentRepository.create({
        patientId: patient.id,
        visitId,
        admissionFormNumber,
        documentType: "DISCHARGE",
        documentName: `Discharge Summary – ${formNumber} – ${isoDate()}`,
        relativePath: saved.relativePath,
        fileName: saved.fileName,
        mimeType: saved.mimeType,
        fileSize: saved.fileSize,
        checksum: saved.checksum,
        status: "ARCHIVED",
        createdById,
      });
    } catch (err: any) {
      console.error("[PatientFileArchive] onDischargeFormCreated failed:", err?.message ?? err);
    }
  }
}

export const patientFileArchiveService = new PatientFileArchiveService();
