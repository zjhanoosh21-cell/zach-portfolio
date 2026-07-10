"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLE_TYPES = [
  { value: "LEGAL_SECRETARY", label: "Legal Secretary" },
  { value: "LEGAL_ASSISTANT", label: "Legal Assistant" },
  { value: "PARALEGAL", label: "Paralegal" },
  { value: "BILLING_CLERK", label: "Billing Clerk" },
  { value: "BILLING_COORDINATOR", label: "Billing Coordinator" },
  { value: "OTHER_LEGAL", label: "Other Legal" },
  { value: "OTHER_PROFESSIONAL", label: "Other Professional" },
  { value: "NON_LEGAL", label: "Non-Legal" },
];

interface Client {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

interface Props {
  clients: Client[];
  users?: User[];
  defaultClientId?: string;
  defaultClientName?: string;
  mode?: "create" | "edit";
  jobId?: string;
  defaultValues?: {
    title?: string;
    clientId?: string | null;
    clientName?: string;
    location?: string | null;
    jobType?: string;
    roleType?: string | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    priority?: number;
    description?: string | null;
    internalNotes?: string | null;
    practiceAreas?: string[];
    requiredSkills?: string[];
    targetFillDate?: string | null;
    status?: string;
    assignedToId?: string | null;
  };
}

export function JobForm({
  clients,
  users,
  defaultClientId,
  defaultClientName,
  mode = "create",
  jobId,
  defaultValues,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clientId, setClientId] = useState(defaultValues?.clientId ?? defaultClientId ?? "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const fd = new FormData(e.currentTarget);

    const practiceAreasRaw = (fd.get("practiceAreas") as string) || "";
    const requiredSkillsRaw = (fd.get("requiredSkills") as string) || "";
    const practiceAreas = practiceAreasRaw.split(",").map((s) => s.trim()).filter(Boolean);
    const requiredSkills = requiredSkillsRaw.split(",").map((s) => s.trim()).filter(Boolean);

    const salaryMinRaw = fd.get("salaryMin") as string;
    const salaryMaxRaw = fd.get("salaryMax") as string;
    const targetFillDateRaw = fd.get("targetFillDate") as string;
    const assignedToIdRaw = fd.get("assignedToId") as string;

    const selectedClientId = fd.get("clientId") as string;
    const selectedClient = clients.find((c) => c.id === selectedClientId);
    const clientName = selectedClient?.name ?? (fd.get("clientName") as string) ?? "";

    const payload: Record<string, unknown> = {
      title: fd.get("title") as string,
      clientId: selectedClientId || null,
      clientName,
      location: (fd.get("location") as string) || null,
      jobType: fd.get("jobType") as string,
      roleType: (fd.get("roleType") as string) || null,
      practiceAreas,
      requiredSkills,
      salaryMin: salaryMinRaw ? parseInt(salaryMinRaw) : null,
      salaryMax: salaryMaxRaw ? parseInt(salaryMaxRaw) : null,
      priority: parseInt(fd.get("priority") as string) || 2,
      description: (fd.get("description") as string) || null,
      internalNotes: (fd.get("internalNotes") as string) || null,
      targetFillDate: targetFillDateRaw || null,
      assignedToId: assignedToIdRaw || null,
    };

    if (mode === "edit") {
      payload.status = fd.get("status") as string;
    }

    const url = mode === "create" ? "/api/jobs" : `/api/jobs/${jobId}`;
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

    const job = await res.json();
    router.push(`/jobs/${job.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Job title <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          defaultValue={defaultValues?.title ?? ""}
          required
          className="w-full h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          placeholder="Litigation Paralegal"
        />
      </div>

      {/* Client */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
          <select
            name="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full h-9 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">Select client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            <option value="__new__">+ Enter manually</option>
          </select>
        </div>
        {(clientId === "__new__" || (!clientId && !defaultClientId)) && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client name</label>
            <input
              name="clientName"
              defaultValue={defaultClientName ?? defaultValues?.clientName ?? ""}
              className="w-full h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Firm or company name"
            />
          </div>
        )}
      </div>

      {/* Type, role, priority, status (edit only) */}
      <div className={`grid gap-4 ${mode === "edit" ? "grid-cols-4" : "grid-cols-3"}`}>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Job type</label>
          <select
            name="jobType"
            defaultValue={defaultValues?.jobType ?? "DIRECT_HIRE"}
            className="w-full h-9 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="DIRECT_HIRE">Direct Hire</option>
            <option value="TEMP_TO_HIRE">Temp-to-Hire</option>
            <option value="TEMP">Temp</option>
            <option value="CONTRACT">Contract</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Role type</label>
          <select
            name="roleType"
            defaultValue={defaultValues?.roleType ?? ""}
            className="w-full h-9 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">Select…</option>
            {ROLE_TYPES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
          <select
            name="priority"
            defaultValue={String(defaultValues?.priority ?? 2)}
            className="w-full h-9 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="1">1 — Urgent</option>
            <option value="2">2 — Normal</option>
            <option value="3">3 — Low</option>
          </select>
        </div>
        {mode === "edit" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              name="status"
              defaultValue={defaultValues?.status ?? "OPEN"}
              className="w-full h-9 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="OPEN">Open</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="FILLED">Filled by CRI</option>
              <option value="FILLED_BY_COMPETITOR">Filled by Competitor</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        )}
      </div>

      {/* Location + salary + target fill date */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
          <input
            name="location"
            defaultValue={defaultValues?.location ?? ""}
            className="w-full h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="Chicago, IL"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Salary min</label>
          <input
            name="salaryMin"
            type="number"
            defaultValue={defaultValues?.salaryMin ?? ""}
            className="w-full h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="50000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Salary max</label>
          <input
            name="salaryMax"
            type="number"
            defaultValue={defaultValues?.salaryMax ?? ""}
            className="w-full h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="70000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Target fill date</label>
          <input
            name="targetFillDate"
            type="date"
            defaultValue={defaultValues?.targetFillDate ?? ""}
            className="w-full h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
      </div>

      {/* Assigned recruiter */}
      {users && users.length > 0 && (
        <div className="max-w-xs">
          <label className="block text-sm font-medium text-slate-700 mb-1">Assigned recruiter</label>
          <select
            name="assignedToId"
            defaultValue={defaultValues?.assignedToId ?? ""}
            className="w-full h-9 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Practice areas + skills */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Practice areas</label>
          <input
            name="practiceAreas"
            defaultValue={defaultValues?.practiceAreas?.join(", ") ?? ""}
            className="w-full h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="Litigation, Corporate, Real Estate…"
          />
          <p className="text-xs text-slate-400 mt-0.5">Comma-separated</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Required skills</label>
          <input
            name="requiredSkills"
            defaultValue={defaultValues?.requiredSkills?.join(", ") ?? ""}
            className="w-full h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="iManage, Relativity, MS Word…"
          />
          <p className="text-xs text-slate-400 mt-0.5">Comma-separated</p>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Job description</label>
        <textarea
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          rows={4}
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
          placeholder="Role responsibilities, requirements, work arrangement…"
        />
      </div>

      {/* Internal notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Internal notes</label>
        <textarea
          name="internalNotes"
          defaultValue={defaultValues?.internalNotes ?? ""}
          rows={2}
          className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
          placeholder="Client preferences, hiring manager notes, fee arrangement…"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="h-9 px-5 text-sm font-medium bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : mode === "create" ? "Create job order" : "Save changes"}
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
