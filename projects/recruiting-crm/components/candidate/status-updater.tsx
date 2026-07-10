"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CandidateStatus } from "@prisma/client";

const STATUS_OPTIONS: { value: CandidateStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "ACTIVE", label: "Active" },
  { value: "PLACED", label: "Placed" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "REJECTED", label: "Rejected" },
  { value: "DO_NOT_CONSIDER", label: "Do Not Consider" },
];

interface Props {
  candidateId: string;
  currentStatus: CandidateStatus;
}

export function StatusUpdater({ candidateId, currentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<CandidateStatus>(currentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Sync dropdown when server refreshes with new status
  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  async function handleUpdate() {
    if (status === currentStatus) return;
    setSaving(true);
    setError("");
    setSaved(false);

    const res = await fetch(`/api/candidates/${candidateId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? `Error ${res.status}`);
    } else {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <div className="space-y-1.5">
      <select
        value={status}
        onChange={(e) => { setStatus(e.target.value as CandidateStatus); setSaved(false); }}
        className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {status !== currentStatus && (
        <button
          onClick={handleUpdate}
          disabled={saving}
          className="w-full py-1 text-xs font-medium bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Update status"}
        </button>
      )}

      {saved && <p className="text-xs font-medium text-emerald-600">✓ Status saved</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
