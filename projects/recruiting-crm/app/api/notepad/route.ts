import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const pageSchema = z.object({
  id: z.string(),
  title: z.string().max(60),
  content: z.string().max(20000),
});

const putSchema = z.object({
  pages: z.array(pageSchema).min(1).max(20),
});

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notepad = await prisma.userNotepad.findUnique({
    where: { userId: token.id as string },
    select: { pages: true },
  });

  return NextResponse.json({ pages: notepad?.pages ?? [] });
}

export async function PUT(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await prisma.userNotepad.upsert({
    where: { userId: token.id as string },
    create: { userId: token.id as string, pages: parsed.data.pages },
    update: { pages: parsed.data.pages },
  });

  return NextResponse.json({ success: true });
}
