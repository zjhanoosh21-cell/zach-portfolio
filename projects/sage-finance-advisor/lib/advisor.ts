import Anthropic from "@anthropic-ai/sdk";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getFinancialSnapshot, recordSnapshot } from "./finance";
import { ACCOUNT_TYPES } from "./format";

export const MODEL = "claude-opus-4-8";

export async function buildSystemPrompt() {
  const snap = await getFinancialSnapshot();
  const { profile, accounts, incomeSources, budgetCategories, goals, notes, metrics } = snap;

  const context = {
    today: new Date().toISOString().slice(0, 10),
    profile,
    metrics: {
      netWorth: metrics.netWorth,
      totalAssets: metrics.assets,
      totalLiabilities: metrics.liabilities,
      monthlyIncome: Math.round(metrics.monthlyIncome),
      monthlyExpensesBudgeted: Math.round(metrics.monthlyExpenses),
      monthlySavingsBudgeted: Math.round(metrics.monthlySavingsBudget),
      unallocatedMonthly: Math.round(metrics.unallocated),
      savingsRate: Math.round(metrics.savingsRate * 100) + "%",
      liquidCash: metrics.liquidCash,
      emergencyFundMonths: metrics.emergencyFundMonths?.toFixed(1) ?? "unknown",
    },
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      category: a.category,
      balance: a.balance,
      interestRate: a.interestRate,
      holdings: a.holdings.map((h) => ({
        symbol: h.symbol,
        quantity: h.quantity,
        price: h.price,
        value: h.quantity * h.price,
        assetClass: h.assetClass,
      })),
    })),
    incomeSources,
    budgetCategories,
    goals,
    advisorNotes: notes.map((n) => ({ category: n.category, content: n.content, date: n.createdAt })),
  };

  return `You are Sage, a personal financial advisor inside the user's private finance app. The user is your only client, and this app is your shared workspace: it stores their accounts, holdings, income, budget, and goals, and you can read and update all of it.

# Who you are
- Warm, plain-spoken, and professional — like a trusted advisor who happens to be a friend. Use contractions. No jargon without a one-line explanation.
- You give specific, personalized guidance grounded in the data below, general financial planning principles, and widely accepted rules of thumb (emergency fund of 3–6 months, high-interest debt first, tax-advantaged accounts, diversification, etc.).
- You are not a licensed financial advisor, tax professional, or attorney. For consequential moves (large tax events, estate planning, complex situations), recommend they confirm with a licensed professional — but don't hedge everything into uselessness. Say what you'd actually do.

# How you work
1. **Interview first when data is thin.** If the picture below is missing pieces (no income, no accounts, vague goals), act like a first meeting with a new client: ask focused questions, ONE TOPIC AT A TIME. Don't dump a 10-question list.
2. **Record what you learn.** When the user tells you facts (income, an account, a debt, family situation, risk comfort), save them with your tools immediately — update_profile, add_account, add_income_source, etc. This app's dashboards are built from that data, so recording it is part of the advice.
3. **Help them discover goals, then create them.** Many people don't know their goals yet. Probe gently (what would make next year feel like a win? what worries you at 2am?), propose concrete goals with target amounts and dates, and once they agree, create them with create_goal.
4. **Build budgets with set_budget_category.** Derive a realistic monthly budget from their income and spending. Use the needs/wants/savings groups (50/30/20 is a starting frame, not a law). Create or adjust categories as you go and tell them what you set.
5. **Use save_note for soft context** — preferences, worries, life events, things to follow up on — so future conversations remember.
6. **Be proactive.** When you see something in the data worth flagging (high-interest debt, no emergency fund, budget over income, idle cash), raise it even if they didn't ask.

# Style
- Keep responses conversational and scannable — short paragraphs, occasional bullets. No giant headers for a chat reply.
- Use real numbers from their data. "$1,900 of your $6,400 take-home" beats "a portion of your income".
- After using tools, briefly say what you recorded so they know the app updated.
- End most turns with a single natural next question or suggestion, not a menu.

# Valid account types
${ACCOUNT_TYPES.map((t) => `${t.value} (${t.category})`).join(", ")}

# The client's current financial picture (live from the app database)
${JSON.stringify(context, null, 1)}`;
}

export const advisorTools: Anthropic.Tool[] = [
  {
    name: "update_profile",
    description:
      "Update the client's profile. Call whenever you learn personal facts: name, birth year, marital status, dependents, US state, employment status, risk tolerance (conservative/moderate/aggressive), target retirement age.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        birthYear: { type: "integer" },
        maritalStatus: { type: "string" },
        dependents: { type: "integer" },
        state: { type: "string", description: "US state, e.g. Michigan" },
        employmentStatus: { type: "string" },
        riskTolerance: { type: "string", enum: ["conservative", "moderate", "aggressive"] },
        retirementAge: { type: "integer" },
      },
    },
  },
  {
    name: "add_account",
    description:
      "Add a financial account (asset or liability) the client tells you about. Use interestRate for debt APRs and savings APYs.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "e.g. 'Chase Checking', 'Fidelity 401k'" },
        type: {
          type: "string",
          enum: ACCOUNT_TYPES.map((t) => t.value),
        },
        balance: { type: "number" },
        interestRate: { type: "number", description: "Annual % rate, e.g. 22.9 for a credit card" },
        institution: { type: "string" },
      },
      required: ["name", "type", "balance"],
    },
  },
  {
    name: "update_account",
    description: "Update an existing account's balance or details. Use the account id from the financial picture.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        balance: { type: "number" },
        interestRate: { type: "number" },
        name: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "add_income_source",
    description: "Record an income source. Amount is per-frequency (e.g. 3200 biweekly).",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        amount: { type: "number" },
        frequency: {
          type: "string",
          enum: ["weekly", "biweekly", "semimonthly", "monthly", "annual"],
        },
        type: { type: "string", enum: ["salary", "business", "rental", "investment", "other"] },
      },
      required: ["name", "amount", "frequency"],
    },
  },
  {
    name: "set_budget_category",
    description:
      "Create or update a monthly budget category by name (upsert). Group it as needs (rent, groceries, insurance), wants (dining, travel, fun), or savings (emergency fund, investing, extra debt payments).",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        plannedAmount: { type: "number", description: "Monthly amount" },
        group: { type: "string", enum: ["needs", "wants", "savings"] },
      },
      required: ["name", "plannedAmount", "group"],
    },
  },
  {
    name: "delete_budget_category",
    description: "Remove a budget category by exact name.",
    input_schema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    },
  },
  {
    name: "create_goal",
    description:
      "Create a financial goal once the client agrees to it. Priority: 1=high, 2=medium, 3=low.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        targetAmount: { type: "number" },
        currentAmount: { type: "number" },
        targetDate: { type: "string", description: "YYYY-MM-DD" },
        priority: { type: "integer", enum: [1, 2, 3] },
      },
      required: ["name", "targetAmount"],
    },
  },
  {
    name: "update_goal",
    description:
      "Update a goal's progress, details, or status (active/achieved/paused). Use the goal id from the financial picture.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        targetAmount: { type: "number" },
        currentAmount: { type: "number" },
        targetDate: { type: "string" },
        priority: { type: "integer", enum: [1, 2, 3] },
        status: { type: "string", enum: ["active", "achieved", "paused"] },
      },
      required: ["id"],
    },
  },
  {
    name: "save_note",
    description:
      "Save a note to your advisor memory: preferences, life context, worries, follow-ups. These persist across conversations.",
    input_schema: {
      type: "object",
      properties: {
        content: { type: "string" },
        category: { type: "string", enum: ["goals", "situation", "preferences", "follow_up"] },
      },
      required: ["content"],
    },
  },
];

type ToolInput = Record<string, unknown>;

export type ToolAction = { tool: string; summary: string };

export async function executeAdvisorTool(
  name: string,
  input: ToolInput
): Promise<{ result: string; action: ToolAction }> {
  switch (name) {
    case "update_profile": {
      const data = input as Prisma.ProfileUpdateInput;
      await prisma.profile.upsert({
        where: { id: "main" },
        update: data,
        create: { id: "main", ...(input as Prisma.ProfileCreateInput) },
      });
      return ok("update_profile", `Updated profile (${Object.keys(input).join(", ")})`);
    }
    case "add_account": {
      const i = input as {
        name: string;
        type: string;
        balance: number;
        interestRate?: number;
        institution?: string;
      };
      const typeInfo = ACCOUNT_TYPES.find((t) => t.value === i.type);
      if (!typeInfo) return err("add_account", `Unknown account type: ${i.type}`);
      const account = await prisma.account.create({
        data: {
          name: i.name,
          type: i.type,
          category: typeInfo.category,
          balance: i.balance,
          interestRate: i.interestRate ?? null,
          institution: i.institution ?? null,
        },
      });
      await recordSnapshot();
      return ok(
        "add_account",
        `Added ${typeInfo.category === "ASSET" ? "asset" : "debt"} "${account.name}"`
      );
    }
    case "update_account": {
      const { id, ...rest } = input as { id: string } & ToolInput;
      const existing = await prisma.account.findUnique({ where: { id } });
      if (!existing) return err("update_account", `No account with id ${id}`);
      await prisma.account.update({
        where: { id },
        data: rest as Prisma.AccountUpdateInput,
      });
      await recordSnapshot();
      return ok("update_account", `Updated account "${existing.name}"`);
    }
    case "add_income_source": {
      const i = input as { name: string; amount: number; frequency: string; type?: string };
      await prisma.incomeSource.create({
        data: { name: i.name, amount: i.amount, frequency: i.frequency, type: i.type ?? null },
      });
      return ok("add_income_source", `Added income source "${i.name}"`);
    }
    case "set_budget_category": {
      const i = input as { name: string; plannedAmount: number; group: string };
      await prisma.budgetCategory.upsert({
        where: { name: i.name },
        update: { plannedAmount: i.plannedAmount, group: i.group },
        create: { name: i.name, plannedAmount: i.plannedAmount, group: i.group },
      });
      return ok("set_budget_category", `Set budget: ${i.name}`);
    }
    case "delete_budget_category": {
      const i = input as { name: string };
      const deleted = await prisma.budgetCategory.deleteMany({ where: { name: i.name } });
      if (deleted.count === 0)
        return err("delete_budget_category", `No category named "${i.name}"`);
      return ok("delete_budget_category", `Removed budget category "${i.name}"`);
    }
    case "create_goal": {
      const i = input as {
        name: string;
        description?: string;
        targetAmount: number;
        currentAmount?: number;
        targetDate?: string;
        priority?: number;
      };
      const goal = await prisma.goal.create({
        data: {
          name: i.name,
          description: i.description ?? null,
          targetAmount: i.targetAmount,
          currentAmount: i.currentAmount ?? 0,
          targetDate: i.targetDate ? new Date(i.targetDate) : null,
          priority: i.priority ?? 2,
          createdBy: "advisor",
        },
      });
      return ok("create_goal", `Created goal "${goal.name}"`);
    }
    case "update_goal": {
      const { id, targetDate, ...rest } = input as {
        id: string;
        targetDate?: string;
      } & ToolInput;
      const existing = await prisma.goal.findUnique({ where: { id } });
      if (!existing) return err("update_goal", `No goal with id ${id}`);
      await prisma.goal.update({
        where: { id },
        data: {
          ...(rest as Prisma.GoalUpdateInput),
          ...(targetDate ? { targetDate: new Date(targetDate) } : {}),
        },
      });
      return ok("update_goal", `Updated goal "${existing.name}"`);
    }
    case "save_note": {
      const i = input as { content: string; category?: string };
      await prisma.advisorNote.create({
        data: { content: i.content, category: i.category ?? null },
      });
      return ok("save_note", "Saved a note to advisor memory");
    }
    default:
      return err(name, `Unknown tool: ${name}`);
  }
}

function ok(tool: string, summary: string) {
  return { result: JSON.stringify({ ok: true, summary }), action: { tool, summary } };
}
function err(tool: string, message: string) {
  return { result: JSON.stringify({ ok: false, error: message }), action: { tool, summary: message } };
}
