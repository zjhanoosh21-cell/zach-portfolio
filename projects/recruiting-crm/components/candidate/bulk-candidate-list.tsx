"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CandidateStatus, CandidateTier } from "@prisma/client";
import { timeAgo, fileAge } from "@/lib/utils";
import {
  TIER_LABEL_SHORT as TIER_LABEL,
  TIER_CLASSES,
  STATUS_CLASSES,
  effectiveScore,
  effectiveTier,
  showPriorityCall,
} from "@/lib/candidate-display";

const STATUS_OPTIONS: { value: CandidateStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "PLACED", label: "Placed" },
  { value: "REJECTED", label: "Rejected" },
  { value: "DO_NOT_CONSIDER", label: "Do Not Consider" },
];

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export type CandidateSummary = {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  appliedRole: string | null;
  candidateLocation: string | null;
  candidateState: string | null;
  currentTitle: string | null;
  currentEmployer: string | null;
  yearsOfExperience: number | null;
  status: CandidateStatus;
  aiCompositeScore: number | null;
  manualScore: number | null;
  useManualScore: boolean;
  aiTier: CandidateTier | null;
  aiTriageAction: string | null;
  priorityCall: boolean;
  aiSummary: string | null;
  keySkills: string[];
  practiceAreas: string[];
  riskFlags: string[];
  source: string;
  createdAt: Date;
  originalEntryDate: Date | null;
  isDuplicate: boolean;
};

interface Props {
  candidates: CandidateSummary[];
  isAdmin?: boolean;
  aiScoringEnabled?: boolean;
}

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

export function BulkCandidateList({ candidates, isAdmin = false, aiScoringEnabled = true }: Props) {
  const router = useRouter();
  const rawParams = useSearchParams();
  // Build list context: all current params except 'page' — used to preserve filters when navigating to a profile
  const listCtx = useMemo(() => {
    const p = new URLSearchParams(rawParams.toString());
    p.delete("page");
    return p.toString();
  }, [rawParams]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<CandidateStatus>("REVIEWED");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  // Delete flow
  const [showDeletePin, setShowDeletePin] = useState(false);
  const [deletePin, setDeletePin] = useState("");
  const [deleting, setDeleting] = useState(false);
  // Export flow
  const [showExportPin, setShowExportPin] = useState(false);
  const [exportPin, setExportPin] = useState("");
  const [exporting, setExporting] = useState(false);

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === candidates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(candidates.map((c) => c.id)));
    }
  };

  const applyBulk = () => {
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/candidates/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), status: bulkStatus }),
      });
      if (res.ok) {
        setSelected(new Set());
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Bulk update failed.");
      }
    });
  };

  const applyBulkDelete = async () => {
    if (deletePin.length !== 4) return;
    setDeleting(true);
    setError("");
    const res = await fetch("/api/candidates/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), pin: deletePin }),
    });
    setDeleting(false);
    if (res.ok) {
      setSelected(new Set());
      setShowDeletePin(false);
      setDeletePin("");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Delete failed.");
      setDeletePin("");
    }
  };

  const applyExport = async () => {
    if (exportPin.length !== 4) return;
    setExporting(true);
    setError("");
    const res = await fetch("/api/export/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: exportPin, ids: Array.from(selected) }),
    });
    setExporting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Export failed.");
      setExportPin("");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidates-selected-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportPin(false);
    setExportPin("");
  };

  return (
    <div className="relative">
      {/* Select-all row */}
      {candidates.length > 0 && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <input
            type="checkbox"
            checked={selected.size === candidates.length && candidates.length > 0}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-slate-300 accent-slate-800 cursor-pointer"
          />
          <span className="text-xs text-slate-500">
            {selected.size > 0
              ? `${selected.size} of ${candidates.length} selected`
              : `Select all ${candidates.length}`}
          </span>
        </div>
      )}

      {/* Candidate cards */}
      <div className="space-y-2">
        {candidates.map((c) => (
          <div key={c.id} className="flex items-start gap-3">
            {/* Checkbox */}
            <div className="pt-4 pl-1">
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => toggleOne(c.id)}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 rounded border-slate-300 accent-slate-800 cursor-pointer"
              />
            </div>
            {/* Card */}
            <div className="flex-1">
              <CandidateCard candidate={c} listCtx={listCtx} aiScoringEnabled={aiScoringEnabled} />
            </div>
          </div>
        ))}
      </div>

      {/* Floating bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded border border-slate-200 bg-white shadow-xl px-5 py-3">
          <span className="text-sm font-medium text-slate-700">
            {selected.size} selected
          </span>

          <span className="text-slate-300 text-lg">|</span>

          <label className="text-sm text-slate-600">Move to:</label>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as CandidateStatus)}
            className="h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={applyBulk}
            disabled={isPending}
            className="h-8 px-4 text-sm font-medium bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50"
          >
            {isPending ? "Updating…" : "Apply"}
          </button>

          <span className="text-slate-300 text-lg">|</span>

          {showExportPin ? (
            <div className="flex items-center gap-2">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={exportPin}
                onChange={(e) => { setExportPin(e.target.value.replace(/\D/g, "")); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && exportPin.length === 4 && applyExport()}
                autoFocus
                placeholder="PIN"
                className="w-20 h-8 rounded border border-slate-300 bg-white px-2 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={applyExport}
                disabled={exportPin.length !== 4 || exporting}
                className="h-8 px-3 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {exporting ? "Exporting…" : `Export ${selected.size}`}
              </button>
              <button
                onClick={() => { setShowExportPin(false); setExportPin(""); setError(""); }}
                className="h-8 px-2 text-xs text-slate-500 hover:text-slate-800"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setShowExportPin(true); setShowDeletePin(false); setDeletePin(""); setError(""); }}
              className="h-8 px-3 text-sm font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50 whitespace-nowrap"
            >
              Export CSV
            </button>
          )}

          {isAdmin && (
            <>
              <span className="text-slate-300 text-lg">|</span>

              {showDeletePin ? (
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={deletePin}
                    onChange={(e) => { setDeletePin(e.target.value.replace(/\D/g, "")); setError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && deletePin.length === 4 && applyBulkDelete()}
                    autoFocus
                    placeholder="PIN"
                    className="w-20 h-8 rounded border border-red-300 bg-white px-2 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                  <button
                    onClick={applyBulkDelete}
                    disabled={deletePin.length !== 4 || deleting}
                    className="h-8 px-3 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? "Deleting…" : `Delete ${selected.size}`}
                  </button>
                  <button
                    onClick={() => { setShowDeletePin(false); setDeletePin(""); setError(""); }}
                    className="h-8 px-2 text-xs text-slate-500 hover:text-slate-800"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setShowDeletePin(true); setShowExportPin(false); setExportPin(""); setError(""); }}
                  className="h-8 px-3 text-sm font-medium text-red-600 border border-red-200 rounded hover:bg-red-50"
                >
                  Delete
                </button>
              )}
            </>
          )}

          <button
            onClick={() => { setSelected(new Set()); setShowDeletePin(false); setDeletePin(""); setShowExportPin(false); setExportPin(""); setError(""); }}
            className="h-8 px-3 text-sm text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Candidate card (client-side copy)
// ─────────────────────────────────────────────────────────

function CandidateCard({ candidate: c, listCtx, aiScoringEnabled = true }: { candidate: CandidateSummary; listCtx?: string; aiScoringEnabled?: boolean }) {
  const router = useRouter();
  const [pcHovered, setPcHovered] = useState(false);
  const [clearingPc, setClearingPc] = useState(false);

  const name = c.displayName || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Unknown";
  const score = effectiveScore(c.aiCompositeScore, c.manualScore, c.useManualScore);
  const tier = effectiveTier(c.aiTier, c.aiCompositeScore, c.manualScore, c.useManualScore);
  const isPriorityCall = showPriorityCall(c.priorityCall, c.aiTriageAction, score);

  async function clearPriorityCall(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setClearingPc(true);
    await fetch(`/api/candidates/${c.id}/triage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priorityCall: false, clearTriageAction: true }),
    });
    setClearingPc(false);
    setPcHovered(false);
    router.refresh();
  }

  return (
    <Link
      href={`/candidates/${c.id}?from=list${listCtx ? `&${listCtx}` : ""}`}
      className="block rounded border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-4">
        {/* Score circle */}
        {aiScoringEnabled && score != null && (
          <div
            className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
              tier === "TIER_1"
                ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                : tier === "TIER_2"
                ? "border-blue-400 bg-blue-50 text-blue-800"
                : tier === "TIER_3"
                ? "border-amber-400 bg-amber-50 text-amber-800"
                : tier === "TIER_4"
                ? "border-red-300 bg-red-50 text-red-800"
                : "border-slate-200 bg-white text-slate-800"
            }`}
          >
            {score}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{name}</span>

            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                STATUS_CLASSES[c.status] ?? "bg-slate-100 text-slate-700"
              }`}
            >
              {c.status.replace(/_/g, " ")}
            </span>

            {aiScoringEnabled && tier && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                  TIER_CLASSES[tier] ?? ""
                }`}
              >
                {TIER_LABEL[tier]}
              </span>
            )}

            {isPriorityCall ? (
              <span
                className="relative inline-flex items-center"
                onMouseEnter={() => setPcHovered(true)}
                onMouseLeave={() => setPcHovered(false)}
              >
                <span className={`text-xs font-medium text-emerald-700 transition-all ${
                  pcHovered ? "ring-1 ring-emerald-400 ring-offset-1 rounded px-1 py-0.5" : ""
                }`}>
                  → Priority Call
                </span>
                {pcHovered && !clearingPc && (
                  <button
                    onClick={clearPriorityCall}
                    className="absolute -top-2 -right-2 w-4 h-4 bg-slate-400 hover:bg-red-500 text-white rounded-full text-[8px] flex items-center justify-center z-10 transition-colors leading-none"
                  >
                    ✕
                  </button>
                )}
              </span>
            ) : null}

            {c.isDuplicate && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                ⚠ Duplicate
              </span>
            )}
          </div>

          {/* Role / employer / location */}
          <p className="text-sm text-slate-600 mt-0.5">
            {[c.currentTitle || c.appliedRole, c.currentEmployer, c.candidateLocation]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <div className="shrink-0 text-right text-xs text-slate-400">
          {c.originalEntryDate ? (
            <>
              <p className="font-medium text-slate-500">{fileAge(c.originalEntryDate)} on file</p>
              <p className="mt-0.5">{c.originalEntryDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
            </>
          ) : (
            <>
              <p>{fileAge(c.createdAt)} on file</p>
              <p className="mt-0.5">{c.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            </>
          )}
          <p className="mt-0.5">{c.source}</p>
        </div>
      </div>
    </Link>
  );
}

