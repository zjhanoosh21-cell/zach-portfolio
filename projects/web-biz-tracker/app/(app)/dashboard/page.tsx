import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDollars, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  PROSPECT_STATUS_LABELS,
  PROSPECT_STATUS_CLASSES,
  ASSIGNEE_COLORS,
  type ProspectStatus,
} from "@/lib/constants";
import { ArrowRight } from "lucide-react";

export default async function DashboardPage() {
  const [phases, prospects, deals, recentNotes] = await Promise.all([
    prisma.phase.findMany({
      orderBy: { order: "asc" },
      include: { tasks: true },
    }),
    prisma.prospect.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.deal.findMany({
      where: { status: { in: ["active", "won"] } },
    }),
    prisma.feedNote.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        author: { select: { id: true, name: true } },
        prospect: { select: { id: true, name: true } },
      },
    }),
  ]);

  const totalProspects = prospects.reduce((s, p) => s + p._count.status, 0);
  const statusCounts = Object.fromEntries(
    prospects.map((p) => [p.status, p._count.status])
  );

  const wonDeals = deals.filter((d) => d.status === "won");
  const activeDeals = deals.filter((d) => d.status === "active");
  const totalWon = wonDeals.reduce((s, d) => s + (d.proposalAmount ?? 0), 0);
  const pipeline = activeDeals.reduce((s, d) => s + (d.proposalAmount ?? 0), 0);
  const mrr = wonDeals.reduce((s, d) => s + (d.retainerAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>

      {/* Revenue summary */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Revenue Won" value={formatDollars(totalWon)} sub={`${wonDeals.length} deals`} />
        <StatCard label="In Pipeline" value={formatDollars(pipeline)} sub={`${activeDeals.length} active`} />
        <StatCard label="MRR" value={`${formatDollars(mrr)}/mo`} sub="recurring" green />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan progress */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Plan Progress</h2>
            <Link href="/plan" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
              View <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {phases.map((phase) => {
              const total = phase.tasks.length;
              const done = phase.tasks.filter((t) => t.status === "done").length;
              const pct = total === 0 ? 0 : Math.round((done / total) * 100);
              return (
                <div key={phase.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700 font-medium">{phase.title}</span>
                    <span className="text-slate-400">{done}/{total}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-700 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prospect pipeline */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Prospect Pipeline</h2>
            <Link href="/prospects" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
              View all ({totalProspects}) <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {totalProspects === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No prospects yet.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(statusCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        PROSPECT_STATUS_CLASSES[status as ProspectStatus] ??
                          "bg-slate-100 text-slate-600"
                      )}
                    >
                      {PROSPECT_STATUS_LABELS[status as ProspectStatus] ?? status}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">{count}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Recent Activity</h2>
          <Link href="/feed" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
            View feed <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recentNotes.length === 0 ? (
          <p className="text-sm text-slate-400">No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {recentNotes.map((note) => {
              const authorKey = note.author?.name.toLowerCase().split(" ")[0] ?? "";
              return (
                <div key={note.id} className="flex gap-3">
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full h-fit flex-shrink-0 mt-0.5",
                      ASSIGNEE_COLORS[authorKey] ?? "bg-slate-100 text-slate-600"
                    )}
                  >
                    {note.author?.name.split(" ")[0] ?? "?"}
                  </span>
                  <div>
                    <p className="text-sm text-slate-700 line-clamp-2">{note.content}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{timeAgo(new Date(note.createdAt))}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  green,
}: {
  label: string;
  value: string;
  sub: string;
  green?: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={cn("text-2xl font-bold mt-1", green ? "text-green-700" : "text-slate-900")}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}
