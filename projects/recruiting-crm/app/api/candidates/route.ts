import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { sanitizeFilename } from "@/lib/validations/intake";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  resumeEmail: z.string().email().optional().or(z.literal("")),
  resumePhone: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),

  candidateAddress: z.string().optional(),
  candidateCity: z.string().optional(),
  candidateState: z.string().optional(),
  candidateZip: z.string().optional(),

  appliedRole: z.string().optional(),
  currentTitle: z.string().optional(),
  currentEmployer: z.string().optional(),
  yearsOfExperience: z.coerce.number().int().min(0).max(60).optional().nullable(),
  workHistorySummary: z.string().optional(),

  educationDegree: z.string().optional(),
  educationMajor: z.string().optional(),
  educationInstitution: z.string().optional(),
  educationYear: z.coerce.number().int().min(1950).max(2040).optional().nullable(),

  certifications: z.array(z.string()).optional(),
  barAdmissions: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  availabilityNotes: z.string().optional(),
  typingWpm: z.coerce.number().int().min(0).max(300).optional().nullable(),
  desiredSalary: z.coerce.number().int().min(0).optional().nullable(),

  source: z.string().default("Manual Entry"),
});

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Parse multipart/form-data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  // Extract text fields
  const get = (key: string) => (formData.get(key) as string | null)?.trim() ?? "";
  const getNum = (key: string) => {
    const v = get(key);
    return v ? Number(v) : null;
  };

  const rawBody = {
    firstName: get("firstName"),
    lastName: get("lastName"),
    resumeEmail: get("resumeEmail"),
    resumePhone: get("resumePhone"),
    linkedinUrl: get("linkedinUrl"),
    candidateAddress: get("candidateAddress"),
    candidateCity: get("candidateCity"),
    candidateState: get("candidateState"),
    candidateZip: get("candidateZip"),
    appliedRole: get("appliedRole"),
    currentTitle: get("currentTitle"),
    currentEmployer: get("currentEmployer"),
    yearsOfExperience: getNum("yearsOfExperience"),
    workHistorySummary: get("workHistorySummary"),
    educationDegree: get("educationDegree"),
    educationMajor: get("educationMajor"),
    educationInstitution: get("educationInstitution"),
    educationYear: getNum("educationYear"),
    certifications: get("certifications").split(",").map((s) => s.trim()).filter(Boolean),
    barAdmissions: get("barAdmissions").split(",").map((s) => s.trim()).filter(Boolean),
    languages: get("languages").split(",").map((s) => s.trim()).filter(Boolean),
    availabilityNotes: get("availabilityNotes"),
    typingWpm: getNum("typingWpm"),
    desiredSalary: getNum("desiredSalary"),
    source: "Manual Entry",
  };

  const parsed = schema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;

  // Build candidate record
  const candidateLocation = [d.candidateCity, d.candidateState].filter(Boolean).join(", ") || undefined;
  const displayName = `${d.lastName}, ${d.firstName}`;

  const candidate = await prisma.candidate.create({
    data: {
      firstName: d.firstName,
      lastName: d.lastName,
      displayName,
      resumeEmail: d.resumeEmail || undefined,
      resumePhone: d.resumePhone || undefined,
      linkedinUrl: d.linkedinUrl || undefined,
      candidateAddress: d.candidateAddress || undefined,
      candidateCity: d.candidateCity || undefined,
      candidateState: d.candidateState || undefined,
      candidateZip: d.candidateZip || undefined,
      candidateLocation,
      appliedRole: d.appliedRole || undefined,
      currentTitle: d.currentTitle || undefined,
      currentEmployer: d.currentEmployer || undefined,
      yearsOfExperience: d.yearsOfExperience ?? undefined,
      workHistorySummary: d.workHistorySummary || undefined,
      educationDegree: d.educationDegree || undefined,
      educationMajor: d.educationMajor || undefined,
      educationInstitution: d.educationInstitution || undefined,
      educationYear: d.educationYear ?? undefined,
      certifications: d.certifications ?? [],
      barAdmissions: d.barAdmissions ?? [],
      languages: d.languages ?? [],
      availabilityNotes: d.availabilityNotes || undefined,
      typingWpm: d.typingWpm ?? undefined,
      desiredSalary: d.desiredSalary ?? undefined,
      source: d.source,
      status: "ACTIVE",
    },
  });

  // Handle optional resume upload
  const file = formData.get("resume") as File | null;
  if (file && file.size > 0) {
    const mimeType = file.type.toLowerCase().trim();

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      // Candidate was already created — delete it and return error
      await prisma.candidate.delete({ where: { id: candidate.id } }).catch(() => {});
      return NextResponse.json({ error: "Invalid file type. Only PDF and DOCX are accepted." }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      await prisma.candidate.delete({ where: { id: candidate.id } }).catch(() => {});
      return NextResponse.json({ error: "File exceeds 15MB size limit." }, { status: 400 });
    }

    const origExt = file.name.includes(".") ? file.name.split(".").pop()! : "pdf";
    const displayName = `${d.lastName}, ${d.firstName}.${origExt}`;
    const diskName = sanitizeFilename(displayName);
    const dir = join(process.cwd(), "uploads", "candidates", candidate.id);
    const absPath = join(dir, diskName);

    try {
      await mkdir(dir, { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(absPath, buffer);

      await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          resumeFileName: displayName,
          resumeMimeType: mimeType,
          resumeStoragePath: `candidates/${candidate.id}/${diskName}`,
          resumeUploadedAt: new Date(),
        },
      });
    } catch (err) {
      console.error("Resume upload failed:", err);
      // Non-fatal — candidate is still created, resume just not attached
    }
  }

  await prisma.activityLog.create({
    data: {
      type: "CANDIDATE_CREATED",
      description: "Candidate created manually",
      userId: token.id as string,
      candidateId: candidate.id,
    },
  });

  return NextResponse.json({ id: candidate.id }, { status: 201 });
}
