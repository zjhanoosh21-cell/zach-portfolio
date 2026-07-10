"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { recordSnapshot } from "@/lib/finance";
import { ACCOUNT_TYPES } from "@/lib/format";

function num(form: FormData, key: string): number | null {
  const v = form.get(key);
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function str(form: FormData, key: string): string | null {
  const v = form.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function revalidateAll() {
  for (const p of ["/", "/accounts", "/budget", "/goals", "/settings"]) {
    revalidatePath(p);
  }
}

// ── Accounts ────────────────────────────────────────────────

export async function saveAccount(form: FormData) {
  const id = str(form, "id");
  const type = str(form, "type") ?? "checking";
  const category = ACCOUNT_TYPES.find((t) => t.value === type)?.category ?? "ASSET";
  const data = {
    name: str(form, "name") ?? "Untitled account",
    institution: str(form, "institution"),
    type,
    category,
    balance: num(form, "balance") ?? 0,
    interestRate: num(form, "interestRate"),
    notes: str(form, "notes"),
  };
  if (id) await prisma.account.update({ where: { id }, data });
  else await prisma.account.create({ data });
  await recordSnapshot();
  revalidateAll();
}

export async function deleteAccount(form: FormData) {
  const id = str(form, "id");
  if (id) {
    await prisma.account.delete({ where: { id } });
    await recordSnapshot();
  }
  revalidateAll();
}

// ── Holdings ────────────────────────────────────────────────

export async function saveHolding(form: FormData) {
  const id = str(form, "id");
  const accountId = str(form, "accountId");
  if (!accountId) return;
  const data = {
    accountId,
    symbol: (str(form, "symbol") ?? "?").toUpperCase(),
    name: str(form, "name"),
    quantity: num(form, "quantity") ?? 0,
    price: num(form, "price") ?? 0,
    assetClass: str(form, "assetClass"),
  };
  if (id) await prisma.holding.update({ where: { id }, data });
  else await prisma.holding.create({ data });
  revalidateAll();
}

export async function deleteHolding(form: FormData) {
  const id = str(form, "id");
  if (id) await prisma.holding.delete({ where: { id } });
  revalidateAll();
}

// ── Income ──────────────────────────────────────────────────

export async function saveIncome(form: FormData) {
  const id = str(form, "id");
  const data = {
    name: str(form, "name") ?? "Income",
    amount: num(form, "amount") ?? 0,
    frequency: str(form, "frequency") ?? "monthly",
    type: str(form, "type"),
  };
  if (id) await prisma.incomeSource.update({ where: { id }, data });
  else await prisma.incomeSource.create({ data });
  revalidateAll();
}

export async function deleteIncome(form: FormData) {
  const id = str(form, "id");
  if (id) await prisma.incomeSource.delete({ where: { id } });
  revalidateAll();
}

// ── Budget ──────────────────────────────────────────────────

export async function saveBudgetCategory(form: FormData) {
  const id = str(form, "id");
  const data = {
    name: str(form, "name") ?? "Category",
    plannedAmount: num(form, "plannedAmount") ?? 0,
    group: str(form, "group") ?? "needs",
  };
  if (id) await prisma.budgetCategory.update({ where: { id }, data });
  else await prisma.budgetCategory.create({ data });
  revalidateAll();
}

export async function deleteBudgetCategory(form: FormData) {
  const id = str(form, "id");
  if (id) await prisma.budgetCategory.delete({ where: { id } });
  revalidateAll();
}

// ── Goals ───────────────────────────────────────────────────

export async function saveGoal(form: FormData) {
  const id = str(form, "id");
  const targetDate = str(form, "targetDate");
  const data = {
    name: str(form, "name") ?? "Goal",
    description: str(form, "description"),
    targetAmount: num(form, "targetAmount") ?? 0,
    currentAmount: num(form, "currentAmount") ?? 0,
    targetDate: targetDate ? new Date(targetDate) : null,
    priority: num(form, "priority") ?? 2,
    status: str(form, "status") ?? "active",
  };
  if (id) await prisma.goal.update({ where: { id }, data });
  else await prisma.goal.create({ data: { ...data, createdBy: "user" } });
  revalidateAll();
}

export async function deleteGoal(form: FormData) {
  const id = str(form, "id");
  if (id) await prisma.goal.delete({ where: { id } });
  revalidateAll();
}

// ── Profile ─────────────────────────────────────────────────

export async function saveProfile(form: FormData) {
  const data = {
    name: str(form, "name"),
    birthYear: num(form, "birthYear"),
    maritalStatus: str(form, "maritalStatus"),
    dependents: num(form, "dependents"),
    state: str(form, "state"),
    employmentStatus: str(form, "employmentStatus"),
    riskTolerance: str(form, "riskTolerance"),
    retirementAge: num(form, "retirementAge"),
  };
  await prisma.profile.upsert({
    where: { id: "main" },
    update: data,
    create: { id: "main", ...data },
  });
  revalidateAll();
}

// ── Conversations ───────────────────────────────────────────

export async function deleteConversation(form: FormData) {
  const id = str(form, "id");
  if (id) await prisma.conversation.delete({ where: { id } });
  revalidatePath("/advisor");
}
