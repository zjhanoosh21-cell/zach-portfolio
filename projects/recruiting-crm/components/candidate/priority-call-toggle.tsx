"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showPriorityCall } from "@/lib/candidate-display";

interface Props {
  candidateId: string;
  priorityCall: boolean;
  aiTriageAction: string | null;
  effectiveScore: number | null;
}

export function PriorityCallToggle({ candidateId, priorityCall, aiTriageAction, effectiveScore }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const isOn = showPriorityCall(priorityCall, aiTriageAction, effectiveScore);

  async function toggle() {
    setLoading(true);
    await fetch(`/api/candidates/${candidateId}/triage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isOn
          ? { priorityCall: false, clearTriageAction: true }
          : { priorityCall: true }
      ),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-center py-0.5">
      <button
        onClick={toggle}
        disabled={loading}
        title={isOn ? "Turn off priority call" : "Mark as priority call"}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
          isOn ? "bg-emerald-500" : "bg-slate-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
            isOn ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
