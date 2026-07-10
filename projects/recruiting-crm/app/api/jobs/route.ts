import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  title: z.string().min(1).max(300).trim(),
  clientId: z.string().nullish(),
  clientName: z.string().min(1).max(200).trim(),
  location: z.string().max(200).nullish(),
  jobType: z.enum(["DIRECT_HIRE", "TEMP_TO_HIRE", "TEMP", "CONTRACT"]).default("DIRECT_HIRE"),
  roleType: z.enum(["LEGAL_SECRETARY","LEGAL_ASSISTANT","PARALEGAL","BILLING_CLERK","BILLING_COORDINATOR","OTHER_LEGAL","OTHER_PROFESSIONAL","NON_LEGAL"]).nullish(),
  practiceAreas: z.array(z.string().max(100)).max(20).default([]),
  requiredSkills: z.array(z.string().max(100)).max(30).default([]),
  salaryMin: z.number().int().min(0).nullish(),
  salaryMax: z.number().int().min(0).nullish(),
  priority: z.number().int().min(1).max(3).default(2),
  description: z.string().max(5000).nullish(),
  internalNotes: z.string().max(2000).nullish(),
  targetFillDate: z.string().nullish(), // ISO date string
  assignedToId: z.string().nullish(),
});

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim();

  const statusParsed = z.enum(["OPEN", "ON_HOLD", "FILLED", "CANCELLED"]).optional().safeParse(status ?? undefined);
  if (!statusParsed.success) {
    return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
  }

  const jobs = await prisma.jobOrder.findMany({
    where: {
      ...(statusParsed.data ? { status: statusParsed.data } : {}),
      ...(q && {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { clientName: { contains: q, mode: "insensitive" } },
          { location: { contains: q, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { submissions: true } },
    },
  });

  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { targetFillDate, assignedToId, ...rest } = parsed.data;
  const job = await prisma.jobOrder.create({
    data: {
      ...rest,
      targetFillDate: targetFillDate ? new Date(targetFillDate) : null,
      ...(assignedToId !== undefined && { assignedToId: assignedToId ?? null }),
    },
  });

  return NextResponse.json(job, { status: 201 });
}
