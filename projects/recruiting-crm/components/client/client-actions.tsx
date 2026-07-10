"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  clientId: string;
  isActive: boolean;
  isAdminOrManager: boolean;
  hasDeletionPin: boolean;
}

export function ClientActions({ clientId, isActive, isAdminOrManager, hasDeletionPin }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"idle" | "confirm" | "pin">("idle");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  async function toggleActive() {
    setLoading(true);
    await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setLoading(false);
    router.refresh();
  }

  async function handleDelete() {
    if (pin.length !== 4) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/clients/${clientId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/clients");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Deletion failed.");
      setPin("");
    }
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={toggleActive}
        disabled={loading}
        className={`h-8 px-3 text-sm border rounded flex items-center disabled:opacity-50 ${
          isActive
            ? "border-amber-300 text-amber-700 hover:bg-amber-50"
            : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
        }`}
      >
        {loading ? "…" : isActive ? "Mark Inactive" : "Mark Active"}
      </button>

      {isAdminOrManager && !hasDeletionPin && (
        <p className="text-xs text-slate-400">
          Deletion PIN not configured.{" "}
          <a href="/settings" className="text-blue-600 hover:underline">Set one in Settings.</a>
        </p>
      )}

      {isAdminOrManager && hasDeletionPin && stage === "idle" && (
        <button
          onClick={() => setStage("confirm")}
          className="h-8 px-3 text-sm border border-red-200 text-red-600 rounded hover:bg-red-50 flex items-center"
        >
          Delete client
        </button>
      )}

      {isAdminOrManager && hasDeletionPin && stage === "confirm" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Delete this client?</span>
          <button
            onClick={() => setStage("pin")}
            className="h-8 px-3 text-sm text-white bg-red-600 rounded hover:bg-red-700"
          >
            Yes, continue
          </button>
          <button
            onClick={() => setStage("idle")}
            className="h-8 px-2 text-sm text-slate-400 hover:text-slate-700"
          >
            Cancel
          </button>
        </div>
      )}

      {isAdminOrManager && hasDeletionPin && stage === "pin" && (
        <div className="flex items-center gap-2">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && pin.length === 4 && handleDelete()}
            autoFocus
            placeholder="PIN"
            className="w-20 h-7 rounded border border-slate-300 px-2 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          {error && <span className="text-xs text-red-600">{error}</span>}
          <button
            onClick={handleDelete}
            disabled={pin.length !== 4 || loading}
            className="h-8 px-3 text-sm text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "…" : "Delete"}
          </button>
          <button
            onClick={() => { setStage("idle"); setPin(""); setError(""); }}
            className="h-8 px-2 text-sm text-slate-400 hover:text-slate-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
