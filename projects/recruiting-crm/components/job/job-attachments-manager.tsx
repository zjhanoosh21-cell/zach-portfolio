"use client";

import { useRef, useState } from "react";

interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
}

interface Props {
  jobId: string;
  initialAttachments: Attachment[];
}

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/jpeg",
  "image/png",
];

function getFileIcon(mimeType: string) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("word")) return "DOC";
  if (mimeType.startsWith("image/")) return "IMG";
  return "FILE";
}

export function JobAttachmentsManager({ jobId, initialAttachments }: Props) {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      setUploadError("Only PDF, DOCX, DOC, JPG, PNG files allowed.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError("File must be under 15MB.");
      return;
    }

    setUploadError("");
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`/api/jobs/${jobId}/attachments`, { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setUploadError(data.error ?? "Upload failed.");
      } else {
        const att = await res.json();
        setAttachments((prev) => [att, ...prev]);
      }
    } catch {
      setUploadError("Upload failed. Try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(att: Attachment) {
    if (!confirm(`Delete "${att.fileName}"?`)) return;
    setDeleting(att.id);
    try {
      const res = await fetch(`/api/jobs/${jobId}/attachments/${att.id}`, { method: "DELETE" });
      if (res.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== att.id));
      }
    } catch {}
    setDeleting(null);
  }

  return (
    <div className="space-y-3">
      {/* Upload */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="h-8 px-3 text-xs font-medium border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          {uploading ? "Uploading…" : "Upload File"}
        </button>
        <span className="text-[11px] text-slate-400">PDF, DOCX, DOC, JPG, PNG · max 15MB</span>
      </div>
      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

      {/* File list */}
      {attachments.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No attachments yet.</p>
      ) : (
        <div className="space-y-1.5">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2.5 rounded border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 uppercase tracking-wide">
                {getFileIcon(att.mimeType)}
              </span>
              <a
                href={`/api/jobs/${jobId}/attachments/${att.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 min-w-0 text-sm font-medium text-[#1a6bbf] hover:underline truncate"
              >
                {att.fileName}
              </a>
              <span className="text-[11px] text-slate-400 shrink-0">
                {new Date(att.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <button
                onClick={() => handleDelete(att)}
                disabled={deleting === att.id}
                className="shrink-0 text-slate-400 hover:text-red-500 disabled:opacity-40 transition-colors text-xs"
                aria-label="Delete"
              >
                {deleting === att.id ? "…" : "✕"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
