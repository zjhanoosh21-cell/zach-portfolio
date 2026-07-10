"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "./modal";
import { inputClass, buttonPrimary, buttonGhost } from "./ui";
import {
  saveIncome,
  deleteIncome,
  saveBudgetCategory,
  deleteBudgetCategory,
} from "@/app/actions";
import { fmtCurrency, monthlyAmount } from "@/lib/format";

const field = "space-y-1";
const labelClass = "text-xs font-medium text-ink-2";

type Income = {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  type: string | null;
};

type Category = { id: string; name: string; plannedAmount: number; group: string };

function IncomeForm({ income, onDone }: { income?: Income; onDone: () => void }) {
  return (
    <form
      action={async (form) => {
        await saveIncome(form);
        onDone();
      }}
      className="space-y-3"
    >
      {income && <input type="hidden" name="id" value={income.id} />}
      <div className={field}>
        <label className={labelClass}>Name</label>
        <input name="name" required defaultValue={income?.name} placeholder="e.g. Salary — Acme Co" className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={field}>
          <label className={labelClass}>Amount ($, after tax)</label>
          <input name="amount" type="number" step="0.01" required defaultValue={income?.amount} className={inputClass} />
        </div>
        <div className={field}>
          <label className={labelClass}>Frequency</label>
          <select name="frequency" defaultValue={income?.frequency ?? "monthly"} className={inputClass}>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Every 2 weeks</option>
            <option value="semimonthly">Twice a month</option>
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onDone} className={buttonGhost}>Cancel</button>
        <button type="submit" className={buttonPrimary + " btn-accent-text"}>
          {income ? "Save changes" : "Add income"}
        </button>
      </div>
    </form>
  );
}

export function AddIncomeButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonGhost}>
        <Plus size={14} /> Add income
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add income source">
        <IncomeForm onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function IncomeRow({ income }: { income: Income }) {
  const [editing, setEditing] = useState(false);
  const freqLabel: Record<string, string> = {
    weekly: "weekly",
    biweekly: "every 2 weeks",
    semimonthly: "twice a month",
    monthly: "monthly",
    annual: "per year",
  };
  return (
    <div className="flex items-center gap-3 px-5 py-3 border-t border-line first:border-t-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{income.name}</p>
        <p className="text-xs text-ink-3">
          {fmtCurrency(income.amount)} {freqLabel[income.frequency] ?? income.frequency}
        </p>
      </div>
      <p className="text-sm font-semibold text-ink tabular">
        {fmtCurrency(monthlyAmount(income.amount, income.frequency))}
        <span className="text-xs font-normal text-ink-3">/mo</span>
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => setEditing(true)} className="p-1.5 text-ink-3 hover:text-ink cursor-pointer" title="Edit">
          <Pencil size={13} />
        </button>
        <form action={deleteIncome}>
          <input type="hidden" name="id" value={income.id} />
          <button className="p-1.5 text-ink-3 hover:text-critical cursor-pointer" title="Delete">
            <Trash2 size={13} />
          </button>
        </form>
      </div>
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit income source">
        <IncomeForm income={income} onDone={() => setEditing(false)} />
      </Modal>
    </div>
  );
}

function CategoryForm({ category, onDone }: { category?: Category; onDone: () => void }) {
  return (
    <form
      action={async (form) => {
        await saveBudgetCategory(form);
        onDone();
      }}
      className="space-y-3"
    >
      {category && <input type="hidden" name="id" value={category.id} />}
      <div className={field}>
        <label className={labelClass}>Category</label>
        <input name="name" required defaultValue={category?.name} placeholder="e.g. Groceries" className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={field}>
          <label className={labelClass}>Monthly amount ($)</label>
          <input name="plannedAmount" type="number" step="0.01" required defaultValue={category?.plannedAmount} className={inputClass} />
        </div>
        <div className={field}>
          <label className={labelClass}>Group</label>
          <select name="group" defaultValue={category?.group ?? "needs"} className={inputClass}>
            <option value="needs">Needs</option>
            <option value="wants">Wants</option>
            <option value="savings">Savings & debt payoff</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onDone} className={buttonGhost}>Cancel</button>
        <button type="submit" className={buttonPrimary + " btn-accent-text"}>
          {category ? "Save changes" : "Add category"}
        </button>
      </div>
    </form>
  );
}

export function AddCategoryButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonPrimary + " btn-accent-text"}>
        <Plus size={15} /> Add category
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add budget category">
        <CategoryForm onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function CategoryRow({ category, maxAmount }: { category: Category; maxAmount: number }) {
  const [editing, setEditing] = useState(false);
  const groupColor: Record<string, string> = {
    needs: "var(--series-1)",
    wants: "var(--series-3)",
    savings: "var(--series-2)",
  };
  return (
    <div className="px-5 py-2.5 border-t border-line first:border-t-0">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-1">
            <p className="text-sm text-ink truncate">{category.name}</p>
            <p className="text-sm text-ink font-medium tabular">
              {fmtCurrency(category.plannedAmount)}
              <span className="text-xs font-normal text-ink-3">/mo</span>
            </p>
          </div>
          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${maxAmount > 0 ? (category.plannedAmount / maxAmount) * 100 : 0}%`,
                background: groupColor[category.group] ?? "var(--series-1)",
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setEditing(true)} className="p-1.5 text-ink-3 hover:text-ink cursor-pointer" title="Edit">
            <Pencil size={13} />
          </button>
          <form action={deleteBudgetCategory}>
            <input type="hidden" name="id" value={category.id} />
            <button className="p-1.5 text-ink-3 hover:text-critical cursor-pointer" title="Delete">
              <Trash2 size={13} />
            </button>
          </form>
        </div>
      </div>
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit category">
        <CategoryForm category={category} onDone={() => setEditing(false)} />
      </Modal>
    </div>
  );
}
