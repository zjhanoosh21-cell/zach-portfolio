import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const NOTE_TYPES = ["GENERAL", "PHONE_SCREEN", "INTERVIEW_NOTES", "REFERENCE_CHECK", "CLIENT_FEEDBACK", "INTERNAL"] as const;

const schema = z.object({
  content: z.string().min(1).max(5000).trim(),
  type: z.enum(NOTE_TYPES).default("CLIENT_FEEDBACK"),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const notes = await prisma.note.findMany({
    where: { submissionId: id },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json(notes);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id },
    select: { id: true, candidateId: true, jobOrder: { select: { title: true } } },
  });
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  const note = await prisma.note.create({
    data: {
      content: parsed.data.content,
      type: parsed.data.type,
      submissionId: id,
      candidateId: submission.candidateId, // also link to candidate so it appears on their profile
      authorId: token.id as string,
    },
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json(note, { status: 201 });
}
