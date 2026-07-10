import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { readFile, unlink } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { resolveUploadPath } from "@/lib/upload-path";

// GET — serve an attachment file
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, attachmentId } = await params;
  const attachment = await prisma.candidateAttachment.findUnique({
    where: { id: attachmentId },
  });
  if (!attachment || attachment.candidateId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const absPath = resolveUploadPath(attachment.storagePath);
  if (!absPath) return NextResponse.json({ error: "Invalid file path" }, { status: 400 });

  let fileBuffer: Buffer;
  try {
    fileBuffer = await readFile(absPath);
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }

  const asDownload = req.nextUrl.searchParams.get("download") === "1";
  const disposition = asDownload ? "attachment" : "inline";

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `${disposition}; filename="${attachment.fileName}"`,
      "Content-Length": fileBuffer.length.toString(),
      "Cache-Control": "no-store",
    },
  });
}

// PATCH — rename an attachment's display filename
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, attachmentId } = await params;

  let body: { fileName?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const fileName = body.fileName?.trim();
  if (!fileName) return NextResponse.json({ error: "fileName is required" }, { status: 400 });

  const attachment = await prisma.candidateAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment || attachment.candidateId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.candidateAttachment.update({ where: { id: attachmentId }, data: { fileName } });

  return NextResponse.json({ success: true });
}

// DELETE — delete an attachment
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, attachmentId } = await params;
  const attachment = await prisma.candidateAttachment.findUnique({
    where: { id: attachmentId },
  });
  if (!attachment || attachment.candidateId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete file from disk — resolveUploadPath guards against path traversal
  const absPath = resolveUploadPath(attachment.storagePath);
  if (absPath) await unlink(absPath).catch(() => {});

  await prisma.candidateAttachment.delete({ where: { id: attachmentId } });

  await prisma.activityLog.create({
    data: {
      type: "RESUME_VIEWED", // closest available type — tracks file activity
      description: `Attachment deleted: ${attachment.fileName}`,
      userId: token.id as string,
      candidateId: id,
    },
  }).catch((e) => console.error("[AUDIT] Activity log write failed:", e));

  return NextResponse.json({ success: true });
}
