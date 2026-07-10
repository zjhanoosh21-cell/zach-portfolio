import Link from "next/link";
import { Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { fmtCurrency, monthlyAmount, fmtPercent } from "@/lib/format";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import {
  AddIncomeButton,
  IncomeRow,
  AddCategoryButton,
  CategoryRow,
} from "@/components/budget-ui";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  const [incomeSources, categories] = await Promise.all([
    prisma.incomeSource.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.budgetCategory.findMany({ orderBy: { plannedAmount: "desc" } }),
  ]);

  const monthlyIncome = incomeSources.reduce(
    (s, i) => s + monthlyAmount(i.amount, i.frequency),
    0
  );
  const groups = ["needs", "wants", "savings"] as const;
  const groupMeta = {
    needs: { label: "Needs", hint: "Housing, groceries, insurance, minimum payments", color: "var(--series-1)" },
    wants: { label: "Wants", hint: "Dining, travel, subscriptions, fun", color: "var(--series-3)" },
    savings: { label: "Savings & debt payoff", hint: "Emergency fund, investing, extra payments", color: "var(--series-2)" },
  };
  const totals = Object.fromEntries(
    groups.map((g) => [
      g,
      categories.filter((c) => c.group === g).reduce((s, c) => s + c.plannedAmount, 0),
    ])
  ) as Record<(typeof groups)[number], number>;
  const allocated = totals.needs + totals.wants + totals.savings;
  const leftover = monthlyIncome - allocated;
  const maxAmount = Math.max(...categories.map((c) => c.plannedAmount), 1);

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">Budget</h1>
          <p className="text-sm text-ink-3 mt-0.5">
            Plan where each month&apos;s income goes — or ask Sage to draft it with you.
          </p>
        </div>
        <AddCategoryButton />
      </div>

      <Card className="mb-4">
        <CardHeader
          title="Income"
          subtitle={monthlyIncome > 0 ? `${fmtCurrency(monthlyIncome)} per month` : undefined}
          action={<AddIncomeButton />}
        />
        <div className="pb-2">
          {incomeSources.length === 0 ? (
            <p className="px-5 pb-4 text-sm text-ink-3">
              Add your take-home pay so the budget has something to work from.
            </p>
          ) : (
            incomeSources.map((i) => <IncomeRow key={i.id} income={i} />)
          )}
        </div>
      </Card>

      {monthlyIncome > 0 && allocated > 0 && (
        <Card className="mb-4">
          <CardHeader
            title="Monthly allocation"
            subtitle={
              leftover >= 0
                ? `${fmtCurrency(leftover)} unallocated`
                : `${fmtCurrency(-leftover)} over budget`
            }
          />
          <div className="px-5 pb-4 pt-1">
            <div className="flex h-3 rounded-full overflow-hidden gap-[2px]">
              {groups.map((g) =>
                totals[g] > 0 ? (
                  <div
                    key={g}
                    style={{
                      width: `${(totals[g] / Math.max(monthlyIncome, allocated)) * 100}%`,
                      background: groupMeta[g].color,
                    }}
                    title={`${groupMeta[g].label}: ${fmtCurrency(totals[g])}`}
                  />
                ) : null
              )}
              {leftover > 0 && (
                <div
                  style={{ width: `${(leftover / monthlyIncome) * 100}%` }}
                  className="bg-surface-2"
                  title={`Unallocated: ${fmtCurrency(leftover)}`}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
              {groups.map((g) => (
                <span key={g} className="inline-flex items-center gap-1.5 text-xs text-ink-2">
                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: groupMeta[g].color }} />
                  {groupMeta[g].label}: <span className="font-medium text-ink tabular">{fmtCurrency(totals[g])}</span>
                  <span className="text-ink-3">({monthlyIncome > 0 ? fmtPercent(totals[g] / monthlyIncome) : "—"})</span>
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-2">
                <span className="h-2.5 w-2.5 rounded-[3px] bg-surface-2 border border-line" />
                Unallocated: <span className={`font-medium tabular ${leftover < 0 ? "text-critical" : "text-ink"}`}>{fmtCurrency(leftover)}</span>
              </span>
            </div>
            <p className="text-[11px] text-ink-3 mt-2">
              A common frame: ~50% needs, ~30% wants, ~20% savings. Yours doesn&apos;t have to
              match — it just has to be on purpose.
            </p>
          </div>
        </Card>
      )}

      {categories.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wallet size={28} />}
            title="No budget yet"
            body="The fastest way to build one: tell Sage your income and typical spending, and it will draft categories you can tweak."
            action={
              <Link href="/advisor" className="text-sm font-medium text-accent-strong hover:underline">
                Build it with Sage →
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {groups.map((g) => {
            const items = categories.filter((c) => c.group === g);
            if (items.length === 0) return null;
            return (
              <Card key={g}>
                <CardHeader
                  title={groupMeta[g].label}
                  subtitle={`${groupMeta[g].hint} · ${fmtCurrency(totals[g])}/mo`}
                />
                <div className="pb-2">
                  {items.map((c) => (
                    <CategoryRow key={c.id} category={c} maxAmount={maxAmount} />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
