"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface NotificationItem {
  id: string;
  readAt: string | null;
  createdAt: string;
  authorName: string | null;
  content: string;
  candidateId: string | null;
  candidateName: string | null;
  jobOrderId: string | null;
  jobTitle: string | null;
}

export function NotificationBell() {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setUnread(data.unread ?? 0);
      setItems(data.items ?? []);
    } catch (e) {
      console.error("[NotificationBell] Failed to fetch notifications:", e);
    }
  }, []);

  // Poll every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleOpen() {
    setOpen((o) => !o);
    if (!open && unread > 0) {
      // Mark all read
      setLoading(true);
      try {
        await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
        setUnread(0);
        setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      } catch {}
      setLoading(false);
    }
  }

  function handleNavigate(item: NotificationItem) {
    setOpen(false);
    if (item.candidateId) {
      router.push(`/candidates/${item.candidateId}#discussion`);
    } else if (item.jobOrderId) {
      router.push(`/jobs/${item.jobOrderId}#discussion`);
    }
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center h-8 w-8 rounded text-white/70 hover:text-white hover:bg-white/15 transition-colors focus:outline-none"
        aria-label="Notifications"
      >
        {/* Bell icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 h-4 min-w-4 px-0.5 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white leading-none">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 w-80 rounded border border-slate-200 bg-white shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            {loading && <span className="text-[11px] text-slate-400">Marking read…</span>}
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-slate-400">No notifications yet.</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3 ${!item.readAt ? "bg-blue-50/60" : ""}`}
                >
                  <div className="h-7 w-7 rounded-full bg-[#1a6bbf] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-white">
                      {item.authorName ? item.authorName[0].toUpperCase() : "@"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800">
                      {item.authorName ?? "Someone"} mentioned you
                      {item.candidateName && (
                        <span className="font-normal text-slate-500"> on {item.candidateName}</span>
                      )}
                      {item.jobTitle && (
                        <span className="font-normal text-slate-500"> on {item.jobTitle}</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5 truncate">{item.content}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(item.createdAt)}</p>
                  </div>
                  {!item.readAt && (
                    <span className="h-2 w-2 rounded-full bg-[#1a6bbf] shrink-0 mt-2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
