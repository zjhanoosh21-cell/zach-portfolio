"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MultiSelect } from "@/components/ui/multi-select";

const TIER_OPTIONS = [
  { value: "TIER_1", label: "Tier 1 – Premium" },
  { value: "TIER_2", label: "Tier 2 – Strong" },
  { value: "TIER_3", label: "Tier 3 – Transitional" },
  { value: "TIER_4", label: "Tier 4 – High Risk" },
];

const STATUS_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "PLACED", label: "Placed" },
  { value: "REJECTED", label: "Rejected" },
  { value: "DO_NOT_CONSIDER", label: "Do Not Consider" },
];

const ROLE_OPTIONS = [
  { value: "PARALEGAL", label: "Paralegal" },
  { value: "LEGAL_SECRETARY", label: "Legal Secretary" },
  { value: "LEGAL_ASSISTANT", label: "Legal Assistant" },
  { value: "BILLING_COORDINATOR", label: "Billing Coordinator" },
  { value: "BILLING_CLERK", label: "Billing Clerk" },
  { value: "OTHER_LEGAL", label: "Other Legal" },
  { value: "OTHER_PROFESSIONAL", label: "Other Professional" },
  { value: "NON_LEGAL", label: "Non-Legal" },
];

export function CandidateFilterBar({
  query: initialQuery = "",
  tier: initialTier = "",
  status: initialStatus = "",
  role: initialRole = "",
  appliedRole: initialAppliedRole = "",
  appliedRoleOptions = [],
  state: initialState = "",
  sort: initialSort = "date",
  minExp: initialMinExp,
  maxExp: initialMaxExp,
  archived = false,
  tab = "crm",
  duplicateOnly: initialDuplicateOnly = false,
  priorityOnly: initialPriorityOnly = false,
}: {
  query?: string;
  tier?: string;
  status?: string;
  role?: string;
  /** Comma-separated applied-role values currently selected. */
  appliedRole?: string;
  /** Dynamic options built from the applied roles actually present in the data. */
  appliedRoleOptions?: { value: string; label: string }[];
  state?: string;
  sort?: string;
  minExp?: number;
  maxExp?: number;
  archived?: boolean;
  tab?: string;
  duplicateOnly?: boolean;
  priorityOnly?: boolean;
}) {
  const router = useRouter();
  const [duplicateOnly, setDuplicateOnly] = useState(initialDuplicateOnly);
  const [priorityOnly, setPriorityOnly] = useState(initialPriorityOnly);

  const [selectedTiers, setSelectedTiers] = useState<string[]>(
    initialTier ? initialTier.split(",").filter(Boolean) : []
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    initialStatus ? initialStatus.split(",").filter(Boolean) : []
  );
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    initialRole ? initialRole.split(",").filter(Boolean) : []
  );
  const [selectedAppliedRoles, setSelectedAppliedRoles] = useState<string[]>(
    initialAppliedRole ? initialAppliedRole.split(",").filter(Boolean) : []
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = ((fd.get("q") as string) ?? "").trim();
    const state = ((fd.get("state") as string) ?? "").trim();
    const minExp = fd.get("minExp") as string;
    const maxExp = fd.get("maxExp") as string;
    const sort = fd.get("sort") as string;

    const qs = new URLSearchParams();
    if (tab && tab !== "crm") qs.set("tab", tab);
    if (archived) qs.set("archived", "1");
    if (q) qs.set("q", q);
    if (selectedTiers.length) qs.set("tier", selectedTiers.join(","));
    if (selectedStatuses.length) qs.set("status", selectedStatuses.join(","));
    if (selectedRoles.length) qs.set("role", selectedRoles.join(","));
    if (selectedAppliedRoles.length) qs.set("appliedRole", selectedAppliedRoles.join(","));
    if (state) qs.set("state", state);
    if (sort && sort !== "date") qs.set("sort", sort);
    if (minExp) qs.set("minExp", minExp);
    if (maxExp) qs.set("maxExp", maxExp);
    if (duplicateOnly) qs.set("duplicate", "1");
    if (priorityOnly) qs.set("priority", "1");

    const str = qs.toString();
    router.push(`/candidates${str ? `?${str}` : ""}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-center">
      <input
        name="q"
        defaultValue={initialQuery}
        placeholder="Search name, title, skill, employer…"
        className="h-9 w-72 rounded border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
      />

      <MultiSelect
        options={TIER_OPTIONS}
        selected={selectedTiers}
        onChange={setSelectedTiers}
        allLabel="All tiers"
      />

      {(tab === "resumate" || !archived) && (
        <MultiSelect
          options={STATUS_OPTIONS}
          selected={selectedStatuses}
          onChange={setSelectedStatuses}
          allLabel="All statuses"
        />
      )}

      <MultiSelect
        options={ROLE_OPTIONS}
        selected={selectedRoles}
        onChange={setSelectedRoles}
        allLabel="All role types"
      />

      {appliedRoleOptions.length > 0 && (
        <MultiSelect
          options={appliedRoleOptions}
          selected={selectedAppliedRoles}
          onChange={setSelectedAppliedRoles}
          allLabel="All applied roles"
          searchable
          searchPlaceholder="Search applied roles…"
        />
      )}

      <input
        name="state"
        defaultValue={initialState ?? ""}
        placeholder="State (e.g. IL)"
        className="h-9 w-28 rounded border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
      />

      <div className="flex items-center gap-1">
        <input
          name="minExp"
          type="number"
          min="0"
          max="50"
          defaultValue={initialMinExp ?? ""}
          placeholder="Min yrs"
          className="h-9 w-20 rounded border border-slate-300 bg-white px-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        <span className="text-slate-400 text-sm">–</span>
        <input
          name="maxExp"
          type="number"
          min="0"
          max="50"
          defaultValue={initialMaxExp ?? ""}
          placeholder="Max yrs"
          className="h-9 w-20 rounded border border-slate-300 bg-white px-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        <span className="text-xs text-slate-400">exp.</span>
      </div>

      <select
        name="sort"
        defaultValue={initialSort}
        className="h-9 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
      >
        <option value="score">Score: High → Low</option>
        <option value="score_asc">Score: Low → High</option>
        <option value="date">Date: Newest first</option>
        <option value="date_asc">Date: Oldest first</option>
        <option value="name">Name: A → Z</option>
        <option value="name_desc">Name: Z → A</option>
        <option value="onfile_desc">On File: Longest first</option>
        <option value="onfile_asc">On File: Shortest first</option>
      </select>

      <button
        type="button"
        onClick={() => setPriorityOnly((v) => !v)}
        className={`h-9 px-3 text-sm font-medium rounded border transition-colors ${
          priorityOnly
            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
        }`}
      >
        ★ Priority
      </button>

      <button
        type="button"
        onClick={() => setDuplicateOnly((v) => !v)}
        className={`h-9 px-3 text-sm font-medium rounded border transition-colors ${
          duplicateOnly
            ? "bg-amber-100 text-amber-800 border-amber-300"
            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
        }`}
      >
        ⚠ Duplicates
      </button>

      <button
        type="submit"
        className="h-9 px-4 text-sm font-medium bg-slate-800 text-white rounded hover:bg-slate-700"
      >
        Search
      </button>

      <a
        href={`/candidates${tab !== "crm" ? `?tab=${tab}` : archived ? "?archived=1" : ""}`}
        className="h-9 px-3 flex items-center text-sm text-slate-500 border border-slate-300 rounded hover:bg-slate-50 hover:text-slate-800"
      >
        Clear
      </a>
    </form>
  );
}
