import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { StatusUpdater } from "@/components/candidate/status-updater";
import { NoteForm } from "@/components/candidate/note-form";
import { NotesList } from "@/components/candidate/notes-list";
import { SubmitCandidateForm } from "@/components/job/submit-candidate";
import { DeleteCandidate } from "@/components/candidate/delete-candidate";
import { AttachmentsManager } from "@/components/candidate/attachments-manager";
import { CandidateEditor } from "@/components/candidate/candidate-editor";
import { DuplicateDismiss } from "@/components/candidate/duplicate-dismiss";
import { CandidateTabBar } from "@/components/candidate/candidate-tab-bar";
import { Suspense } from "react";
import { ManualScoreEditor } from "@/components/candidate/manual-score-editor";
import { PriorityCallToggle } from "@/components/candidate/priority-call-toggle";
import { CandidateListNavigator } from "@/components/candidate/candidate-list-navigator";
import { BackButton } from "@/components/candidate/back-button";
import { SubmittedJobsList } from "@/components/candidate/submitted-jobs-list";
import { DiscussionPanel } from "@/components/discussion/discussion-panel";
import { ResumeCard } from "@/components/candidate/resume-card";
import { CopyButton } from "@/components/candidate/copy-button";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  TIER_LABEL,
  TIER_CLASSES,
  TIER_SCORE_COLOR,
  STATUS_CLASSES,
  effectiveScore,
  effectiveTier,
} from "@/lib/candidate-display";

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────

const FACTOR_LABELS: Record<string, string> = {
  scoreLawFirmExp: "Law Firm Exp.",
  scoreLongevity: "Longevity",
  scoreTitleSpecific: "Title Match",
  scoreTechnicalSkills: "Technical",
  scoreProfessionalism: "Professionalism",
};


const ROLE_TYPE_LABELS: Record<string, string> = {
  LEGAL_SECRETARY: "Legal Secretary",
  LEGAL_ASSISTANT: "Legal Assistant",
  PARALEGAL: "Paralegal",
  BILLING_CLERK: "Billing Clerk",
  BILLING_COORDINATOR: "Billing Coordinator",
  OTHER_LEGAL: "Other Legal",
  OTHER_PROFESSIONAL: "Other Professional",
  NON_LEGAL: "Non-Legal",
};

// ─────────────────────────────────────────────────────────
// Job match scoring
// ─────────────────────────────────────────────────────────

function scoreJobMatch(
  candidateRoleType: string | null,
  candidatePracticeAreas: string[],
  candidateKeySkills: string[],
  candidateDesiredSalary: number | null,
  job: { roleType: string | null; practiceAreas: string[]; requiredSkills: string[]; salaryMin: number | null; salaryMax: number | null }
): number {
  let score = 0;

  // Role type match: 50 pts
  if (candidateRoleType && job.roleType && candidateRoleType === job.roleType) {
    score += 50;
  }

  // Practice areas overlap: up to 30 pts
  if (candidatePracticeAreas.length > 0 && job.practiceAreas.length > 0) {
    const cSet = new Set(candidatePracticeAreas.map((s) => s.toLowerCase()));
    const overlap = job.practiceAreas.filter((pa) => cSet.has(pa.toLowerCase())).length;
    const denom = Math.min(candidatePracticeAreas.length, job.practiceAreas.length);
    if (denom > 0) score += Math.round((overlap / denom) * 30);
  }

  // Skills overlap: up to 20 pts
  if (candidateKeySkills.length > 0 && job.requiredSkills.length > 0) {
    const cSet = new Set(candidateKeySkills.map((s) => s.toLowerCase()));
    const overlap = job.requiredSkills.filter((sk) => cSet.has(sk.toLowerCase())).length;
    const denom = Math.min(candidateKeySkills.length, job.requiredSkills.length);
    if (denom > 0) score += Math.round((overlap / denom) * 20);
  }

  // Salary compatibility: -15 pts if candidate wants >10% over job max
  if (candidateDesiredSalary != null && job.salaryMax != null && candidateDesiredSalary > job.salaryMax * 1.1) {
    score -= 15;
  }

  return Math.max(0, score);
}

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

export default async function CandidateDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await getServerSession(authOptions);
  const isAdmin = !!(session?.user as { isAdmin?: boolean } | null)?.isAdmin;
  const isManager = !!(session?.user as { isManager?: boolean } | null)?.isManager;
  const canDelete = isAdmin || isManager;

  // Build URL-encoded back href for job links — preserves list/dashboard context so returning from job restores navigator
  const currentParams = new URLSearchParams();
  Object.entries(sp).forEach(([k, v]) => { if (v) currentParams.set(k, v); });
  const currentParamsStr = currentParams.toString();
  const candidateBackHref = encodeURIComponent(`/candidates/${id}${currentParamsStr ? `?${currentParamsStr}` : ""}`);

  // Build list context string from URL params (strip "from", "page", "panel" — used by navigator)
  const fromDashboard = sp.from === "dashboard";
  const listSearchParamsStr = (sp.from === "list" || fromDashboard)
    ? (() => {
        const p = new URLSearchParams();
        Object.entries(sp).forEach(([k, v]) => {
          if (k !== "from" && k !== "page" && k !== "panel" && v) p.set(k, v);
        });
        return p.toString();
      })()
    : null;

  // For dashboard context, back link restores window filter if present
  const dashboardBackHref = fromDashboard
    ? sp.window ? `/dashboard?window=${sp.window}` : "/dashboard"
    : undefined;

  const userId = (session?.user as { id?: string } | null)?.id ?? null;

  const [candidate, openJobs, appSettings, userFieldPrefs] = await Promise.all([
    prisma.candidate.findUnique({
      where: { id },
      include: {
        notes: {
          orderBy: { createdAt: "desc" },
          include: {
            author: { select: { name: true } },
            submission: { select: { jobOrder: { select: { id: true, title: true } } } },
          },
        },
        submissions: {
          include: {
            jobOrder: { select: { id: true, title: true, clientName: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        activityLog: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        attachments: {
          orderBy: { uploadedAt: "desc" },
        },
      },
    }),
    prisma.jobOrder.findMany({
      where: { status: "OPEN" },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      select: { id: true, title: true, clientName: true, status: true, roleType: true, practiceAreas: true, requiredSkills: true, salaryMin: true, salaryMax: true },
    }),
    prisma.appSettings.findUnique({ where: { id: "singleton" } }),
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { profileFieldPrefs: true } })
      : null,
  ]);

  if (!candidate) notFound();

  const aiScoringEnabled = appSettings?.aiScoringEnabled ?? true;
  const fieldPrefs = (userFieldPrefs?.profileFieldPrefs as { visible?: string[] } | null)?.visible ?? undefined;

  // Potential duplicate check — same first+last name, different record
  const potentialDuplicates = (candidate.firstName && candidate.lastName)
    ? await prisma.candidate.findMany({
        where: {
          id: { not: id },
          firstName: { equals: candidate.firstName, mode: "insensitive" },
          lastName: { equals: candidate.lastName, mode: "insensitive" },
        },
        select: { id: true, displayName: true, firstName: true, lastName: true, currentTitle: true, currentEmployer: true, status: true, createdAt: true },
        take: 5,
      })
    : [];

  // Auto-review if NEW
  if (candidate.status === "NEW") {
    await prisma.candidate.update({
      where: { id },
      data: { status: "REVIEWED", reviewedAt: new Date() },
    });
    prisma.activityLog.create({
      data: {
        type: "STATUS_CHANGED",
        description: "Status changed from NEW to REVIEWED",
        candidateId: id,
        metadata: { from: "NEW", to: "REVIEWED", auto: true },
      },
    }).catch(() => {});
  }

  const name =
    candidate.displayName ||
    [candidate.firstName, candidate.lastName].filter(Boolean).join(" ") ||
    "Unknown Candidate";

  const hasResume = !!candidate.resumeStoragePath;
  const tier = effectiveTier(candidate.aiTier, candidate.aiCompositeScore, candidate.manualScore, candidate.useManualScore);
  const effScore = effectiveScore(candidate.aiCompositeScore, candidate.manualScore, candidate.useManualScore);
  const activeTab = sp.tab ?? "overview";

  const factorKeys = [
    "scoreLawFirmExp",
    "scoreLongevity",
    "scoreTitleSpecific",
    "scoreTechnicalSkills",
    "scoreProfessionalism",
  ] as const;

  const hasAiScorecard =
    factorKeys.some((k) => candidate[k] != null) ||
    !!candidate.aiTriageAction ||
    candidate.priorityCall ||
    !!candidate.aiSummary;

  const hasAiDetails =
    candidate.practiceAreas.length > 0 ||
    candidate.keySkills.length > 0 ||
    candidate.topStrengths.length > 0 ||
    candidate.topConcerns.length > 0 ||
    candidate.riskFlags.length > 0;

  const tabBar = (
    <Suspense fallback={null}>
      <CandidateTabBar />
    </Suspense>
  );

  // Profile content — shared between list-context (navigator shell) and direct-nav (simple header) modes
  const profileContent = (
    <>
      {/* ── Compact header card — hidden on Overview (embedded in Card 1 there) ── */}
      {activeTab !== "overview" && <div className="rounded border border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <h1 className="text-lg font-bold text-slate-900 mr-0.5">{name}</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASSES[candidate.status]}`}>
            {candidate.status.replace(/_/g, " ")}
          </span>
          {aiScoringEnabled && tier && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TIER_CLASSES[tier]}`}>
              {TIER_LABEL[tier]}
            </span>
          )}
          {candidate.aiDetectedRoleType && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
              {ROLE_TYPE_LABELS[candidate.aiDetectedRoleType] ?? candidate.aiDetectedRoleType.replace(/_/g, " ")}
            </span>
          )}
          {candidate.isDuplicate && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-300">
              ⚠ Duplicate
              <DuplicateDismiss candidateId={candidate.id} />
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500 mb-2.5">
          {candidate.currentTitle && <span>{candidate.currentTitle}</span>}
          {candidate.currentTitle && candidate.currentEmployer && <span className="text-slate-300">at</span>}
          {candidate.currentEmployer && <span className="font-medium text-slate-700">{candidate.currentEmployer}</span>}
          {(candidate.currentTitle || candidate.currentEmployer) && candidate.candidateLocation && <span className="text-slate-300">·</span>}
          {candidate.candidateLocation && <span>{candidate.candidateLocation}</span>}
          {candidate.yearsOfExperience != null && (
            <><span className="text-slate-300">·</span><span>{candidate.yearsOfExperience} yrs exp.</span></>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-2.5">
          <StatusUpdater candidateId={candidate.id} currentStatus={candidate.status} />
          <PriorityCallToggle
            candidateId={candidate.id}
            priorityCall={candidate.priorityCall}
            aiTriageAction={candidate.aiTriageAction}
            effectiveScore={effScore}
          />
        </div>
      </div>}

      {/* ── Compact duplicate strip ── */}
      {potentialDuplicates.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs">
          <span className="font-semibold text-amber-700 shrink-0">⚠ Possible duplicate{potentialDuplicates.length > 1 ? "s" : ""}:</span>
          {potentialDuplicates.map((dup) => {
            const dupName = dup.displayName || [dup.firstName, dup.lastName].filter(Boolean).join(" ") || "Unknown";
            return (
              <a key={dup.id} href={`/candidates/${dup.id}`} className="font-medium text-amber-800 hover:underline hover:text-[#1a6bbf]">
                {dupName}{dup.currentEmployer ? ` · ${dup.currentEmployer}` : ""}
              </a>
            );
          })}
          <span className="text-amber-500">— review before proceeding</span>
        </div>
      )}

      {/* ── Tab content (switched by ?tab= URL param) ── */}

      {/* ── OVERVIEW: 2×2 card grid ── */}
      {activeTab === "overview" && (() => {
        const visibleSet = new Set(fieldPrefs ?? [
          "resumeEmail","resumePhone","linkedinUrl","candidateLocation",
          "currentEmployer","currentTitle","appliedRole","yearsOfExperience",
          "educationDegree","educationInstitution","certifications",
          "barAdmissions","languages","typingWpm","desiredSalary",
          "availabilityNotes","workHistorySummary",
        ]);
        const show = (key: string) => visibleSet.has(key);
        const submittedIds = new Set(candidate.submissions.map((s) => s.jobOrder.id));
        const matchingJobs = openJobs
          .filter((j) => !submittedIds.has(j.id))
          .map((j) => ({ ...j, matchScore: scoreJobMatch(candidate.aiDetectedRoleType, candidate.practiceAreas, candidate.keySkills, candidate.desiredSalary, j) }))
          .filter((j) => j.matchScore >= 25)
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 5);
        return (
          <div className="flex flex-col md:flex-row gap-4 items-start">
          {/* ── Left column: Card 1 + Card 3 ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* ── Card 1: Header + Profile ── */}
            <div className="rounded border border-slate-200 bg-white">
              {/* Header section */}
              <div className="px-4 pt-4 pb-3">
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <h1 className="text-xl font-bold text-slate-900 mr-0.5">{name}</h1>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASSES[candidate.status]}`}>
                    {candidate.status.replace(/_/g, " ")}
                  </span>
                  {aiScoringEnabled && tier && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TIER_CLASSES[tier]}`}>
                      {TIER_LABEL[tier]}
                    </span>
                  )}
                  {candidate.aiDetectedRoleType && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      {ROLE_TYPE_LABELS[candidate.aiDetectedRoleType] ?? candidate.aiDetectedRoleType.replace(/_/g, " ")}
                    </span>
                  )}
                  {candidate.isDuplicate && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-300">
                      ⚠ Duplicate
                      <DuplicateDismiss candidateId={candidate.id} />
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-600 mb-3">
                  {candidate.currentTitle && <span>{candidate.currentTitle}</span>}
                  {candidate.currentTitle && candidate.currentEmployer && <span className="text-slate-300">at</span>}
                  {candidate.currentEmployer && <span className="font-medium text-slate-700">{candidate.currentEmployer}</span>}
                  {(candidate.currentTitle || candidate.currentEmployer) && candidate.candidateLocation && <span className="text-slate-300">·</span>}
                  {candidate.candidateLocation && <span>{candidate.candidateLocation}</span>}
                  {candidate.yearsOfExperience != null && (
                    <><span className="text-slate-300">·</span><span>{candidate.yearsOfExperience} yrs exp.</span></>
                  )}
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-200 border border-slate-200 rounded-lg bg-slate-50 overflow-hidden mt-2">
                  <div className="px-3 py-2.5 min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Status</p>
                    <StatusUpdater candidateId={candidate.id} currentStatus={candidate.status} />
                  </div>
                  <div className="px-3 py-2.5 flex flex-col items-center justify-center min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Priority</p>
                    <PriorityCallToggle
                      candidateId={candidate.id}
                      priorityCall={candidate.priorityCall}
                      aiTriageAction={candidate.aiTriageAction}
                      effectiveScore={effScore}
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-200" />

              {/* Profile fields + inline Jobs panel — 2-column grid */}
              <div className="p-3 grid grid-cols-1 md:grid-cols-[1fr_240px] gap-x-3 text-[13px] overflow-hidden">

                {/* LEFT: profile fields — compact labeled rows */}
                <div className="text-sm min-w-0">

                  {/* Email */}
                  {show("resumeEmail") && candidate.resumeEmail && (
                    <div className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-b-0 min-w-0">
                      <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase w-16 shrink-0">Email</span>
                      <a href={`mailto:${candidate.resumeEmail}`} target="_blank" rel="noopener noreferrer" className="text-[#1a6bbf] hover:underline truncate min-w-0">{candidate.resumeEmail}</a>
                      <div className="flex-1" />
                      <CopyButton value={candidate.resumeEmail} />
                    </div>
                  )}

                  {/* Phone */}
                  {show("resumePhone") && candidate.resumePhone && (
                    <div className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-b-0 min-w-0">
                      <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase w-16 shrink-0">Phone</span>
                      <a href={`tel:${candidate.resumePhone}`} className="text-slate-700 hover:text-[#1a6bbf] min-w-0">{candidate.resumePhone}</a>
                      <div className="flex-1" />
                      <CopyButton value={candidate.resumePhone} />
                    </div>
                  )}

                  {/* Location */}
                  {show("candidateLocation") && candidate.candidateLocation && (
                    <div className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-b-0 min-w-0">
                      <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase w-16 shrink-0">Location</span>
                      <span className="text-slate-700 truncate flex-1 min-w-0">{candidate.candidateLocation}</span>
                    </div>
                  )}

                  {/* LinkedIn */}
                  {show("linkedinUrl") && candidate.linkedinUrl && (
                    <div className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-b-0 min-w-0">
                      <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase w-16 shrink-0">LinkedIn</span>
                      <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-[#1a6bbf] hover:underline truncate flex-1 min-w-0">{candidate.linkedinUrl}</a>
                    </div>
                  )}

                  {/* Employer */}
                  {show("currentEmployer") && candidate.currentEmployer && (
                    <div className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-b-0 min-w-0">
                      <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase w-16 shrink-0">Employer</span>
                      <span className="text-slate-700 font-medium truncate flex-1 min-w-0">{candidate.currentEmployer}</span>
                    </div>
                  )}

                  {/* Title */}
                  {show("currentTitle") && candidate.currentTitle && (
                    <div className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-b-0 min-w-0">
                      <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase w-16 shrink-0">Title</span>
                      <span className="text-slate-600 truncate flex-1 min-w-0">{candidate.currentTitle}</span>
                    </div>
                  )}

                  {/* Experience */}
                  {show("yearsOfExperience") && candidate.yearsOfExperience != null && (
                    <div className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-b-0">
                      <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase w-16 shrink-0">Exp.</span>
                      <span className="text-slate-600">{candidate.yearsOfExperience} yrs</span>
                    </div>
                  )}

                  {/* Applied Role */}
                  {show("appliedRole") && candidate.appliedRole && (
                    <div className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-b-0 min-w-0">
                      <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase w-16 shrink-0">Applied</span>
                      <span className="text-slate-600 truncate flex-1 min-w-0">{candidate.appliedRole}</span>
                    </div>
                  )}

                  {/* Past Applications — surfaced when candidate re-applies via n8n intake */}
                  {candidate.pastAppliedRoles && candidate.pastAppliedRoles.length > 0 && (
                    <div className="flex items-start gap-3 py-1.5 border-b border-slate-100 last:border-b-0 min-w-0">
                      <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase w-16 shrink-0 pt-0.5">Past Apps</span>
                      <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                        {candidate.pastAppliedRoles.map((role, i) => (
                          <span
                            key={`${role}-${i}`}
                            className="inline-flex items-center rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-[11px] font-medium text-violet-700"
                            title={candidate.lastReappliedAt ? `Most recent re-application: ${new Date(candidate.lastReappliedAt).toLocaleString()}` : undefined}
                          >
                            🔄 {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Education — two lines, compact */}
                  {(show("educationDegree") || show("educationInstitution")) && (candidate.educationDegree || candidate.educationInstitution) && (
                    <div className="py-1.5 border-b border-slate-100 last:border-b-0">
                      <div className="flex items-baseline gap-3">
                        <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase w-16 shrink-0">Edu.</span>
                        <div className="min-w-0 text-xs">
                          {(candidate.educationDegree || candidate.educationMajor) && (
                            <div className="text-slate-700 truncate">{[candidate.educationDegree, candidate.educationMajor].filter(Boolean).join(" · ")}</div>
                          )}
                          {candidate.educationInstitution && (
                            <div className="text-slate-400 truncate">{candidate.educationInstitution}{candidate.educationYear ? ` ${candidate.educationYear}` : ""}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {show("certifications") && (candidate.certifications as string[]).length > 0 && (
                    <div className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-b-0 min-w-0">
                      <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase w-16 shrink-0">Certs.</span>
                      <span className="text-xs text-slate-600 truncate flex-1 min-w-0">{(candidate.certifications as string[]).join(", ")}</span>
                    </div>
                  )}

                  {/* Bar Admissions */}
                  {show("barAdmissions") && (candidate.barAdmissions as string[]).length > 0 && (
                    <div className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-b-0 min-w-0">
                      <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase w-16 shrink-0">Bar</span>
                      <span className="text-xs text-slate-600 truncate flex-1 min-w-0">{(candidate.barAdmissions as string[]).join(", ")}</span>
                    </div>
                  )}

                  {/* Languages */}
                  {show("languages") && (candidate.languages as string[]).length > 0 && (
                    <div className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-b-0 min-w-0">
                      <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase w-16 shrink-0">Lang.</span>
                      <span className="text-xs text-slate-600 truncate flex-1 min-w-0">{(candidate.languages as string[]).join(", ")}</span>
                    </div>
                  )}

                  {/* Typing WPM */}
                  {show("typingWpm") && candidate.typingWpm != null && (
                    <div className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-b-0">
                      <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase w-16 shrink-0">Typing</span>
                      <span className="text-xs text-slate-600">{candidate.typingWpm} WPM</span>
                    </div>
                  )}

                  {/* Desired Salary */}
                  {show("desiredSalary") && candidate.desiredSalary != null && (
                    <div className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-b-0">
                      <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase w-16 shrink-0">Salary</span>
                      <span className="text-xs text-slate-600">${candidate.desiredSalary.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Availability */}
                  {show("availabilityNotes") && candidate.availabilityNotes && (
                    <div className="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-b-0 min-w-0">
                      <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase w-16 shrink-0">Avail.</span>
                      <span className="text-xs text-slate-600 italic truncate flex-1 min-w-0">{candidate.availabilityNotes}</span>
                    </div>
                  )}

                  {/* Work History Summary */}
                  {show("workHistorySummary") && candidate.workHistorySummary && (
                    <div className="py-1.5 border-b border-slate-100 last:border-b-0">
                      <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mb-0.5">History</div>
                      <div className="text-xs text-slate-600 leading-relaxed line-clamp-4">{candidate.workHistorySummary}</div>
                    </div>
                  )}

                </div>{/* end profile fields */}

                {/* RIGHT: Jobs panel — self-start so it only occupies what it needs */}
                <div className="self-start min-w-0 overflow-hidden space-y-3 border border-slate-200 rounded bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Linked Jobs</p>

                  {/* Submit to job */}
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1.5">Submit to Job</p>
                    <SubmitCandidateForm
                      candidateId={candidate.id}
                      openJobs={openJobs}
                      existingJobIds={candidate.submissions.map((s) => s.jobOrder.id)}
                    />
                  </div>

                  {/* Submitted jobs with full inline editing */}
                  {candidate.submissions.length > 0 && (
                    <div>
                      <p className="text-[10px] text-slate-400 mb-1.5">Submitted ({candidate.submissions.length})</p>
                      <SubmittedJobsList
                        submissions={candidate.submissions.map((s) => ({
                          id: s.id,
                          status: s.status,
                          interviewDate: s.interviewDate?.toISOString() ?? null,
                          submittedAt: s.createdAt.toISOString(),
                          jobOrder: {
                            id: s.jobOrder.id,
                            title: s.jobOrder.title,
                            clientName: s.jobOrder.clientName ?? "",
                          },
                        }))}
                        candidateId={candidate.id}
                      />
                    </div>
                  )}

                  {/* Matching jobs */}
                  {matchingJobs.length > 0 && (
                    <div>
                      <p className="text-[10px] text-emerald-700 font-semibold mb-1.5">Matching Jobs ({matchingJobs.length})</p>
                      <div className="space-y-1.5">
                        {matchingJobs.map((job) => {
                          const badgeColor = job.matchScore >= 75
                            ? "bg-emerald-100 text-emerald-700"
                            : job.matchScore >= 50
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700";
                          return (
                            <a key={job.id} href={`/jobs/${job.id}?back=${candidateBackHref}`} className="flex items-center justify-between gap-2 group">
                              <span className="text-xs font-medium text-slate-700 group-hover:text-emerald-700 truncate">{job.title}</span>
                              <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${badgeColor}`}>{job.matchScore}%</span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>{/* end jobs panel */}

              </div>
            </div>{/* end Card 1 outer */}

            {/* ── Card 3: AI Analysis ── */}
            {aiScoringEnabled && (hasAiScorecard || hasAiDetails) ? (
              <div className="rounded border border-slate-200 bg-white p-3">
                {/* 2-col grid: content left, score circle right (self-start so it doesn't push content down) */}
                <div className="grid grid-cols-[1fr_auto] gap-x-3">
                  {/* LEFT: label + triage + dot graph + summary + tags */}
                  <div className="space-y-2 min-w-0">
                    {/* Label */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide shrink-0">AI Analysis</p>
                    </div>
                    {/* Dot graph */}
                    <div className="space-y-1">
                      {factorKeys.map((key) => {
                        const score = candidate[key];
                        if (score == null) return null;
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 w-24 shrink-0 truncate">{FACTOR_LABELS[key]}</span>
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map((dot) => {
                                const filled = dot <= score;
                                const color = score >= 4 ? "bg-emerald-500" : score === 3 ? "bg-blue-500" : score === 2 ? "bg-amber-400" : "bg-red-400";
                                return <span key={dot} className={`w-2.5 h-2.5 rounded-full ${filled ? color : "bg-slate-200"}`} />;
                              })}
                            </div>
                            <span className="text-[10px] text-slate-400">{score}/5</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Summary quote */}
                    {candidate.aiSummary && (
                      <p className="text-xs text-slate-600 italic leading-relaxed">&ldquo;{candidate.aiSummary}&rdquo;</p>
                    )}
                    {candidate.topStrengths.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Strengths</p>
                        <div className="flex flex-wrap gap-1">
                          {candidate.topStrengths.slice(0, 4).map((s, i) => (
                            <span key={i} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {candidate.topConcerns.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Concerns</p>
                        <div className="flex flex-wrap gap-1">
                          {candidate.topConcerns.slice(0, 3).map((c, i) => (
                            <span key={i} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {candidate.riskFlags.length > 0 && (
                      <div className="text-xs text-red-700 space-y-0.5">
                        {candidate.riskFlags.map((f, i) => <div key={i}>⚠ {f}</div>)}
                      </div>
                    )}
                  </div>
                  {/* RIGHT: score circle — self-start so height doesn't affect left column */}
                  <div className="self-start">
                    <ManualScoreEditor
                      candidateId={candidate.id}
                      aiCompositeScore={candidate.aiCompositeScore}
                      manualScore={candidate.manualScore}
                      useManualScore={candidate.useManualScore}
                      tier={tier}
                      compact
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded border border-slate-200 bg-white p-3 flex items-center justify-center text-sm text-slate-400">
                No AI analysis available
              </div>
            )}

            {/* ── Discussion ── */}
            <div id="discussion" className="rounded border border-slate-200 bg-white p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Discussion</p>
              <DiscussionPanel candidateId={candidate.id} />
            </div>

          </div>{/* end left column */}

          {/* ── Right column: Notes + Resume ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* ── Card 2: Notes ── */}
            <div className="rounded border border-slate-200 bg-white p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Notes {candidate.notes.length > 0 && `(${candidate.notes.length})`}</p>
              <NotesList
                candidateId={candidate.id}
                limit={4}
                notes={candidate.notes.map((note) => ({
                  id: note.id,
                  type: note.type,
                  content: note.content,
                  createdAt: note.createdAt.toISOString(),
                  updatedAt: note.updatedAt.toISOString(),
                  authorName: note.author?.name ?? null,
                  submissionJobId: note.submission?.jobOrder.id ?? null,
                  submissionJobTitle: note.submission?.jobOrder.title ?? null,
                }))}
              />
              <NoteForm candidateId={candidate.id} />
            </div>

            {/* ── Card 4: Resume Preview ── */}
            {hasResume ? (
              <ResumeCard
                candidateId={candidate.id}
                resumeFileName={candidate.resumeFileName ?? null}
                resumeMimeType={candidate.resumeMimeType ?? null}
                candidateName={name}
              />
            ) : (
              <div className="rounded border border-slate-200 bg-white p-3 flex items-center justify-center text-sm text-slate-400">
                No resume on file
              </div>
            )}

          </div>{/* end right column */}

          </div>
        );
      })()}

      {/* ── PROFILE tab ── */}
      {activeTab === "profile" && (
        <CandidateEditor candidate={{
          id: candidate.id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          displayName: candidate.displayName,
          currentTitle: candidate.currentTitle,
          currentEmployer: candidate.currentEmployer,
          appliedRole: candidate.appliedRole,
          resumeEmail: candidate.resumeEmail,
          resumePhone: candidate.resumePhone,
          linkedinUrl: candidate.linkedinUrl,
          candidateAddress: candidate.candidateAddress,
          candidateCity: candidate.candidateCity,
          candidateState: candidate.candidateState,
          candidateZip: candidate.candidateZip,
          candidateLocation: candidate.candidateLocation,
          yearsOfExperience: candidate.yearsOfExperience,
          typingWpm: candidate.typingWpm,
          desiredSalary: candidate.desiredSalary,
          availabilityNotes: candidate.availabilityNotes,
          aiCompositeScore: candidate.aiCompositeScore,
          aiTier: candidate.aiTier,
          source: candidate.source,
          createdAt: candidate.createdAt,
          originalEntryDate: candidate.originalEntryDate,
          educationDegree: candidate.educationDegree,
          educationMajor: candidate.educationMajor,
          educationInstitution: candidate.educationInstitution,
          educationYear: candidate.educationYear,
          languages: candidate.languages,
          certifications: candidate.certifications,
          barAdmissions: candidate.barAdmissions,
          workHistorySummary: candidate.workHistorySummary,
        }} initialFieldPrefs={fieldPrefs} />
      )}

      {/* ── NOTES tab ── */}
      {activeTab === "notes" && (
        <div className="space-y-5">
          <div className="rounded border border-slate-200 bg-white p-5 space-y-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Notes</p>
            <NotesList
              candidateId={candidate.id}
              notes={candidate.notes.map((note) => ({
                id: note.id,
                type: note.type,
                content: note.content,
                createdAt: note.createdAt.toISOString(),
                updatedAt: note.updatedAt.toISOString(),
                authorName: note.author?.name ?? null,
                submissionJobId: note.submission?.jobOrder.id ?? null,
                submissionJobTitle: note.submission?.jobOrder.title ?? null,
              }))}
            />
            <NoteForm candidateId={candidate.id} />
          </div>
          <div className="rounded border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Discussions</p>
            <DiscussionPanel candidateId={candidate.id} />
          </div>
          {candidate.activityLog.length > 0 && (
            <div className="rounded border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Activity</p>
              <ol className="relative border-l border-slate-200 ml-1 space-y-3">
                {candidate.activityLog.map((entry) => (
                  <li key={entry.id} className="ml-3">
                    <div className="absolute -left-1 w-2 h-2 rounded-full border border-white bg-slate-300 mt-1" />
                    <p className="text-xs text-slate-700 leading-snug">{entry.description}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{entry.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* ── JOBS tab ── */}
      {activeTab === "jobs" && (
        <div className="space-y-5">
          {(() => {
            const today = new Date(); today.setHours(0,0,0,0);
            const upcoming = candidate.submissions
              .filter((s) => s.interviewDate && new Date(s.interviewDate) >= today)
              .sort((a, b) => new Date(a.interviewDate!).getTime() - new Date(b.interviewDate!).getTime());
            const past = candidate.submissions
              .filter((s) => {
                if (!s.interviewDate) return false;
                const d = new Date(s.interviewDate);
                const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - 14);
                return d < today && d >= cutoff;
              }).sort((a, b) => new Date(b.interviewDate!).getTime() - new Date(a.interviewDate!).getTime());
            if (upcoming.length === 0 && past.length === 0) return null;
            return (
              <div className="rounded border border-indigo-200 bg-indigo-50 p-4">
                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-3">Schedule</p>
                <div className="space-y-2">
                  {upcoming.map((s) => {
                    const d = new Date(new Date(s.interviewDate!).toISOString().split("T")[0] + "T12:00:00");
                    return (
                      <div key={s.id} className="flex items-center gap-2 text-xs">
                        <span className="w-16 text-indigo-500 font-medium shrink-0">{d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        <span className="text-slate-700 font-medium truncate">Interview · {s.jobOrder.title}</span>
                      </div>
                    );
                  })}
                  {past.map((s) => {
                    const d = new Date(new Date(s.interviewDate!).toISOString().split("T")[0] + "T12:00:00");
                    return (
                      <div key={s.id} className="flex items-center gap-2 text-xs opacity-50">
                        <span className="w-16 text-slate-400 shrink-0">{d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        <span className="text-slate-500 truncate line-through">Interview · {s.jobOrder.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          <div className="rounded border border-slate-200 bg-white p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Submit to Job</p>
              <SubmitCandidateForm candidateId={candidate.id} openJobs={openJobs} existingJobIds={candidate.submissions.map((s) => s.jobOrder.id)} />
            </div>
            {candidate.submissions.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Submitted To ({candidate.submissions.length})</p>
                <SubmittedJobsList
                  candidateId={candidate.id}
                  candidateBackHref={candidateBackHref}
                  submissions={candidate.submissions.map((s) => ({ id: s.id, status: s.status, interviewDate: s.interviewDate?.toISOString() ?? null, submittedAt: s.createdAt.toISOString(), jobOrder: s.jobOrder }))}
                />
              </div>
            )}
            {(() => {
              const submittedIds = new Set(candidate.submissions.map((s) => s.jobOrder.id));
              const scored = openJobs
                .filter((j) => !submittedIds.has(j.id))
                .map((j) => ({ ...j, matchScore: scoreJobMatch(candidate.aiDetectedRoleType, candidate.practiceAreas, candidate.keySkills, candidate.desiredSalary, j) }))
                .filter((j) => j.matchScore >= 25)
                .sort((a, b) => b.matchScore - a.matchScore)
                .slice(0, 8);
              return (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">Matching Open Jobs {scored.length > 0 ? `(${scored.length})` : ""}</p>
                  {scored.length === 0 ? <p className="text-sm text-slate-400">None</p> : (
                    <div className="space-y-2">
                      {scored.map((job) => {
                        const badgeColor = job.matchScore >= 75 ? "bg-emerald-100 text-emerald-700" : job.matchScore >= 50 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700";
                        return (
                          <a key={job.id} href={`/jobs/${job.id}?back=${candidateBackHref}`} className="flex items-center justify-between gap-2 group">
                            <div className="min-w-0">
                              <span className="block text-sm font-medium text-slate-900 group-hover:text-emerald-700 truncate">{job.title}</span>
                              <span className="text-xs text-slate-500">{job.clientName}</span>
                            </div>
                            <span className={`shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded ${badgeColor}`}>{job.matchScore}%</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <div className="rounded border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Resumes &amp; Files</p>
            <AttachmentsManager
              candidateId={candidate.id}
              primary={hasResume ? { candidateId: candidate.id, fileName: candidate.resumeFileName ?? null, mimeType: candidate.resumeMimeType ?? null } : null}
              initialAttachments={candidate.attachments.map((a) => ({ id: a.id, fileName: a.fileName, mimeType: a.mimeType, uploadedAt: a.uploadedAt.toISOString() }))}
            />
          </div>
          {canDelete && (
            <div className="rounded border border-red-200 bg-white p-4">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-3">Danger Zone</p>
              <DeleteCandidate candidateId={candidate.id} candidateName={name} hasDeletionPin={!!appSettings?.deletionPinHash} />
            </div>
          )}
        </div>
      )}

    </>
  );

  return listSearchParamsStr !== null ? (
    <CandidateListNavigator
      currentId={id}
      searchParamsStr={listSearchParamsStr}
      briefHref={`/candidates/${id}/brief`}
      initialPanelOpen={sp.panel === "1"}
      backHref={dashboardBackHref}
      from={fromDashboard ? "dashboard" : "list"}
      tabBar={tabBar}
    >
      {profileContent}
    </CandidateListNavigator>
  ) : (
    <div className="-mt-8">
      <div className="sticky top-16 z-[35] bg-white border-b border-slate-200 shadow-sm -mx-6 lg:-mx-10 px-6 lg:px-10 h-12 flex items-center mb-5">
        <div className="flex items-center justify-between w-full">
          <BackButton />
          <div className="flex-1 flex items-stretch h-full overflow-x-auto mx-2">
            {tabBar}
          </div>
          <Link href={`/candidates/${id}/brief`} target="_blank" className="text-sm text-slate-500 hover:text-[#1a6bbf] transition-colors shrink-0">
            Print Brief ↗
          </Link>
        </div>
      </div>
      <div className="space-y-5">
        {profileContent}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Helper components
// ─────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

function TagGroup({
  label,
  tags,
  className = "",
  color = "slate",
}: {
  label: string;
  tags: string[];
  className?: string;
  color?: "slate" | "blue";
}) {
  const tagClass =
    color === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div className={className}>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag, i) => (
          <span key={i} className={`text-xs px-2 py-0.5 rounded-full border ${tagClass}`}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
