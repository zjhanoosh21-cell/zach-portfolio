"use client";

import { useState } from "react";

const TAB_KEYS = ["overview", "profile", "ai", "notes", "jobs"] as const;
type TabKey = typeof TAB_KEYS[number];

const TAB_LABELS: Record<TabKey, string> = {
  overview: "Overview",
  profile: "Profile",
  ai:      "AI Analysis",
  notes:   "Notes",
  jobs:    "Jobs",
};

interface Props {
  overview: React.ReactNode;
  profile: React.ReactNode;
  ai:      React.ReactNode | null;
  notes:   React.ReactNode;
  jobs:    React.ReactNode;
  hasAi:   boolean;
  defaultTab?: TabKey;
}

export function ProfileTabs({ overview, profile, ai, notes, jobs, hasAi, defaultTab = "overview" }: Props) {
  const [active, setActive] = useState<TabKey>(defaultTab);
  const visibleTabs = TAB_KEYS.filter((t) => t !== "ai" || hasAi);

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-slate-200 mb-4">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active === tab
                ? "border-[#1a6bbf] text-[#1a6bbf]"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {active === "overview" && overview}
        {active === "profile" && profile}
        {active === "ai" && hasAi && ai}
        {active === "notes" && notes}
        {active === "jobs" && jobs}
      </div>
    </div>
  );
}
