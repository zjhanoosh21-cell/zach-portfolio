"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Page = { id: string; title: string; content: string };

function newPage(index: number): Page {
  return { id: crypto.randomUUID(), title: `Page ${index}`, content: "" };
}

const DEFAULT_PAGES: Page[] = [newPage(1)];

export function FloatingNotepad() {
  const [open, setOpen] = useState(false);
  const [pages, setPages] = useState<Page[]>(DEFAULT_PAGES);
  const [activeId, setActiveId] = useState(DEFAULT_PAGES[0].id);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load on first open
  useEffect(() => {
    if (!open || loaded) return;
    fetch("/api/notepad")
      .then((r) => r.json())
      .then((data) => {
        const fetched: Page[] = Array.isArray(data.pages) && data.pages.length > 0
          ? data.pages
          : [newPage(1)];
        setPages(fetched);
        setActiveId(fetched[0].id);
        setLoaded(true);
      })
      .catch(() => { setLoadError(true); setLoaded(true); });
  }, [open, loaded]);

  // Focus textarea when switching pages or opening
  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 50);
  }, [open, activeId]);

  // Debounced save
  const scheduleSave = useCallback((updated: Page[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await fetch("/api/notepad", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages: updated }),
      }).catch(() => {});
      setSaving(false);
    }, 800);
  }, []);

  function updateContent(content: string) {
    const updated = pages.map((p) => (p.id === activeId ? { ...p, content } : p));
    setPages(updated);
    scheduleSave(updated);
  }

  function updateTitle(title: string) {
    const updated = pages.map((p) => (p.id === activeId ? { ...p, title } : p));
    setPages(updated);
    scheduleSave(updated);
  }

  function addPage() {
    const page = newPage(pages.length + 1);
    const updated = [...pages, page];
    setPages(updated);
    setActiveId(page.id);
    scheduleSave(updated);
  }

  function clearPage() {
    const updated = pages.map((p) => (p.id === activeId ? { ...p, content: "" } : p));
    setPages(updated);
    scheduleSave(updated);
  }

  function deletePage(id: string) {
    if (pages.length === 1) return; // always keep at least 1
    const updated = pages.filter((p) => p.id !== id);
    setPages(updated);
    if (activeId === id) setActiveId(updated[updated.length - 1].id);
    scheduleSave(updated);
  }

  const activePage = pages.find((p) => p.id === activeId) ?? pages[0];

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notepad"
        className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-[#0f2a4a] text-white shadow-lg flex items-center justify-center hover:bg-[#1a6bbf] transition-colors"
      >
        <NotepadIcon />
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-80 flex flex-col rounded border border-slate-200 bg-white shadow-2xl overflow-hidden"
          style={{ height: 420 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#0f2a4a] shrink-0">
            <div className="flex items-center gap-2">
              <NotepadIcon className="text-white/70 w-3.5 h-3.5" />
              <span className="text-xs font-semibold text-white tracking-wide uppercase">Notepad</span>
            </div>
            <div className="flex items-center gap-2">
              {saving && <span className="text-[10px] text-white/40">saving…</span>}
              <button
                onClick={() => setOpen(false)}
                className="text-white/60 hover:text-white transition-colors"
                title="Close"
              >
                <XIcon />
              </button>
            </div>
          </div>

          {/* Page tabs */}
          <div className="flex items-center gap-0 border-b border-slate-200 bg-slate-50 shrink-0 overflow-x-auto">
            {pages.map((p) => (
              <div key={p.id} className="relative flex items-center group shrink-0">
                <button
                  onClick={() => setActiveId(p.id)}
                  className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors border-r border-slate-200 ${
                    p.id === activeId
                      ? "bg-white text-slate-900 border-b-2 border-b-[#1a6bbf]"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/60"
                  }`}
                >
                  {p.title}
                </button>
                {pages.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deletePage(p.id); }}
                    className="absolute right-0.5 top-0.5 hidden group-hover:flex w-3.5 h-3.5 items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                    title="Delete page"
                  >
                    <span className="text-[9px] leading-none">✕</span>
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addPage}
              title="New page"
              className="px-2.5 py-1.5 text-slate-400 hover:text-slate-700 hover:bg-white/60 text-sm shrink-0 transition-colors"
            >
              +
            </button>
          </div>

          {/* Page title */}
          <div className="px-3 pt-2 pb-1 shrink-0 border-b border-slate-100">
            <input
              value={activePage?.title ?? ""}
              onChange={(e) => updateTitle(e.target.value)}
              maxLength={60}
              className="w-full text-xs font-semibold text-slate-700 bg-transparent focus:outline-none placeholder:text-slate-400"
              placeholder="Page title…"
            />
          </div>

          {/* Content textarea */}
          {loadError ? (
            <div className="flex-1 flex items-center justify-center px-4 text-center text-sm text-red-500">
              Failed to load notepad. Check your connection and try again.
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={activePage?.content ?? ""}
              onChange={(e) => updateContent(e.target.value)}
              placeholder="Start writing…"
              className="flex-1 w-full px-3 py-2 text-sm text-slate-800 bg-white resize-none focus:outline-none placeholder:text-slate-300 leading-relaxed"
            />
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-100 bg-slate-50 shrink-0">
            <span className="text-[10px] text-slate-400">
              {activePage?.content.length ?? 0} chars
            </span>
            <button
              onClick={clearPage}
              disabled={!activePage?.content}
              className="text-[11px] text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Clear page
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function NotepadIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="1" width="10" height="14" rx="1" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="5" y1="7" x2="11" y2="7" />
      <line x1="5" y1="10" x2="11" y2="10" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="2" y1="2" x2="12" y2="12" />
      <line x1="12" y1="2" x2="2" y2="12" />
    </svg>
  );
}
