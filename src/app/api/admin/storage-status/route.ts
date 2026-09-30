import { NextResponse } from "next/server";
import { localStorageService } from "@/lib/localStorageService";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/storage-status
 *
 * Returns disk usage metrics for the Patient File Archive.
 * Admin-only endpoint for monitoring storage health.
 */
export async function GET() {
  try {
    const metrics = localStorageService.getStorageMetrics();

    // Count documents in DB
    const totalDbDocuments = await prisma.patientDocument.count();
    const errorDocuments = await prisma.patientDocument.count({ where: { status: "ERROR" } });
    const archivedDocuments = await prisma.patientDocument.count({ where: { status: "ARCHIVED" } });
    const verifiedDocuments = await prisma.patientDocument.count({ where: { status: "VERIFIED" } });

    // Disk space warning threshold: warn if less than 500 MB free
    // Since we cannot get OS-level disk free space from Node.js easily without native modules,
    // we report what we can and recommend admins monitor disk externally.
    const warnings: string[] = [];
    if (totalDbDocuments !== metrics.totalFiles) {
      warnings.push(
        `DB record count (${totalDbDocuments}) does not match filesystem file count (${metrics.totalFiles}). Consider running an integrity check.`
      );
    }
    if (errorDocuments > 0) {
      warnings.push(`${errorDocuments} document(s) have archive errors. Review PatientDocument table for status=ERROR records.`);
    }

    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        storage: {
          rootPath: metrics.rootPath,
          totalPatientFolders: metrics.totalPatientFolders,
          totalFiles: metrics.totalFiles,
          totalSizeBytes: metrics.totalSizeBytes,
          totalSizeMB: metrics.totalSizeMB,
        },
        database: {
          totalDocuments: totalDbDocuments,
          archivedDocuments,
          verifiedDocuments,
          errorDocuments,
        },
        warnings,
        healthy: warnings.length === 0,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Storage Status Error]:", error);
    return NextResponse.json(
      { error: "Failed to retrieve storage status: " + error.message },
      { status: 500 }
    );
  }
}
