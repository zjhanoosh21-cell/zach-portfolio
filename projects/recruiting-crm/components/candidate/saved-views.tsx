"use client";

import { useState, useEffect } from "react";
import { Pin } from "lucide-react";

type SavedView = { id: string; name: string; href: string; pinned?: boolean };

function storageKey(userId: string) {
  return `cri-crm-saved-views:${userId}`;
}

interface Props {
  userId: string;
}

export function SavedViewsBar({ userId }: Props) {
  const [views, setViews] = useState<SavedView[]>([]);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(storageKey(userId));
      if (stored) setViews(JSON.parse(stored));
    } catch {}
  }, [userId]);

  function persist(next: SavedView[]) {
    setViews(next);
    try { localStorage.setItem(storageKey(userId), JSON.stringify(next)); } catch {}
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    persist([
      ...views,
      {
        id: Date.now().toString(),
        name: trimmed,
        href: window.location.pathname + window.location.search,
      },
    ]);
    setName("");
    setNaming(false);
  }

  function remove(id: string) {
    persist(views.filter((v) => v.id !== id));
  }

  function togglePin(id: string) {
    const target = views.find((v) => v.id === id);
    if (!target) return;
    if (target.pinned) {
      // Unpin — go back to default
      persist(views.map((v) => ({ ...v, pinned: false })));
    } else {
      // Pin this one, unpin all others
      persist(views.map((v) => ({ ...v, pinned: v.id === id })));
    }
  }

  if (!mounted) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 min-h-[28px]">
      {views.map((v) => (
        <span
          key={v.id}
          className={`inline-flex items-center gap-1 rounded-full border pl-2 pr-1 py-0.5 ${
            v.pinned
              ? "border-blue-400 bg-blue-100"
              : "border-blue-200 bg-blue-50"
          }`}
        >
          <button
            onClick={() => togglePin(v.id)}
            title={v.pinned ? "Unpin (go back to default)" : "Pin as default view"}
            className="flex items-center justify-center"
          >
            <Pin
              size={10}
              className={
                v.pinned
                  ? "fill-blue-500 text-blue-500"
                  : "text-slate-300 hover:text-blue-400"
              }
            />
          </button>
          <a
            href={v.href}
            className="text-xs font-medium text-blue-700 hover:text-blue-900 whitespace-nowrap"
          >
            {v.name}
          </a>
          <button
            onClick={() => remove(v.id)}
            className="h-4 w-4 flex items-center justify-center rounded-full text-blue-300 hover:text-blue-700 hover:bg-blue-100 text-sm leading-none"
            aria-label={`Remove "${v.name}"`}
          >
            ×
          </button>
        </span>
      ))}

      {naming ? (
        <span className="inline-flex items-center gap-1.5">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") { setNaming(false); setName(""); }
            }}
            placeholder="Name this view…"
            className="h-7 w-44 rounded-full border border-slate-300 bg-white px-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button onClick={handleSave} className="text-xs font-medium text-blue-600 hover:text-blue-800">
            Save
          </button>
          <button onClick={() => { setNaming(false); setName(""); }} className="text-xs text-slate-400 hover:text-slate-600">
            Cancel
          </button>
        </span>
      ) : (
        <button
          onClick={() => setNaming(true)}
          className="text-xs text-slate-400 hover:text-slate-600 border border-dashed border-slate-200 rounded-full px-3 py-0.5 hover:border-slate-400 transition-colors"
        >
          + Save view
        </button>
      )}
    </div>
  );
}
