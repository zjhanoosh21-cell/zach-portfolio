"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PriorityCardActionsProps {
  candidateId: string;
}

export function PriorityCardActions({ candidateId }: PriorityCardActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: "REVIEWED" | "ACTIVE") {
    setLoading(true);
    try {
      await fetch(`/api/candidates/${candidateId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 mt-2" onClick={(e) => e.preventDefault()}>
      <button
        onClick={() => updateStatus("REVIEWED")}
        disabled={loading}
        className="text-xs px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-600 hover:border-[#1a6bbf] hover:text-[#1a6bbf] transition-colors disabled:opacity-50"
      >
        Mark Reviewed
      </button>
      <button
        onClick={() => updateStatus("ACTIVE")}
        disabled={loading}
        className="text-xs px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-700 transition-colors disabled:opacity-50"
      >
        Mark Active
      </button>
    </div>
  );
}
