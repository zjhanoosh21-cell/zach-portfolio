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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const attachments = await prisma.jobAttachment.findMany({
    where: { jobOrderId: id },
    orderBy: { uploadedAt: "desc" },
  });
  return NextResponse.json(attachments);
}

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

  const job = await prisma.jobOrder.findUnique({ where: { id }, select: { id: true } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data" }, { status: 400 }); }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const mimeType = file.type.toLowerCase().trim();
  if (!ALLOWED_MIME_TYPES.includes(mimeType))
    return NextResponse.json({ error: "Invalid file type. Accepted: PDF, DOCX, DOC, JPG, PNG." }, { status: 400 });
  if (file.size > MAX_FILE_BYTES)
    return NextResponse.json({ error: "File exceeds 15MB limit." }, { status: 400 });

  const fileBuffer = await file.arrayBuffer();
  const magicValid = await validateFileMagic(fileBuffer, mimeType);
  if (!magicValid)
    return NextResponse.json({ error: "File content does not match its declared type." }, { status: 400 });

  const safeFilename = sanitizeFilename(file.name);
  const diskFilename = `${Date.now()}-${safeFilename}`;
  const dir = join(process.cwd(), "uploads", "jobs", id);
  const filepath = join(dir, diskFilename);

  try {
    await mkdir(dir, { recursive: true });
    await writeFile(filepath, Buffer.from(fileBuffer));

    const attachment = await prisma.jobAttachment.create({
      data: {
        jobOrderId: id,
        fileName: safeFilename,
        mimeType,
        storagePath: `jobs/${id}/${diskFilename}`,
      },
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (e: unknown) {
    // Clean up file if database write failed
    await unlink(filepath).catch(() => {});
    const isPrismaNotFound = (e as { code?: string })?.code === 'P2025';
    if (isPrismaNotFound) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
