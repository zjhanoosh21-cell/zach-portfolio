"use client";

import { useState } from "react";

type ExportItem = {
  key: string;
  label: string;
  description: string;
  endpoint: string;
};

const EXPORTS: ExportItem[] = [
  {
    key: "candidates",
    label: "Candidates",
    description: "All candidate records — AI scores, contact info, work history, education, skills",
    endpoint: "/api/export/candidates",
  },
  {
    key: "clients",
    label: "Clients",
    description: "All client firms and their contacts",
    endpoint: "/api/export/clients",
  },
  {
    key: "jobs",
    label: "Job Orders",
    description: "All job orders — status, salary ranges, requirements, submission counts",
    endpoint: "/api/export/jobs",
  },
];

export function ExportManager({ hasDeletionPin, isElevated }: { hasDeletionPin: boolean; isElevated: boolean }) {
  const [active, setActive] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const date = new Date().toISOString().slice(0, 10);

  function openPin(key: string) {
    setActive(key);
    setPin("");
    setError("");
  }

  function cancel() {
    setActive(null);
    setPin("");
    setError("");
  }

  async function handleExport() {
    const item = EXPORTS.find((e) => e.key === active);
    if (!item || pin.length !== 4) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(item.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Export failed");
        setLoading(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.key}-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      cancel();
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  if (!isElevated) {
    return (
      <div className="space-y-3">
        <p className="text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded px-3 py-2">
          View only — Manager or System Admin role required to export data.
        </p>
        {EXPORTS.map((item) => (
          <div key={item.key} className="rounded border border-slate-200 bg-slate-50 px-4 py-3 opacity-60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
              </div>
              <button disabled className="shrink-0 ml-4 text-sm px-3 py-1.5 rounded border border-slate-200 text-slate-400 cursor-not-allowed">
                Download CSV
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!hasDeletionPin) {
    return (
      <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded px-4 py-3">
        No admin PIN configured. Set a PIN in the &quot;Candidate Deletion PIN&quot; section above before exports can be used.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {EXPORTS.map((item) => (
        <div
          key={item.key}
          className="rounded border border-slate-200 bg-slate-50 px-4 py-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">{item.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
            </div>
            {active === item.key ? (
              <button
                onClick={cancel}
                className="shrink-0 ml-4 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            ) : (
              <button
                onClick={() => openPin(item.key)}
                className="shrink-0 ml-4 text-sm px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-white hover:border-slate-400 transition-colors"
              >
                Download CSV
              </button>
            )}
          </div>

          {active === item.key && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-600 font-medium mb-2">Enter the 4-digit admin PIN to export:</p>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => {
                    setError("");
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                  }}
                  onKeyDown={(e) => e.key === "Enter" && pin.length === 4 && handleExport()}
                  className="w-24 rounded border border-slate-300 px-3 py-1.5 text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleExport}
                  disabled={pin.length !== 4 || loading}
                  className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Exporting…" : "Export"}
                </button>
              </div>
              {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
