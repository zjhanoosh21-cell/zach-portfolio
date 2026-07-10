import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { buildCsv, csvResponse } from "@/lib/csv";
import { checkPinBlocked, recordPinFailure, clearPinFailures } from "@/lib/pin-limiter";

const schema = z.object({
  pin: z.string().regex(/^\d{4}$/),
  ids: z.array(z.string()).optional(),
});

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

  const selectedIds = parsed.data.ids;
  const candidates = await prisma.candidate.findMany({
    where: selectedIds && selectedIds.length > 0 ? { id: { in: selectedIds } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 10000,
  });

  const headers = [
    "ID",
    "First Name",
    "Last Name",
    "Display Name",
    "Status",
    "AI Score",
    "Tier",
    "Triage Action",
    "Role Type",
    "Applied Role",
    "Email",
    "Phone",
    "LinkedIn",
    "Address",
    "City",
    "State",
    "ZIP",
    "Current Title",
    "Current Employer",
    "Years of Experience",
    "Work History Summary",
    "Education Degree",
    "Education Major",
    "Education Institution",
    "Education Year",
    "Certifications",
    "Bar Admissions",
    "Languages",
    "Desired Salary",
    "Typing WPM",
    "Availability Notes",
    "Practice Areas",
    "Key Skills",
    "Top Strengths",
    "Top Concerns",
    "Risk Flags",
    "AI Summary",
    "Law Firm Exp Score",
    "Longevity Score",
    "Title Specific Score",
    "Technical Skills Score",
    "Professionalism Score",
    "Source",
    "CRM Profile Created",
    "Original Entry Date",
    "Time On File",
    "Updated At",
  ];

  const rows = candidates.map((c) => [
    c.id,
    c.firstName,
    c.lastName,
    c.displayName,
    c.status,
    c.aiCompositeScore,
    c.aiTier,
    c.aiTriageAction,
    c.aiDetectedRoleType,
    c.appliedRole,
    c.resumeEmail,
    c.resumePhone,
    c.linkedinUrl,
    c.candidateAddress,
    c.candidateCity,
    c.candidateState,
    c.candidateZip,
    c.currentTitle,
    c.currentEmployer,
    c.yearsOfExperience,
    c.workHistorySummary,
    c.educationDegree,
    c.educationMajor,
    c.educationInstitution,
    c.educationYear,
    c.certifications.join("; "),
    c.barAdmissions.join("; "),
    c.languages.join("; "),
    c.desiredSalary,
    c.typingWpm,
    c.availabilityNotes,
    c.practiceAreas.join("; "),
    c.keySkills.join("; "),
    c.topStrengths.join("; "),
    c.topConcerns.join("; "),
    c.riskFlags.join("; "),
    c.aiSummary,
    c.scoreLawFirmExp,
    c.scoreLongevity,
    c.scoreTitleSpecific,
    c.scoreTechnicalSkills,
    c.scoreProfessionalism,
    c.source,
    c.createdAt.toISOString(),
    c.originalEntryDate?.toISOString() ?? "",
    (() => {
      const ref = c.originalEntryDate ?? c.createdAt;
      const days = Math.floor((Date.now() - ref.getTime()) / (1000 * 60 * 60 * 24));
      if (days < 14) return `${days} days`;
      if (days < 60) return `${Math.floor(days / 7)} wks`;
      const months = Math.round(days / 30.44);
      if (months < 24) return `${months} mos`;
      return `${Math.round(months / 12)} yrs`;
    })(),
    c.updatedAt.toISOString(),
  ]);

  const date = new Date().toISOString().slice(0, 10);
  console.log(`[AUDIT] Candidates CSV exported by ${token.email ?? token.sub ?? "unknown"}`);
  return csvResponse(buildCsv(headers, rows), `candidates-${date}.csv`);
}
