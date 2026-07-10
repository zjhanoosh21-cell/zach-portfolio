"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TIER_SCORE_COLOR } from "@/lib/candidate-display";

interface Props {
  candidateId: string;
  aiCompositeScore: number | null;
  manualScore: number | null;
  useManualScore: boolean;
  tier: string | null;
  compact?: boolean;
  inline?: boolean; // single-row display: score number + action links, no circle
}

export function ManualScoreEditor({
  candidateId,
  aiCompositeScore,
  manualScore,
  useManualScore,
  tier,
  compact = false,
  inline = false,
}: Props) {
  const router = useRouter();
  const [overriding, setOverriding] = useState(false);
  const [input, setInput] = useState(manualScore?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const hasAiScore = aiCompositeScore != null;
  const displayScore = useManualScore && manualScore != null ? manualScore : aiCompositeScore;
  const scoreColor = tier ? TIER_SCORE_COLOR[tier] : "text-slate-800";

  async function patch(data: Record<string, unknown>) {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/candidates/${candidateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Failed to save");
    } else {
      window.dispatchEvent(new CustomEvent("navigator:refresh"));
      router.refresh();
    }
    return res.ok;
  }

  async function handleSave() {
    const val = parseInt(input, 10);
    if (isNaN(val) || val < 0 || val > 100) {
      setError("Enter 0–100");
      return;
    }
    const ok = await patch({ manualScore: val, useManualScore: true });
    if (ok) setOverriding(false);
  }

  async function handleRevert() {
    const ok = await patch({ useManualScore: false });
    if (ok) setOverriding(false);
  }

  const circleSize = compact ? "w-14 h-14" : "w-16 h-16";
  const scoreFont = compact ? "text-2xl" : "text-2xl";

  // ── Inline mode: single row, no circle ──
  if (inline) {
    if (overriding) {
      return (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={100}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-16 h-6 rounded border border-slate-300 bg-white px-2 text-xs text-center focus:outline-none focus:ring-2 focus:ring-[#1a6bbf]"
            autoFocus
          />
          <button onClick={handleSave} disabled={saving} className="text-[10px] font-medium text-[#1a6bbf] hover:underline disabled:opacity-50">
            {saving ? "…" : "Save"}
          </button>
          <button onClick={() => { setOverriding(false); setError(""); }} className="text-[10px] text-slate-400 hover:text-slate-700">
            Cancel
          </button>
          {error && <span className="text-[10px] text-red-600">{error}</span>}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5">
        {displayScore != null && (
          <span className={`text-xl font-bold leading-none ${scoreColor}`}>{displayScore}</span>
        )}
        {useManualScore && (
          <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-slate-700 text-white leading-none">Manual</span>
        )}
        {!useManualScore && hasAiScore && (
          <span className="text-[10px] text-slate-400">/100</span>
        )}
        {useManualScore ? (
          <>
            {hasAiScore && <span className="text-slate-200 text-[10px]">·</span>}
            {hasAiScore && <span className="text-[10px] text-slate-400">AI: {aiCompositeScore}</span>}
            <span className="text-slate-200 text-[10px]">·</span>
            <button onClick={() => { setInput(manualScore?.toString() ?? ""); setOverriding(true); setError(""); }} className="text-[10px] text-slate-500 hover:text-slate-800 underline underline-offset-2">Edit</button>
            {hasAiScore && (
              <>
                <span className="text-slate-200 text-[10px]">·</span>
                <button onClick={handleRevert} disabled={saving} className="text-[10px] text-slate-500 hover:text-slate-800 underline underline-offset-2 disabled:opacity-50">Use AI</button>
              </>
            )}
          </>
        ) : (
          <>
            <button onClick={() => { setInput(aiCompositeScore?.toString() ?? ""); setOverriding(true); setError(""); }} className="text-[10px] text-slate-500 hover:text-slate-800 underline underline-offset-2">Override</button>
          </>
        )}
        {displayScore == null && !overriding && (
          <button onClick={() => { setInput(""); setOverriding(true); setError(""); }} className="text-[10px] text-slate-500 hover:text-slate-800 underline underline-offset-2">Set score</button>
        )}
      </div>
    );
  }

  // No score at all — show a compact "Set score" prompt
  if (displayScore == null && !overriding) {
    return (
      <div className="shrink-0 flex flex-col items-center gap-1">
        <div className={`${circleSize} rounded-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 bg-white`}>
          <span className="text-[10px] text-slate-400 leading-tight text-center px-1">No score</span>
        </div>
        <button
          onClick={() => { setInput(""); setOverriding(true); setError(""); }}
          className="text-[10px] text-slate-500 hover:text-slate-800 underline underline-offset-2"
        >
          Set score
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0 flex flex-col items-center gap-1">
      {/* Score circle — hidden while the input form is open and there was no previous score */}
      {displayScore != null && (
        <div className="relative">
          <div className={`${circleSize} rounded-full flex flex-col items-center justify-center border-2 border-slate-200 bg-white`}>
            <span className={`${scoreFont} font-bold leading-none ${scoreColor}`}>
              {displayScore}
            </span>
            <span className="text-xs text-slate-400 leading-none mt-0.5">/100</span>
          </div>
          {useManualScore && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-slate-700 text-white leading-none">
              Manual
            </span>
          )}
        </div>
      )}

      {/* Mode indicator + action */}
      {!overriding && (
        <div className="text-center">
          {useManualScore ? (
            <div className="flex flex-col items-center gap-0.5">
              {hasAiScore && (
                <span className="text-[10px] text-slate-400">AI: {aiCompositeScore}</span>
              )}
              <div className="flex gap-1.5 mt-0.5">
                <button
                  onClick={() => { setInput(manualScore?.toString() ?? ""); setOverriding(true); setError(""); }}
                  className="text-[10px] text-slate-500 hover:text-slate-800 underline underline-offset-2"
                >
                  Edit
                </button>
                {hasAiScore && (
                  <>
                    <span className="text-slate-300 text-[10px]">·</span>
                    <button
                      onClick={handleRevert}
                      disabled={saving}
                      className="text-[10px] text-slate-500 hover:text-slate-800 underline underline-offset-2 disabled:opacity-50"
                    >
                      Use AI
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] text-slate-400">AI Score</span>
              <button
                onClick={() => { setInput(aiCompositeScore?.toString() ?? ""); setOverriding(true); setError(""); }}
                className="text-[10px] text-slate-500 hover:text-slate-800 underline underline-offset-2"
              >
                Override
              </button>
            </div>
          )}
        </div>
      )}

      {/* Override form */}
      {overriding && (
        <div className="flex flex-col items-center gap-1 w-20">
          <input
            type="number"
            min={0}
            max={100}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-7 rounded border border-slate-300 bg-white px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1a6bbf]"
            autoFocus
          />
          {error && <p className="text-[10px] text-red-600 text-center">{error}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-6 text-[11px] font-medium bg-[#1a6bbf] text-white rounded hover:bg-[#155a9e] disabled:opacity-50"
          >
            {saving ? "…" : "Save"}
          </button>
          <button
            onClick={() => { setOverriding(false); setError(""); }}
            className="text-[10px] text-slate-500 hover:text-slate-800"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
