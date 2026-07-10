"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MultiSelect } from "@/components/ui/multi-select";

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "FILLED", label: "Filled by CRI" },
  { value: "FILLED_BY_COMPETITOR", label: "Filled by Competitor" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function JobsFilterBar({
  query: initialQuery = "",
  status: initialStatus = "",
  sort: initialSort = "priority",
}: {
  query?: string;
  status?: string;
  sort?: string;
}) {
  const router = useRouter();
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    initialStatus ? initialStatus.split(",").filter(Boolean) : []
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = ((fd.get("q") as string) ?? "").trim();
    const sort = fd.get("sort") as string;

    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (selectedStatuses.length) qs.set("status", selectedStatuses.join(","));
    if (sort && sort !== "priority") qs.set("sort", sort);

    const str = qs.toString();
    router.push(`/jobs${str ? `?${str}` : ""}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
      <input
        name="q"
        defaultValue={initialQuery}
        placeholder="Search title, client…"
        className="h-9 w-64 rounded border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
      />
      <MultiSelect
        options={STATUS_OPTIONS}
        selected={selectedStatuses}
        onChange={setSelectedStatuses}
        allLabel="Open & On Hold"
      />
      <select
        name="sort"
        defaultValue={initialSort}
        className="h-9 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
      >
        <option value="priority">Priority order</option>
        <option value="date">Date: Newest first</option>
        <option value="date_asc">Date: Oldest first</option>
        <option value="title">Title: A → Z</option>
        <option value="title_desc">Title: Z → A</option>
      </select>
      <button
        type="submit"
        className="h-9 px-4 text-sm font-medium bg-slate-800 text-white rounded hover:bg-slate-700"
      >
        Search
      </button>
      <a
        href="/jobs"
        className="h-9 px-3 flex items-center text-sm text-slate-500 hover:text-slate-800"
      >
        Clear
      </a>
    </form>
  );
}
