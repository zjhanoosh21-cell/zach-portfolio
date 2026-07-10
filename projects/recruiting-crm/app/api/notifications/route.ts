import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = token.id as string;

  const [unread, items] = await Promise.all([
    prisma.notification.count({ where: { userId, readAt: null } }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        discussion: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            authorId: true,
            author: { select: { name: true } },
            candidateId: true,
            candidate: { select: { displayName: true, firstName: true, lastName: true } },
            jobOrderId: true,
            jobOrder: { select: { title: true } },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    unread,
    items: items.map((n) => {
      const d = n.discussion;
      const candidateName = d.candidate
        ? d.candidate.displayName ||
          [d.candidate.firstName, d.candidate.lastName].filter(Boolean).join(" ") ||
          "Unknown Candidate"
        : null;
      return {
        id: n.id,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
        authorName: d.author?.name ?? "Someone",
        content: d.content.slice(0, 100),
        candidateId: d.candidateId,
        candidateName,
        jobOrderId: d.jobOrderId,
        jobTitle: d.jobOrder?.title ?? null,
      };
    }),
  });
}
