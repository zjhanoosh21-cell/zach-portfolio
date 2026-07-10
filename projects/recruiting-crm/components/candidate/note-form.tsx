"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { NoteType } from "@prisma/client";

const TEXTAREA_HEIGHT_KEY = "note-textarea-height";

const NOTE_TYPES: { value: NoteType; label: string }[] = [
  { value: "GENERAL", label: "General" },
  { value: "PHONE_SCREEN", label: "Phone Screen" },
  { value: "INTERVIEW_NOTES", label: "Interview Notes" },
  { value: "REFERENCE_CHECK", label: "Reference Check" },
  { value: "CLIENT_FEEDBACK", label: "Client Feedback" },
  { value: "INTERNAL", label: "Internal" },
];

interface Props {
  candidateId: string;
}

export function NoteForm({ candidateId }: Props) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [type, setType] = useState<NoteType>("GENERAL");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    // Restore saved height
    const saved = localStorage.getItem(TEXTAREA_HEIGHT_KEY);
    if (saved) el.style.height = saved;

    // Persist on every resize (fires immediately as user drags)
    const observer = new ResizeObserver(() => {
      if (el.style.height) localStorage.setItem(TEXTAREA_HEIGHT_KEY, el.style.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSaving(true);
    setError("");

    const res = await fetch(`/api/candidates/${candidateId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, type }),
    });

    setSaving(false);
    if (!res.ok) {
      setError("Failed to save note");
    } else {
      setContent("");
      setType("GENERAL");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as NoteType)}
        className="w-full h-8 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
      >
        {NOTE_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a note…"
        rows={3}
        className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 resize-y"
        required
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving || !content.trim()}
        className="w-full h-8 text-sm font-medium bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Add note"}
      </button>
    </form>
  );
}
