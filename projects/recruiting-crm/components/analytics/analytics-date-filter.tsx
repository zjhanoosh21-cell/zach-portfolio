"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const RANGES = [
  { value: "ytd", label: "This Year (YTD)" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "12m", label: "Last 12 Months" },
  { value: "all", label: "All Time" },
];

export function AnalyticsDateFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const range = searchParams.get("range") ?? "ytd";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ytd") {
      params.delete("range");
    } else {
      params.set("range", value);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <select
      value={range}
      onChange={(e) => handleChange(e.target.value)}
      className="h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1a6bbf]"
    >
      {RANGES.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  );
}
