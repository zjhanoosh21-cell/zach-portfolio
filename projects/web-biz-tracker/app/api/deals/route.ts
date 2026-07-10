import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { DEAL_STATUSES } from "@/lib/constants";

const CreateDealSchema = z.object({
  prospectId: z.string().min(1),
  proposalAmount: z.number().int().nonnegative().nullable().optional(),
  retainerAmount: z.number().int().nonnegative().nullable().optional(),
  closeDate: z.string().datetime().nullable().optional(),
  status: z.enum(DEAL_STATUSES).optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deals = await prisma.deal.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      prospect: {
        select: {
          id: true,
          name: true,
          businessName: true,
          industry: true,
          email: true,
          assignee: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json(deals);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateDealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const deal = await prisma.deal.create({
    data: {
      ...parsed.data,
      closeDate: parsed.data.closeDate ? new Date(parsed.data.closeDate) : null,
      status: parsed.data.status ?? "active",
    },
    include: { prospect: { select: { id: true, name: true, businessName: true } } },
  });

  return NextResponse.json(deal, { status: 201 });
}
