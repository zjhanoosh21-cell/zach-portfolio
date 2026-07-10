"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const ACCEPTED = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

interface Props {
  candidateId: string;
  hasExisting: boolean; // true = replacing, false = first upload
}

export function ResumeUpload({ candidateId, hasExisting }: Props) {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("resume", file);

    const res = await fetch(`/api/candidates/${candidateId}/resume`, {
      method: "POST",
      body: formData,
    });

    setUploading(false);

    if (res.ok) {
      setShowForm(false);
      setFileName(null);
      router.refresh(); // reload page to show new resume
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Upload failed.");
    }
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
      >
        {hasExisting ? "Replace resume" : "Upload resume"}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className="flex items-center gap-3 rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-3 cursor-pointer hover:border-slate-400 transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        <span className="text-slate-400">📄</span>
        <span className="text-sm text-slate-600">
          {fileName ?? "Click to choose a PDF or DOCX (max 15MB)"}
        </span>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleUpload}
          disabled={!fileName || uploading}
          className="h-8 px-4 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <button
          onClick={() => { setShowForm(false); setFileName(null); setError(""); }}
          className="h-8 px-3 text-xs border border-slate-300 rounded hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
