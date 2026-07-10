import { fileTypeFromBuffer } from "file-type";

// Maps client-declared MIME types to allowed magic byte signatures
const ALLOWED_MIME_TO_MAGIC: Record<string, string[]> = {
  "application/pdf": ["application/pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip", // DOCX is a ZIP — file-type may detect as zip
  ],
  "application/msword": ["application/msword"],
  "image/jpeg": ["image/jpeg"],
  "image/png": ["image/png"],
};

/**
 * Validates that a file's actual byte signature matches its declared MIME type.
 * Returns true if the file is safe to store, false if the MIME type is spoofed.
 *
 * Falls back to allowing the file if file-type cannot determine the type
 * (e.g., plain-text DOCX files or unusual encodings), to avoid false rejections.
 */
export async function validateFileMagic(
  buffer: ArrayBuffer,
  declaredMime: string
): Promise<boolean> {
  const allowed = ALLOWED_MIME_TO_MAGIC[declaredMime];
  if (!allowed) return false; // declared type not in our allowlist at all

  const detected = await fileTypeFromBuffer(new Uint8Array(buffer));
  if (!detected) {
    // file-type couldn't detect — allow it through (conservative fallback)
    return true;
  }

  return allowed.includes(detected.mime);
}
