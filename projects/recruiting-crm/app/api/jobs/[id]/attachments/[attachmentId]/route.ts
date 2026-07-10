import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { readFile, unlink } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { resolveUploadPath } from "@/lib/upload-path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, attachmentId } = await params;
  const attachment = await prisma.jobAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment || attachment.jobOrderId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const absPath = resolveUploadPath(attachment.storagePath);
  if (!absPath) return NextResponse.json({ error: "Invalid file path" }, { status: 400 });

  let fileBuffer: Buffer;
  try {
    fileBuffer = await readFile(absPath);
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `inline; filename="${attachment.fileName}"`,
      "Content-Length": fileBuffer.length.toString(),
      "Cache-Control": "no-store",
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, attachmentId } = await params;
  const attachment = await prisma.jobAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment || attachment.jobOrderId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const absPath = resolveUploadPath(attachment.storagePath);
  if (absPath) await unlink(absPath).catch(() => {});

  await prisma.jobAttachment.delete({ where: { id: attachmentId } });

  await prisma.activityLog.create({
    data: {
      type: "PROFILE_UPDATED",
      description: `Job attachment deleted: ${attachment.fileName}`,
      userId: token.id as string,
      jobOrderId: id,
    },
  }).catch((e) => console.error("[AUDIT] Activity log write failed:", e));

  return NextResponse.json({ success: true });
}
