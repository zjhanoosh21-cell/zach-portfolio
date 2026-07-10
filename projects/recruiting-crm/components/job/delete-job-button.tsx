"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  jobId: string;
  hasDeletionPin: boolean;
}

export function DeleteJobButton({ jobId, hasDeletionPin }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<"idle" | "confirm" | "pin">("idle");
  const [pin, setPin] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function handleDelete(e: React.MouseEvent) {
    stop(e);
    if (pin.length !== 4) return;
    setDeleting(true);
    setError("");

    const res = await fetch(`/api/jobs/${jobId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });

    setDeleting(false);
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Deletion failed.");
      setPin("");
    }
  }

  if (!hasDeletionPin) {
    return (
      <p className="text-xs text-slate-400">
        Deletion PIN not configured.{" "}
        <a href="/settings" className="text-blue-600 hover:underline">Set one in Settings.</a>
      </p>
    );
  }

  if (stage === "idle") {
    return (
      <button
        onClick={(e) => { stop(e); setStage("confirm"); }}
        className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded px-2 py-1 hover:bg-red-50 transition-colors"
      >
        Delete
      </button>
    );
  }

  if (stage === "confirm") {
    return (
      <div className="flex items-center gap-2" onClick={stop}>
        <span className="text-xs text-slate-600">Delete this job order?</span>
        <button
          onClick={(e) => { stop(e); setStage("pin"); }}
          className="text-xs font-medium text-white bg-red-600 px-2 py-1 rounded hover:bg-red-700"
        >
          Yes, continue
        </button>
        <button
          onClick={(e) => { stop(e); setStage("idle"); }}
          className="text-xs text-slate-400 hover:text-slate-700 px-1"
        >
          Cancel
        </button>
      </div>
    );
  }

  // PIN stage
  return (
    <div className="flex items-center gap-2" onClick={stop}>
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={pin}
        onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
        onKeyDown={(e) => e.key === "Enter" && pin.length === 4 && handleDelete(e as unknown as React.MouseEvent)}
        autoFocus
        placeholder="PIN"
        className="w-20 h-7 rounded border border-slate-300 px-2 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-red-400"
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        onClick={handleDelete}
        disabled={pin.length !== 4 || deleting}
        className="text-xs font-medium text-white bg-red-600 px-2 py-1 rounded hover:bg-red-700 disabled:opacity-50"
      >
        {deleting ? "…" : "Delete"}
      </button>
      <button
        onClick={(e) => { stop(e); setStage("idle"); setPin(""); setError(""); }}
        className="text-xs text-slate-400 hover:text-slate-700 px-1"
      >
        Cancel
      </button>
    </div>
  );
}
