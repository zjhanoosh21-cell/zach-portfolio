"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "general", label: "General" },
  { key: "appearance", label: "Appearance" },
  { key: "security", label: "Security" },
  { key: "integrations", label: "Integrations" },
];

export function SettingsTabs({ defaultTab = "general" }: { defaultTab?: string }) {
  const searchParams = useSearchParams();
  const active = searchParams.get("tab") ?? defaultTab;

  return (
    <div className="flex gap-0 border-b border-slate-200">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`/settings?tab=${tab.key}`}
          className={cn(
            "px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
            active === tab.key
              ? "border-[var(--cri-blue)] text-[var(--cri-blue)]"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
