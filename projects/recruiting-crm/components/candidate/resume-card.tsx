"use client";

import { useState, useEffect } from "react";

const ZOOM_KEY = "resume-card-zoom";
const ZOOM_LEVELS = [0.75, 1.0, 1.25, 1.5] as const;
type ZoomLevel = (typeof ZOOM_LEVELS)[number];
const ZOOM_LABELS: Record<ZoomLevel, string> = { 0.75: "75%", 1.0: "100%", 1.25: "125%", 1.5: "150%" };

// Container always renders at this height regardless of zoom
const CONTAINER_H = 1056;

interface Props {
  candidateId: string;
  resumeFileName: string | null;
  resumeMimeType: string | null;
  candidateName: string;
}

export function ResumeCard({ candidateId, resumeFileName, resumeMimeType, candidateName }: Props) {
  const [zoom, setZoom] = useState<ZoomLevel>(1.0);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(resumeFileName ?? "");
  const [currentFileName, setCurrentFileName] = useState(resumeFileName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(ZOOM_KEY);
    const parsed = parseFloat(saved ?? "");
    if (ZOOM_LEVELS.includes(parsed as ZoomLevel)) setZoom(parsed as ZoomLevel);
  }, []);

  function handleZoom(z: ZoomLevel) {
    setZoom(z);
    localStorage.setItem(ZOOM_KEY, String(z));
  }

  async function saveName() {
    const trimmed = nameValue.trim();
    if (!trimmed) { setNameError("Name cannot be empty"); return; }
    setSavingName(true);
    setNameError("");
    const res = await fetch(`/api/candidates/${candidateId}/resume`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: trimmed }),
    });
    setSavingName(false);
    if (res.ok) {
      setCurrentFileName(trimmed);
      setEditingName(false);
    } else {
      const d = await res.json().catch(() => ({}));
      setNameError(d.error ?? "Failed to save");
    }
  }

  const isPdf = resumeMimeType === "application/pdf";

  return (
    <div className="rounded border border-slate-200 bg-white p-3 space-y-2">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        {/* Filename + rename */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide shrink-0">Resume</p>
          {editingName ? (
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <input
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                className="flex-1 min-w-0 text-xs border border-slate-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
              <button
                onClick={saveName}
                disabled={savingName}
                className="text-xs text-emerald-600 hover:text-emerald-800 font-medium shrink-0 disabled:opacity-50"
              >
                {savingName ? "…" : "Save"}
              </button>
              <button
                onClick={() => { setEditingName(false); setNameValue(currentFileName); setNameError(""); }}
                className="text-xs text-slate-400 hover:text-slate-600 shrink-0"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setNameValue(currentFileName); setEditingName(true); }}
              className="flex items-center gap-1 min-w-0 group"
              title="Click to rename"
            >
              <span className="text-xs text-slate-600 truncate max-w-[240px]">{currentFileName}</span>
              <span className="text-slate-300 group-hover:text-slate-500 text-[10px] shrink-0">✎</span>
            </button>
          )}
          {nameError && <p className="text-[10px] text-red-500 shrink-0">{nameError}</p>}
        </div>

        {/* Action links */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <a
            href={`mailto:?subject=${encodeURIComponent(`Resume – ${candidateName}`)}&body=${encodeURIComponent(`Please find attached the resume for ${candidateName}.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            Email ✉
          </a>
          <a
            href={`/api/candidates/${candidateId}/resume?download=1`}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            Download ↓
          </a>
          <a
            href={`/api/candidates/${candidateId}/resume`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            Open ↗
          </a>
        </div>
      </div>

      {/* Zoom controls (PDF only) */}
      {isPdf && (
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400 mr-1">Zoom</span>
          {ZOOM_LEVELS.map((z) => (
            <button
              key={z}
              onClick={() => handleZoom(z)}
              className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                zoom === z
                  ? "bg-slate-700 text-white border-slate-700"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
              }`}
            >
              {ZOOM_LABELS[z]}
            </button>
          ))}
        </div>
      )}

      {/* Preview */}
      {isPdf ? (
        <div style={{ height: `${CONTAINER_H}px`, overflow: "hidden" }}>
          {/* Scale a wrapper div so the iframe fills the container at every zoom level */}
          <div
            style={{
              width: `${(1 / zoom) * 100}%`,
              height: `${CONTAINER_H / zoom}px`,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
            <iframe
              src={`/api/candidates/${candidateId}/resume#toolbar=0&navpanes=0`}
              style={{ width: "100%", height: "100%", display: "block", border: "none" }}
              title={`Resume for ${candidateName}`}
            />
          </div>
        </div>
      ) : (
        <div className="rounded border border-slate-200 bg-slate-50 p-6 text-center space-y-2">
          <p className="text-sm text-slate-600">In-browser preview not supported for this file type.</p>
          <a
            href={`/api/candidates/${candidateId}/resume`}
            className="inline-block text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Download to view
          </a>
        </div>
      )}
    </div>
  );
}
