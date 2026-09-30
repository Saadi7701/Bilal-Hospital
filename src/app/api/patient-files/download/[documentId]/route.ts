import { NextResponse } from "next/server";
import { patientDocumentRepository } from "@/repositories/PatientDocumentRepository";
import { localStorageService } from "@/lib/localStorageService";

/**
 * GET /api/patient-files/download/[documentId]
 *
 * Secure document download endpoint.
 * - Looks up the PatientDocument record by ID.
 * - Validates the file exists on disk (never exposes path to client).
 * - Streams the file content as a download response.
 * - Path traversal is prevented inside localStorageService.resolveSafePath().
 */
export async function GET(
  req: Request,
  { params }: { params: { documentId: string } }
) {
  try {
    const { documentId } = params;

    if (!documentId || documentId.length < 10) {
      return NextResponse.json({ error: "Invalid document ID." }, { status: 400 });
    }

    // Fetch DB record — contains trusted relative path
    const doc = await patientDocumentRepository.findById(documentId);
    if (!doc) {
      return NextResponse.json({ error: "Document record not found." }, { status: 404 });
    }

    if (doc.status === "ERROR") {
      return NextResponse.json(
        { error: "Document has an archive error. File may not be available." },
        { status: 410 }
      );
    }

    // Verify file exists on disk using safe path resolution
    if (!localStorageService.documentExists(doc.relativePath)) {
      // Mark as error in DB
      await patientDocumentRepository.markError(doc.id, "File not found on disk during download attempt.");
      return NextResponse.json(
        { error: "Document file not found on server disk." },
        { status: 404 }
      );
    }

    // Read file safely
    const fileBuffer = localStorageService.getDocument(doc.relativePath);
    const uint8Array = new Uint8Array(fileBuffer);

    return new Response(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.fileName)}"`,
        "Content-Length": String(fileBuffer.length),
        "X-Document-Name": doc.documentName,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("[Patient File Download Error]:", error);
    return NextResponse.json(
      { error: "Failed to download document." },
      { status: 500 }
    );
  }
}
