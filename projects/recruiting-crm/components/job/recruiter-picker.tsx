"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface User { id: string; name: string; }

interface Props {
  jobId: string;
  assignedTo: User | null;
  users: User[];
}

export function RecruiterPicker({ jobId, assignedTo, users }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(assignedTo?.id ?? "");

  async function save(newId: string) {
    setSaving(true);
    await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId: newId || null }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <select
          autoFocus
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="text-sm border border-slate-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
          disabled={saving}
        >
          <option value="">— Unassigned —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <button
          onClick={() => save(selected)}
          disabled={saving}
          className="text-xs text-emerald-600 hover:text-emerald-800 font-medium disabled:opacity-50"
        >
          {saving ? "…" : "Save"}
        </button>
        <button
          onClick={() => { setEditing(false); setSelected(assignedTo?.id ?? ""); }}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1 group text-left"
      title="Click to change recruiter"
    >
      <span className="text-sm text-slate-900">{assignedTo?.name ?? "Unassigned"}</span>
      <span className="text-slate-300 group-hover:text-slate-500 text-[10px]">✎</span>
    </button>
  );
}
