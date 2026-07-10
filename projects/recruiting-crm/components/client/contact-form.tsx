"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  clientId: string;
}

export function ContactForm({ clientId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name") as string,
      title: (fd.get("title") as string) || null,
      email: (fd.get("email") as string) || null,
      phone: (fd.get("phone") as string) || null,
      isPrimary: fd.get("isPrimary") === "on",
      notes: (fd.get("notes") as string) || null,
    };

    const res = await fetch(`/api/clients/${clientId}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      setError("Failed to save contact.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        + Add contact
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded border border-slate-200 bg-slate-50 p-4 space-y-3 mt-3">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">New contact</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            required
            className="w-full h-8 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
          <input
            name="title"
            className="w-full h-8 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            placeholder="HR Manager"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
          <input
            name="email"
            type="email"
            className="w-full h-8 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            placeholder="jane@firm.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
          <input
            name="phone"
            className="w-full h-8 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
            placeholder="(312) 555-0100"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
        <input type="checkbox" name="isPrimary" className="rounded" />
        Primary contact
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="h-8 px-4 text-xs font-medium bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add contact"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-8 px-3 text-xs text-slate-500 border border-slate-300 rounded hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
