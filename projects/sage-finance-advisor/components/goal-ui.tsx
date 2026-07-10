"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "./modal";
import { inputClass, buttonPrimary, buttonGhost, Badge, ProgressBar, Card } from "./ui";
import { saveGoal, deleteGoal } from "@/app/actions";
import { fmtCurrency, fmtDate } from "@/lib/format";

const field = "space-y-1";
const labelClass = "text-xs font-medium text-ink-2";

export type GoalData = {
  id: string;
  name: string;
  description: string | null;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date | null;
  priority: number;
  status: string;
  createdBy: string;
};

function GoalForm({ goal, onDone }: { goal?: GoalData; onDone: () => void }) {
  return (
    <form
      action={async (form) => {
        await saveGoal(form);
        onDone();
      }}
      className="space-y-3"
    >
      {goal && <input type="hidden" name="id" value={goal.id} />}
      <div className={field}>
        <label className={labelClass}>Goal</label>
        <input name="name" required defaultValue={goal?.name} placeholder="e.g. 6-month emergency fund" className={inputClass} />
      </div>
      <div className={field}>
        <label className={labelClass}>Why it matters (optional)</label>
        <input name="description" defaultValue={goal?.description ?? ""} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={field}>
          <label className={labelClass}>Target amount ($)</label>
          <input name="targetAmount" type="number" step="0.01" required defaultValue={goal?.targetAmount} className={inputClass} />
        </div>
        <div className={field}>
          <label className={labelClass}>Saved so far ($)</label>
          <input name="currentAmount" type="number" step="0.01" defaultValue={goal?.currentAmount ?? 0} className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className={field + " col-span-1"}>
          <label className={labelClass}>Target date</label>
          <input
            name="targetDate"
            type="date"
            defaultValue={goal?.targetDate ? new Date(goal.targetDate).toISOString().slice(0, 10) : ""}
            className={inputClass}
          />
        </div>
        <div className={field}>
          <label className={labelClass}>Priority</label>
          <select name="priority" defaultValue={goal?.priority ?? 2} className={inputClass}>
            <option value="1">High</option>
            <option value="2">Medium</option>
            <option value="3">Low</option>
          </select>
        </div>
        <div className={field}>
          <label className={labelClass}>Status</label>
          <select name="status" defaultValue={goal?.status ?? "active"} className={inputClass}>
            <option value="active">Active</option>
            <option value="achieved">Achieved</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onDone} className={buttonGhost}>Cancel</button>
        <button type="submit" className={buttonPrimary + " btn-accent-text"}>
          {goal ? "Save changes" : "Create goal"}
        </button>
      </div>
    </form>
  );
}

export function AddGoalButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonPrimary + " btn-accent-text"}>
        <Plus size={15} /> New goal
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create a goal">
        <GoalForm onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function GoalCard({ goal }: { goal: GoalData }) {
  const [editing, setEditing] = useState(false);
  const frac = goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

  let monthlyNeeded: number | null = null;
  if (goal.targetDate && remaining > 0) {
    const months =
      (new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44);
    if (months > 0.5) monthlyNeeded = remaining / months;
  }

  const priorityLabel = { 1: "High priority", 2: "Medium", 3: "Low" }[goal.priority] ?? "Medium";

  return (
    <Card className="px-5 py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{goal.name}</p>
          {goal.description && (
            <p className="text-xs text-ink-2 mt-0.5 leading-relaxed">{goal.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setEditing(true)} className="p-1.5 text-ink-3 hover:text-ink cursor-pointer" title="Edit">
            <Pencil size={13} />
          </button>
          <form
            action={deleteGoal}
            onSubmit={(e) => {
              if (!confirm(`Delete goal "${goal.name}"?`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={goal.id} />
            <button className="p-1.5 text-ink-3 hover:text-critical cursor-pointer" title="Delete">
              <Trash2 size={13} />
            </button>
          </form>
        </div>
      </div>

      <div className="flex items-baseline justify-between mt-3 mb-1.5">
        <p className="text-lg font-semibold text-ink tabular">
          {fmtCurrency(goal.currentAmount)}
          <span className="text-xs font-normal text-ink-3"> of {fmtCurrency(goal.targetAmount)}</span>
        </p>
        <p className="text-xs font-medium text-ink-2 tabular">{Math.round(frac * 100)}%</p>
      </div>
      <ProgressBar fraction={frac} tone={goal.status === "achieved" || frac >= 1 ? "good" : "accent"} />

      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        {goal.status === "achieved" ? (
          <Badge tone="good">Achieved</Badge>
        ) : goal.status === "paused" ? (
          <Badge>Paused</Badge>
        ) : (
          <Badge tone={goal.priority === 1 ? "accent" : "neutral"}>{priorityLabel}</Badge>
        )}
        {goal.targetDate && <Badge>By {fmtDate(goal.targetDate)}</Badge>}
        {monthlyNeeded !== null && goal.status === "active" && (
          <Badge tone="accent">{fmtCurrency(monthlyNeeded)}/mo to stay on pace</Badge>
        )}
        {goal.createdBy === "advisor" && <Badge>Set with Sage</Badge>}
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit goal">
        <GoalForm goal={goal} onDone={() => setEditing(false)} />
      </Modal>
    </Card>
  );
}
