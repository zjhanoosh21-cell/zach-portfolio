import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CandidateStatus } from "@prisma/client";

const schema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(100),
  status: z.nativeEnum(CandidateStatus),
});

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!token.isAdmin && !token.isManager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { ids, status } = parsed.data;

  await prisma.$transaction([
    prisma.candidate.updateMany({
      where: { id: { in: ids } },
      data: { status },
    }),
    prisma.activityLog.createMany({
      data: ids.map((id) => ({
        type: "STATUS_CHANGED" as const,
        description: `Status bulk-updated to ${status.replace(/_/g, " ")}`,
        userId: token.id as string,
        candidateId: id,
        metadata: { to: status, bulk: true },
      })),
      skipDuplicates: true,
    }),
  ]);

  return NextResponse.json({ success: true, count: ids.length });
}
