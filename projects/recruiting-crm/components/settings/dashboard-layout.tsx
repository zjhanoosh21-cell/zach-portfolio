"use client";

import { useState, useTransition } from "react";
import type { DashboardSection } from "@/app/api/preferences/dashboard/route";

const SECTION_LABELS: Record<DashboardSection["id"], string> = {
  priority_calls: "Priority Calls",
  needs_your_attention: "Needs Your Attention",
  new_candidates: "New Candidates",
};

const SECTION_DESCRIPTIONS: Record<DashboardSection["id"], string> = {
  priority_calls: "Candidates flagged for a callback",
  needs_your_attention: "Unreviewed Tier 1 & 2 candidates",
  new_candidates: "Recently submitted candidates",
};

export function DashboardLayout({ initialSections }: { initialSections: DashboardSection[] }) {
  const [sections, setSections] = useState<DashboardSection[]>(initialSections);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const toggleVisible = (id: DashboardSection["id"]) => {
    setSaved(false);
    setDirty(true);
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s))
    );
  };

  const move = (index: number, dir: -1 | 1) => {
    setSaved(false);
    setDirty(true);
    const next = [...sections];
    const swapIndex = index + dir;
    if (swapIndex < 0 || swapIndex >= next.length) return;
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    setSections(next);
  };

  const handleSave = () => {
    startTransition(async () => {
      await fetch("/api/preferences/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections }),
      });
      setDirty(false);
      setSaved(true);
    });
  };

  return (
    <div className="space-y-3">
      <div className="rounded border border-slate-200 bg-white divide-y divide-slate-100">
        {sections.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3">
            {/* Up / Down */}
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="p-0.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                aria-label="Move up"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === sections.length - 1}
                className="p-0.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                aria-label="Move down"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${s.visible ? "text-slate-900" : "text-slate-400"}`}>
                {SECTION_LABELS[s.id]}
              </p>
              <p className="text-xs text-slate-400 truncate">{SECTION_DESCRIPTIONS[s.id]}</p>
            </div>

            {/* Visibility toggle */}
            <button
              role="switch"
              aria-checked={s.visible}
              onClick={() => toggleVisible(s.id)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                s.visible ? "bg-[var(--accent,#1a6bbf)]" : "bg-slate-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  s.visible ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending || !dirty}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all ${
            dirty && !isPending
              ? "bg-slate-900 text-white hover:bg-slate-700 cursor-pointer"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          {isPending ? "Saving…" : "Save layout"}
        </button>
        {saved && (
          <span className="text-sm text-emerald-600 font-medium">Saved!</span>
        )}
      </div>
    </div>
  );
}
