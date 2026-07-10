import { prisma } from "@/lib/prisma";

function pct(num: number, denom: number) {
  if (denom === 0) return 0;
  return Math.round((num / denom) * 100);
}

const ROLE_LABELS: Record<string, string> = {
  LEGAL_SECRETARY: "Legal Secretary",
  LEGAL_ASSISTANT: "Legal Assistant",
  PARALEGAL: "Paralegal",
  BILLING_CLERK: "Billing Clerk",
  BILLING_COORDINATOR: "Billing Coordinator",
  OTHER_LEGAL: "Other Legal",
  OTHER_PROFESSIONAL: "Other Professional",
  NON_LEGAL: "Non-Legal",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-sky-400",
  REVIEWED: "bg-[#1a6bbf]",
  ACTIVE: "bg-emerald-500",
  PLACED: "bg-emerald-700",
  ON_HOLD: "bg-amber-400",
  REJECTED: "bg-red-400",
  DO_NOT_CONSIDER: "bg-slate-400",
};

export default async function AnalyticsCandidatesPage() {
  const now = new Date();

  const [candidateByStatus, candidateByTier, candidateBySource, candidateByRole, recentCandidates] =
    await Promise.all([
      prisma.candidate.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.candidate.groupBy({
        by: ["aiTier"],
        _count: { _all: true },
        where: { aiTier: { not: null } },
      }),
      prisma.candidate.groupBy({
        by: ["source"],
        _count: { _all: true },
        orderBy: { _count: { source: "desc" } },
      }),
      prisma.candidate.groupBy({
        by: ["aiDetectedRoleType"],
        _count: { _all: true },
        where: { aiDetectedRoleType: { not: null } },
        orderBy: { _count: { aiDetectedRoleType: "desc" } },
      }),
      prisma.candidate.findMany({
        where: { createdAt: { gte: new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000) } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

  const totalCandidates = candidateByStatus.reduce((s, r) => s + r._count._all, 0);
  const totalWithTier = candidateByTier.reduce((s, r) => s + r._count._all, 0);
  const totalByRole = candidateByRole.reduce((s, r) => s + r._count._all, 0);

  // Weekly intake (last 8 weeks)
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    weeks.push({
      label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: recentCandidates.filter((c) => c.createdAt >= start && c.createdAt < end).length,
    });
  }
  const maxWeek = Math.max(...weeks.map((w) => w.count), 1);

  const TIER_INFO = [
    { key: "TIER_1", label: "Tier 1 — Excellent", numCls: "text-emerald-600", bgCls: "bg-emerald-500" },
    { key: "TIER_2", label: "Tier 2 — Strong", numCls: "text-[#1a6bbf]", bgCls: "bg-[#1a6bbf]" },
    { key: "TIER_3", label: "Tier 3 — Moderate", numCls: "text-amber-600", bgCls: "bg-amber-400" },
    { key: "TIER_4", label: "Tier 4 — Weak", numCls: "text-red-500", bgCls: "bg-red-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Candidates" value={totalCandidates.toLocaleString()} />
        <StatCard label="AI-Scored" value={totalWithTier.toLocaleString()} />
        <StatCard
          label="Active"
          value={candidateByStatus.filter((r) => r.status === "ACTIVE").reduce((s, r) => s + r._count._all, 0).toLocaleString()}
        />
        <StatCard
          label="New (7 days)"
          value={weeks[weeks.length - 1].count.toLocaleString()}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status breakdown */}
        <div className="rounded border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold text-slate-800 mb-4">Candidates by Status</p>
          <div className="space-y-2.5">
            {candidateByStatus
              .sort((a, b) => b._count._all - a._count._all)
              .map((row) => (
                <div key={row.status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">{row.status.replace(/_/g, " ")}</span>
                    <span className="font-semibold text-slate-900">
                      {row._count._all}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        ({pct(row._count._all, totalCandidates)}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${STATUS_COLORS[row.status] ?? "bg-slate-400"}`}
                      style={{ width: `${pct(row._count._all, totalCandidates)}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Weekly intake */}
        <div className="rounded border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold text-slate-800 mb-4">Candidate Intake (8 Weeks)</p>
          <div className="flex items-end gap-2 h-32">
            {weeks.map((w) => (
              <div key={w.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-semibold text-slate-700">{w.count || ""}</span>
                <div className="w-full bg-slate-100 rounded-sm" style={{ height: "72px", display: "flex", alignItems: "flex-end" }}>
                  <div
                    className="w-full bg-[#1a6bbf] rounded-sm transition-all"
                    style={{ height: `${Math.max(pct(w.count, maxWeek), w.count > 0 ? 6 : 0)}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-400 text-center leading-tight">{w.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Tier distribution */}
        <div className="rounded border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold text-slate-800 mb-4">AI Tier Distribution</p>
          <div className="grid grid-cols-2 gap-3">
            {TIER_INFO.map((tier) => {
              const count = candidateByTier.find((r) => r.aiTier === tier.key)?._count._all ?? 0;
              return (
                <div key={tier.key} className="rounded border border-slate-100 p-4 text-center">
                  <p className={`text-3xl font-bold ${tier.numCls}`}>{count}</p>
                  <p className="text-xs text-slate-500 mt-1">{tier.label}</p>
                  <p className="text-xs text-slate-400">{pct(count, totalWithTier || 1)}% of scored</p>
                </div>
              );
            })}
          </div>
          {/* Tier bar */}
          {totalWithTier > 0 && (
            <div className="mt-4 h-2 rounded-full overflow-hidden flex gap-0.5">
              {TIER_INFO.map((tier) => {
                const count = candidateByTier.find((r) => r.aiTier === tier.key)?._count._all ?? 0;
                const w = pct(count, totalWithTier);
                return w > 0 ? (
                  <div key={tier.key} className={`h-full ${tier.bgCls}`} style={{ width: `${w}%` }} />
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* Role type breakdown */}
        <div className="rounded border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold text-slate-800 mb-4">Candidates by Role Type</p>
          <div className="space-y-2">
            {candidateByRole
              .filter((r) => r.aiDetectedRoleType)
              .map((row) => {
                const label = ROLE_LABELS[row.aiDetectedRoleType!] ?? row.aiDetectedRoleType!.replace(/_/g, " ");
                return (
                  <div key={row.aiDetectedRoleType}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-600">{label}</span>
                      <span className="font-semibold text-slate-900">
                        {row._count._all}
                        <span className="text-xs font-normal text-slate-400 ml-1">
                          ({pct(row._count._all, totalByRole)}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-400 rounded-full"
                        style={{ width: `${pct(row._count._all, totalByRole)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Candidate sources */}
      <div className="rounded border border-slate-200 bg-white p-6">
        <p className="text-sm font-semibold text-slate-800 mb-4">Candidate Sources</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-2.5">
          {candidateBySource.map((row) => (
            <div key={row.source}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">{row.source}</span>
                <span className="font-semibold text-slate-900">
                  {row._count._all}
                  <span className="text-xs font-normal text-slate-400 ml-1">
                    ({pct(row._count._all, totalCandidates)}%)
                  </span>
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 rounded-full"
                  style={{ width: `${pct(row._count._all, totalCandidates)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}
