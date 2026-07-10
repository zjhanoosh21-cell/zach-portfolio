"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { STATUS_CLASSES } from "@/lib/candidate-display";

interface ProfileNote {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  authorName: string | null;
}

interface CandidateInfo {
  id: string;
  name: string;
  candidateStatus?: string | null;
  currentTitle?: string | null;
  currentEmployer?: string | null;
  resumeEmail?: string | null;
  resumePhone?: string | null;
  aiCompositeScore?: number | null;
  aiTier?: string | null;
  aiSummary?: string | null;
  keySkills: string[];
  practiceAreas: string[];
  availabilityNotes?: string | null;
  candidateLocation?: string | null;
  yearsOfExperience?: number | null;
  aiDetectedRoleType?: string | null;
  profileNotes?: ProfileNote[];
}

interface SubmissionCardProps {
  submissionId: string;
  jobTitle: string;
  candidate: CandidateInfo;
  currentStatus: string;
  clientFeedback?: string | null;
  offerAmount?: number | null;
  placementFee?: number | null;
  interviewDate?: string | null;
  submittedByName?: string | null;
  submittedAt: string;
}

const TIER_CLASSES: Record<string, string> = {
  TIER_1: "border-emerald-400 bg-emerald-50 text-emerald-800",
  TIER_2: "border-blue-400 bg-blue-50 text-blue-800",
  TIER_3: "border-amber-400 bg-amber-50 text-amber-800",
  TIER_4: "border-red-300 bg-red-50 text-red-700",
};

const SUB_STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted",
  CLIENT_REVIEW: "Client Review",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  INTERVIEW_COMPLETED: "Interview Completed",
  OFFER_EXTENDED: "Offer Extended",
  OFFER_ACCEPTED: "Offer Accepted",
  OFFER_DECLINED: "Offer Declined",
  REJECTED_BY_CLIENT: "Rejected by Client",
  CANDIDATE_WITHDREW: "Candidate Withdrew",
  PLACED: "Placed",
};

const SUB_STATUS_CLASSES: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-800",
  CLIENT_REVIEW: "bg-violet-100 text-violet-800",
  INTERVIEW_SCHEDULED: "bg-indigo-100 text-indigo-800",
  INTERVIEW_COMPLETED: "bg-indigo-100 text-indigo-800",
  OFFER_EXTENDED: "bg-amber-100 text-amber-800",
  OFFER_ACCEPTED: "bg-emerald-100 text-emerald-800",
  OFFER_DECLINED: "bg-red-100 text-red-700",
  REJECTED_BY_CLIENT: "bg-red-100 text-red-700",
  CANDIDATE_WITHDREW: "bg-slate-100 text-slate-500",
  PLACED: "bg-emerald-200 text-emerald-900",
};

const SUB_STATUSES = [
  "SUBMITTED",
  "CLIENT_REVIEW",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_COMPLETED",
  "OFFER_EXTENDED",
  "OFFER_ACCEPTED",
  "OFFER_DECLINED",
  "REJECTED_BY_CLIENT",
  "CANDIDATE_WITHDREW",
  "PLACED",
];

function buildEmailDraft(jobTitle: string, c: CandidateInfo): string {
  const yoe = c.yearsOfExperience;
  const role = c.aiDetectedRoleType?.replace(/_/g, " ") ?? "professional";
  const skills = c.keySkills.slice(0, 6).join(", ");
  const areas = c.practiceAreas.slice(0, 4).join(", ");

  const lines: string[] = [`Hello,\n`];

  let intro = `I'd like to introduce you to ${c.name}`;
  if (yoe != null) intro += `, a ${role} with ${yoe} year${yoe !== 1 ? "s" : ""} of experience`;
  else intro += `, a ${role}`;
  if (c.currentEmployer) intro += ` currently at ${c.currentEmployer}`;
  intro += ".";
  lines.push(intro);

  if (c.aiSummary) {
    lines.push(`\n${c.aiSummary}`);
  }

  const details: string[] = [];
  if (skills) details.push(`Key Skills: ${skills}`);
  if (areas) details.push(`Practice Areas: ${areas}`);
  if (c.candidateLocation) details.push(`Location: ${c.candidateLocation}`);
  if (c.availabilityNotes) details.push(`Availability: ${c.availabilityNotes}`);
  if (details.length > 0) {
    lines.push(`\n${details.join("\n")}`);
  }

  const firstName = c.name.includes(",") ? c.name.split(",")[1]?.trim() : c.name.split(" ")[0];
  lines.push(
    `\nI believe ${firstName || c.name} would be a strong fit for the ${jobTitle} position. Please find their resume attached for your review.`
  );
  lines.push(`\nI look forward to discussing this further.\n\nBest regards,\n[Your name]`);

  return lines.join("\n");
}

const NOTE_TYPES: { value: string; label: string }[] = [
  { value: "GENERAL", label: "General" },
  { value: "PHONE_SCREEN", label: "Phone Screen" },
  { value: "INTERVIEW_NOTES", label: "Interview Notes" },
  { value: "REFERENCE_CHECK", label: "Reference Check" },
  { value: "CLIENT_FEEDBACK", label: "Client Feedback" },
  { value: "INTERNAL", label: "Internal" },
];

const NOTE_TYPE_LABEL: Record<string, string> = Object.fromEntries(NOTE_TYPES.map((t) => [t.value, t.label]));

interface NoteItem {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  candidateId?: string | null;
  author: { name: string } | null;
}

export function SubmissionCard({
  submissionId,
  jobTitle,
  candidate,
  currentStatus,
  clientFeedback: initialFeedback,
  offerAmount: initialOfferAmount,
  placementFee: initialPlacementFee,
  interviewDate: initialInterviewDate,
  submittedByName,
  submittedAt,
}: SubmissionCardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "update" | "email" | "notes">("view");
  const [status, setStatus] = useState(currentStatus);
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [offerAmount, setOfferAmount] = useState(initialOfferAmount?.toString() ?? "");
  const [placementFee, setPlacementFee] = useState(initialPlacementFee?.toString() ?? "");
  const [interviewDate, setInterviewDate] = useState(
    initialInterviewDate ? new Date(initialInterviewDate).toISOString().split("T")[0] : ""
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [emailText, setEmailText] = useState(() => buildEmailDraft(jobTitle, candidate));
  const [emailSubject, setEmailSubject] = useState("");
  const [templates, setTemplates] = useState<{ id: string; name: string; subject: string; body: string }[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  // Notes
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("CLIENT_FEEDBACK");
  const [addingNote, setAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editType, setEditType] = useState("CLIENT_FEEDBACK");
  const [editSaving, setEditSaving] = useState(false);

  async function loadNotes() {
    if (notesLoaded) return;
    const res = await fetch(`/api/submissions/${submissionId}/notes`);
    if (res.ok) {
      setNotes(await res.json());
      setNotesLoaded(true);
    }
  }

  async function openNotes() {
    setMode(mode === "notes" ? "view" : "notes");
    if (!notesLoaded) await loadNotes();
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setAddingNote(true);
    const res = await fetch(`/api/submissions/${submissionId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteText.trim(), type: noteType }),
    });
    if (res.ok) {
      const note = await res.json();
      setNotes((prev) => [...prev, note]);
      setNoteText("");
      setNoteType("CLIENT_FEEDBACK");
    }
    setAddingNote(false);
  }

  async function handleSaveEdit(noteId: string, candidateId: string | null | undefined) {
    if (!editText.trim() || !candidateId) return;
    setEditSaving(true);
    const res = await fetch(`/api/candidates/${candidateId}/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editText.trim(), type: editType }),
    });
    if (res.ok) {
      setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, content: editText.trim(), type: editType } : n));
      setEditingNoteId(null);
    }
    setEditSaving(false);
  }

  const isInterview = ["INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED"].includes(status);
  const isOffer = ["OFFER_EXTENDED", "OFFER_ACCEPTED", "PLACED"].includes(status);

  async function handleSave() {
    setSaving(true);
    setSaveError("");

    const payload: Record<string, unknown> = { status };
    payload.clientFeedback = feedback || null;
    if (isInterview && interviewDate) payload.interviewDate = interviewDate;
    if (isOffer) {
      payload.offerAmount = offerAmount ? parseInt(offerAmount) : null;
      payload.placementFee = placementFee ? parseFloat(placementFee) : null;
    }

    const res = await fetch(`/api/submissions/${submissionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!res.ok) {
      setSaveError("Save failed. Please try again.");
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => { setSaved(false); setMode("view"); }, 1200);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(emailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function removeSubmission() {
    setRemoving(true);
    await fetch(`/api/submissions/${submissionId}`, { method: "DELETE" });
    setRemoving(false);
    setConfirmRemove(false);
    router.refresh();
  }

  return (
    <div className="rounded border border-slate-200 bg-white overflow-hidden">
      {/* ── Main row ── */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Score circle */}
          {candidate.aiCompositeScore != null && (
            <div
              className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                candidate.aiTier ? TIER_CLASSES[candidate.aiTier] : "border-slate-300 bg-slate-50 text-slate-700"
              }`}
            >
              {candidate.aiCompositeScore}
            </div>
          )}

          {/* Candidate info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/candidates/${candidate.id}`} className="font-medium text-slate-900 hover:underline text-sm">
                {candidate.name}
              </Link>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SUB_STATUS_CLASSES[status] ?? "bg-slate-100 text-slate-700"}`}>
                {SUB_STATUS_LABEL[status] ?? status.replace(/_/g, " ")}
              </span>
              {candidate.candidateStatus && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASSES[candidate.candidateStatus] ?? "bg-slate-100 text-slate-500"}`}>
                  {candidate.candidateStatus.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              )}
            </div>
            {candidate.currentTitle && (
              <p className="text-xs text-slate-500 mt-0.5">
                {candidate.currentTitle}
                {candidate.currentEmployer && <span> · {candidate.currentEmployer}</span>}
              </p>
            )}
            <div className="flex flex-wrap gap-3 mt-1">
              {candidate.resumeEmail && (
                <a
                  href={`mailto:${candidate.resumeEmail}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  {candidate.resumeEmail}
                </a>
              )}
              {candidate.resumePhone && (
                <a
                  href={`tel:${candidate.resumePhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-500 hover:underline"
                >
                  {candidate.resumePhone}
                </a>
              )}
            </div>
            {/* Show placement info in view mode */}
            {status === "PLACED" && (offerAmount || placementFee) && (
              <div className="flex gap-4 mt-1.5">
                {offerAmount && (
                  <span className="text-xs text-emerald-700 font-medium">
                    Offer: ${parseInt(offerAmount).toLocaleString()}
                  </span>
                )}
                {placementFee && (
                  <span className="text-xs text-emerald-700 font-medium">
                    Fee: ${parseFloat(placementFee).toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right side: meta + action buttons */}
          <div className="shrink-0 flex flex-col items-end gap-2">
            <div className="text-right text-xs text-slate-400">
              <p>{submittedByName ?? "System"}</p>
              <p className="mt-0.5">
                {new Date(submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
            {confirmRemove ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500">Remove?</span>
                <button
                  onClick={removeSubmission}
                  disabled={removing}
                  className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  {removing ? "Removing…" : "Yes, remove"}
                </button>
                <button
                  onClick={() => setConfirmRemove(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-1">
                <button
                  onClick={openNotes}
                  className={`text-xs px-2 py-1 rounded border font-medium transition-colors ${
                    mode === "notes"
                      ? "border-violet-300 bg-violet-50 text-violet-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Notes{notes.length > 0 ? ` (${notes.length})` : ""}
                </button>
                <button
                  onClick={async () => {
                    if (mode !== "email" && !templatesLoaded) {
                      const res = await fetch("/api/email-templates");
                      if (res.ok) { setTemplates(await res.json()); setTemplatesLoaded(true); }
                    }
                    setMode(mode === "email" ? "view" : "email");
                  }}
                  className={`text-xs px-2 py-1 rounded border font-medium transition-colors ${
                    mode === "email"
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Email
                </button>
                <button
                  onClick={() => setMode(mode === "update" ? "view" : "update")}
                  className={`text-xs px-2 py-1 rounded border font-medium transition-colors ${
                    mode === "update"
                      ? "border-slate-400 bg-slate-100 text-slate-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Update
                </button>
                <button
                  onClick={() => setConfirmRemove(true)}
                  className="text-xs px-2 py-1 rounded border font-medium border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Show feedback in view mode */}
        {feedback && mode === "view" && (
          <p className="mt-2 text-xs text-slate-600 bg-slate-50 rounded p-2 border border-slate-100 whitespace-pre-wrap">
            {feedback}
          </p>
        )}
      </div>

      {/* ── Update panel ── */}
      {mode === "update" && (
        <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-8 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {SUB_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            {isInterview && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Interview Date</label>
                <input
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full h-8 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            )}
          </div>

          {isOffer && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Offer Amount ($)</label>
                <input
                  type="number"
                  min="0"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="e.g. 65000"
                  className="w-full h-8 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Placement Fee ($)</label>
                <input
                  type="number"
                  min="0"
                  value={placementFee}
                  onChange={(e) => setPlacementFee(e.target.value)}
                  placeholder="e.g. 9750"
                  className="w-full h-8 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Client Feedback</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={2}
              placeholder="Add client feedback or notes…"
              className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>

          {saveError && <p className="text-xs text-red-600">{saveError}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-8 px-4 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50"
            >
              {saved ? "Saved!" : saving ? "Saving…" : "Save changes"}
            </button>
            <button
              onClick={() => { setMode("view"); setSaveError(""); }}
              className="h-8 px-3 text-xs text-slate-600 border border-slate-300 rounded hover:bg-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Notes panel ── */}
      {mode === "notes" && (
        <div className="border-t border-slate-100 bg-violet-50 p-4 space-y-4">

          {/* Candidate profile notes — read-only */}
          {candidate.profileNotes && candidate.profileNotes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-violet-800 mb-2">
                Candidate Profile Notes
              </p>
              <div className="space-y-2">
                {candidate.profileNotes.map((n) => (
                  <div key={n.id} className="bg-white rounded border border-violet-100 px-3 py-2">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{n.content}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {n.type.replace(/_/g, " ")} · {n.authorName ?? "System"} · {new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submission-specific notes */}
          <div>
            <p className="text-xs font-semibold text-violet-800 mb-2">Submission Notes</p>

            {/* Notes list — above the input */}
            {notes.length === 0 ? (
              <p className="text-xs text-violet-600 mb-3">No notes yet.</p>
            ) : (
              <div className="space-y-2 mb-3">
                {notes.map((n) => (
                  <div key={n.id} className="bg-white rounded border border-violet-100 px-3 py-2">
                    {editingNoteId === n.id ? (
                      <div className="space-y-2">
                        <select
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                          className="w-full h-8 rounded border border-violet-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                        >
                          {NOTE_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                          autoFocus
                          className="w-full rounded border border-violet-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(n.id, n.candidateId)}
                            disabled={editSaving || !editText.trim()}
                            className="h-7 px-3 text-xs font-medium bg-violet-700 text-white rounded hover:bg-violet-600 disabled:opacity-50"
                          >
                            {editSaving ? "…" : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingNoteId(null)}
                            className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingNoteId(n.id); setEditText(n.content); setEditType(n.type); }}
                        className="w-full text-left group"
                        title="Click to edit"
                      >
                        <p className="text-sm text-slate-700 whitespace-pre-wrap group-hover:text-slate-900">{n.content}</p>
                        <p className="text-xs text-slate-400 mt-1 group-hover:text-violet-500">
                          {NOTE_TYPE_LABEL[n.type] ?? n.type.replace(/_/g, " ")} · {n.author?.name ?? "System"} · {new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · <span className="italic">click to edit</span>
                        </p>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add note form — below the list */}
            <div className="space-y-2">
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value)}
                className="w-full h-8 rounded border border-violet-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                {NOTE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={2}
                  placeholder="Add a note about this submission…"
                  className="flex-1 rounded border border-violet-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                />
                <button
                  onClick={handleAddNote}
                  disabled={addingNote || !noteText.trim()}
                  className="self-end h-8 px-3 text-xs font-medium bg-violet-700 text-white rounded hover:bg-violet-600 disabled:opacity-50"
                >
                  {addingNote ? "…" : "Add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Email draft panel ── */}
      {mode === "email" && (
        <div className="border-t border-slate-100 bg-blue-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-blue-800">Submission Email Draft</p>
            <div className="flex items-center gap-2">
              {templates.length > 0 && (
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const t = templates.find((x) => x.id === e.target.value);
                    if (t) { setEmailSubject(t.subject); setEmailText(t.body); }
                    e.target.value = "";
                  }}
                  className="text-xs rounded border border-blue-200 bg-white text-blue-700 px-2 py-1 focus:outline-none"
                >
                  <option value="" disabled>Load template…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
              <button
                onClick={handleCopy}
                className="text-xs px-3 py-1 rounded border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 font-medium"
              >
                {copied ? "Copied!" : "Copy to clipboard"}
              </button>
            </div>
          </div>
          {emailSubject && (
            <input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Subject line"
              className="w-full rounded border border-blue-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          )}
          <textarea
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            rows={14}
            className="w-full rounded border border-blue-200 bg-white px-3 py-2 text-sm text-slate-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
          <p className="text-xs text-blue-600">
            Edit before sending. Attach the candidate&apos;s resume from their profile.
          </p>
        </div>
      )}
    </div>
  );
}
