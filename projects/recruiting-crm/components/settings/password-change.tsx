"use client";

import { useState } from "react";

export function PasswordChange() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newPassword = fd.get("newPassword") as string;
    const confirmPassword = fd.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "change_password",
        currentPassword: fd.get("currentPassword") as string,
        newPassword,
      }),
    });

    setSaving(false);
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      setMessage({ type: "success", text: "Password updated successfully." });
      (e.target as HTMLFormElement).reset();
    } else {
      setMessage({ type: "error", text: data.error ?? "Failed to update password." });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Current password</label>
        <input
          name="currentPassword"
          type="password"
          required
          className="w-full h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
        <input
          name="newPassword"
          type="password"
          required
          minLength={8}
          className="w-full h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Confirm new password</label>
        <input
          name="confirmPassword"
          type="password"
          required
          className="w-full h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
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
        {saving ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
