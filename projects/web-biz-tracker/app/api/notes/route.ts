import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateNoteSchema = z.object({
  content: z.string().min(1),
  prospectId: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const prospectId = searchParams.get("prospectId");

  const notes = await prisma.feedNote.findMany({
    where: prospectId ? { prospectId } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      author: { select: { id: true, name: true } },
      prospect: { select: { id: true, name: true, businessName: true } },
    },
  });

  return NextResponse.json(notes);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const note = await prisma.feedNote.create({
    data: {
      content: parsed.data.content,
      prospectId: parsed.data.prospectId ?? null,
      authorId: session.user.id,
    },
    include: {
      author: { select: { id: true, name: true } },
      prospect: { select: { id: true, name: true, businessName: true } },
    },
  });

  return NextResponse.json(note, { status: 201 });
}
