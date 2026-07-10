"use client";

import { useEffect, useState } from "react";

type CalendarEvent = {
  type: "interview" | "followup";
  date: string; // YYYY-MM-DD
  candidateId: string;
  candidateName: string;
  jobId?: string;
  jobTitle?: string;
  clientName?: string;
};

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function FloatingCalendar() {
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Load events when opened or mine toggle changes
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/calendar${mine ? "?mine=true" : ""}`)
      .then((r) => r.json())
      .then((data) => {
        setEvents(Array.isArray(data.events) ? data.events : []);
        setLoaded(true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open, mine]);

  // Reset loaded state when mine toggle changes so next open re-fetches
  function toggleMine() {
    setMine((m) => !m);
    setLoaded(false);
  }

  // Build event map: date string -> events[]
  const eventMap = events.reduce<Record<string, CalendarEvent[]>>((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date].push(e);
    return acc;
  }, {});

  // Build calendar grid cells
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const selectedEvents = selectedDate ? (eventMap[selectedDate] ?? []) : [];

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Calendar"
        className="fixed bottom-6 right-20 z-50 w-11 h-11 rounded-full bg-[#0f2a4a] text-white shadow-lg flex items-center justify-center hover:bg-[#1a6bbf] transition-colors"
      >
        <CalendarIcon className="w-5 h-5" />
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-20 right-20 z-50 w-[22rem] flex flex-col rounded border border-slate-200 bg-white shadow-2xl overflow-hidden"
          style={{ maxHeight: 540 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#0f2a4a] shrink-0">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-3.5 h-3.5 text-white/70" />
              <span className="text-xs font-semibold text-white uppercase tracking-wide">Calendar</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleMine}
                title={mine ? "Showing my assigned jobs only" : "Showing all events"}
                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors ${
                  mine
                    ? "bg-white text-[#0f2a4a] border-white"
                    : "text-white/70 border-white/30 hover:border-white/60 hover:text-white"
                }`}
              >
                {mine ? "My Jobs" : "All"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-white/60 hover:text-white transition-colors text-sm leading-none"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 shrink-0">
            <button
              onClick={prevMonth}
              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-slate-700">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
            >
              ›
            </button>
          </div>

          {/* Calendar grid */}
          <div className="px-2 pt-2 pb-1 shrink-0">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-0.5">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-[10px] font-medium text-slate-400 py-0.5">
                  {d}
                </div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (day === null) return <div key={`e-${i}`} className="h-8" />;
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayEvents = eventMap[dateStr] ?? [];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const hasInterview = dayEvents.some((e) => e.type === "interview");
                const hasFollowup = dayEvents.some((e) => e.type === "followup");

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`h-8 flex flex-col items-center justify-center rounded text-xs transition-colors ${
                      isSelected
                        ? "bg-[#1a6bbf] text-white"
                        : isToday
                        ? "bg-slate-100 text-slate-900 font-semibold"
                        : dayEvents.length > 0
                        ? "hover:bg-slate-50 text-slate-700 cursor-pointer"
                        : "text-slate-400"
                    }`}
                  >
                    <span className="leading-none">{day}</span>
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {hasInterview && (
                          <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-emerald-500"}`} />
                        )}
                        {hasFollowup && (
                          <span className={`w-1 h-1 rounded-full ${isSelected ? "bg-white/80" : "bg-amber-400"}`} />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="px-3 py-1.5 flex items-center gap-4 border-t border-slate-100 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[10px] text-slate-500">Interview</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span className="text-[10px] text-slate-500">Follow-up</span>
            </div>
          </div>

          {/* Selected day events */}
          {selectedDate && (
            <div className="border-t border-slate-100 overflow-y-auto flex-1 min-h-0">
              <div className="px-3 py-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                {selectedEvents.length === 0 ? (
                  <p className="text-xs text-slate-400">No events this day.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedEvents.map((e, i) => (
                      <a
                        key={i}
                        href={`/candidates/${e.candidateId}`}
                        className="flex items-start gap-2 group hover:bg-slate-50 -mx-1 px-1 py-1 rounded"
                      >
                        <span
                          className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                            e.type === "interview" ? "bg-emerald-500" : "bg-amber-400"
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-800 group-hover:text-[#1a6bbf] truncate">
                            {e.candidateName}
                          </p>
                          {e.type === "interview" && e.jobTitle && (
                            <p className="text-[11px] text-slate-500 truncate">
                              Interview · {e.jobTitle}
                              {e.clientName ? ` · ${e.clientName}` : ""}
                            </p>
                          )}
                          {e.type === "followup" && (
                            <p className="text-[11px] text-slate-500">Follow-up reminder</p>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <span className="text-xs text-slate-400">Loading…</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function CalendarIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
