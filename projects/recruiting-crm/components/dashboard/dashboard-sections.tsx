"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";
import {
  TIER_CLASSES,
  TRIAGE_LABEL,
  effectiveScore,
  effectiveTier,
  showPriorityCall,
} from "@/lib/candidate-display";
import { PriorityCardActions } from "@/components/dashboard/priority-card-actions";
import type { DashboardSection } from "@/app/api/preferences/dashboard/route";

// ─── Types ────────────────────────────────────────────────

type CandidateSummary = {
  id: string;
  displayName: string | null;
  firstName?: string | null;
  lastName?: string | null;
  appliedRole: string | null;
  aiCompositeScore: number | null;
  manualScore: number | null;
  useManualScore: boolean;
  aiTier: string | null;
  aiTriageAction: string | null;
  priorityCall?: boolean;
  candidateLocation: string | null;
  createdAt: Date;
};

type WindowOption = { value: string; label: string };

type Props = {
  priorityCallCandidates: CandidateSummary[];
  priorityCandidates: CandidateSummary[];
  recentCandidates: CandidateSummary[];
  activeWindow: string;
  windowLabel: string;
  windowOptions: WindowOption[];
  initialSections: DashboardSection[];
};

// ─── Collapse toggle wrapper ──────────────────────────────

function CollapsibleSection({
  title,
  subtitle,
  dotColor,
  headerRight,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  dotColor?: string;
  headerRight?: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 group text-left"
          aria-expanded={!collapsed}
        >
          {dotColor && (
            <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} />
          )}
          <h2 className="font-medium text-slate-900 flex items-center gap-1.5">
            {title}
            {subtitle && (
              <span className="text-xs font-normal text-slate-500">{subtitle}</span>
            )}
          </h2>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              collapsed ? "-rotate-90" : "rotate-0"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {headerRight && !collapsed && (
          <div>{headerRight}</div>
        )}
      </div>

      {/* Smooth slide via CSS grid trick */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: collapsed ? "0fr" : "1fr" }}
      >
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────

export function DashboardSections({
  priorityCallCandidates,
  priorityCandidates,
  recentCandidates,
  activeWindow,
  windowLabel,
  windowOptions,
  initialSections,
}: Props) {
  const [sections, setSections] = useState<DashboardSection[]>(initialSections);

  const persistSections = useCallback(async (updated: DashboardSection[]) => {
    await fetch("/api/preferences/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections: updated }),
    });
  }, []);

  const toggleCollapse = (id: DashboardSection["id"]) => {
    const updated = sections.map((s) =>
      s.id === id ? { ...s, collapsed: !s.collapsed } : s
    );
    setSections(updated);
    persistSections(updated);
  };

  const renderSection = (s: DashboardSection) => {
    if (!s.visible) return null;

    if (s.id === "priority_calls") {
      if (priorityCallCandidates.length === 0) return null;
      return (
        <CollapsibleSection
          key="priority_calls"
          title="Priority Calls"
          subtitle="— call these candidates"
          dotColor="bg-emerald-500"
          collapsed={s.collapsed}
          onToggle={() => toggleCollapse("priority_calls")}
          headerRight={
            <Link href="/candidates?filter=priority" className="text-sm text-blue-600 hover:underline">
              See all →
            </Link>
          }
        >
          <div className="space-y-1.5 pt-1">
            {priorityCallCandidates.map((c) => {
              const name = c.displayName || "Unknown Candidate";
              const score = effectiveScore(c.aiCompositeScore, c.manualScore, c.useManualScore);
              const tier = effectiveTier(c.aiTier, c.aiCompositeScore, c.manualScore, c.useManualScore);
              const isManual = c.priorityCall;
              return (
                <Link
                  key={c.id}
                  href={`/candidates/${c.id}?from=dashboard&ctx=priority-call`}
                  className="flex items-center gap-3 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 hover:border-emerald-300 hover:shadow-sm transition-all"
                >
                  {score != null ? (
                    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                      tier === "TIER_1" ? "border-emerald-400 bg-emerald-100 text-emerald-800"
                      : tier === "TIER_2" ? "border-blue-400 bg-blue-50 text-blue-800"
                      : tier === "TIER_3" ? "border-amber-400 bg-amber-50 text-amber-800"
                      : "border-slate-200 bg-white text-slate-800"
                    }`}>
                      {score}
                    </div>
                  ) : (
                    <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-sm">📞</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
                    <p className="text-xs text-slate-600 truncate">
                      {[c.appliedRole, c.candidateLocation].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`text-xs font-semibold ${isManual ? "text-emerald-700" : "text-blue-600"}`}>
                      {isManual ? "📞 Priority" : "AI Priority"}
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">{timeAgo(c.createdAt)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </CollapsibleSection>
      );
    }

    if (s.id === "needs_your_attention") {
      if (priorityCandidates.length === 0) return null;
      return (
        <CollapsibleSection
          key="needs_your_attention"
          title="Needs your attention"
          subtitle="— unreviewed Tier 1 & 2"
          dotColor="bg-amber-400"
          collapsed={s.collapsed}
          onToggle={() => toggleCollapse("needs_your_attention")}
          headerRight={
            <Link href="/candidates?filter=needs-attention" className="text-sm text-blue-600 hover:underline">
              See all →
            </Link>
          }
        >
          <div className="space-y-2 pt-1">
            {priorityCandidates.map((c) => (
              <PriorityCard key={c.id} candidate={c} />
            ))}
          </div>
        </CollapsibleSection>
      );
    }

    if (s.id === "new_candidates") {
      return (
        <CollapsibleSection
          key="new_candidates"
          title="New candidates"
          subtitle={`— last ${windowLabel}${recentCandidates.length > 0 ? ` (${recentCandidates.length})` : ""}`}
          collapsed={s.collapsed}
          onToggle={() => toggleCollapse("new_candidates")}
          headerRight={
            <div className="flex items-center gap-1">
              {windowOptions.map((opt) => (
                <Link
                  key={opt.value}
                  href={`/dashboard?window=${opt.value}`}
                  className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
                    activeWindow === opt.value
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          }
        >
          <div className="pt-1">
            {recentCandidates.length === 0 ? (
              <div className="rounded border border-dashed border-slate-300 p-8 text-center">
                <p className="text-sm text-slate-500">No new candidates in the last {windowLabel}.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Try a wider window, or candidates will appear here automatically when n8n processes applications.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentCandidates.map((c) => {
                  const name =
                    c.displayName ||
                    [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                    "Unknown Candidate";
                  const score = effectiveScore(c.aiCompositeScore, c.manualScore, c.useManualScore);
                  const tier = effectiveTier(c.aiTier, c.aiCompositeScore, c.manualScore, c.useManualScore);
                  return (
                    <Link
                      key={c.id}
                      href={`/candidates/${c.id}?from=dashboard&ctx=recent&window=${activeWindow}`}
                      className="flex items-center gap-3 rounded border border-slate-200 bg-white px-4 py-3 hover:border-slate-300 hover:shadow-sm transition-all"
                    >
                      {score != null ? (
                        <div
                          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                            tier === "TIER_1"
                              ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                              : tier === "TIER_2"
                              ? "border-blue-400 bg-blue-50 text-blue-800"
                              : tier === "TIER_3"
                              ? "border-amber-400 bg-amber-50 text-amber-800"
                              : tier === "TIER_4"
                              ? "border-red-300 bg-red-50 text-red-700"
                              : "border-slate-200 bg-white text-slate-800"
                          }`}
                        >
                          {score}
                        </div>
                      ) : (
                        <div className="shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                          —
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {[c.appliedRole, c.candidateLocation].filter(Boolean).join(" · ")}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {showPriorityCall(c.priorityCall ?? false, c.aiTriageAction, score) && (
                          <span className="text-xs font-semibold text-emerald-700">📞</span>
                        )}
                        {c.aiTier && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                              TIER_CLASSES[c.aiTier] ?? "bg-slate-100 text-slate-700"
                            }`}
                          >
                            T{c.aiTier.split("_")[1]}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">{timeAgo(c.createdAt)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </CollapsibleSection>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {sections.map((s) => renderSection(s))}
    </div>
  );
}

// ─── PriorityCard (local) ─────────────────────────────────

function PriorityCard({ candidate: c }: { candidate: CandidateSummary }) {
  const name = c.displayName || "Unknown Candidate";
  const score = effectiveScore(c.aiCompositeScore, c.manualScore, c.useManualScore);
  const tier = effectiveTier(c.aiTier, c.aiCompositeScore, c.manualScore, c.useManualScore);
  return (
    <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 hover:border-amber-300 hover:shadow-sm transition-all">
      <Link href={`/candidates/${c.id}?from=dashboard&ctx=priority`} className="flex items-center gap-3">
        {score != null && (
          <div
            className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              tier === "TIER_1"
                ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                : tier === "TIER_2"
                ? "border-blue-400 bg-blue-50 text-blue-800"
                : tier === "TIER_3"
                ? "border-amber-400 bg-amber-50 text-amber-800"
                : tier === "TIER_4"
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-slate-200 bg-white text-slate-800"
            }`}
          >
            {score}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
          <p className="text-xs text-slate-600 truncate">
            {[c.appliedRole, c.candidateLocation].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {c.aiTriageAction && (
            <p className="text-xs font-medium text-amber-700">
              {TRIAGE_LABEL[c.aiTriageAction] ?? c.aiTriageAction}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-0.5">{timeAgo(c.createdAt)}</p>
        </div>
      </Link>
      <PriorityCardActions candidateId={c.id} />
    </div>
  );
}
