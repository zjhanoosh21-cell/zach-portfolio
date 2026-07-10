import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CandidateStatus } from "@prisma/client";

const schema = z.object({
  status: z.nativeEnum(CandidateStatus),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
  }

  const existing = await prisma.candidate.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const candidate = await prisma.candidate.update({
    where: { id },
    data: {
      status: parsed.data.status,
      reviewedAt: existing.status === "NEW" ? new Date() : undefined,
    },
    select: { id: true, status: true },
  });

  // Log status change
  await prisma.activityLog.create({
    data: {
      type: "STATUS_CHANGED",
      description: `Status changed from ${existing.status} to ${parsed.data.status}`,
      candidateId: id,
      userId: token.id as string,
      metadata: { from: existing.status, to: parsed.data.status },
    },
  }).catch((e) => console.error("[AUDIT] Activity log write failed:", e));

  return NextResponse.json(candidate);
}
