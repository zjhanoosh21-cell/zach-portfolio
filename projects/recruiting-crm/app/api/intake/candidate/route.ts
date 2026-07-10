import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/api-key";
import {
  intakeSchema,
  mapTriageToEnum,
  mapRoleTypeToEnum,
  sanitizeFilename,
} from "@/lib/validations/intake";
import { scoreToTier } from "@/lib/candidate-display";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export async function POST(req: NextRequest) {
  // ── 1. API key auth ──────────────────────────────────────────────────────
  const isValid = await validateApiKey(req);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

  // ── 1b. Intake gate ──────────────────────────────────────────────────────
  const appSettings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  if (appSettings && appSettings.intakeEnabled === false) {
    return NextResponse.json({ error: "Intake is currently paused" }, { status: 503 });
  }

  // ── 2. Parse body ────────────────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ── 3. Validate with Zod ─────────────────────────────────────────────────
  const parsed = intakeSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // ── 4. Dedup check — message ID (exact duplicate email, skip entirely) ────
  if (data.intake_email_message_id) {
    const existing = await prisma.candidate.findUnique({
      where: { intakeEmailMessageId: data.intake_email_message_id },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({
        success: true,
        candidate_id: existing.id,
        is_duplicate: true,
        message: "Candidate already exists for this email message ID",
      });
    }
  }

  // ── 5. Decode & validate resume buffer (file write deferred until after dedup) ─
  let resumeFileBuffer: Buffer | null = null;
  let resumeValidMimeType: string | null = null;
  let resumeValidFilename: string | null = null;

  if (data.resume_base64 && data.resume_mime_type && data.resume_filename) {
    const mimeType = data.resume_mime_type.toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF and DOCX are accepted." },
        { status: 400 }
      );
    }
    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(data.resume_base64, "base64");
    } catch {
      return NextResponse.json({ error: "Invalid base64 file data" }, { status: 400 });
    }
    if (fileBuffer.length < 512) {
      console.warn(`[intake] resume_base64 decoded to only ${fileBuffer.length} bytes — likely an n8n binary ref, skipping file write.`);
    } else if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "File exceeds 15MB size limit" }, { status: 400 });
    } else {
      resumeFileBuffer   = fileBuffer;
      resumeValidMimeType  = mimeType;
      resumeValidFilename  = sanitizeFilename(data.resume_filename);
    }
  }

  // Helper: write resume buffer to a given candidate folder and return the relative path
  async function writeResumeForCandidate(candidateId: string): Promise<string> {
    const relPath    = `candidates/${candidateId}/${resumeValidFilename!}`;
    const absDir     = join(process.cwd(), "uploads", `candidates/${candidateId}`);
    const absPath    = join(process.cwd(), "uploads", relPath);
    await mkdir(absDir, { recursive: true });
    await writeFile(absPath, resumeFileBuffer!);
    return relPath;
  }

  // ── 6. Map AI fields to enums ────────────────────────────────────────────
  // Derive tier from score using CRI thresholds (76-100=T1, 51-75=T2, 26-50=T3, 1-25=T4)
  // rather than trusting n8n's tier label, which may differ.
  const aiTier = data.ai_score != null ? (scoreToTier(data.ai_score) as "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4") : null;
  const aiTriageAction = mapTriageToEnum(data.ai_triage_action);

  const detectedRoleType = mapRoleTypeToEnum(
    (data.ai_analysis?.detected_role_type as string) ?? null
  );
  const factorScores = data.ai_analysis?.factor_scores as Record<string, number> | undefined;
  const practiceAreas = (data.ai_analysis?.practice_areas as string[]) ?? [];
  const keySkills = (data.ai_analysis?.key_skills_detected as string[]) ?? [];
  const topStrengths = (data.ai_analysis?.top_strengths as string[]) ?? [];
  const topConcerns = (data.ai_analysis?.top_concerns as string[]) ?? [];
  const riskFlags = (data.ai_analysis?.risk_flags as string[]) ?? [];
  const aiSummary = (data.ai_analysis?.one_line_summary as string) ?? null;

  // ── 7. Duplicate check — attach resume to existing candidate if missing ───
  // Helper: patch resume onto an existing candidate that has none
  async function attachResumeIfMissing(existingId: string): Promise<void> {
    if (!resumeFileBuffer) return;
    const existing = await prisma.candidate.findUnique({
      where: { id: existingId },
      select: { resumeStoragePath: true },
    });
    if (existing?.resumeStoragePath) return; // already has one, don't overwrite
    const relPath = await writeResumeForCandidate(existingId);
    await prisma.candidate.update({
      where: { id: existingId },
      data: {
        resumeFileName:    resumeValidFilename,
        resumeMimeType:    resumeValidMimeType,
        resumeStoragePath: relPath,
        resumeUploadedAt:  new Date(),
      },
    });
    console.log(`[intake] Resume attached to existing candidate ${existingId}`);
  }

  // Helper: handle a re-application against an existing candidate.
  //   - Always appends the new role to pastAppliedRoles and logs REAPPLIED
  //   - If a new resume came in, saves it as a CandidateAttachment (and back-fills
  //     the primary resume slot if it was empty)
  //   - If the role is different OR the candidate was previously rejected, re-opens
  //     the record (status=NEW, priorityCall=true) and notifies all active recruiters
  async function handleReapplication(existingId: string, matchType: "email" | "name") {
    const existing = await prisma.candidate.findUnique({
      where: { id: existingId },
      select: {
        firstName: true,
        lastName: true,
        displayName: true,
        appliedRole: true,
        pastAppliedRoles: true,
        status: true,
        resumeStoragePath: true,
      },
    });
    if (!existing) {
      // Race: candidate vanished between dedup check and now. Fall through to create path.
      return null;
    }

    const newRole = data.applied_role?.trim() || null;
    const previousRole = existing.appliedRole;
    const knownRoles = new Set([previousRole, ...existing.pastAppliedRoles].filter(Boolean) as string[]);
    const roleChanged = !!newRole && !knownRoles.has(newRole);

    const wasRejected = existing.status === "REJECTED" || existing.status === "DO_NOT_CONSIDER";
    const shouldNotify = roleChanged || wasRejected;
    const shouldReopen = roleChanged; // status flip only on role change

    // Save the new resume as an attachment (preserves history, doesn't clobber primary)
    let newAttachmentPath: string | null = null;
    if (resumeFileBuffer) {
      try {
        // Use a uniquified filename so multiple re-applies don't overwrite each other
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        const labeledName = `${ts}__${resumeValidFilename}`;
        const relPath = `candidates/${existingId}/${labeledName}`;
        const absDir = join(process.cwd(), "uploads", `candidates/${existingId}`);
        const absPath = join(process.cwd(), "uploads", relPath);
        await mkdir(absDir, { recursive: true });
        await writeFile(absPath, resumeFileBuffer);
        newAttachmentPath = relPath;
      } catch (err) {
        console.error("[intake] Failed to write re-application resume file:", err);
        // Non-fatal — proceed without the attachment
      }
    }

    const candidateLabel =
      existing.displayName ||
      [existing.firstName, existing.lastName].filter(Boolean).join(" ").trim() ||
      "Candidate";

    await prisma.$transaction(async (tx) => {
      // 1. Append role + bump lastReappliedAt; optionally reset status
      const updates: Record<string, unknown> = {
        lastReappliedAt: new Date(),
      };
      if (newRole && !knownRoles.has(newRole)) {
        updates.pastAppliedRoles = { push: newRole };
      }
      if (shouldReopen) {
        updates.status = "NEW";
        updates.priorityCall = true;
        updates.appliedRole = newRole;
        updates.reviewedAt = null;
        updates.isDuplicate = false; // re-engaging means it's not just noise
      }
      await tx.candidate.update({ where: { id: existingId }, data: updates });

      // 2. ActivityLog: REAPPLIED (always)
      await tx.activityLog.create({
        data: {
          type: "REAPPLIED",
          description: `Re-applied via ${data.source}${newRole ? ` for ${newRole}` : ""}${
            previousRole && previousRole !== newRole ? ` (previously ${previousRole})` : ""
          }`,
          candidateId: existingId,
          metadata: {
            source: data.source,
            match_type: matchType,
            new_role: newRole,
            previous_role: previousRole,
            role_changed: roleChanged,
            message_id: data.intake_email_message_id,
            ai_score: data.ai_score,
          },
        },
      });

      // 3. ActivityLog: STATUS_REOPENED (only if we flipped to NEW)
      if (shouldReopen) {
        await tx.activityLog.create({
          data: {
            type: "STATUS_REOPENED",
            description: `Status re-opened to NEW — candidate re-applied for a different role${
              previousRole ? ` (was ${previousRole})` : ""
            }`,
            candidateId: existingId,
            metadata: {
              new_role: newRole,
              previous_role: previousRole,
              previous_status: existing.status,
            },
          },
        });
      }

      // 4. Attachment record for the new resume
      if (newAttachmentPath && resumeValidFilename && resumeValidMimeType) {
        await tx.candidateAttachment.create({
          data: {
            candidateId: existingId,
            fileName: resumeValidFilename,
            mimeType: resumeValidMimeType,
            storagePath: newAttachmentPath,
          },
        });
      }

      // 5. Discussion + Notifications (only if role changed OR was rejected)
      if (shouldNotify) {
        const reasonText = roleChanged
          ? `now interested in ${newRole}${previousRole ? ` (previously ${previousRole})` : ""}`
          : `re-engaged after previous ${existing.status === "REJECTED" ? "rejection" : "do-not-consider status"}`;
        const discussion = await tx.discussion.create({
          data: {
            content: `🔄 ${candidateLabel} re-applied — ${reasonText}.`,
            authorId: null, // system-authored
            candidateId: existingId,
          },
        });
        const activeUsers = await tx.user.findMany({
          where: { isActive: true },
          select: { id: true },
        });
        if (activeUsers.length > 0) {
          await tx.notification.createMany({
            data: activeUsers.map((u) => ({ userId: u.id, discussionId: discussion.id })),
          });
        }
      }
    });

    // 6. Back-fill primary resume if it was empty (outside txn — writes the file)
    if (!existing.resumeStoragePath) {
      await attachResumeIfMissing(existingId);
    }

    return {
      candidate_id: existingId,
      reapplied: true,
      role_changed: roleChanged,
      reopened: shouldReopen,
      notified: shouldNotify,
      match_type: matchType,
    };
  }

  if (data.resume_email) {
    const emailMatch = await prisma.candidate.findFirst({
      where: { resumeEmail: { equals: data.resume_email, mode: "insensitive" } },
      select: { id: true },
    });
    if (emailMatch) {
      const result = await handleReapplication(emailMatch.id, "email");
      if (result) {
        return NextResponse.json({
          success: true,
          candidate_id: result.candidate_id,
          is_duplicate: true,
          reapplied: true,
          role_changed: result.role_changed,
          reopened: result.reopened,
          notified: result.notified,
          message: result.role_changed
            ? "Re-application detected (email match) — candidate re-opened and team notified"
            : "Re-application detected (email match) — logged and resume archived",
        });
      }
    }
  }
  if (data.candidate_first_name && data.candidate_last_name) {
    const nameMatch = await prisma.candidate.findFirst({
      where: {
        firstName: { equals: data.candidate_first_name, mode: "insensitive" },
        lastName:  { equals: data.candidate_last_name,  mode: "insensitive" },
      },
      select: { id: true },
    });
    if (nameMatch) {
      const result = await handleReapplication(nameMatch.id, "name");
      if (result) {
        return NextResponse.json({
          success: true,
          candidate_id: result.candidate_id,
          is_duplicate: true,
          reapplied: true,
          role_changed: result.role_changed,
          reopened: result.reopened,
          notified: result.notified,
          message: result.role_changed
            ? "Re-application detected (name match) — candidate re-opened and team notified"
            : "Re-application detected (name match) — logged and resume archived",
        });
      }
    }
  }

  const isDuplicate = false;

  // ── 8. Create candidate record + write resume file using real cuid (atomic) ───
  // The resume file is written *inside* the transaction, *after* the candidate row
  // exists, so the upload folder name == the real candidate cuid. The legacy code
  // generated a separate random hex for the folder, leaving orphan paths in the DB.
  let resumeStoragePath: string | null = null;
  const resumeFileName: string | null = resumeValidFilename;
  const resumeMimeType: string | null = resumeValidMimeType;
  let resumeWrittenDir: string | null = null;

  let candidate;
  try {
    candidate = await prisma.$transaction(async (tx) => {
      const c = await tx.candidate.create({
        data: {
          // Identity
          firstName: data.candidate_first_name ?? null,
          lastName: data.candidate_last_name ?? null,
          displayName: data.candidate_display_name ?? null,
          resumeEmail: data.resume_email ?? null,
          resumePhone: data.resume_phone ?? null,

          // Location
          candidateAddress: data.candidate_address ?? null,
          candidateCity: data.candidate_city ?? null,
          candidateState: data.candidate_state ?? null,
          candidateZip: data.candidate_zip ?? null,
          candidateLocation: data.candidate_location ??
            ([data.candidate_city, data.candidate_state].filter(Boolean).join(", ") || null),

          // Work history
          currentEmployer: data.current_employer ?? null,
          currentTitle: data.current_title ?? null,
          yearsOfExperience: data.years_of_experience ?? null,
          workHistorySummary: data.work_history_summary ?? null,

          // Education
          educationDegree: data.education_degree ?? null,
          educationMajor: data.education_major ?? null,
          educationInstitution: data.education_institution ?? null,
          educationYear: data.education_year ?? null,

          // Credentials
          certifications: data.certifications,
          barAdmissions: data.bar_admissions,
          languages: data.languages,
          availabilityNotes: data.availability_notes ?? null,
          typingWpm: data.typing_wpm ?? null,
          desiredSalary: data.desired_salary ?? null,

          // Source
          source: data.source,
          appliedRole: data.applied_role ?? null,
          intakeEmailMessageId: data.intake_email_message_id ?? null,

          // Status (starts as NEW)
          status: "NEW",
          isDuplicate,

          // AI scores
          aiCompositeScore: data.ai_score ?? null,
          aiTier: aiTier ?? undefined,
          aiTriageAction: aiTriageAction ?? undefined,
          aiDetectedRoleType: detectedRoleType ?? undefined,

          // AI factor scores
          scoreLawFirmExp: factorScores?.law_firm_experience ?? null,
          scoreLongevity: factorScores?.longevity_stability ?? null,
          scoreTitleSpecific: factorScores?.title_specific_experience ?? null,
          scoreTechnicalSkills: factorScores?.technical_skill_alignment ?? null,
          scoreProfessionalism: factorScores?.professionalism_communication ?? null,

          // AI arrays
          practiceAreas,
          keySkills,
          topStrengths,
          topConcerns,
          riskFlags,
          aiSummary,

          // Raw AI output (cast to Prisma's InputJsonValue)
          aiRawOutput: data.ai_analysis
            ? (data.ai_analysis as Parameters<typeof prisma.candidate.create>[0]["data"]["aiRawOutput"])
            : undefined,

          // Resume file fields intentionally omitted here — populated below via update()
          // after the file is written to a folder named after this row's cuid.

          // effectiveScore is a PostgreSQL GENERATED ALWAYS AS column — do not write it
        },
      });

      // ── 8a. Write resume file using the row's real cuid as the folder name ──
      // Inside the txn: if this throws, the candidate row never commits and the
      // catch block below cleans up any partial bytes on disk via resumeWrittenDir.
      if (resumeFileBuffer) {
        resumeStoragePath = await writeResumeForCandidate(c.id);
        resumeWrittenDir  = join(process.cwd(), "uploads", `candidates/${c.id}`);
        await tx.candidate.update({
          where: { id: c.id },
          data: {
            resumeFileName:    resumeFileName ?? null,
            resumeMimeType:    resumeMimeType ?? null,
            resumeStoragePath,
            resumeUploadedAt:  new Date(),
          },
        });
      }

      // ── 8b. Create system activity log entry (same transaction) ───────────
      await tx.activityLog.create({
        data: {
          type: "INTAKE_FROM_N8N",
          description: `Candidate ingested from ${data.source} via n8n`,
          candidateId: c.id,
          metadata: {
            source: data.source,
            applied_role: data.applied_role,
            ai_score: data.ai_score,
            message_id: data.intake_email_message_id,
          },
        },
      });

      return c;
    });
  } catch (err) {
    // Clean up the resume file we wrote to disk (applies to all error cases)
    if (resumeWrittenDir) {
      await rm(resumeWrittenDir, { recursive: true, force: true }).catch(() => {});
    }
    // P2002 = unique constraint — concurrent dedup race; return existing candidate gracefully
    if ((err as { code?: string })?.code === 'P2002' && data.intake_email_message_id) {
      const existing = await prisma.candidate.findUnique({
        where: { intakeEmailMessageId: data.intake_email_message_id },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({
          success: true,
          candidate_id: existing.id,
          is_duplicate: true,
          message: "Candidate already exists for this email message ID",
        });
      }
    }
    console.error("Failed to create candidate:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // ── 10. Return success ────────────────────────────────────────────────────
  return NextResponse.json({
    success: true,
    candidate_id: candidate.id,
    is_duplicate: false,
    message: "Candidate created successfully",
  }, { status: 201 });
}
