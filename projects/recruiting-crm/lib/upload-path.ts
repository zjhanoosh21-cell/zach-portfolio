import { resolve, relative, isAbsolute } from "path";

const UPLOADS_DIR = resolve(process.cwd(), "uploads");

/**
 * Resolves a stored relative path to an absolute filesystem path,
 * ensuring it stays within the uploads directory (prevents path traversal).
 * Uses resolve() + relative() so ".." sequences are handled by the OS path
 * resolution rather than brittle string manipulation.
 * Returns the absolute path, or null if the path is invalid/outside uploads.
 */
export function resolveUploadPath(storagePath: string): string | null {
  const absPath = resolve(UPLOADS_DIR, storagePath);
  const rel = relative(UPLOADS_DIR, absPath);
  // If relative path starts with ".." or is absolute, it escaped the uploads dir
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) return null;
  return absPath;
}
