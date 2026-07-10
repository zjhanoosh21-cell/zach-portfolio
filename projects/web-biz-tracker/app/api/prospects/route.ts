import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { PROSPECT_STATUSES, PROSPECT_SOURCES } from "@/lib/constants";

const CreateProspectSchema = z.object({
  name: z.string().min(1),
  businessName: z.string().optional(),
  industry: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(PROSPECT_STATUSES).optional(),
  source: z.enum(PROSPECT_SOURCES).optional(),
  assigneeId: z.string().nullable().optional(),
  followUpDate: z.string().datetime().nullable().optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const source = searchParams.get("source");

  const prospects = await prisma.prospect.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(source ? { source } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      assignee: { select: { id: true, name: true } },
      deal: { select: { id: true, status: true, proposalAmount: true } },
    },
  });

  return NextResponse.json(prospects);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateProspectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = {
    ...parsed.data,
    followUpDate: parsed.data.followUpDate
      ? new Date(parsed.data.followUpDate)
      : null,
  };

  const prospect = await prisma.prospect.create({
    data: { ...data, status: data.status ?? "scraped" },
    include: { assignee: { select: { id: true, name: true } } },
  });

  return NextResponse.json(prospect, { status: 201 });
}
