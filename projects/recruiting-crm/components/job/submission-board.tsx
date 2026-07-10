"use client";

import Link from "next/link";

const TIER_DOT: Record<string, string> = {
  TIER_1: "bg-emerald-500",
  TIER_2: "bg-blue-500",
  TIER_3: "bg-amber-500",
  TIER_4: "bg-red-400",
};

const TIER_TEXT: Record<string, string> = {
  TIER_1: "text-emerald-700",
  TIER_2: "text-blue-700",
  TIER_3: "text-amber-700",
  TIER_4: "text-red-600",
};

interface BoardSubmission {
  id: string;
  status: string;
  createdAt: string;
  candidate: {
    id: string;
    name: string;
    appliedRole: string | null;
    aiTier: string | null;
    currentTitle: string | null;
  };
}

interface SubmissionBoardProps {
  submissions: BoardSubmission[];
}

const COLUMNS = [
  { key: "submitted", label: "Submitted", statuses: ["SUBMITTED", "CLIENT_REVIEW"], color: "border-blue-200 bg-blue-50" },
  { key: "interview", label: "Interview", statuses: ["INTERVIEW_SCHEDULED", "INTERVIEW_COMPLETED"], color: "border-indigo-200 bg-indigo-50" },
  { key: "offer", label: "Offer", statuses: ["OFFER_EXTENDED", "OFFER_ACCEPTED"], color: "border-amber-200 bg-amber-50" },
  { key: "placed", label: "Placed", statuses: ["PLACED"], color: "border-emerald-200 bg-emerald-50" },
  { key: "closed", label: "Closed", statuses: ["OFFER_DECLINED", "REJECTED_BY_CLIENT", "CANDIDATE_WITHDREW"], color: "border-slate-200 bg-slate-50" },
];

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted",
  CLIENT_REVIEW: "Client Review",
  INTERVIEW_SCHEDULED: "Int. Scheduled",
  INTERVIEW_COMPLETED: "Int. Completed",
  OFFER_EXTENDED: "Offer Extended",
  OFFER_ACCEPTED: "Offer Accepted",
  OFFER_DECLINED: "Offer Declined",
  REJECTED_BY_CLIENT: "Rejected",
  CANDIDATE_WITHDREW: "Withdrew",
  PLACED: "Placed",
};

export function SubmissionBoard({ submissions }: SubmissionBoardProps) {
  if (submissions.length === 0) {
    return <p className="text-sm text-slate-400">No submissions yet.</p>;
  }

  return (
    <div className="grid grid-cols-5 gap-3 min-w-0">
      {COLUMNS.map((col) => {
        const cards = submissions.filter((s) => col.statuses.includes(s.status));
        return (
          <div key={col.key} className="flex flex-col gap-2 min-w-0">
            <div className={`rounded border ${col.color} px-3 py-2 flex items-center justify-between`}>
              <span className="text-xs font-semibold text-slate-700">{col.label}</span>
              {cards.length > 0 && (
                <span className="text-xs font-bold text-slate-500">{cards.length}</span>
              )}
            </div>
            <div className="space-y-2">
              {cards.map((s) => {
                const daysSince = Math.round(
                  (Date.now() - new Date(s.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <Link
                    key={s.id}
                    href={`/candidates/${s.candidate.id}`}
                    className="block rounded border border-slate-200 bg-white p-3 hover:border-[#1a6bbf] hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-1.5 mb-1">
                      {s.candidate.aiTier && (
                        <span className={`mt-1 shrink-0 w-2 h-2 rounded-full ${TIER_DOT[s.candidate.aiTier] ?? "bg-slate-300"}`} />
                      )}
                      <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-2">
                        {s.candidate.name}
                      </p>
                    </div>
                    {s.candidate.currentTitle && (
                      <p className="text-[10px] text-slate-400 truncate">{s.candidate.currentTitle}</p>
                    )}
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[9px] text-slate-400">{daysSince}d ago</span>
                      {s.candidate.aiTier && (
                        <span className={`text-[9px] font-semibold ${TIER_TEXT[s.candidate.aiTier]}`}>
                          T{s.candidate.aiTier.split("_")[1]}
                        </span>
                      )}
                    </div>
                    <div className="mt-1">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
                        {STATUS_LABEL[s.status] ?? s.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </Link>
                );
              })}
              {cards.length === 0 && (
                <div className="rounded border border-dashed border-slate-200 px-3 py-4 text-center">
                  <p className="text-[10px] text-slate-300">Empty</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
