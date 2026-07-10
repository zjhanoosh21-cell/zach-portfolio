"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "FILLED", label: "Filled by CRI" },
  { value: "FILLED_BY_COMPETITOR", label: "Filled by Competitor" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_CLASSES: Record<string, string> = {
  OPEN: "bg-emerald-100 text-emerald-800 border-emerald-200",
  ON_HOLD: "bg-amber-100 text-amber-800 border-amber-200",
  FILLED: "bg-blue-100 text-blue-800 border-blue-200",
  FILLED_BY_COMPETITOR: "bg-orange-100 text-orange-800 border-orange-200",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
};

interface Props {
  jobId: string;
  currentStatus: string;
}

export function JobStatusUpdater({ jobId, currentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  async function handleChange(newStatus: string) {
    if (newStatus === status) { setEditing(false); return; }
    setSaving(true);
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setSaving(false);
    if (res.ok) {
      setStatus(newStatus);
      router.refresh();
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <select
          value={status}
          onChange={(e) => handleChange(e.target.value)}
          disabled={saving}
          autoFocus
          onBlur={() => setEditing(false)}
          className="h-8 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Click to change status"
      className={`text-sm px-3 py-1 rounded-full font-medium border cursor-pointer hover:opacity-80 transition-opacity ${STATUS_CLASSES[status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}
    >
      {saving ? "Saving…" : STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status.replace(/_/g, " ")}
    </button>
  );
}
