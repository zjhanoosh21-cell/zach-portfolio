import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { getFinancialSnapshot, computeInsights } from "@/lib/finance";
import { fmtCurrency, fmtPercent, accountTypeLabel } from "@/lib/format";
import { Card, CardHeader, StatTile, ProgressBar, Badge, EmptyState, buttonPrimary } from "@/components/ui";
import { NetWorthChart, AllocationDonut } from "@/components/charts";

export const dynamic = "force-dynamic";

const ALLOCATION_GROUPS: { name: string; types: string[] }[] = [
  { name: "Cash", types: ["checking", "savings"] },
  { name: "Investments", types: ["brokerage"] },
  { name: "Retirement", types: ["retirement", "hsa"] },
  { name: "Real estate", types: ["real_estate"] },
  { name: "Crypto", types: ["crypto"] },
  { name: "Other", types: ["vehicle", "other_asset"] },
];

export default async function DashboardPage() {
  const snap = await getFinancialSnapshot();
  const { accounts, goals, snapshots, metrics, profile, incomeSources } = snap;
  const insights = computeInsights(snap);

  const isEmpty = accounts.length === 0 && incomeSources.length === 0;
  const firstName = profile?.name?.split(" ")[0];

  if (isEmpty) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-20">
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-strong mb-5">
            <Sparkles size={26} />
          </div>
          <h1 className="text-2xl font-semibold text-ink">Welcome to Sage</h1>
          <p className="text-ink-2 mt-3 max-w-lg mx-auto leading-relaxed">
            Sage is your personal financial advisor. Tell it about your accounts,
            income, and what you&apos;re working toward — it will build your
            dashboard, budget, and goals as you talk, then help you stay on track.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/advisor" className={buttonPrimary + " btn-accent-text"}>
              Start with a conversation <ArrowRight size={15} />
            </Link>
            <Link
              href="/accounts"
              className="text-sm font-medium text-ink-2 hover:text-ink px-3 py-2"
            >
              Or add accounts manually
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-14">
          {[
            ["Talk it through", "Sage interviews you like a real advisor and records everything for you."],
            ["See it clearly", "Net worth, allocation, budget, and goals — one calm dashboard."],
            ["Stay on track", "Personalized insights and a plan that updates as life changes."],
          ].map(([title, body]) => (
            <Card key={title} className="px-5 py-4">
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="text-xs text-ink-2 mt-1.5 leading-relaxed">{body}</p>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const allocation = ALLOCATION_GROUPS.map((g) => ({
    name: g.name,
    value: accounts
      .filter((a) => a.category === "ASSET" && g.types.includes(a.type))
      .reduce((s, a) => s + a.balance, 0),
  })).filter((g) => g.value > 0);

  const activeGoals = goals.filter((g) => g.status === "active").slice(0, 4);
  const debts = accounts
    .filter((a) => a.category === "LIABILITY" && a.balance > 0)
    .sort((a, b) => (b.interestRate ?? 0) - (a.interestRate ?? 0));

  const insightIcon = {
    good: <CheckCircle2 size={15} className="text-good-text shrink-0 mt-0.5" />,
    warning: <AlertTriangle size={15} className="text-serious shrink-0 mt-0.5" />,
    serious: <ShieldAlert size={15} className="text-critical shrink-0 mt-0.5" />,
    info: <Info size={15} className="text-ink-3 shrink-0 mt-0.5" />,
  };

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">
            {firstName ? `Good to see you, ${firstName}` : "Your financial picture"}
          </h1>
          <p className="text-sm text-ink-3 mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link href="/advisor" className={buttonPrimary + " btn-accent-text"}>
          Ask Sage <ArrowRight size={15} />
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatTile
          label="Net worth"
          value={fmtCurrency(metrics.netWorth)}
          detail={`${fmtCurrency(metrics.assets)} assets − ${fmtCurrency(metrics.liabilities)} debts`}
        />
        <StatTile
          label="Monthly income"
          value={fmtCurrency(metrics.monthlyIncome)}
          detail={incomeSources.length ? `${incomeSources.length} source${incomeSources.length > 1 ? "s" : ""}` : "Not set yet"}
        />
        <StatTile
          label="Savings rate"
          value={metrics.monthlyIncome > 0 ? fmtPercent(metrics.savingsRate) : "—"}
          detail={metrics.monthlyIncome > 0 ? `${fmtCurrency(metrics.monthlySavingsBudget + Math.max(metrics.unallocated, 0))}/mo toward savings` : "Add income + budget"}
          detailTone={metrics.savingsRate >= 0.2 ? "good" : "muted"}
        />
        <StatTile
          label="Emergency fund"
          value={
            metrics.emergencyFundMonths !== null
              ? `${metrics.emergencyFundMonths.toFixed(1)} mo`
              : "—"
          }
          detail={
            metrics.emergencyFundMonths !== null
              ? `${fmtCurrency(metrics.liquidCash)} in cash`
              : "Add a budget to measure"
          }
          detailTone={
            metrics.emergencyFundMonths !== null && metrics.emergencyFundMonths < 3
              ? "serious"
              : "muted"
          }
        />
      </div>

      <div className="grid grid-cols-5 gap-4 mt-4">
        <Card className="col-span-3">
          <CardHeader title="Net worth over time" subtitle="Recorded each time balances change" />
          {snapshots.length >= 2 ? (
            <NetWorthChart data={snapshots.map((s) => ({ date: s.date, netWorth: s.netWorth }))} />
          ) : (
            <EmptyState
              title="Your trend starts here"
              body="Sage records a snapshot whenever balances change. Update balances over time and this becomes a trend line."
            />
          )}
        </Card>
        <Card className="col-span-2">
          <CardHeader title="Asset allocation" />
          {allocation.length > 0 ? (
            <AllocationDonut data={allocation} />
          ) : (
            <EmptyState title="No assets yet" body="Add accounts to see your allocation." />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader
            title="Sage's observations"
            subtitle="Generated from your current numbers"
          />
          <div className="px-5 pb-4 space-y-3 pt-1">
            {insights.length === 0 ? (
              <p className="text-sm text-ink-3 py-2">
                Add income and a budget and Sage will start flagging what matters.
              </p>
            ) : (
              insights.map((ins) => (
                <div key={ins.title} className="flex gap-2.5">
                  {insightIcon[ins.level]}
                  <div>
                    <p className="text-sm font-medium text-ink leading-snug">{ins.title}</p>
                    <p className="text-xs text-ink-2 mt-0.5 leading-relaxed">{ins.body}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Goals"
            action={
              <Link href="/goals" className="text-xs font-medium text-accent-strong hover:underline">
                View all
              </Link>
            }
          />
          <div className="px-5 pb-4 space-y-4 pt-1">
            {activeGoals.length === 0 ? (
              <EmptyState
                title="No goals yet"
                body="Sage can help you figure out what to aim for — an emergency fund, a down payment, retirement."
                action={
                  <Link href="/advisor" className="text-sm font-medium text-accent-strong hover:underline">
                    Talk goals with Sage →
                  </Link>
                }
              />
            ) : (
              activeGoals.map((g) => {
                const frac = g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0;
                return (
                  <div key={g.id}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <p className="text-sm font-medium text-ink">{g.name}</p>
                      <p className="text-xs text-ink-2 tabular">
                        {fmtCurrency(g.currentAmount)}{" "}
                        <span className="text-ink-3">of {fmtCurrency(g.targetAmount)}</span>
                      </p>
                    </div>
                    <ProgressBar fraction={frac} tone={frac >= 1 ? "good" : "accent"} />
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {debts.length > 0 && (
        <Card className="mt-4">
          <CardHeader
            title="Debt overview"
            subtitle="Ordered by interest rate — highest first is usually the best payoff order"
          />
          <div className="px-5 pb-4 pt-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-3">
                  <th className="font-medium py-1.5">Account</th>
                  <th className="font-medium py-1.5">Type</th>
                  <th className="font-medium py-1.5 text-right">APR</th>
                  <th className="font-medium py-1.5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {debts.map((d) => (
                  <tr key={d.id} className="border-t border-line">
                    <td className="py-2 text-ink font-medium">{d.name}</td>
                    <td className="py-2 text-ink-2">{accountTypeLabel(d.type)}</td>
                    <td className="py-2 text-right tabular">
                      {d.interestRate != null ? (
                        <Badge tone={d.interestRate >= 8 ? "serious" : "neutral"}>
                          {d.interestRate.toFixed(1)}%
                        </Badge>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </td>
                    <td className="py-2 text-right text-ink tabular">{fmtCurrency(d.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
