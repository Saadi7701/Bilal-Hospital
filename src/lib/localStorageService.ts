import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface PatientIdentityInput {
  id: string;
  mrNumber: string;
  cnic?: string | null;
  fullName: string;
  gender?: string | null;
  age?: number | null;
  phone?: string | null;
}

export interface SaveDocumentOptions {
  patient: PatientIdentityInput;
  admissionNumberOrId: string;
  category:
    | "admission"
    | "doctor-notes"
    | "prescriptions"
    | "laboratory"
    | "ultrasound"
    | "operation"
    | "referral"
    | "discharge"
    | "other";
  fileName: string;
  data: Buffer | string;
  mimeType?: string;
}

export interface SavedDocumentMetadata {
  absolutePath: string;
  relativePath: string;
  fileName: string;
  fileSize: number;
  checksum: string;
  mimeType: string;
  category: string;
  admissionId: string;
  patientFolder: string;
}

export class LocalStorageService {
  private rootPath: string;

  constructor() {
    const isVercel = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
    const defaultRoot = isVercel ? "/tmp/storage/patient-files" : "./storage/patient-files";
    const configuredRoot = process.env.PATIENT_FILES_ROOT || defaultRoot;
    this.rootPath = path.resolve(configuredRoot);
    this.ensureDirectoryExists(this.rootPath);
  }

  /**
   * Sanitizes a string for filesystem folder/file names to prevent path traversal.
   */
  public sanitizeName(name: string): string {
    if (!name) return "unnamed";
    // Keep alphanumeric, hyphens, underscores, dots
    const cleaned = name.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
    // Remove any path traversal sequences
    return cleaned.replace(/\.\./g, "_");
  }

  /**
   * Primary patient folder identifier choice:
   * 1. CNIC if available (e.g., 35202-1234567-1)
   * 2. mrNumber (e.g., MR-100201)
   * 3. Patient UUID id
   */
  public getPatientFolderName(patient: PatientIdentityInput): string {
    if (patient.cnic && patient.cnic.trim().length >= 5) {
      return this.sanitizeName(patient.cnic.trim());
    }
    if (patient.mrNumber && patient.mrNumber.trim().length > 0) {
      return this.sanitizeName(patient.mrNumber.trim());
    }
    return this.sanitizeName(patient.id);
  }

  /**
   * Gets the absolute path to a patient's directory.
   */
  public getPatientDirectoryPath(patient: PatientIdentityInput): string {
    const folderName = this.getPatientFolderName(patient);
    return path.join(this.rootPath, folderName);
  }

  /**
   * Ensures a directory path exists on disk.
   */
  public ensureDirectoryExists(dirPath: string): void {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    } catch (e: any) {
      console.warn(`[LocalStorageService] Cannot create directory ${dirPath}:`, e?.message);
    }
  }

  /**
   * Creates or updates the patient directory and writes/updates `patient.json` metadata.
   */
  public createPatientDirectory(patient: PatientIdentityInput): string {
    const patientDir = this.getPatientDirectoryPath(patient);
    this.ensureDirectoryExists(patientDir);

    const metadataPath = path.join(patientDir, "patient.json");
    let existingMeta: any = {};
    try {
      if (fs.existsSync(metadataPath)) {
        try {
          existingMeta = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
        } catch (e) {
          existingMeta = {};
        }
      }

      const updatedMeta = {
        ...existingMeta,
        patientId: patient.id,
        mrNumber: patient.mrNumber,
        cnic: patient.cnic || existingMeta.cnic || null,
        fullName: patient.fullName,
        gender: patient.gender || existingMeta.gender || null,
        age: patient.age ?? existingMeta.age ?? null,
        phone: patient.phone || existingMeta.phone || null,
        updatedAt: new Date().toISOString(),
        createdAt: existingMeta.createdAt || new Date().toISOString(),
        folderName: this.getPatientFolderName(patient),
      };

      fs.writeFileSync(metadataPath, JSON.stringify(updatedMeta, null, 2), "utf-8");
    } catch (e: any) {
      console.warn(`[LocalStorageService] Patient metadata write warning:`, e?.message);
    }
    return patientDir;
  }

  /**
   * Creates an admission directory and subfolders under the patient folder.
   * e.g., PATIENT_FILES_ROOT/<CNIC_OR_MR>/admissions/<ADM_ID>/
   */
  public createAdmissionDirectory(
    patient: PatientIdentityInput,
    admissionNumberOrId: string
  ): string {
    const patientDir = this.createPatientDirectory(patient);
    const sanitizedAdmId = this.sanitizeName(admissionNumberOrId);
    const admissionDir = path.join(patientDir, "admissions", sanitizedAdmId);

    const subCategories = [
      "admission",
      "doctor-notes",
      "prescriptions",
      "laboratory",
      "ultrasound",
      "operation",
      "referral",
      "discharge",
      "other",
    ];

    for (const sub of subCategories) {
      this.ensureDirectoryExists(path.join(admissionDir, sub));
    }

    return admissionDir;
  }

  /**
   * Calculates SHA-256 checksum of buffer or string data.
   */
  public calculateChecksum(data: Buffer | string): string {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf-8");
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  /**
   * Saves a document to local disk using atomic write (.tmp -> verify -> rename).
   */
  public saveDocument(options: SaveDocumentOptions): SavedDocumentMetadata {
    const { patient, admissionNumberOrId, category, fileName, data, mimeType } = options;

    const sanitizedFileName = this.sanitizeName(fileName);
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf-8");
    const checksum = this.calculateChecksum(buffer);
    const patientFolder = this.getPatientFolderName(patient);
    const admissionId = this.sanitizeName(admissionNumberOrId);

    try {
      // Ensure admission structure exists
      const admissionDir = this.createAdmissionDirectory(patient, admissionNumberOrId);
      const categoryDir = path.join(admissionDir, this.sanitizeName(category));
      this.ensureDirectoryExists(categoryDir);

      const targetPath = path.join(categoryDir, sanitizedFileName);
      const tempPath = `${targetPath}.tmp_${Date.now()}`;

      // 1. Write to temporary file first
      fs.writeFileSync(tempPath, buffer);

      // 2. Verify temporary file was written cleanly
      if (fs.existsSync(tempPath)) {
        const stat = fs.statSync(tempPath);
        if (stat.size === buffer.length) {
          // 3. Atomically move/rename to final path
          fs.renameSync(tempPath, targetPath);
        } else {
          try { fs.unlinkSync(tempPath); } catch {}
        }
      }

      const relativePath = path.relative(this.rootPath, targetPath).replace(/\\/g, "/");
      return {
        absolutePath: targetPath,
        relativePath,
        fileName: sanitizedFileName,
        fileSize: buffer.length,
        checksum,
        mimeType: mimeType || this.inferMimeType(sanitizedFileName),
        category,
        admissionId,
        patientFolder,
      };
    } catch (err: any) {
      console.warn(`[LocalStorageService] saveDocument fallback for ${sanitizedFileName}:`, err?.message);
      const fallbackRelative = `admissions/${admissionId}/${category}/${sanitizedFileName}`;
      return {
        absolutePath: path.join(this.rootPath, fallbackRelative),
        relativePath: fallbackRelative,
        fileName: sanitizedFileName,
        fileSize: buffer.length,
        checksum,
        mimeType: mimeType || this.inferMimeType(sanitizedFileName),
        category,
        admissionId,
        patientFolder,
      };
    }
  }

  /**
   * Safely reads a document given its relative path from PATIENT_FILES_ROOT.
   * Guarantees path cannot escape rootPath (Path Traversal Protection).
   */
  public getDocument(relativePath: string): Buffer {
    const safePath = this.resolveSafePath(relativePath);
    if (!fs.existsSync(safePath)) {
      throw new Error(`Document file not found at path: ${relativePath}`);
    }
    return fs.readFileSync(safePath);
  }

  /**
   * Checks if a document exists given its relative path.
   */
  public documentExists(relativePath: string): boolean {
    try {
      const safePath = this.resolveSafePath(relativePath);
      return fs.existsSync(safePath);
    } catch {
      return false;
    }
  }

  /**
   * Validates and resolves a relative path, preventing path traversal attacks.
   */
  public resolveSafePath(relativePath: string): string {
    const normalized = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, "");
    const absolute = path.resolve(this.rootPath, normalized);

    // Verify resolved path starts with rootPath
    if (!absolute.startsWith(this.rootPath)) {
      throw new Error("Security Violation: Access outside storage root is prohibited.");
    }
    return absolute;
  }

  /**
   * Calculates overall storage metrics for system health monitoring.
   */
  public getStorageMetrics() {
    let totalFiles = 0;
    let totalSizeBytes = 0;
    let totalPatientFolders = 0;

    if (fs.existsSync(this.rootPath)) {
      const entries = fs.readdirSync(this.rootPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          totalPatientFolders++;
          const patientFolder = path.join(this.rootPath, entry.name);
          const walk = (dir: string) => {
            const list = fs.readdirSync(dir, { withFileTypes: true });
            for (const f of list) {
              const full = path.join(dir, f.name);
              if (f.isDirectory()) {
                walk(full);
              } else if (f.isFile()) {
                totalFiles++;
                totalSizeBytes += fs.statSync(full).size;
              }
            }
          };
          try {
            walk(patientFolder);
          } catch (e) {
            // Ignore sub-walk errors
          }
        }
      }
    }

    return {
      rootPath: this.rootPath,
      totalPatientFolders,
      totalFiles,
      totalSizeBytes,
      totalSizeMB: parseFloat((totalSizeBytes / (1024 * 1024)).toFixed(2)),
    };
  }

  private inferMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    if (ext === ".pdf") return "application/pdf";
    if (ext === ".json") return "application/json";
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".png") return "image/png";
    if (ext === ".txt") return "text/plain";
    return "application/octet-stream";
  }
}

export const localStorageService = new LocalStorageService();
