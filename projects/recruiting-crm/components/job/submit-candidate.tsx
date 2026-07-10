"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface JobOption {
  id: string;
  title: string;
  clientName: string;
  status: string;
}

interface Props {
  candidateId: string;
  openJobs: JobOption[];
  existingJobIds: string[];
}

export function SubmitCandidateForm({ candidateId, openJobs, existingJobIds }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [jobOrderId, setJobOrderId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const available = openJobs.filter((j) => !existingJobIds.includes(j.id));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobOrderId) return;
    setSaving(true);
    setError("");

    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId, jobOrderId }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to submit.");
      return;
    }

    setOpen(false);
    setJobOrderId("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={available.length === 0}
        className="w-full h-8 text-sm font-medium bg-blue-700 text-white rounded hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {available.length === 0 ? "No open jobs available" : "Submit to job order"}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <select
        value={jobOrderId}
        onChange={(e) => setJobOrderId(e.target.value)}
        className="w-full h-9 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        required
      >
        <option value="">Select job order…</option>
        {available.map((j) => (
          <option key={j.id} value={j.id}>
            {j.title} — {j.clientName}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !jobOrderId}
          className="flex-1 h-8 text-sm font-medium bg-blue-700 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? "Submitting…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-8 px-3 text-sm border border-slate-300 rounded hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
