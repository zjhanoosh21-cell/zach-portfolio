"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FollowUpPickerProps {
  candidateId: string;
  followUpDate: Date | null;
  defaultDays?: number;
}

export function FollowUpPicker({ candidateId, followUpDate, defaultDays = 3 }: FollowUpPickerProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isOverdue = followUpDate
    ? new Date(followUpDate).setHours(0, 0, 0, 0) < today.getTime()
    : false;

  const isToday = followUpDate
    ? new Date(followUpDate).setHours(0, 0, 0, 0) === today.getTime()
    : false;

  // Format Date → "YYYY-MM-DD" for date input
  // When no date is set, pre-fill with today + defaultDays
  const defaultDate = new Date(today);
  defaultDate.setDate(defaultDate.getDate() + defaultDays);
  const inputValue = followUpDate
    ? new Date(followUpDate).toISOString().split("T")[0]
    : defaultDate.toISOString().split("T")[0];

  async function handleChange(value: string) {
    setSaving(true);
    try {
      await fetch(`/api/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpDate: value ? new Date(value).toISOString() : null }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-1 min-w-0">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Follow-up
        </label>
        {followUpDate && (
          <button
            onClick={() => handleChange("")}
            disabled={saving}
            className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <input
        type="date"
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        disabled={saving}
        className={`w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#1a6bbf] transition-colors ${
          isOverdue
            ? "border-red-300 bg-red-50 text-red-700"
            : isToday
            ? "border-amber-300 bg-amber-50 text-amber-700"
            : "border-slate-200 bg-white text-slate-700"
        }`}
      />
      {saving && <p className="text-[10px] text-slate-400">Saving...</p>}
      {isOverdue && <p className="text-[10px] font-medium text-red-600">Overdue</p>}
      {isToday && <p className="text-[10px] font-medium text-amber-600">Today</p>}
    </div>
  );
}
