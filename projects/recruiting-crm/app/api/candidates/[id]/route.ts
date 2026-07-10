import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  firstName: z.string().max(100).nullable().optional(),
  lastName: z.string().max(100).nullable().optional(),
  displayName: z.string().max(200).nullable().optional(),
  currentTitle: z.string().max(200).nullable().optional(),
  currentEmployer: z.string().max(200).nullable().optional(),
  appliedRole: z.string().max(200).nullable().optional(),
  resumeEmail: z.string().max(200).nullable().optional(),
  resumePhone: z.string().max(50).nullable().optional(),
  linkedinUrl: z.string().max(500).nullable().optional(),
  candidateAddress: z.string().max(300).nullable().optional(),
  candidateCity: z.string().max(100).nullable().optional(),
  candidateState: z.string().max(100).nullable().optional(),
  candidateZip: z.string().max(20).nullable().optional(),
  candidateLocation: z.string().max(200).nullable().optional(),
  yearsOfExperience: z.number().int().min(0).max(60).nullable().optional(),
  typingWpm: z.number().int().min(0).max(300).nullable().optional(),
  desiredSalary: z.number().int().min(0).max(9999999).nullable().optional(),
  availabilityNotes: z.string().max(500).nullable().optional(),
  workHistorySummary: z.string().max(2000).nullable().optional(),
  educationDegree: z.string().max(200).nullable().optional(),
  educationMajor: z.string().max(200).nullable().optional(),
  educationInstitution: z.string().max(200).nullable().optional(),
  educationYear: z.number().int().min(1950).max(2099).nullable().optional(),
  certifications: z.array(z.string().max(200)).optional(),
  barAdmissions: z.array(z.string().max(200)).optional(),
  languages: z.array(z.string().max(200)).optional(),
  manualScore: z.number().int().min(0).max(100).nullable().optional(),
  useManualScore: z.boolean().optional(),
  isDuplicate: z.boolean().optional(),
  lastReappliedAt: z.null().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const candidate = await prisma.candidate.findUnique({ where: { id }, select: { id: true } });
  if (!candidate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  // Build update — strip undefined keys so we don't overwrite with null accidentally
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) data[k] = v === "" ? null : v;
  }

  // Auto-update candidateLocation if city/state changed
  if (data.candidateCity !== undefined || data.candidateState !== undefined) {
    const current = await prisma.candidate.findUnique({
      where: { id },
      select: { candidateCity: true, candidateState: true },
    });
    const city = data.candidateCity ?? current?.candidateCity ?? "";
    const state = data.candidateState ?? current?.candidateState ?? "";
    if (city || state) data.candidateLocation = [city, state].filter(Boolean).join(", ");
  }

  // effectiveScore is a PostgreSQL GENERATED ALWAYS AS column — DB auto-computes it

  try {
    const updated = await prisma.candidate.update({
      where: { id },
      data,
    });

    // Log the edit
    await prisma.activityLog.create({
      data: {
        type: "PROFILE_UPDATED",
        description: "Candidate profile updated",
        candidateId: id,
        userId: token.id as string,
      },
    }).catch((e) => console.error("[AUDIT] Activity log write failed:", e));

    return NextResponse.json({ success: true, id: updated.id });
  } catch (e: unknown) {
    const isPrismaNotFound = (e as { code?: string })?.code === 'P2025';
    if (isPrismaNotFound) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
