"use client";

import { useState } from "react";

interface Props {
  hasDeletionPin: boolean;
  isAdmin: boolean;
}

export function PinManager({ hasDeletionPin, isAdmin }: Props) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [hasPin, setHasPin] = useState(hasDeletionPin);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pin = fd.get("pin") as string;
    const confirmPin = fd.get("confirmPin") as string;

    if (pin !== confirmPin) {
      setMessage({ type: "error", text: "PINs do not match." });
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setMessage({ type: "error", text: "PIN must be exactly 4 digits." });
      return;
    }

    setSaving(true);
    setMessage(null);

    const payload: Record<string, string> = { action: "set_deletion_pin", pin };
    const currentPin = fd.get("currentPin") as string;
    if (currentPin) payload.currentPin = currentPin;

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      setMessage({ type: "success", text: "Deletion PIN saved." });
      setHasPin(true);
      (e.target as HTMLFormElement).reset();
    } else {
      setMessage({ type: "error", text: data.error ?? "Failed to save PIN." });
    }
  }

  if (!isAdmin) {
    return (
      <div className="space-y-3">
        <p className="text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded px-3 py-2">
          View only — only System Admins can set or change the Deletion PIN.
        </p>
        <p className="text-sm text-slate-600">
          {hasPin ? "A deletion PIN is currently set." : "No deletion PIN has been set yet."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <p className="text-sm text-slate-600">
        {hasPin
          ? "A deletion PIN is set. Enter the current PIN to change it."
          : "No deletion PIN is set. Any team member can see the delete button but it will be disabled until a PIN is configured."}
      </p>

      {hasPin && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Current PIN</label>
          <input
            name="currentPin"
            type="password"
            inputMode="numeric"
            maxLength={4}
            pattern="\d{4}"
            required={hasPin}
            className="w-32 h-9 rounded border border-slate-300 bg-white px-3 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-400"
            placeholder="••••"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {hasPin ? "New PIN" : "Set PIN"} (4 digits)
        </label>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          maxLength={4}
          pattern="\d{4}"
          required
          className="w-32 h-9 rounded border border-slate-300 bg-white px-3 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-400"
          placeholder="••••"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Confirm PIN</label>
        <input
          name="confirmPin"
          type="password"
          inputMode="numeric"
          maxLength={4}
          pattern="\d{4}"
          required
          className="w-32 h-9 rounded border border-slate-300 bg-white px-3 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-400"
          placeholder="••••"
        />
      </div>

      {message && (
        <p className={`text-sm ${message.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="h-9 px-5 text-sm font-medium bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : hasPin ? "Update PIN" : "Set PIN"}
      </button>
    </form>
  );
}
