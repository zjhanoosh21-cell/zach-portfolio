import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

function fmt$(n: number | null | undefined) {
  if (n == null) return "—";
  return "$" + Math.round(Number(n)).toLocaleString();
}
function pct(num: number, denom: number) {
  if (denom === 0) return 0;
  return Math.round((num / denom) * 100);
}
function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function getRangeStart(range: string | undefined): Date | null {
  const now = new Date();
  switch (range ?? "ytd") {
    case "30d": return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    case "90d": return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    case "12m": return new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    case "all": return null;
    default: return new Date(now.getFullYear(), 0, 1); // ytd
  }
}

function getRangeLabel(range: string | undefined): string {
  switch (range ?? "ytd") {
    case "30d": return "Last 30 Days";
    case "90d": return "Last 90 Days";
    case "12m": return "Last 12 Months";
    case "all": return "All Time";
    default: return "YTD";
  }
}

export default async function AnalyticsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const isAdmin = !!(session?.user as { isAdmin?: boolean })?.isAdmin;
  const isManager = !!(session?.user as { isManager?: boolean })?.isManager;
  const isElevated = isAdmin || isManager;

  const { range } = await searchParams;
  const now = new Date();
  const rangeStart = getRangeStart(range);
  const rangeLabel = getRangeLabel(range);
  const startOf30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const periodWhere = rangeStart ? { createdAt: { gte: rangeStart } } : {};

  const [
    candidateByStatus,
    submissionByStatus,
    placedStats,
    jobByStatus,
    periodCandidates,
    periodSubmissions,
    placedSubmissions,
    filledJobs,
  ] = await Promise.all([
    prisma.candidate.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.submission.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.submission.aggregate({
      where: { status: { in: ["PLACED", "OFFER_ACCEPTED"] }, ...periodWhere },
      _count: { _all: true },
      _sum: { placementFee: true },
    }),
    prisma.jobOrder.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.candidate.count({ where: periodWhere }),
    prisma.submission.count({ where: periodWhere }),
    prisma.submission.findMany({
      where: { status: { in: ["PLACED", "OFFER_ACCEPTED"] }, ...periodWhere },
      select: { createdAt: true, placementFee: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.jobOrder.findMany({
      where: { status: "FILLED", filledAt: { not: null } },
      select: { openedAt: true, filledAt: true },
    }),
  ]);

  const totalCandidates = candidateByStatus.reduce((s, r) => s + r._count._all, 0);
  const activeCandidates = candidateByStatus
    .filter((r) => r.status === "ACTIVE")
    .reduce((s, r) => s + r._count._all, 0);
  const totalSubmissions = submissionByStatus.reduce((s, r) => s + r._count._all, 0);
  const openJobs = jobByStatus.find((j) => j.status === "OPEN")?._count._all ?? 0;
  const periodPlacements = placedStats._count._all;
  const periodFees = placedSubmissions.reduce((sum, s) => sum + Number(s.placementFee ?? 0), 0);
  const avgFee = periodPlacements > 0 ? periodFees / periodPlacements : 0;

  const daysToFill = filledJobs
    .filter((j) => j.filledAt)
    .map((j) => (j.filledAt!.getTime() - j.openedAt.getTime()) / (1000 * 60 * 60 * 24));
  const avgDaysToFill =
    daysToFill.length > 0
      ? Math.round(daysToFill.reduce((s, d) => s + d, 0) / daysToFill.length)
      : null;

  // Submission funnel
  const funnelStages = [
    { label: "Submitted", statuses: ["SUBMITTED", "CLIENT_REVIEW"] },
    { label: "Interview", statuses: ["INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED"] },
    { label: "Offer", statuses: ["OFFER_EXTENDED", "OFFER_ACCEPTED", "OFFER_DECLINED"] },
    { label: "Placed", statuses: ["PLACED"] },
  ];
  const funnelCounts = funnelStages.map((stage) => ({
    label: stage.label,
    count: submissionByStatus
      .filter((r) => stage.statuses.includes(r.status))
      .reduce((s, r) => s + r._count._all, 0),
  }));
  const funnelMax = Math.max(...funnelCounts.map((f) => f.count), 1);

  // Monthly placements (last 6 months)
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const mp = placedSubmissions.filter((s) => s.createdAt >= d && s.createdAt < next);
    months.push({ label: monthLabel(d), count: mp.length, fees: mp.reduce((s, p) => s + Number(p.placementFee ?? 0), 0) });
  }
  const maxMonthFees = Math.max(...months.map((m) => m.fees), 1);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className={`grid gap-4 ${isElevated ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"}`}>
        <KpiCard label="Total Candidates" value={totalCandidates.toLocaleString()} sub="all time" />
        <KpiCard label="Active Pipeline" value={activeCandidates.toLocaleString()} sub="active/submitted/interviewing" />
        <KpiCard label={`New (${rangeLabel})`} value={periodCandidates.toLocaleString()} sub={`${periodSubmissions} new submissions`} />
        <KpiCard label="Open Jobs" value={openJobs.toLocaleString()} sub={`${totalSubmissions} total submissions`} />
        <KpiCard label={`Placements (${rangeLabel})`} value={periodPlacements.toLocaleString()} sub={avgFee > 0 ? `avg fee ${fmt$(avgFee)}` : "no placements yet"} />
        {isElevated && <KpiCard label={`Fees (${rangeLabel})`} value={periodFees > 0 ? fmt$(periodFees) : "$0"} sub={avgFee > 0 ? `avg ${fmt$(avgFee)}` : "no placements yet"} accent />}
      </div>

      {/* Two charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Mini funnel */}
        <div className="rounded border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-800">Submission Funnel</p>
            <Link href="/analytics/pipeline" className="text-xs text-[#1a6bbf] hover:underline">Full pipeline →</Link>
          </div>
          <div className="space-y-3">
            {funnelCounts.map((stage, i) => (
              <div key={stage.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600">{stage.label}</span>
                  <span className="font-semibold text-slate-900">{stage.count}</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${i === 0 ? "bg-[#1a6bbf]" : i === 1 ? "bg-indigo-500" : i === 2 ? "bg-amber-400" : "bg-emerald-500"}`}
                    style={{ width: `${pct(stage.count, funnelMax)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex gap-6 text-center text-sm">
            <div><p className="font-bold text-slate-800">{avgDaysToFill != null ? `${avgDaysToFill}d` : "—"}</p><p className="text-xs text-slate-400">Avg Days to Fill</p></div>
            <div><p className="font-bold text-slate-800">{submissionByStatus.find((s) => s.status === "REJECTED_BY_CLIENT")?._count._all ?? 0}</p><p className="text-xs text-slate-400">Rejected by Client</p></div>
          </div>
        </div>

        {/* Monthly placements */}
        <div className="rounded border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-800">Placements by Month</p>
            {isElevated && <Link href="/analytics/revenue" className="text-xs text-[#1a6bbf] hover:underline">Full revenue →</Link>}
          </div>
          <div className="flex items-end gap-3 h-36">
            {months.map((m) => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-semibold text-slate-700">{m.count || ""}</span>
                <div className="w-full bg-slate-100 rounded-t-sm" style={{ height: "96px", display: "flex", alignItems: "flex-end" }}>
                  <div
                    className="w-full bg-emerald-500 rounded-t-sm transition-all"
                    style={{ height: `${Math.max(pct(m.fees, maxMonthFees), m.count > 0 ? 8 : 0)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick links to other tabs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { href: "/analytics/pipeline", label: "Pipeline", desc: "Funnel, open jobs, submission breakdown", elevated: false },
          { href: "/analytics/candidates", label: "Candidates", desc: "Status, tiers, intake trends, role types", elevated: false },
          { href: "/analytics/revenue", label: "Revenue", desc: "Fees, placements, top clients", elevated: true },
        ].filter((item) => !item.elevated || isElevated).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded border border-slate-200 bg-white px-5 py-4 hover:border-[#1a6bbf] hover:bg-blue-50 transition-colors group"
          >
            <p className="text-sm font-semibold text-slate-800 group-hover:text-[#1a6bbf]">{item.label} →</p>
            <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded border p-4 ${accent ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? "text-emerald-700" : "text-slate-900"}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}
