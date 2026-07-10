import { prisma } from "@/lib/prisma";
import Link from "next/link";

function pct(num: number, denom: number) {
  if (denom === 0) return 0;
  return Math.round((num / denom) * 100);
}

const PRIORITY_LABEL: Record<number, { label: string; cls: string }> = {
  1: { label: "Urgent", cls: "bg-red-50 text-red-600 border border-red-200" },
  2: { label: "Normal", cls: "bg-slate-100 text-slate-600" },
  3: { label: "Low", cls: "bg-slate-50 text-slate-400" },
};

export default async function AnalyticsPipelinePage() {
  const startOf30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [submissionByStatus, openJobs, filledJobs, recentSubmissions] = await Promise.all([
    prisma.submission.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.jobOrder.findMany({
      where: { status: "OPEN" },
      select: {
        id: true, title: true, clientName: true, roleType: true, priority: true, openedAt: true,
        _count: { select: { submissions: true } },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    }),
    prisma.jobOrder.findMany({
      where: { status: "FILLED", filledAt: { not: null } },
      select: { openedAt: true, filledAt: true },
    }),
    prisma.submission.count({ where: { createdAt: { gte: startOf30 } } }),
  ]);

  const totalSubmissions = submissionByStatus.reduce((s, r) => s + r._count._all, 0);

  const daysToFill = filledJobs
    .filter((j) => j.filledAt)
    .map((j) => (j.filledAt!.getTime() - j.openedAt.getTime()) / (1000 * 60 * 60 * 24));
  const avgDaysToFill =
    daysToFill.length > 0
      ? Math.round(daysToFill.reduce((s, d) => s + d, 0) / daysToFill.length)
      : null;

  // Full funnel
  const funnelStages = [
    { label: "Submitted", color: "bg-[#1a6bbf]", statuses: ["SUBMITTED", "CLIENT_REVIEW"] },
    { label: "Interview", color: "bg-indigo-500", statuses: ["INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED"] },
    { label: "Offer Extended", color: "bg-amber-400", statuses: ["OFFER_EXTENDED"] },
    { label: "Offer Accepted", color: "bg-emerald-400", statuses: ["OFFER_ACCEPTED"] },
    { label: "Placed", color: "bg-emerald-600", statuses: ["PLACED"] },
  ];
  const funnelCounts = funnelStages.map((stage) => ({
    ...stage,
    count: submissionByStatus
      .filter((r) => stage.statuses.includes(r.status))
      .reduce((s, r) => s + r._count._all, 0),
  }));
  const funnelMax = Math.max(...funnelCounts.map((f) => f.count), 1);

  // All submission statuses for breakdown
  const STATUS_LABELS: Record<string, string> = {
    SUBMITTED: "Submitted",
    CLIENT_REVIEW: "Client Review",
    INTERVIEW_SCHEDULED: "Interview Scheduled",
    INTERVIEW_COMPLETED: "Interview Completed",
    OFFER_EXTENDED: "Offer Extended",
    OFFER_ACCEPTED: "Offer Accepted",
    OFFER_DECLINED: "Offer Declined",
    REJECTED_BY_CLIENT: "Rejected by Client",
    CANDIDATE_WITHDREW: "Candidate Withdrew",
    PLACED: "Placed",
  };

  const openJobsCount = openJobs.length;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Submissions" value={totalSubmissions.toLocaleString()} />
        <StatCard label="New (30 days)" value={recentSubmissions.toLocaleString()} />
        <StatCard label="Open Jobs" value={openJobsCount.toLocaleString()} />
        <StatCard label="Avg Days to Fill" value={avgDaysToFill != null ? `${avgDaysToFill}d` : "—"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submission funnel */}
        <div className="rounded border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold text-slate-800 mb-4">Submission Funnel</p>
          <div className="space-y-3">
            {funnelCounts.map((stage, i) => (
              <div key={stage.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-600">{stage.label}</span>
                  <span className="font-semibold text-slate-900">{stage.count}</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${stage.color}`}
                    style={{ width: `${pct(stage.count, funnelMax)}%` }}
                  />
                </div>
                {i > 0 && funnelCounts[i - 1].count > 0 && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {pct(stage.count, funnelCounts[i - 1].count)}% of previous stage
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Exits</p>
            {["OFFER_DECLINED", "REJECTED_BY_CLIENT", "CANDIDATE_WITHDREW"].map((status) => {
              const count = submissionByStatus.find((s) => s.status === status)?._count._all ?? 0;
              return (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{STATUS_LABELS[status]}</span>
                  <span className="font-medium text-slate-700">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* All submission statuses */}
        <div className="rounded border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold text-slate-800 mb-4">All Submission Statuses</p>
          <div className="space-y-2">
            {submissionByStatus
              .sort((a, b) => b._count._all - a._count._all)
              .map((row) => (
                <div key={row.status} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-slate-600">{STATUS_LABELS[row.status] ?? row.status.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1a6bbf] rounded-full"
                        style={{ width: `${pct(row._count._all, totalSubmissions)}%` }}
                      />
                    </div>
                    <span className="font-semibold text-slate-900 w-6 text-right">{row._count._all}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Open job orders */}
      <div className="rounded border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-800">Open Job Orders ({openJobsCount})</p>
          <Link href="/jobs" className="text-xs text-[#1a6bbf] hover:underline">Manage jobs →</Link>
        </div>
        {openJobs.length === 0 ? (
          <p className="text-sm text-slate-400">No open jobs.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {openJobs.map((job) => {
              const p = PRIORITY_LABEL[job.priority] ?? PRIORITY_LABEL[2];
              const daysOpen = Math.round((Date.now() - job.openedAt.getTime()) / (1000 * 60 * 60 * 24));
              return (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{job.title}</p>
                    <p className="text-xs text-slate-400">{job.clientName} · {daysOpen}d open</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${p.cls}`}>{p.label}</span>
                    <span className="text-xs text-slate-500">{job._count.submissions} sub{job._count.submissions !== 1 ? "s" : ""}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
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
