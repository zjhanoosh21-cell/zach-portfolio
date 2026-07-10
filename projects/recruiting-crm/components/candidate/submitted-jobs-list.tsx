"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface SubmissionItem {
  id: string;
  status: string;
  interviewDate: string | null;
  submittedAt: string | null;
  jobOrder: {
    id: string;
    title: string;
    clientName: string;
  };
}

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

const SUB_STATUS_OPTIONS = [
  { value: "SUBMITTED",           label: "Submitted" },
  { value: "CLIENT_REVIEW",       label: "Client Review" },
  { value: "INTERVIEW_SCHEDULED", label: "Interview Scheduled" },
  { value: "INTERVIEW_COMPLETED", label: "Interview Completed" },
  { value: "OFFER_EXTENDED",      label: "Offer Extended" },
  { value: "OFFER_ACCEPTED",      label: "Offer Accepted" },
  { value: "OFFER_DECLINED",      label: "Offer Declined" },
  { value: "REJECTED_BY_CLIENT",  label: "Rejected by Client" },
  { value: "CANDIDATE_WITHDREW",  label: "Candidate Withdrew" },
  { value: "PLACED",              label: "Placed" },
];

const SUB_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  SUB_STATUS_OPTIONS.map((o) => [o.value, o.label])
);

function SubmissionRow({ sub, candidateId, candidateBackHref }: { sub: SubmissionItem; candidateId?: string; candidateBackHref?: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [dateValue, setDateValue] = useState(
    sub.interviewDate ? new Date(sub.interviewDate).toISOString().split("T")[0] : ""
  );
  const [saving, setSaving] = useState(false);
  const [statusEditing, setStatusEditing] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  const displayDate = dateValue
    ? new Date(dateValue + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  async function saveDate() {
    setSaving(true);
    await fetch(`/api/submissions/${sub.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: sub.status,
        interviewDate: dateValue || null,
      }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  function cancelEdit() {
    setDateValue(sub.interviewDate ? new Date(sub.interviewDate).toISOString().split("T")[0] : "");
    setEditing(false);
  }

  async function saveStatus(newStatus: string) {
    setStatusSaving(true);
    await fetch(`/api/submissions/${sub.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setStatusSaving(false);
    setStatusEditing(false);
    router.refresh();
  }

  async function removeSubmission() {
    setRemoving(true);
    await fetch(`/api/submissions/${sub.id}`, { method: "DELETE" });
    setRemoving(false);
    setConfirmRemove(false);
    router.refresh();
  }

  const jobHref = candidateBackHref
    ? `/jobs/${sub.jobOrder.id}?back=${candidateBackHref}`
    : candidateId
      ? `/jobs/${sub.jobOrder.id}?back=/candidates/${candidateId}`
      : `/jobs/${sub.jobOrder.id}`;

  return (
    <div className="rounded border border-slate-200 px-3 py-2.5 space-y-1.5">
      {/* Top row: job link + status */}
      <div className="flex items-start gap-2">
        <Link href={jobHref} className="flex-1 min-w-0 group">
          <p className="text-xs font-medium text-slate-900 truncate group-hover:text-[#1a6bbf] transition-colors">
            {sub.jobOrder.title}
          </p>
          <p className="text-xs text-slate-500 truncate">{sub.jobOrder.clientName}</p>
        </Link>
        {statusEditing ? (
          <select
            defaultValue={sub.status}
            onChange={(e) => saveStatus(e.target.value)}
            onBlur={() => setStatusEditing(false)}
            disabled={statusSaving}
            autoFocus
            className="h-6 rounded border border-slate-300 bg-white px-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#1a6bbf] disabled:opacity-50"
          >
            {SUB_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <button
            onClick={() => setStatusEditing(true)}
            title="Click to change status"
            className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 transition-opacity hover:opacity-70 ${
              SUB_STATUS_CLASSES[sub.status] ?? "bg-slate-100 text-slate-700"
            }`}
          >
            {SUB_STATUS_LABEL[sub.status] ?? sub.status.replace(/_/g, " ")}
          </button>
        )}
      </div>

      {/* Submission date */}
      {sub.submittedAt && (
        <p className="text-[10px] text-slate-400">
          Submitted {new Date(sub.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      )}

      {/* Interview date row */}
      {editing ? (
        <div className="space-y-1.5 pt-0.5">
          <input
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            autoFocus
            className="w-full h-6 rounded border border-slate-300 bg-white px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1a6bbf]"
          />
          <div className="flex items-center gap-1.5">
            <button
              onClick={saveDate}
              disabled={saving}
              className="h-6 px-2 text-xs font-medium bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? "…" : "Save"}
            </button>
            <button
              onClick={cancelEdit}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : displayDate ? (
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <span>📅</span>
          <span className="font-medium">Interview: {displayDate}</span>
          <span className="text-slate-400 ml-0.5">✎</span>
        </button>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          + Set interview date
        </button>
      )}

      {/* Remove row */}
      <div>
        {confirmRemove ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Remove submission?</span>
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
          <button
            onClick={() => setConfirmRemove(true)}
            className="text-xs text-red-400 hover:text-red-600 transition-colors font-medium"
          >
            Remove from job
          </button>
        )}
      </div>
    </div>
  );
}

export function SubmittedJobsList({ submissions, candidateId, candidateBackHref }: { submissions: SubmissionItem[]; candidateId?: string; candidateBackHref?: string }) {
  return (
    <div className="space-y-2">
      {submissions.map((sub) => (
        <SubmissionRow key={sub.id} sub={sub} candidateId={candidateId} candidateBackHref={candidateBackHref} />
      ))}
    </div>
  );
}
