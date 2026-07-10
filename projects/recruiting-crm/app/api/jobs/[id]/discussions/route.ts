import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const postSchema = z.object({
  content: z.string().min(1).max(5000).trim(),
  mentionedUserIds: z.array(z.string().cuid()).max(50).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const discussions = await prisma.discussion.findMany({
    where: { jobOrderId: id },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true } } },
  });

  return NextResponse.json(discussions.map((d) => ({
    id: d.id,
    content: d.content,
    createdAt: d.createdAt.toISOString(),
    authorId: d.authorId,
    authorName: d.author?.name ?? "Unknown",
  })));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const job = await prisma.jobOrder.findUnique({ where: { id }, select: { id: true } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const discussion = await prisma.discussion.create({
    data: {
      content: parsed.data.content,
      authorId: token.id as string,
      jobOrderId: id,
    },
  });

  // Create notifications for mentioned users (deduplicated per post; self-mentions allowed)
  const mentionIds = Array.from(new Set(parsed.data.mentionedUserIds ?? []));
  if (mentionIds.length > 0) {
    await prisma.notification.createMany({
      data: mentionIds.map((userId) => ({
        userId,
        discussionId: discussion.id,
      })),
    });
  }

  return NextResponse.json({
    id: discussion.id,
    content: discussion.content,
    createdAt: discussion.createdAt.toISOString(),
    authorId: discussion.authorId,
    authorName: (token.name as string) ?? "Unknown",
  }, { status: 201 });
}
