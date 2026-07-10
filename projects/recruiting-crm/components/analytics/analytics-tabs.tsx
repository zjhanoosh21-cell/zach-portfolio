"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const allTabs = [
  { href: "/analytics", label: "Overview", elevated: false },
  { href: "/analytics/pipeline", label: "Pipeline", elevated: false },
  { href: "/analytics/candidates", label: "Candidates", elevated: false },
  { href: "/analytics/revenue", label: "Revenue", elevated: true },
];

export function AnalyticsTabs({ isElevated }: { isElevated: boolean }) {
  const tabs = allTabs.filter((t) => !t.elevated || isElevated);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const range = searchParams.get("range");

  function tabHref(href: string) {
    return range ? `${href}?range=${range}` : href;
  }

  return (
    <div className="flex gap-0 border-b border-slate-200">
      {tabs.map((tab) => {
        const active =
          tab.href === "/analytics"
            ? pathname === "/analytics"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tabHref(tab.href)}
            className={cn(
              "px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              active
                ? "border-[#1a6bbf] text-[#1a6bbf]"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
