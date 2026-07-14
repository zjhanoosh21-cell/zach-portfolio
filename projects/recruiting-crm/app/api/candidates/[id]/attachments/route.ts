import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { sanitizeFilename } from "@/lib/validations/intake";
import { validateFileMagic } from "@/lib/validate-mime";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/jpeg",
  "image/png",
];
const MAX_FILE_BYTES = 15 * 1024 * 1024;

// GET — list all attachments for a candidate
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const attachments = await prisma.candidateAttachment.findMany({
    where: { candidateId: id },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json(attachments);
}

// POST — upload a new attachment
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

  const candidate = await prisma.candidate.findUnique({ where: { id }, select: { id: true, firstName: true, lastName: true } });
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const mimeType = file.type.toLowerCase().trim();
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { error: "Invalid file type. Accepted: PDF, DOCX, DOC, JPG, PNG." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File exceeds 15MB limit." }, { status: 400 });
  }

  const fileBuffer = await file.arrayBuffer();
  const magicValid = await validateFileMagic(fileBuffer, mimeType);
  if (!magicValid) {
    return NextResponse.json({ error: "File content does not match its declared type." }, { status: 400 });
  }

  const origExt = file.name.includes(".") ? file.name.split(".").pop()! : "bin";
  const baseName = `${candidate.lastName}, ${candidate.firstName}`;

  // Find next available display name (with comma) to avoid collisions
  const existing = await prisma.candidateAttachment.findMany({
    where: { candidateId: id },
    select: { fileName: true },
  });
  const usedNames = new Set(existing.map((a) => a.fileName));
  let displayName = `${baseName}.${origExt}`;
  let counter = 1;
  while (usedNames.has(displayName)) {
    displayName = `${baseName} (${counter}).${origExt}`;
    counter++;
  }

  // Sanitize separately for disk storage — commas become underscores on disk
  const diskFilename = `${Date.now()}-${sanitizeFilename(displayName)}`;
  const dir = join(process.cwd(), "uploads", "candidates", id, "attachments");
  const absPath = join(dir, diskFilename);

  await mkdir(dir, { recursive: true });
  await writeFile(absPath, Buffer.from(fileBuffer));

  let attachment;
  try {
    attachment = await prisma.candidateAttachment.create({
      data: {
        candidateId: id,
        fileName: displayName,
        mimeType,
        storagePath: `candidates/${id}/attachments/${diskFilename}`,
      },
    });
  } catch (err) {
    console.error("Failed to create attachment record:", err);
    // Clean up the file we already wrote to avoid orphaning it
    await unlink(absPath).catch(() => {});
    return NextResponse.json({ error: "Failed to save attachment" }, { status: 500 });
  }

  await prisma.activityLog.create({
    data: {
      type: "RESUME_VIEWED", // closest available type — tracks file activity
      description: `Attachment uploaded: ${displayName}`,
      userId: token.id as string,
      candidateId: id,
    },
  }).catch((e) => console.error("[AUDIT] Activity log write failed:", e));

  return NextResponse.json(attachment, { status: 201 });
}
