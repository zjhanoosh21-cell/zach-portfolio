"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  candidateId: string;
  candidateName: string;
  hasDeletionPin: boolean;
}

export function DeleteCandidate({ candidateId, candidateName, hasDeletionPin }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<"idle" | "confirm" | "pin">("idle");
  const [pin, setPin] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (pin.length !== 4) return;
    setDeleting(true);
    setError("");

    const res = await fetch(`/api/candidates/${candidateId}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });

    setDeleting(false);

    if (res.ok) {
      router.push("/candidates");
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
        Deletion PIN not configured. Set one in{" "}
        <a href="/settings" className="text-blue-600 hover:underline">Settings</a>.
      </p>
    );
  }

  if (stage === "idle") {
    return (
      <button
        onClick={() => setStage("confirm")}
        className="w-full h-8 text-xs font-medium text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
      >
        Permanently delete candidate
      </button>
    );
  }

  if (stage === "confirm") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-slate-600">
          This will permanently delete <strong>{candidateName}</strong> and all their data including the resume. This cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setStage("pin")}
            className="flex-1 h-8 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700"
          >
            Yes, delete permanently
          </button>
          <button
            onClick={() => setStage("idle")}
            className="h-8 px-3 text-xs border border-slate-300 rounded hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-600 font-medium">Enter the 4-digit deletion PIN:</p>
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={pin}
        onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
        onKeyDown={(e) => e.key === "Enter" && pin.length === 4 && handleDelete()}
        autoFocus
        className="w-32 h-9 rounded border border-slate-300 bg-white px-3 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-red-400"
        placeholder="••••"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          disabled={pin.length !== 4 || deleting}
          className="flex-1 h-8 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
        <button
          onClick={() => { setStage("idle"); setPin(""); setError(""); }}
          className="h-8 px-3 text-xs border border-slate-300 rounded hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
