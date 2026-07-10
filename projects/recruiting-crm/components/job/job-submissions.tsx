"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SubmissionCard } from "@/components/job/submission-card";
import { SubmissionBoard } from "@/components/job/submission-board";

interface ProfileNote {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  authorName: string | null;
}

interface SubCandidate {
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

interface SubItem {
  id: string;
  status: string;
  clientFeedback?: string | null;
  offerAmount?: number | null;
  placementFee?: number | null;
  interviewDate?: string | null;
  submittedByName?: string | null;
  submittedAt: string;
  candidate: SubCandidate;
}

interface JobSubmissionsProps {
  submissions: SubItem[];
  jobTitle: string;
}

export function JobSubmissions({ submissions, jobTitle }: JobSubmissionsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<"list" | "board">(
    searchParams.get("view") === "board" ? "board" : "list"
  );

  function handleSetView(v: "list" | "board") {
    setView(v);
    const params = new URLSearchParams(window.location.search);
    params.set("view", v);
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  }

  if (submissions.length === 0) {
    return (
      <div className="rounded border border-dashed border-slate-300 p-8 text-center">
        <p className="text-sm text-slate-500">No candidates submitted yet.</p>
        <p className="text-xs text-slate-400 mt-1">
          Go to a candidate profile and use &quot;Submit to job order&quot; to add them here.
        </p>
      </div>
    );
  }

  // Board-compatible shape
  const boardSubmissions = submissions.map((s) => ({
    id: s.id,
    status: s.status,
    createdAt: s.submittedAt,
    candidate: {
      id: s.candidate.id,
      name: s.candidate.name,
      appliedRole: s.candidate.aiDetectedRoleType ?? null,
      aiTier: s.candidate.aiTier ?? null,
      currentTitle: s.candidate.currentTitle ?? null,
    },
  }));

  return (
    <div className="space-y-3">
      {/* View toggle */}
      <div className="flex items-center gap-1 self-start">
        <button
          onClick={() => handleSetView("list")}
          className={`text-xs px-2.5 py-1 rounded border font-medium transition-colors ${
            view === "list"
              ? "bg-slate-800 text-white border-slate-800"
              : "border-slate-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          List
        </button>
        <button
          onClick={() => handleSetView("board")}
          className={`text-xs px-2.5 py-1 rounded border font-medium transition-colors ${
            view === "board"
              ? "bg-slate-800 text-white border-slate-800"
              : "border-slate-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          Board
        </button>
      </div>

      {view === "list" ? (
        <div className="space-y-2">
          {submissions.map((sub) => (
            <SubmissionCard
              key={sub.id}
              submissionId={sub.id}
              jobTitle={jobTitle}
              candidate={sub.candidate}
              currentStatus={sub.status}
              clientFeedback={sub.clientFeedback}
              offerAmount={sub.offerAmount}
              placementFee={sub.placementFee}
              interviewDate={sub.interviewDate}
              submittedByName={sub.submittedByName}
              submittedAt={sub.submittedAt}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <SubmissionBoard submissions={boardSubmissions} />
        </div>
      )}
    </div>
  );
}
