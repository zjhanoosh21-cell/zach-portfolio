import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { DEAL_STATUSES } from "@/lib/constants";

const PatchDealSchema = z.object({
  proposalAmount: z.number().int().nonnegative().nullable().optional(),
  retainerAmount: z.number().int().nonnegative().nullable().optional(),
  closeDate: z.string().datetime().nullable().optional(),
  status: z.enum(DEAL_STATUSES).optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = PatchDealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if ("closeDate" in parsed.data) {
    data.closeDate = parsed.data.closeDate
      ? new Date(parsed.data.closeDate)
      : null;
  }

  const deal = await prisma.deal.update({ where: { id }, data });
  return NextResponse.json(deal);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.deal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
