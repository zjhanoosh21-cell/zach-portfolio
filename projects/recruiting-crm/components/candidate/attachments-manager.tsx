"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const ZOOM_KEY = "attachments-preview-zoom";
const ZOOM_LEVELS = [0.75, 1.0, 1.25, 1.5] as const;
type ZoomLevel = (typeof ZOOM_LEVELS)[number];
const ZOOM_LABELS: Record<ZoomLevel, string> = { 0.75: "75%", 1.0: "100%", 1.25: "125%", 1.5: "150%" };
const PREVIEW_H = 1056;

interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
}

interface PrimaryResume {
  fileName: string | null;
  mimeType: string | null;
  candidateId: string;
}

interface Props {
  candidateId: string;
  primary: PrimaryResume | null;
  initialAttachments: Attachment[];
}

interface RenameState {
  id: string; // "primary" or attachment id
  value: string;
  saving: boolean;
  error: string;
}

const ACCEPTED = ".pdf,.doc,.docx,image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function fileIcon(mimeType: string) {
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("word") || mimeType.includes("docx")) return "📝";
  if (mimeType.startsWith("image/")) return "🖼️";
  return "📎";
}

export function AttachmentsManager({ candidateId, primary, initialAttachments }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [primaryFileName, setPrimaryFileName] = useState(primary?.fileName ?? "");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rename, setRename] = useState<RenameState | null>(null);

  async function saveRename() {
    if (!rename) return;
    const trimmed = rename.value.trim();
    if (!trimmed) { setRename({ ...rename, error: "Name cannot be empty" }); return; }
    setRename({ ...rename, saving: true, error: "" });

    const url = rename.id === "primary"
      ? `/api/candidates/${candidateId}/resume`
      : `/api/candidates/${candidateId}/attachments/${rename.id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: trimmed }),
    });

    if (res.ok) {
      if (rename.id === "primary") {
        setPrimaryFileName(trimmed);
      } else {
        setAttachments((prev) => prev.map((a) => a.id === rename.id ? { ...a, fileName: trimmed } : a));
      }
      setRename(null);
    } else {
      const d = await res.json().catch(() => ({}));
      setRename({ ...rename, saving: false, error: d.error ?? "Failed to save" });
    }
  }

  const [previewId, setPreviewId] = useState<string | null>(
    primary?.mimeType === "application/pdf" ? "primary"
    : initialAttachments.find((a) => a.mimeType === "application/pdf")?.id ?? null
  );
  const [zoom, setZoom] = useState<ZoomLevel>(1.0);

  useEffect(() => {
    const saved = localStorage.getItem(ZOOM_KEY);
    const parsed = parseFloat(saved ?? "");
    if (ZOOM_LEVELS.includes(parsed as ZoomLevel)) setZoom(parsed as ZoomLevel);
  }, []);

  function handleZoom(z: ZoomLevel) {
    setZoom(z);
    localStorage.setItem(ZOOM_KEY, String(z));
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/candidates/${candidateId}/attachments`, {
      method: "POST",
      body: formData,
    });

    setUploading(false);

    if (res.ok) {
      const newAttachment = await res.json();
      setAttachments((prev) => [newAttachment, ...prev]);
      setShowUploadForm(false);
      setSelectedFile(null);
      if (newAttachment.mimeType === "application/pdf" && !previewId) {
        setPreviewId(newAttachment.id);
      }
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setUploadError(data.error ?? "Upload failed.");
    }
  }

  async function handleDelete(attachmentId: string) {
    setDeletingId(attachmentId);
    const res = await fetch(`/api/candidates/${candidateId}/attachments/${attachmentId}`, {
      method: "DELETE",
    });
    setDeletingId(null);

    if (res.ok) {
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      if (previewId === attachmentId) {
        setPreviewId(null);
      }
    }
  }

  const previewSrc = previewId === "primary"
    ? `/api/candidates/${candidateId}/resume`
    : previewId
    ? `/api/candidates/${candidateId}/attachments/${previewId}`
    : null;

  const hasPrimary = !!primary?.fileName;
  const hasAny = hasPrimary || attachments.length > 0;

  return (
    <div className="space-y-3">
      {/* File list */}
      {hasAny && (
        <div className="space-y-1.5">
          {/* Primary resume row */}
          {hasPrimary && (
            <div className={`flex items-center gap-2 rounded px-3 py-2 border transition-colors ${
              previewId === "primary" ? "border-[#1a6bbf] bg-blue-50" : "border-slate-200 hover:border-slate-300"
            }`}>
              <span
                className="text-sm cursor-pointer"
                onClick={() => primary?.mimeType === "application/pdf" && setPreviewId("primary")}
              >{fileIcon(primary!.mimeType ?? "")}</span>

              {rename?.id === "primary" ? (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <input
                    autoFocus
                    value={rename.value}
                    onChange={(e) => setRename({ ...rename, value: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setRename(null); }}
                    className="flex-1 min-w-0 text-xs border border-slate-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <button onClick={saveRename} disabled={rename.saving} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium shrink-0 disabled:opacity-50">{rename.saving ? "…" : "Save"}</button>
                  <button onClick={() => setRename(null)} className="text-xs text-slate-400 hover:text-slate-600 shrink-0">Cancel</button>
                  {rename.error && <span className="text-[10px] text-red-500 shrink-0">{rename.error}</span>}
                </div>
              ) : (
                <button
                  onClick={() => setRename({ id: "primary", value: primaryFileName, saving: false, error: "" })}
                  className="flex items-center gap-1 flex-1 min-w-0 group text-left"
                  title="Click to rename"
                >
                  <span className="flex-1 text-xs font-medium text-slate-800 truncate">{primaryFileName || primary!.fileName}</span>
                  <span className="text-slate-300 group-hover:text-slate-500 text-[10px] shrink-0">✎</span>
                </button>
              )}

              <span className="text-xs text-slate-400 shrink-0">Primary</span>
              <a href={`/api/candidates/${candidateId}/resume`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-[#1a6bbf] hover:underline shrink-0">Open ↗</a>
              <a href={`/api/candidates/${candidateId}/resume?download=1`} onClick={(e) => e.stopPropagation()} className="text-xs text-slate-500 hover:text-slate-800 shrink-0">↓</a>
            </div>
          )}

          {/* Additional attachments */}
          {attachments.map((att) => (
            <div
              key={att.id}
              className={`flex items-center gap-2 rounded px-3 py-2 border transition-colors ${
                previewId === att.id ? "border-[#1a6bbf] bg-blue-50" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="text-sm cursor-pointer" onClick={() => att.mimeType === "application/pdf" && setPreviewId(att.id)}>{fileIcon(att.mimeType)}</span>

              {rename?.id === att.id ? (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <input
                    autoFocus
                    value={rename.value}
                    onChange={(e) => setRename({ ...rename, value: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setRename(null); }}
                    className="flex-1 min-w-0 text-xs border border-slate-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <button onClick={saveRename} disabled={rename.saving} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium shrink-0 disabled:opacity-50">{rename.saving ? "…" : "Save"}</button>
                  <button onClick={() => setRename(null)} className="text-xs text-slate-400 hover:text-slate-600 shrink-0">Cancel</button>
                  {rename.error && <span className="text-[10px] text-red-500 shrink-0">{rename.error}</span>}
                </div>
              ) : (
                <button
                  onClick={() => setRename({ id: att.id, value: att.fileName, saving: false, error: "" })}
                  className="flex items-center gap-1 flex-1 min-w-0 group text-left"
                  title="Click to rename"
                >
                  <span className="flex-1 text-xs font-medium text-slate-800 truncate">{att.fileName}</span>
                  <span className="text-slate-300 group-hover:text-slate-500 text-[10px] shrink-0">✎</span>
                </button>
              )}

              <a href={`/api/candidates/${candidateId}/attachments/${att.id}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-[#1a6bbf] hover:underline shrink-0">Open ↗</a>
              <a href={`/api/candidates/${candidateId}/attachments/${att.id}?download=1`} onClick={(e) => e.stopPropagation()} className="text-xs text-slate-500 hover:text-slate-800 shrink-0">↓</a>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(att.id); }} disabled={deletingId === att.id} className="text-xs text-red-400 hover:text-red-600 shrink-0 disabled:opacity-50">
                {deletingId === att.id ? "…" : "✕"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add attachment button / form */}
      {!showUploadForm ? (
        <button
          onClick={() => setShowUploadForm(true)}
          className="w-full text-xs px-3 py-2 rounded border border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors"
        >
          + Add attachment
        </button>
      ) : (
        <div className="space-y-2">
          <div
            className="flex items-center gap-3 rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-3 cursor-pointer hover:border-slate-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <span className="text-slate-400">📎</span>
            <span className="text-xs text-slate-600">
              {selectedFile ?? "Click to choose a file (PDF, DOCX, JPG, PNG — max 15MB)"}
            </span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => setSelectedFile(e.target.files?.[0]?.name ?? null)}
          />
          {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="h-8 px-4 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
            <button
              onClick={() => { setShowUploadForm(false); setSelectedFile(null); setUploadError(""); }}
              className="h-8 px-3 text-xs border border-slate-300 rounded hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* PDF preview */}
      {previewSrc && (
        <iframe
          src={previewSrc}
          className="w-full rounded border border-slate-200 mt-1"
          style={{ height: "500px" }}
          title="File preview"
          tabIndex={-1}
        />
      )}

      {!hasAny && !showUploadForm && (
        <p className="text-xs text-slate-400">No files on file.</p>
      )}
    </div>
  );
}
