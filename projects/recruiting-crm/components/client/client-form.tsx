"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const INDUSTRIES = [
  "Law Firm",
  "Corporate Legal",
  "Financial Services",
  "Healthcare",
  "Insurance",
  "Government",
  "Non-Profit",
  "Other",
];

interface Props {
  mode: "create" | "edit";
  clientId?: string;
  defaultValues?: {
    name?: string;
    industry?: string | null;
    specialty?: string | null;
    city?: string | null;
    state?: string | null;
    website?: string | null;
    notes?: string | null;
  };
}

export function ClientForm({ mode, clientId, defaultValues }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name") as string,
      industry: (fd.get("industry") as string) || null,
      specialty: (fd.get("specialty") as string) || null,
      city: (fd.get("city") as string) || null,
      state: (fd.get("state") as string) || null,
      website: (fd.get("website") as string) || null,
      notes: (fd.get("notes") as string) || null,
    };

    const url = mode === "create" ? "/api/clients" : `/api/clients/${clientId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save. Please try again.");
      return;
    }

    const client = await res.json();
    router.push(`/clients/${client.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Firm / Company name <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          defaultValue={defaultValues?.name ?? ""}
          required
          className="w-full h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          placeholder="Thompson & Partners LLP"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
          <select
            name="industry"
            defaultValue={defaultValues?.industry ?? ""}
            className="w-full h-9 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">Select…</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Specialty</label>
          <input
            name="specialty"
            defaultValue={defaultValues?.specialty ?? ""}
            className="w-full h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="Litigation, Corporate, Multi-practice…"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
          <input
            name="city"
            defaultValue={defaultValues?.city ?? ""}
            className="w-full h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="Chicago"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
          <input
            name="state"
            defaultValue={defaultValues?.state ?? ""}
            className="w-full h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="IL"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
        <input
          name="website"
          type="url"
          defaultValue={defaultValues?.website ?? ""}
          className="w-full h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          placeholder="https://thompsonpartners.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Internal notes</label>
        <textarea
          name="notes"
          defaultValue={defaultValues?.notes ?? ""}
          rows={3}
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
          placeholder="Placement history, preferences, relationship notes…"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="h-9 px-5 text-sm font-medium bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : mode === "create" ? "Add client" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="h-9 px-4 text-sm text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
