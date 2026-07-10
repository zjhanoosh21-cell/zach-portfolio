// Shared display constants for candidate tier, status, and triage action.
// Import from here — do not re-define in individual files.

export const VALID_TIERS = ["TIER_1", "TIER_2", "TIER_3", "TIER_4"];
export const VALID_STATUSES = ["NEW", "REVIEWED", "ACTIVE", "PLACED", "ON_HOLD", "REJECTED", "DO_NOT_CONSIDER"];
export const VALID_ROLES = ["LEGAL_SECRETARY", "LEGAL_ASSISTANT", "PARALEGAL", "BILLING_CLERK", "BILLING_COORDINATOR", "OTHER_LEGAL", "OTHER_PROFESSIONAL", "NON_LEGAL"];

export const TIER_LABEL: Record<string, string> = {
  TIER_1: "Tier 1 – Premium",
  TIER_2: "Tier 2 – Strong",
  TIER_3: "Tier 3 – Transitional",
  TIER_4: "Tier 4 – High Risk",
};

export const TIER_LABEL_SHORT: Record<string, string> = {
  TIER_1: "T1 – Premium",
  TIER_2: "T2 – Strong",
  TIER_3: "T3 – Transitional",
  TIER_4: "T4 – High Risk",
};

export const TIER_CLASSES: Record<string, string> = {
  TIER_1: "bg-emerald-100 text-emerald-800 border-emerald-200",
  TIER_2: "bg-blue-100 text-blue-800 border-blue-200",
  TIER_3: "bg-amber-100 text-amber-800 border-amber-200",
  TIER_4: "bg-red-100 text-red-800 border-red-200",
};

export const TIER_SCORE_COLOR: Record<string, string> = {
  TIER_1: "text-emerald-700",
  TIER_2: "text-blue-700",
  TIER_3: "text-amber-700",
  TIER_4: "text-red-600",
};

export const STATUS_CLASSES: Record<string, string> = {
  NEW: "bg-violet-100 text-violet-800",
  REVIEWED: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-sky-100 text-sky-800",
  PLACED: "bg-emerald-100 text-emerald-800",
  ON_HOLD: "bg-amber-100 text-amber-800",
  REJECTED: "bg-red-100 text-red-700",
  DO_NOT_CONSIDER: "bg-red-200 text-red-900",
};

export const TRIAGE_LABEL: Record<string, string> = {
  ADVANCE_PRIORITY_CALL: "Priority Call",
  ADVANCE_SCHEDULE_REVIEW: "Schedule Review",
  HOLD_RECRUITER_JUDGMENT: "Hold",
  PASS_DO_NOT_SUBMIT: "Pass",
};

/** Returns the score that should be displayed everywhere for this candidate. */
export function effectiveScore(
  aiScore: number | null,
  manualScore: number | null,
  useManual: boolean
): number | null {
  if (useManual && manualScore != null) return manualScore;
  return aiScore ?? null;
}

/** Maps a raw 0–100 score to its CRI tier string. */
export function scoreToTier(score: number): string {
  if (score >= 76) return "TIER_1";
  if (score >= 51) return "TIER_2";
  if (score >= 26) return "TIER_3";
  return "TIER_4";
}

/**
 * Returns the tier to use for colors and badges.
 * When a manual score is active, derives the tier from that score
 * so the circle color always matches the number shown.
 */
export function effectiveTier(
  aiTier: string | null,
  aiScore: number | null,
  manualScore: number | null,
  useManual: boolean
): string | null {
  if (useManual && manualScore != null) return scoreToTier(manualScore);
  return aiTier;
}

/**
 * Returns true if "Priority Call" should be shown for this candidate.
 * Shows if manually set OR if AI recommended it and score is high enough (>=70).
 */
export function showPriorityCall(
  priorityCall: boolean,
  aiTriageAction: string | null,
  score: number | null,
): boolean {
  if (priorityCall) return true;
  if (aiTriageAction === "ADVANCE_PRIORITY_CALL" && score != null && score >= 70) return true;
  return false;
}

export const TRIAGE_CLASSES: Record<string, string> = {
  ADVANCE_PRIORITY_CALL: "text-emerald-700",
  ADVANCE_SCHEDULE_REVIEW: "text-blue-700",
  HOLD_RECRUITER_JUDGMENT: "text-amber-700",
  PASS_DO_NOT_SUBMIT: "text-red-600",
};
