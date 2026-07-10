import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkPinBlocked, recordPinFailure, clearPinFailures } from "@/lib/pin-limiter";

const updateSchema = z.object({
  title: z.string().min(1).max(300).trim().optional(),
  clientName: z.string().min(1).max(200).trim().optional(),
  location: z.string().max(200).nullish(),
  status: z.enum(["OPEN", "ON_HOLD", "FILLED", "FILLED_BY_COMPETITOR", "CANCELLED"]).optional(),
  jobType: z.enum(["DIRECT_HIRE", "TEMP_TO_HIRE", "TEMP", "CONTRACT"]).optional(),
  roleType: z.enum(["LEGAL_SECRETARY","LEGAL_ASSISTANT","PARALEGAL","BILLING_CLERK","BILLING_COORDINATOR","OTHER_LEGAL","OTHER_PROFESSIONAL","NON_LEGAL"]).nullish(),
  salaryMin: z.number().int().min(0).nullish(),
  salaryMax: z.number().int().min(0).nullish(),
  priority: z.number().int().min(1).max(3).optional(),
  description: z.string().max(5000).nullish(),
  internalNotes: z.string().max(2000).nullish(),
  targetFillDate: z.string().nullish(),
  filledAt: z.string().nullish(),
  assignedToId: z.string().nullish(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const job = await prisma.jobOrder.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      submissions: {
        orderBy: { createdAt: "desc" },
        include: {
          candidate: {
            select: {
              id: true,
              displayName: true,
              firstName: true,
              lastName: true,
              currentTitle: true,
              aiCompositeScore: true,
              aiTier: true,
              resumeEmail: true,
              resumePhone: true,
            },
          },
          submittedBy: { select: { name: true } },
        },
      },
      notes: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ...job,
    billRate: job.billRate ? Number(job.billRate) : null,
    payRate: job.payRate ? Number(job.payRate) : null,
    submissions: job.submissions.map((s) => ({
      ...s,
      placementFee: s.placementFee ? Number(s.placementFee) : null,
    })),
  });
}

const pinSchema = z.object({ pin: z.string().regex(/^\d{4}$/) });

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!token.isAdmin && !token.isManager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocked = await checkPinBlocked(req);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const parsed = pinSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "A 4-digit PIN is required" }, { status: 400 });

  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  if (!settings?.deletionPinHash) {
    return NextResponse.json({ error: "No deletion PIN configured. Set one in Settings." }, { status: 403 });
  }

  const pinMatch = await bcrypt.compare(parsed.data.pin, settings.deletionPinHash);
  if (!pinMatch) {
    await recordPinFailure(req);
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
  }
  await clearPinFailures(req);

  const { id } = await params;
  const job = await prisma.jobOrder.findUnique({ where: { id }, select: { id: true } });
  if (!job) return NextResponse.json({ error: "Job order not found" }, { status: 404 });

  await prisma.jobOrder.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { targetFillDate, filledAt, assignedToId, ...rest } = parsed.data;
  const job = await prisma.jobOrder.update({
    where: { id },
    data: {
      ...rest,
      ...(targetFillDate !== undefined && { targetFillDate: targetFillDate ? new Date(targetFillDate) : null }),
      ...(filledAt !== undefined
        ? { filledAt: filledAt ? new Date(filledAt) : null }
        : (rest.status === "FILLED" || rest.status === "FILLED_BY_COMPETITOR")
          ? { filledAt: new Date() }
          : rest.status !== undefined
            ? { filledAt: null }
            : {}),
      ...(assignedToId !== undefined && { assignedToId: assignedToId ?? null }),
    },
  });

  return NextResponse.json({
    ...job,
    billRate: job.billRate ? Number(job.billRate) : null,
    payRate: job.payRate ? Number(job.payRate) : null,
  });
}
