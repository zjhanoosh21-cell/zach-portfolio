import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { buildCsv, csvResponse } from "@/lib/csv";
import { checkPinBlocked, recordPinFailure, clearPinFailures } from "@/lib/pin-limiter";

const schema = z.object({ pin: z.string().regex(/^\d{4}$/) });

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const isElevated = !!token.isAdmin || !!token.isManager;
  if (!isElevated) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const blocked = await checkPinBlocked(req);
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid PIN" }, { status: 400 });

  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  if (!settings?.deletionPinHash) {
    return NextResponse.json({ error: "No admin PIN configured. Set one in Settings first." }, { status: 403 });
  }
  const pinMatch = await bcrypt.compare(parsed.data.pin, settings.deletionPinHash);
  if (!pinMatch) {
    await recordPinFailure(req);
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
  }
  await clearPinFailures(req);

  const jobs = await prisma.jobOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { submissions: true } },
    },
  });

  const headers = [
    "ID",
    "Title",
    "Client Name",
    "Location",
    "Job Type",
    "Status",
    "Role Type",
    "Priority",
    "Salary Min",
    "Salary Max",
    "Bill Rate",
    "Pay Rate",
    "Practice Areas",
    "Required Skills",
    "Description",
    "Internal Notes",
    "Submissions Count",
    "Opened At",
    "Target Fill Date",
    "Filled At",
    "Created At",
  ];

  const rows = jobs.map((j) => [
    j.id,
    j.title,
    j.clientName,
    j.location,
    j.jobType,
    j.status,
    j.roleType,
    j.priority,
    j.salaryMin,
    j.salaryMax,
    j.billRate?.toString(),
    j.payRate?.toString(),
    j.practiceAreas.join("; "),
    j.requiredSkills.join("; "),
    j.description,
    j.internalNotes,
    j._count.submissions,
    j.openedAt.toISOString(),
    j.targetFillDate?.toISOString(),
    j.filledAt?.toISOString(),
    j.createdAt.toISOString(),
  ]);

  const date = new Date().toISOString().slice(0, 10);
  console.log(`[AUDIT] Jobs CSV exported by ${token.email}`);
  return csvResponse(buildCsv(headers, rows), `jobs-${date}.csv`);
}
