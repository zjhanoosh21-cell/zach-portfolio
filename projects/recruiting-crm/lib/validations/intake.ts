import { z } from "zod";

export const intakeSchema = z.object({
  // Identity — at least one name field must be present (enforced by .refine below)
  candidate_display_name: z.string().max(200).nullish(),
  candidate_first_name: z.string().max(100).nullish(),
  candidate_last_name: z.string().max(100).nullish(),

  // Applied role (from ZipRecruiter email subject)
  applied_role: z.string().max(200).nullish(),

  // Contact info extracted from resume
  resume_email: z.string().email().max(200).nullish(),
  resume_phone: z.string().max(50).nullish(),

  // Location from resume
  candidate_address: z.string().max(300).nullish(),
  candidate_city: z.string().max(100).nullish(),
  candidate_state: z.string().max(50).nullish(),
  candidate_zip: z.string().max(20).nullish(),
  candidate_location: z.string().max(200).nullish(),

  // Work history
  current_employer: z.string().max(200).nullish(),
  current_title: z.string().max(200).nullish(),
  years_of_experience: z.number().int().min(0).max(60).nullish(),
  work_history_summary: z.string().max(2000).nullish(),

  // Education
  education_degree: z.string().max(100).nullish(),
  education_major: z.string().max(200).nullish(),
  education_institution: z.string().max(200).nullish(),
  education_year: z.number().int().min(1950).max(2030).nullish(),

  // Credentials
  certifications: z.array(z.string().max(200)).max(20).default([]),
  bar_admissions: z.array(z.string().max(100)).max(20).default([]),
  languages: z.array(z.string().max(100)).max(20).default([]),
  availability_notes: z.string().max(500).nullish(),
  typing_wpm: z.number().int().min(0).max(300).nullish(),
  desired_salary: z.number().int().min(0).max(1_000_000).nullish(),

  // AI scores
  ai_score: z.number().int().min(0).max(100).nullish(),
  ai_tier: z.string().max(100).nullish(),
  ai_triage_action: z.string().max(200).nullish(),
  ai_analysis: z.record(z.string(), z.unknown()).nullish(),

  // Resume file
  resume_base64: z.string().max(20_000_000).nullish(), // ~15MB max in base64
  resume_mime_type: z.string().max(100).nullish(),
  resume_filename: z.string().max(255).nullish(),

  // Source metadata
  source: z.string().max(100).default("ZipRecruiter"),
  intake_email_message_id: z.string().max(200).nullish(),
}).refine(
  (d) =>
    (d.candidate_first_name && d.candidate_first_name.trim().length > 0) ||
    (d.candidate_last_name && d.candidate_last_name.trim().length > 0) ||
    (d.candidate_display_name && d.candidate_display_name.trim().length > 0),
  { message: "At least one name field (candidate_first_name, candidate_last_name, or candidate_display_name) is required" }
);

export type IntakePayload = z.infer<typeof intakeSchema>;

// Map AI tier string to Prisma enum
export function mapTierToEnum(tierStr: string | null | undefined) {
  if (!tierStr) return null;
  const lower = tierStr.toLowerCase();
  // Exact enum matches first (AI structured output)
  if (lower === "tier_1") return "TIER_1";
  if (lower === "tier_2") return "TIER_2";
  if (lower === "tier_3") return "TIER_3";
  if (lower === "tier_4") return "TIER_4";
  // Prefix matches for natural language labels (e.g. "Tier 1 (Premium)")
  if (lower.startsWith("tier 1") || lower.startsWith("tier_1")) return "TIER_1";
  if (lower.startsWith("tier 2") || lower.startsWith("tier_2")) return "TIER_2";
  if (lower.startsWith("tier 3") || lower.startsWith("tier_3")) return "TIER_3";
  if (lower.startsWith("tier 4") || lower.startsWith("tier_4")) return "TIER_4";
  // Keyword fallbacks for descriptive labels
  if (lower === "premium") return "TIER_1";
  if (lower === "strong") return "TIER_2";
  if (lower === "transitional") return "TIER_3";
  if (lower === "high risk" || lower === "high_risk") return "TIER_4";
  return null;
}

// Map triage action string to Prisma enum
export function mapTriageToEnum(actionStr: string | null | undefined) {
  if (!actionStr) return null;
  // Normalize: lowercase + collapse spaces, hyphens, and en/em dashes into underscores
  // \u2013 = en dash (–), \u2014 = em dash (—) — used by AI structured output
  const normalized = actionStr.toLowerCase().replace(/[\s\u2013\u2014-]+/g, "_");
  // Exact enum matches first (AI structured output uses underscores or dashes)
  if (normalized === "advance_priority_call") return "ADVANCE_PRIORITY_CALL";
  if (normalized === "advance_schedule_review") return "ADVANCE_SCHEDULE_REVIEW";
  if (normalized === "hold_recruiter_judgment") return "HOLD_RECRUITER_JUDGMENT";
  if (normalized === "pass_do_not_submit") return "PASS_DO_NOT_SUBMIT";
  // Substring fallbacks — robust to any dash/separator variant the AI produces
  const lower = actionStr.toLowerCase();
  if (lower.includes("priority call")) return "ADVANCE_PRIORITY_CALL";
  if (lower.includes("schedule review")) return "ADVANCE_SCHEDULE_REVIEW";
  if (lower.startsWith("hold")) return "HOLD_RECRUITER_JUDGMENT";
  if (lower.startsWith("pass") || lower.includes("do not submit")) return "PASS_DO_NOT_SUBMIT";
  return null;
}

// Map detected role type to Prisma enum
export function mapRoleTypeToEnum(roleStr: string | null | undefined) {
  if (!roleStr) return null;
  // Normalize: lowercase + strip non-alpha to compare enum keys
  const normalized = roleStr.toLowerCase().replace(/[\s_-]+/g, "_").replace(/[^a-z_]/g, "");
  // Exact enum matches (AI structured output)
  if (normalized === "legal_secretary") return "LEGAL_SECRETARY";
  if (normalized === "legal_assistant") return "LEGAL_ASSISTANT";
  if (normalized === "paralegal") return "PARALEGAL";
  if (normalized === "billing_coordinator") return "BILLING_COORDINATOR";
  if (normalized === "billing_clerk") return "BILLING_CLERK";
  if (normalized === "other_legal") return "OTHER_LEGAL";
  if (normalized === "other_professional") return "OTHER_PROFESSIONAL";
  if (normalized === "non_legal") return "NON_LEGAL";
  // Natural language prefix fallbacks (must check non_legal BEFORE legal to avoid false match)
  const lower = roleStr.toLowerCase();
  if (lower.startsWith("legal secretary")) return "LEGAL_SECRETARY";
  if (lower.startsWith("legal assistant")) return "LEGAL_ASSISTANT";
  if (lower.startsWith("paralegal")) return "PARALEGAL";
  if (lower.startsWith("billing coordinator")) return "BILLING_COORDINATOR";
  if (lower.startsWith("billing clerk")) return "BILLING_CLERK";
  if (lower.startsWith("non-legal") || lower.startsWith("non legal") || lower.startsWith("nonlegal")) return "NON_LEGAL";
  if (lower.startsWith("other legal") || lower.startsWith("other_legal")) return "OTHER_LEGAL";
  if (lower.includes("legal")) return "OTHER_LEGAL";
  return "OTHER_PROFESSIONAL";
}

// Sanitize filename — strip path traversal, keep extension
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\]/g, "") // no path separators
    .replace(/\.\./g, "") // no double dots
    .replace(/[^a-zA-Z0-9._\-\s]/g, "_") // safe chars only
    .trim()
    .slice(0, 200) || "resume.pdf";
}
