import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import { TIER_LABEL, TIER_CLASSES, TRIAGE_LABEL } from "@/lib/candidate-display";
import { WindowPersist } from "@/components/dashboard/window-persist";
import { ReturningCandidates } from "@/components/dashboard/returning-candidates";
import { DashboardSections } from "@/components/dashboard/dashboard-sections";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DEFAULT_SECTIONS } from "@/app/api/preferences/dashboard/route";
import type { DashboardSection } from "@/app/api/preferences/dashboard/route";

const WINDOW_OPTIONS = [
  { value: "1d",  label: "24h",     ms: 24 * 60 * 60 * 1000 },
  { value: "3d",  label: "3 days",  ms: 3  * 24 * 60 * 60 * 1000 },
  { value: "7d",  label: "7 days",  ms: 7  * 24 * 60 * 60 * 1000 },
  { value: "30d", label: "30 days", ms: 30 * 24 * 60 * 60 * 1000 },
] as const;

type WindowValue = (typeof WINDOW_OPTIONS)[number]["value"];

function getWindowMs(w: string | undefined): number {
  return WINDOW_OPTIONS.find((o) => o.value === w)?.ms ?? WINDOW_OPTIONS[0].ms;
}

function getWindowLabel(w: string | undefined): string {
  return WINDOW_OPTIONS.find((o) => o.value === w)?.label ?? WINDOW_OPTIONS[0].label;
}

async function getDashboardStats(windowMs: number) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const windowStart = new Date(now.getTime() - windowMs);

  const [
    newToday,
    needsReview,
    tier1Active,
    openJobs,
    recentCandidates,
    tierCounts,
    statusCounts,
    recentActivity,
    priorityCandidates,
    recruiterJobs,
    activeUsers,
    priorityCallCandidates,
    returningCandidates,
  ] = await Promise.all([
    // New candidates today
    prisma.candidate.count({ where: { createdAt: { gte: todayStart } } }),

    // Unreviewed (status = NEW)
    prisma.candidate.count({ where: { status: "NEW" } }),

    // Tier 1 in active pipeline
    prisma.candidate.count({
      where: {
        aiTier: "TIER_1",
        status: { in: ["NEW", "REVIEWED", "ACTIVE"] },
      },
    }),

    // Open job orders
    prisma.jobOrder.count({ where: { status: "OPEN" } }),

    // Recent candidates (selected window)
    prisma.candidate.findMany({
      where: { createdAt: { gte: windowStart } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        displayName: true,
        firstName: true,
        lastName: true,
        appliedRole: true,
        aiCompositeScore: true,
        manualScore: true,
        useManualScore: true,
        aiTier: true,
        aiTriageAction: true,
        priorityCall: true,
        candidateLocation: true,
        status: true,
        createdAt: true,
      },
    }),

    // Tier distribution
    prisma.candidate.groupBy({
      by: ["aiTier"],
      _count: { id: true },
      where: { aiTier: { not: null } },
    }),

    // Status distribution (active pipeline only)
    prisma.candidate.groupBy({
      by: ["status"],
      _count: { id: true },
      where: { status: { in: ["NEW", "REVIEWED", "ACTIVE", "ON_HOLD"] } },
    }),

    // Recent activity log
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: { select: { name: true } },
        candidate: { select: { displayName: true, firstName: true, lastName: true } },
      },
    }),

    // Priority: unreviewed Tier 1 & 2 — act on these first
    prisma.candidate.findMany({
      where: {
        status: "NEW",
        aiTier: { in: ["TIER_1", "TIER_2"] },
      },
      orderBy: { aiCompositeScore: "desc" },
      take: 5,
      select: {
        id: true,
        displayName: true,
        appliedRole: true,
        aiCompositeScore: true,
        manualScore: true,
        useManualScore: true,
        aiTier: true,
        aiTriageAction: true,
        candidateLocation: true,
        createdAt: true,
      },
    }),

    // Open jobs by assignee
    prisma.jobOrder.groupBy({
      by: ["assignedToId"],
      where: { assignedToId: { not: null }, status: "OPEN" },
      _count: { _all: true },
    }),

    // Active users for name lookup
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    }),

    // Priority call candidates — manually flagged or AI-recommended with score ≥ 70
    prisma.candidate.findMany({
      where: {
        status: { notIn: ["PLACED", "REJECTED", "DO_NOT_CONSIDER"] },
        OR: [
          { priorityCall: true },
          { aiTriageAction: "ADVANCE_PRIORITY_CALL", aiCompositeScore: { gte: 70 } },
        ],
      },
      orderBy: [{ priorityCall: "desc" }, { aiCompositeScore: "desc" }],
      take: 8,
      select: {
        id: true,
        displayName: true,
        appliedRole: true,
        aiCompositeScore: true,
        manualScore: true,
        useManualScore: true,
        aiTier: true,
        aiTriageAction: true,
        priorityCall: true,
        candidateLocation: true,
        createdAt: true,
      },
    }),

    // Returning candidates — re-applied within the last 7 days
    prisma.candidate.findMany({
      where: {
        lastReappliedAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { lastReappliedAt: "desc" },
      take: 10,
      select: {
        id: true,
        displayName: true,
        firstName: true,
        lastName: true,
        appliedRole: true,
        pastAppliedRoles: true,
        lastReappliedAt: true,
        status: true,
        aiTier: true,
      },
    }),
  ]);

  return {
    newToday,
    needsReview,
    tier1Active,
    openJobs,
    recentCandidates,
    tierCounts,
    statusCounts,
    recentActivity,
    priorityCandidates,
    recruiterJobs,
    activeUsers,
    priorityCallCandidates,
    returningCandidates,
  };
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

const TIER_COLORS = TIER_CLASSES; // alias for local readability

const TIER_BAR: Record<string, string> = {
  TIER_1: "bg-emerald-500",
  TIER_2: "bg-blue-500",
  TIER_3: "bg-amber-500",
  TIER_4: "bg-red-400",
};

const TIER_LABELS = TIER_LABEL; // alias for local readability

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  REVIEWED: "Reviewed",
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
};

const STATUS_BAR: Record<string, string> = {
  NEW: "bg-violet-500",
  REVIEWED: "bg-slate-400",
  ACTIVE: "bg-sky-500",
  ON_HOLD: "bg-amber-500",
};

const TRIAGE_LABELS = TRIAGE_LABEL; // alias for local readability


// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const { window: windowParam } = await searchParams;
  const windowMs = getWindowMs(windowParam);
  const windowLabel = getWindowLabel(windowParam);
  const activeWindow = (windowParam ?? "1d") as WindowValue;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;

  const [dashboardData, userPrefs] = await Promise.all([
    getDashboardStats(windowMs),
    userId
      ? prisma.user.findUnique({ where: { id: userId }, select: { dashboardPrefs: true } })
      : Promise.resolve(null),
  ]);

  const {
    newToday,
    needsReview,
    tier1Active,
    openJobs,
    recentCandidates,
    tierCounts,
    statusCounts,
    recentActivity,
    priorityCandidates,
    recruiterJobs,
    activeUsers,
    priorityCallCandidates,
    returningCandidates,
  } = dashboardData;

  // Resolve saved section prefs, falling back to defaults
  function parseSavedSections(raw: unknown): DashboardSection[] {
    if (!raw || typeof raw !== "object") return DEFAULT_SECTIONS;
    const data = raw as { sections?: unknown };
    if (!Array.isArray(data.sections)) return DEFAULT_SECTIONS;
    const validIds = new Set(["priority_calls", "needs_your_attention", "new_candidates"]);
    const parsed = data.sections.filter(
      (s): s is DashboardSection =>
        s && typeof s === "object" &&
        validIds.has((s as DashboardSection).id) &&
        typeof (s as DashboardSection).visible === "boolean" &&
        typeof (s as DashboardSection).collapsed === "boolean"
    );
    const presentIds = new Set(parsed.map((s) => s.id));
    for (const def of DEFAULT_SECTIONS) {
      if (!presentIds.has(def.id)) parsed.push({ ...def });
    }
    return parsed;
  }

  const initialSections = parseSavedSections(userPrefs?.dashboardPrefs);

  // Build recruiter workload map
  const recruiterWorkload = activeUsers
    .map((u) => ({
      id: u.id,
      name: u.name,
      openJobs: recruiterJobs.find((r) => r.assignedToId === u.id)?._count._all ?? 0,
    }))
    .filter((r) => r.openJobs > 0)
    .sort((a, b) => b.openJobs - a.openJobs);

  const totalTier = tierCounts.reduce((s, t) => s + t._count.id, 0);
  const totalStatus = statusCounts.reduce((s, t) => s + t._count.id, 0);

  return (
    <div className="space-y-8">
      <WindowPersist activeWindow={windowParam} />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="New Today"
          value={newToday}
          href="/candidates?filter=today"
          color="text-slate-900"
        />
        <StatCard
          label="Needs Review"
          value={needsReview}
          href="/candidates?status=NEW"
          color="text-slate-900"
          note={needsReview > 0 ? "unread" : undefined}
        />
        <StatCard
          label="Priority Calls"
          value={priorityCallCandidates.length}
          href="/candidates?filter=priority"
          color={priorityCallCandidates.length > 0 ? "text-emerald-700" : "text-slate-900"}
          note={priorityCallCandidates.length > 0 ? "needs call" : undefined}
        />
        <StatCard
          label="Open Jobs"
          value={openJobs}
          href="/jobs"
          color="text-slate-900"
        />
      </div>

      {/* Priority attention + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Priority candidates */}
        <div className="lg:col-span-2">
          <DashboardSections
            priorityCallCandidates={priorityCallCandidates}
            priorityCandidates={priorityCandidates}
            recentCandidates={recentCandidates}
            activeWindow={activeWindow}
            windowLabel={windowLabel}
            windowOptions={WINDOW_OPTIONS.map(({ value, label }) => ({ value, label }))}
            initialSections={initialSections}
          />
        </div>

        {/* Right column: distributions + activity */}
        <div className="space-y-6">

          {/* Returning candidates — re-applied in the last 7 days */}
          <ReturningCandidates candidates={returningCandidates} />

          {/* Recruiter workload — top of right column */}
          {recruiterWorkload.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-medium text-slate-900">Recruiter workload</h2>
              <div className="rounded border border-slate-200 bg-white divide-y divide-slate-100">
                {recruiterWorkload.map((r) => (
                  <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                    <Link
                      href={`/jobs?assignedTo=${r.id}`}
                      className="text-sm font-medium text-[#1a6bbf] hover:underline"
                    >
                      {r.name}
                    </Link>
                    <span className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-900">{r.openJobs}</span> open job{r.openJobs !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pipeline status */}
          <div className="space-y-3">
            <h2 className="font-medium text-slate-900">Pipeline snapshot</h2>
            <div className="rounded border border-slate-200 bg-white p-4 space-y-3">
              {["NEW", "REVIEWED", "ACTIVE", "ON_HOLD"].map((s) => {
                const count = statusCounts.find((x) => x.status === s)?._count.id ?? 0;
                const pct = totalStatus > 0 ? Math.round((count / totalStatus) * 100) : 0;
                return (
                  <div key={s}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{STATUS_LABELS[s]}</span>
                      <span className="text-slate-500 font-medium">{count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${STATUS_BAR[s]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tier distribution */}
          <div className="space-y-3">
            <h2 className="font-medium text-slate-900">AI tier breakdown</h2>
            <div className="rounded border border-slate-200 bg-white p-4 space-y-3">
              {["TIER_1", "TIER_2", "TIER_3", "TIER_4"].map((tier) => {
                const count = tierCounts.find((t) => t.aiTier === tier)?._count.id ?? 0;
                const pct = totalTier > 0 ? Math.round((count / totalTier) * 100) : 0;
                return (
                  <div key={tier}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{TIER_LABELS[tier]}</span>
                      <span className="text-slate-500 font-medium">{count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${TIER_BAR[tier]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity feed */}
          {recentActivity.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-medium text-slate-900">Recent activity</h2>
              <div className="rounded border border-slate-200 bg-white divide-y divide-slate-100">
                {recentActivity.map((a) => {
                  const candidateName = a.candidate
                    ? a.candidate.displayName ||
                      `${a.candidate.firstName ?? ""} ${a.candidate.lastName ?? ""}`.trim() ||
                      "Candidate"
                    : null;
                  return (
                    <div key={a.id} className="px-4 py-3">
                      <p className="text-xs text-slate-700 leading-snug">
                        {a.description}
                        {candidateName && (
                          <span className="text-slate-500"> — {candidateName}</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {a.user?.name ?? "System"} · {timeAgo(a.createdAt)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  href,
  color,
  note,
}: {
  label: string;
  value: number;
  href: string;
  color?: string;
  note?: string;
}) {
  return (
    <Link href={href} className="h-full">
      <div className="h-full rounded border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer">
        <p className={`text-3xl font-bold ${color ?? "text-slate-900"}`}>{value}</p>
        <p className="text-sm text-slate-500 mt-1">{label}</p>
        {note && <p className="text-xs text-amber-500 mt-0.5">{note}</p>}
      </div>
    </Link>
  );
}

