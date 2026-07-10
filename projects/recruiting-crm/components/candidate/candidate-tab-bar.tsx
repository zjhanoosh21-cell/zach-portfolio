"use client";

import { useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";

const TABS = [
  { key: "overview",  label: "Overview" },
  { key: "profile",   label: "Profile" },
  { key: "notes",     label: "Notes" },
  { key: "jobs",      label: "Jobs" },
] as const;

export function CandidateTabBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "overview";

  const buildHref = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="flex items-stretch h-full">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={buildHref(tab.key)}
          className={`px-3 flex items-center text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === tab.key
              ? "border-[#1a6bbf] text-[#1a6bbf]"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
