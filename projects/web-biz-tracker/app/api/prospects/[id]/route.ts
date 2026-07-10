import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { PROSPECT_STATUSES, PROSPECT_SOURCES } from "@/lib/constants";

const PatchProspectSchema = z.object({
  name: z.string().min(1).optional(),
  businessName: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(PROSPECT_STATUSES).optional(),
  source: z.enum(PROSPECT_SOURCES).optional(),
  assigneeId: z.string().nullable().optional(),
  followUpDate: z.string().datetime().nullable().optional(),
  outreachSentAt: z.string().datetime().nullable().optional(),
  outreachTemplate: z.string().nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const prospect = await prisma.prospect.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true } },
      deal: true,
      feedNotes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });

  if (!prospect) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(prospect);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = PatchProspectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if ("followUpDate" in parsed.data) {
    data.followUpDate = parsed.data.followUpDate
      ? new Date(parsed.data.followUpDate)
      : null;
  }
  if ("outreachSentAt" in parsed.data) {
    data.outreachSentAt = parsed.data.outreachSentAt
      ? new Date(parsed.data.outreachSentAt)
      : null;
  }

  const prospect = await prisma.prospect.update({
    where: { id },
    data,
    include: { assignee: { select: { id: true, name: true } } },
  });

  return NextResponse.json(prospect);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.prospect.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
