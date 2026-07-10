"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { timeAgo } from "@/lib/utils";

interface ReturningCandidate {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  appliedRole: string | null;
  status: string;
  lastReappliedAt: Date | null;
  pastAppliedRoles: string[];
}

interface Props {
  candidates: ReturningCandidate[];
}

export function ReturningCandidates({ candidates }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());

  const visible = candidates.filter((c) => !dismissed.has(c.id));

  if (visible.length === 0) return null;

  async function handleDismiss(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDismissing((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastReappliedAt: null }),
      });
      setDismissed((prev) => new Set(prev).add(id));
    } finally {
      setDismissing((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="font-medium text-slate-900 flex items-center gap-2">
        🔄 Returning candidates
        <span className="text-xs font-normal text-slate-500">last 7 days</span>
      </h2>
      <div className="rounded border border-violet-200 bg-violet-50/40 divide-y divide-violet-100">
        {visible.map((c) => {
          const name =
            c.displayName ||
            `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() ||
            "Candidate";
          const newestPast = c.pastAppliedRoles[c.pastAppliedRoles.length - 1];
          const isSpinning = dismissing.has(c.id);
          return (
            <div key={c.id} className="relative group">
              <Link
                href={`/candidates/${c.id}?from=dashboard&ctx=returning`}
                className="block px-4 py-3 pr-10 hover:bg-violet-100/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-900 truncate">
                    {name}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-violet-700 font-semibold shrink-0">
                    {c.status === "NEW" ? "Re-opened" : c.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 truncate">
                  {c.appliedRole ?? "—"}
                  {newestPast && newestPast !== c.appliedRole && (
                    <span className="text-slate-400"> · was {newestPast}</span>
                  )}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {c.lastReappliedAt ? timeAgo(c.lastReappliedAt) : ""}
                </p>
              </Link>

              {/* Dismiss button */}
              <button
                onClick={(e) => handleDismiss(c.id, e)}
                disabled={isSpinning}
                title="Dismiss from returning candidates"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-700 hover:bg-violet-200/60 disabled:opacity-40"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
