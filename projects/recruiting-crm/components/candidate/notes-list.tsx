"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NoteType } from "@prisma/client";
import Link from "next/link";

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  GENERAL: "General",
  PHONE_SCREEN: "Phone Screen",
  INTERVIEW_NOTES: "Interview Notes",
  REFERENCE_CHECK: "Reference Check",
  CLIENT_FEEDBACK: "Client Feedback",
  INTERNAL: "Internal",
  SYSTEM: "System",
};

const NOTE_TYPES: { value: NoteType; label: string }[] = [
  { value: "GENERAL", label: "General" },
  { value: "PHONE_SCREEN", label: "Phone Screen" },
  { value: "INTERVIEW_NOTES", label: "Interview Notes" },
  { value: "REFERENCE_CHECK", label: "Reference Check" },
  { value: "CLIENT_FEEDBACK", label: "Client Feedback" },
  { value: "INTERNAL", label: "Internal" },
];

export type NoteItem = {
  id: string;
  type: NoteType;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorName: string | null;
  submissionJobId: string | null;
  submissionJobTitle: string | null;
};

interface Props {
  candidateId: string;
  notes: NoteItem[];
  limit?: number;
}

export function NotesList({ candidateId, notes, limit }: Props) {
  const [newestFirst, setNewestFirst] = useState(true);

  if (notes.length === 0) {
    return <p className="text-sm text-slate-400 italic">No notes yet.</p>;
  }

  const sorted = [...notes].sort((a, b) => {
    const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return newestFirst ? diff : -diff;
  });
  const visible = limit ? sorted.slice(0, limit) : sorted;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => setNewestFirst((p) => !p)}
          className="text-xs text-slate-400 hover:text-slate-700 transition-colors"
        >
          {newestFirst ? "Newest first ↓" : "Oldest first ↑"}
        </button>
      </div>
      {visible.map((note) => (
        <NoteRow key={note.id} candidateId={candidateId} note={note} />
      ))}
      {limit && notes.length > limit && (
        <p className="text-xs text-slate-400">+{notes.length - limit} more in Notes tab</p>
      )}
    </div>
  );
}

function NoteRow({ candidateId, note }: { candidateId: string; note: NoteItem }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const [type, setType] = useState<NoteType>(note.type);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Don't allow editing system-generated notes
  const isSystem = note.type === "SYSTEM";

  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/candidates/${candidateId}/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, type }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Failed to save");
    } else {
      setEditing(false);
      router.refresh();
    }
  }

  function handleCancel() {
    setContent(note.content);
    setType(note.type);
    setEditing(false);
    setError("");
  }

  const date = new Date(note.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Show "edited" if updatedAt is meaningfully later than createdAt (>5s)
  const wasEdited =
    new Date(note.updatedAt).getTime() - new Date(note.createdAt).getTime() > 5000;

  return (
    <div className="p-3 rounded border border-slate-200 bg-slate-50">
      {editing ? (
        <div className="space-y-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as NoteType)}
            className="w-full h-8 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {NOTE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className="h-7 px-3 text-xs font-medium bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={handleCancel}
              className="h-7 px-3 text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-700">
              {NOTE_TYPE_LABELS[note.type]}
              {note.submissionJobId && note.submissionJobTitle && (
                <Link
                  href={`/jobs/${note.submissionJobId}`}
                  className="text-slate-400 font-normal hover:text-[#1a6bbf] ml-1"
                >
                  · {note.submissionJobTitle}
                </Link>
              )}
              <span className="text-slate-400 font-normal">
                {" "}· {note.authorName ?? "System"}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{date}</span>
              {wasEdited && (
                <span className="text-[10px] text-slate-400 italic">edited</span>
              )}
              {!isSystem && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-slate-400 hover:text-slate-700 underline underline-offset-2"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
        </>
      )}
    </div>
  );
}
