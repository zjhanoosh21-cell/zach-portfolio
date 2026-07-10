import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  priorityCall: z.boolean(),
  clearTriageAction: z.boolean().optional(),
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
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { priorityCall, clearTriageAction } = parsed.data;

  try {
    const candidate = await prisma.candidate.update({
      where: { id },
      data: {
        priorityCall,
        ...(clearTriageAction ? { aiTriageAction: null } : {}),
      },
      select: { id: true, priorityCall: true, aiTriageAction: true },
    });

    return NextResponse.json(candidate);
  } catch (e: unknown) {
    const isPrismaNotFound = (e as { code?: string })?.code === 'P2025';
    if (isPrismaNotFound) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
