import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { readFile, writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { sanitizeFilename } from "@/lib/validations/intake";
import { resolveUploadPath } from "@/lib/upload-path";
import { validateFileMagic } from "@/lib/validate-mime";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];
const MAX_FILE_BYTES = 15 * 1024 * 1024;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check — must be logged in
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    select: {
      resumeStoragePath: true,
      resumeFileName: true,
      resumeMimeType: true,
      id: true,
    },
  });

  if (!candidate || !candidate.resumeStoragePath) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  const absPath = resolveUploadPath(candidate.resumeStoragePath);
  if (!absPath) return NextResponse.json({ error: "Invalid file path" }, { status: 400 });

  let fileBuffer: Buffer;
  try {
    fileBuffer = await readFile(absPath);
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }

  // Log resume view
  prisma.activityLog.create({
    data: {
      type: "RESUME_VIEWED",
      description: "Resume viewed",
      candidateId: candidate.id,
      userId: token.id as string,
    },
  }).catch((e) => console.error("[AUDIT] Activity log write failed:", e));

  const mimeType = candidate.resumeMimeType ?? "application/octet-stream";
  const filename = candidate.resumeFileName ?? "resume.pdf";
  const asDownload = req.nextUrl.searchParams.get("download") === "1";
  const disposition = asDownload ? "attachment" : "inline";

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Content-Length": fileBuffer.length.toString(),
      "Cache-Control": "no-store",
    },
  });
}

// ── POST: Upload / replace resume ─────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Hosted demo runs on serverless (read-only filesystem) — no disk uploads.
  if (process.env.DEMO_MODE === "1") {
    return NextResponse.json(
      { error: "File uploads are disabled in this hosted demo — clone the repo and run it locally to try them." },
      { status: 403 }
    );
  }

  const { id } = await params;

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    select: { id: true, resumeStoragePath: true, firstName: true, lastName: true },
  });
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("resume") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const mimeType = file.type.toLowerCase().trim();
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json({ error: "Invalid file type. Only PDF and DOCX are accepted." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File exceeds 15MB limit." }, { status: 400 });
  }

  const fileBuffer = await file.arrayBuffer();
  const magicValid = await validateFileMagic(fileBuffer, mimeType);
  if (!magicValid) {
    return NextResponse.json({ error: "File content does not match its declared type." }, { status: 400 });
  }

  // Remove old resume file if one exists
  if (candidate.resumeStoragePath) {
    const oldPath = resolveUploadPath(candidate.resumeStoragePath);
    if (oldPath) await unlink(oldPath).catch(() => {});
  }

  // Auto-name as "Lastname, Firstname.ext" — display name keeps the comma,
  // disk filename uses a sanitized version (commas → underscore) for storage safety.
  const origExt = file.name.includes(".") ? file.name.split(".").pop()! : "pdf";
  const displayName = `${candidate.lastName}, ${candidate.firstName}.${origExt}`;
  const diskName = sanitizeFilename(displayName); // e.g. "Doe_ Jane.pdf" — disk only
  const dir = join(process.cwd(), "uploads", "candidates", id);
  const absPath = join(dir, diskName);

  await mkdir(dir, { recursive: true });
  await writeFile(absPath, Buffer.from(fileBuffer));

  await prisma.candidate.update({
    where: { id },
    data: {
      resumeFileName: displayName,          // "Doe, Jane.pdf" — shown in UI + download
      resumeMimeType: mimeType,
      resumeStoragePath: `candidates/${id}/${diskName}`,  // sanitized for disk
      resumeUploadedAt: new Date(),
    },
  });

  await prisma.activityLog.create({
    data: {
      type: "RESUME_VIEWED", // closest available type — tracks resume activity
      description: candidate.resumeStoragePath ? "Resume replaced" : "Resume uploaded",
      userId: token.id as string,
      candidateId: id,
    },
  }).catch((e) => console.error("[AUDIT] Activity log write failed:", e));

  return NextResponse.json({ success: true });
}

// ── PATCH: Rename resume display filename ─────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: { fileName?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const fileName = body.fileName?.trim();
  if (!fileName) return NextResponse.json({ error: "fileName is required" }, { status: 400 });

  const candidate = await prisma.candidate.findUnique({ where: { id }, select: { id: true } });
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.candidate.update({ where: { id }, data: { resumeFileName: fileName } });

  return NextResponse.json({ success: true });
}
