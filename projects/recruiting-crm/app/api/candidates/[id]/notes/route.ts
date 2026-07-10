import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { NoteType } from "@prisma/client";

const schema = z.object({
  content: z.string().min(1).max(5000).trim(),
  type: z.nativeEnum(NoteType).default("GENERAL"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const exists = await prisma.candidate.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
  }

  const note = await prisma.note.create({
    data: {
      content: parsed.data.content,
      type: parsed.data.type,
      candidateId: id,
      authorId: token.id as string,
    },
    include: {
      author: { select: { name: true } },
    },
  });

  // Log note activity
  await prisma.activityLog.create({
    data: {
      type: "NOTE_ADDED",
      description: `Note added (${parsed.data.type})`,
      candidateId: id,
      userId: token.id as string,
    },
  }).catch((e) => console.error("[AUDIT] Activity log write failed:", e));

  return NextResponse.json(note, { status: 201 });
}
