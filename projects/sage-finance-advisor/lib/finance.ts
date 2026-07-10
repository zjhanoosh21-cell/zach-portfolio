import { prisma } from "./prisma";
import { monthlyAmount } from "./format";

export async function getFinancialSnapshot() {
  const [profile, accounts, incomeSources, budgetCategories, goals, notes, snapshots] =
    await Promise.all([
      prisma.profile.findUnique({ where: { id: "main" } }),
      prisma.account.findMany({ include: { holdings: true }, orderBy: { balance: "desc" } }),
      prisma.incomeSource.findMany(),
      prisma.budgetCategory.findMany({ orderBy: { plannedAmount: "desc" } }),
      prisma.goal.findMany({ orderBy: [{ status: "asc" }, { priority: "asc" }] }),
      prisma.advisorNote.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      prisma.snapshot.findMany({ orderBy: { date: "asc" } }),
    ]);

  const assets = accounts
    .filter((a) => a.category === "ASSET")
    .reduce((s, a) => s + a.balance, 0);
  const liabilities = accounts
    .filter((a) => a.category === "LIABILITY")
    .reduce((s, a) => s + a.balance, 0);
  const netWorth = assets - liabilities;

  const monthlyIncome = incomeSources.reduce(
    (s, i) => s + monthlyAmount(i.amount, i.frequency),
    0
  );
  const monthlyExpenses = budgetCategories
    .filter((c) => c.group !== "savings")
    .reduce((s, c) => s + c.plannedAmount, 0);
  const monthlySavingsBudget = budgetCategories
    .filter((c) => c.group === "savings")
    .reduce((s, c) => s + c.plannedAmount, 0);
  const unallocated = monthlyIncome - monthlyExpenses - monthlySavingsBudget;
  const savingsRate =
    monthlyIncome > 0 ? (monthlySavingsBudget + Math.max(unallocated, 0)) / monthlyIncome : 0;

  const liquidCash = accounts
    .filter((a) => a.type === "checking" || a.type === "savings")
    .reduce((s, a) => s + a.balance, 0);
  const emergencyFundMonths =
    monthlyExpenses > 0 ? liquidCash / monthlyExpenses : null;

  return {
    profile,
    accounts,
    incomeSources,
    budgetCategories,
    goals,
    notes,
    snapshots,
    metrics: {
      assets,
      liabilities,
      netWorth,
      monthlyIncome,
      monthlyExpenses,
      monthlySavingsBudget,
      unallocated,
      savingsRate,
      liquidCash,
      emergencyFundMonths,
    },
  };
}

export type FinancialSnapshot = Awaited<ReturnType<typeof getFinancialSnapshot>>;

/** Record today's net worth so the dashboard trend line stays current. */
export async function recordSnapshot() {
  const accounts = await prisma.account.findMany();
  const assets = accounts
    .filter((a) => a.category === "ASSET")
    .reduce((s, a) => s + a.balance, 0);
  const liabilities = accounts
    .filter((a) => a.category === "LIABILITY")
    .reduce((s, a) => s + a.balance, 0);
  const date = new Date().toISOString().slice(0, 10);
  await prisma.snapshot.upsert({
    where: { date },
    update: { assets, liabilities, netWorth: assets - liabilities },
    create: { date, assets, liabilities, netWorth: assets - liabilities },
  });
}

export type Insight = {
  level: "good" | "warning" | "serious" | "info";
  title: string;
  body: string;
};

export function computeInsights(snap: FinancialSnapshot): Insight[] {
  const { metrics, accounts, goals, incomeSources, budgetCategories } = snap;
  const insights: Insight[] = [];

  if (incomeSources.length === 0 || accounts.length === 0) return insights;

  if (metrics.unallocated < 0) {
    insights.push({
      level: "serious",
      title: "Budget exceeds income",
      body: `Your planned spending and savings exceed your monthly income by ${Math.abs(metrics.unallocated).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}. Ask Sage to help rebalance.`,
    });
  }

  if (metrics.emergencyFundMonths !== null && metrics.emergencyFundMonths < 3) {
    insights.push({
      level: "warning",
      title: "Emergency fund below 3 months",
      body: `Your cash covers about ${metrics.emergencyFundMonths.toFixed(1)} months of expenses. Most advisors suggest 3–6 months as a safety net.`,
    });
  } else if (metrics.emergencyFundMonths !== null && metrics.emergencyFundMonths >= 3) {
    insights.push({
      level: "good",
      title: "Solid emergency fund",
      body: `You have roughly ${metrics.emergencyFundMonths.toFixed(1)} months of expenses in cash — a healthy cushion.`,
    });
  }

  const highInterestDebt = accounts.filter(
    (a) => a.category === "LIABILITY" && (a.interestRate ?? 0) >= 8
  );
  if (highInterestDebt.length > 0) {
    const total = highInterestDebt.reduce((s, a) => s + a.balance, 0);
    const maxRate = Math.max(...highInterestDebt.map((a) => a.interestRate ?? 0));
    insights.push({
      level: "warning",
      title: "High-interest debt",
      body: `${highInterestDebt.map((a) => a.name).join(", ")} carries ${total.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} at up to ${maxRate.toFixed(1)}% APR. Paying this down is usually the best guaranteed return.`,
    });
  }

  if (metrics.savingsRate >= 0.2) {
    insights.push({
      level: "good",
      title: "Strong savings rate",
      body: `You're putting away about ${Math.round(metrics.savingsRate * 100)}% of income — ahead of the common 20% guideline.`,
    });
  } else if (metrics.monthlyIncome > 0 && metrics.savingsRate < 0.1) {
    insights.push({
      level: "warning",
      title: "Savings rate under 10%",
      body: `About ${Math.round(metrics.savingsRate * 100)}% of income is going to savings. Sage can help find room in the budget.`,
    });
  }

  if (goals.filter((g) => g.status === "active").length === 0 && budgetCategories.length > 0) {
    insights.push({
      level: "info",
      title: "No active goals yet",
      body: "Goals turn a budget into a plan. Chat with Sage to figure out what you're working toward.",
    });
  }

  return insights.slice(0, 4);
}
