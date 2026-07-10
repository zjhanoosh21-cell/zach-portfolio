import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { NoteType } from "@prisma/client";

const schema = z.object({
  content: z.string().min(1).max(5000).trim(),
  type: z.nativeEnum(NoteType),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, noteId } = await params;

  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: { id: true, candidateId: true },
  });
  if (!note || note.candidateId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.note.update({
    where: { id: noteId },
    data: { content: parsed.data.content, type: parsed.data.type },
    select: { id: true, content: true, type: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, noteId } = await params;

  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: { id: true, candidateId: true },
  });
  if (!note || note.candidateId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.note.delete({ where: { id: noteId } });

  return NextResponse.json({ success: true });
}
