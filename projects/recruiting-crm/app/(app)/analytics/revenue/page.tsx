import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function fmt$(n: number | null | undefined) {
  if (n == null || n === 0) return "—";
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

export default async function AnalyticsRevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const isAdmin = !!(session?.user as { isAdmin?: boolean })?.isAdmin;
  const isManager = !!(session?.user as { isManager?: boolean })?.isManager;
  if (!isAdmin && !isManager) redirect("/analytics");

  const { range } = await searchParams;
  const now = new Date();
  const rangeStart = getRangeStart(range);
  const rangeLabel = getRangeLabel(range);

  const createdAtFilter = rangeStart ? { createdAt: { gte: rangeStart } } : {};

  const [placedSubmissions, filledJobs] = await Promise.all([
    prisma.submission.findMany({
      where: {
        status: { in: ["PLACED", "OFFER_ACCEPTED"] },
        ...createdAtFilter,
      },
      select: {
        id: true,
        createdAt: true,
        placementFee: true,
        offerAmount: true,
        candidate: { select: { displayName: true, firstName: true, lastName: true } },
        jobOrder: { select: { title: true, clientName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.jobOrder.findMany({
      where: { status: "FILLED", filledAt: { not: null } },
      select: { openedAt: true, filledAt: true },
    }),
  ]);

  const totalPlacements = placedSubmissions.length;
  const totalFees = placedSubmissions.reduce((sum, s) => sum + Number(s.placementFee ?? 0), 0);
  const avgFee = totalPlacements > 0 ? totalFees / totalPlacements : 0;

  const daysToFill = filledJobs
    .filter((j) => j.filledAt)
    .map((j) => (j.filledAt!.getTime() - j.openedAt.getTime()) / (1000 * 60 * 60 * 24));
  const avgDaysToFill =
    daysToFill.length > 0
      ? Math.round(daysToFill.reduce((s, d) => s + d, 0) / daysToFill.length)
      : null;

  // Monthly placements + fees (last 12 months)
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const mp = placedSubmissions.filter((s) => s.createdAt >= d && s.createdAt < next);
    months.push({
      label: monthLabel(d),
      count: mp.length,
      fees: mp.reduce((s, p) => s + Number(p.placementFee ?? 0), 0),
    });
  }
  const maxMonthFees = Math.max(...months.map((m) => m.fees), 1);

  // Top clients
  const clientMap = new Map<string, { count: number; fees: number }>();
  for (const s of placedSubmissions) {
    const name = s.jobOrder.clientName;
    const cur = clientMap.get(name) ?? { count: 0, fees: 0 };
    clientMap.set(name, { count: cur.count + 1, fees: cur.fees + Number(s.placementFee ?? 0) });
  }
  const topClients = [...clientMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.fees - a.fees || b.count - a.count)
    .slice(0, 10);
  const maxClientFees = Math.max(...topClients.map((c) => c.fees), 1);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Fees ({rangeLabel})</p>
          <p className="text-2xl font-bold text-emerald-800 mt-1">{totalFees > 0 ? fmt$(totalFees) : "$0"}</p>
          <p className="text-xs text-emerald-600 mt-0.5">{totalPlacements} placement{totalPlacements !== 1 ? "s" : ""}</p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Placements ({rangeLabel})</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalPlacements}</p>
          <p className="text-xs text-slate-400 mt-0.5">{avgFee > 0 ? `avg fee ${fmt$(avgFee)}` : "no placements yet"}</p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Fee</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{avgFee > 0 ? fmt$(avgFee) : "—"}</p>
          <p className="text-xs text-slate-400 mt-0.5">per placement</p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Days to Fill</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{avgDaysToFill != null ? `${avgDaysToFill}d` : "—"}</p>
          <p className="text-xs text-slate-400 mt-0.5">from open to filled</p>
        </div>
      </div>

      {/* Monthly fees bar chart (12 months) */}
      <div className="rounded border border-slate-200 bg-white p-6">
        <p className="text-sm font-semibold text-slate-800 mb-6">Monthly Placements & Fees — {rangeLabel}</p>
        <div className="flex items-end gap-2 h-40">
          {months.map((m) => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              {m.count > 0 && <span className="text-xs font-semibold text-slate-700">{m.count}</span>}
              {m.count === 0 && <span className="text-xs text-transparent">0</span>}
              <div
                className="w-full bg-slate-100 rounded-t-sm"
                style={{ height: "104px", display: "flex", alignItems: "flex-end" }}
              >
                <div
                  className="w-full bg-emerald-500 rounded-t-sm transition-all"
                  style={{ height: `${Math.max(pct(m.fees, maxMonthFees), m.count > 0 ? 6 : 0)}%` }}
                />
              </div>
              <span className="text-[9px] text-slate-400 truncate w-full text-center">{m.label}</span>
              {m.fees > 0 && (
                <span className="text-[9px] text-emerald-700 font-medium truncate w-full text-center">
                  {fmt$(m.fees)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top clients */}
        <div className="rounded border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold text-slate-800 mb-4">Top Clients by Revenue</p>
          {topClients.length === 0 ? (
            <p className="text-sm text-slate-400">No placements recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {topClients.map((c, i) => (
                <div key={c.name}>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs text-slate-400 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="text-sm font-medium text-slate-900 truncate">{c.name}</span>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className="text-xs text-slate-500">{c.count} placement{c.count !== 1 ? "s" : ""}</span>
                        {c.fees > 0 && <span className="text-xs font-semibold text-emerald-700">{fmt$(c.fees)}</span>}
                      </div>
                    </div>
                  </div>
                  {c.fees > 0 && (
                    <div className="ml-7 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${pct(c.fees, maxClientFees)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent placements */}
        <div className="rounded border border-slate-200 bg-white p-6">
          <p className="text-sm font-semibold text-slate-800 mb-4">Recent Placements</p>
          {placedSubmissions.length === 0 ? (
            <p className="text-sm text-slate-400">No placements recorded yet.</p>
          ) : (
            <div className="space-y-0 divide-y divide-slate-100">
              {placedSubmissions.slice(0, 10).map((s) => {
                const name =
                  s.candidate.displayName ||
                  [s.candidate.firstName, s.candidate.lastName].filter(Boolean).join(" ") ||
                  "Unknown";
                return (
                  <div key={s.id} className="py-2.5 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {s.jobOrder.title} · {s.jobOrder.clientName}
                      </p>
                    </div>
                    <div className="shrink-0 ml-3 text-right">
                      {s.placementFee && Number(s.placementFee) > 0 ? (
                        <p className="text-sm font-semibold text-emerald-700">{fmt$(Number(s.placementFee))}</p>
                      ) : (
                        <p className="text-xs text-slate-400">No fee</p>
                      )}
                      <p className="text-xs text-slate-400">
                        {s.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
