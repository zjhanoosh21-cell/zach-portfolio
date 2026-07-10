"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { effectiveScore, effectiveTier } from "@/lib/candidate-display";

interface NavCandidate {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  status: string;
  aiCompositeScore: number | null;
  manualScore: number | null;
  useManualScore: boolean;
  aiTier: string | null;
}

interface Props {
  currentId: string;
  searchParamsStr: string; // serialized filters (no "from" param, no "page", no "panel")
  briefHref: string;
  initialPanelOpen: boolean; // passed from server so first render matches — no flash
  backHref?: string; // override default "/candidates?..." back link (e.g. "/dashboard")
  from?: string; // "list" | "dashboard" — preserved in navigation URLs
  tabBar?: React.ReactNode;
  children: React.ReactNode;
}

function candidateName(c: NavCandidate): string {
  return c.displayName || [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown";
}

export function CandidateListNavigator({ currentId, searchParamsStr, briefHref, initialPanelOpen, backHref: backHrefProp, from = "list", tabBar, children }: Props) {
  const router = useRouter();

  // Server passes the correct initial value — no hydration mismatch, no URL-reading effect
  const [panelOpen, setPanelOpen] = useState(initialPanelOpen);

  // panelFocused: true when the user last clicked inside the panel.
  // Survives navigation via sessionStorage so arrow keys keep working after clicking a candidate.
  const [panelFocused, setPanelFocused] = useState(() => {
    try { return sessionStorage.getItem("nav-panel-focused") === "1"; } catch { return false; }
  });

  // Keep sessionStorage in sync with state
  useEffect(() => {
    try { sessionStorage.setItem("nav-panel-focused", panelFocused ? "1" : "0"); } catch {}
  }, [panelFocused]);

  // Clear focus when panel closes
  useEffect(() => {
    if (!panelOpen) setPanelFocused(false);
  }, [panelOpen]);

  // Clear focus when clicking outside the panel
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [panelOpen]);

  // Transitions are disabled on first paint so the panel appears instantly on navigation.
  // After two animation frames the panel is already in its correct position, so enabling
  // transitions then won't cause any movement — only future manual toggles will animate.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setReady(true));
    });
  }, []);

  // Candidate list — cached in sessionStorage so navigating between candidates is instant
  const [candidates, setCandidates] = useState<NavCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const currentItemRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchCandidates = useCallback((bustCache = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setFetchError(false);

    const cacheKey = `nav-candidates:v2:${searchParamsStr}`;
    if (!bustCache) {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          setCandidates(JSON.parse(cached));
          setLoading(false);
        }
      } catch {}
    }

    fetch(`/api/candidates/navigator?${searchParamsStr}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not ok"))))
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setCandidates(arr);
        setLoading(false);
        try { sessionStorage.setItem(cacheKey, JSON.stringify(arr)); } catch {}
        try { sessionStorage.removeItem(`nav-candidates:${searchParamsStr}`); } catch {}
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return;
        setFetchError(true);
        setLoading(false);
      });
  }, [searchParamsStr]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Refresh list when a score is changed elsewhere (e.g. ManualScoreEditor)
  useEffect(() => {
    const handler = () => fetchCandidates(true);
    window.addEventListener("navigator:refresh", handler);
    return () => window.removeEventListener("navigator:refresh", handler);
  }, [fetchCandidates]);

  // Scroll to current candidate whenever panel opens
  useEffect(() => {
    if (panelOpen && currentItemRef.current) {
      setTimeout(() => {
        currentItemRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }, 150);
    }
  }, [panelOpen]);

  // Close panel on Escape key
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [panelOpen]);

  const currentIndex = candidates.findIndex((c) => c.id === currentId);
  const prev = currentIndex > 0 ? candidates[currentIndex - 1] : null;
  const next = currentIndex < candidates.length - 1 ? candidates[currentIndex + 1] : null;

  const backHref = backHrefProp ?? `/candidates?${searchParamsStr}`;

  const navigateTo = useCallback(
    (id: string) => {
      const panelParam = panelOpen ? "&panel=1" : "";
      router.push(`/candidates/${id}?from=${from}&${searchParamsStr}${panelParam}`);
    },
    [router, from, searchParamsStr, panelOpen]
  );

  // Arrow key navigation when panel is focused
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!panelFocused || !panelOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" && next) {
        e.preventDefault();
        navigateTo(next.id);
      } else if (e.key === "ArrowUp" && prev) {
        e.preventDefault();
        navigateTo(prev.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [panelFocused, panelOpen, next, prev, navigateTo]);

  return (
    <>
      {/* ── Fixed sliding panel — starts at top-28 (below the sticky sub nav bar) ── */}
      <div
        ref={panelRef}
        className={`fixed left-0 top-28 h-[calc(100vh-7rem)] w-72 z-30 bg-white border-r border-slate-200 flex flex-col ${ready ? "transition-transform duration-200" : ""} ${
          panelOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Panel header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
          <span className="text-sm font-semibold text-slate-800">
            {loading ? "Loading…" : fetchError ? "Error loading" : `Candidates (${candidates.length})`}
          </span>
          <button
            onClick={() => setPanelOpen(false)}
            className="text-slate-400 hover:text-slate-700 text-lg leading-none"
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        {/* Candidate list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-10 text-center text-sm text-slate-400">Loading candidates…</div>
          ) : fetchError ? (
            <div className="px-4 py-10 text-center text-sm text-red-500">Failed to load candidates.</div>
          ) : candidates.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-400">No candidates found.</div>
          ) : (
            candidates.map((c) => {
              const name = candidateName(c);
              const score = effectiveScore(c.aiCompositeScore, c.manualScore, c.useManualScore);
              const tier = effectiveTier(c.aiTier, c.aiCompositeScore, c.manualScore, c.useManualScore);
              const isCurrent = c.id === currentId;

              return (
                <button
                  key={c.id}
                  ref={isCurrent ? currentItemRef : undefined}
                  onClick={() => { setPanelFocused(true); navigateTo(c.id); }}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-3 border-l-4 border-b border-b-slate-100 transition-colors ${
                    isCurrent
                      ? "bg-blue-50 border-l-[#1a6bbf]"
                      : "hover:bg-slate-50 border-l-transparent"
                  }`}
                >
                  {/* Score circle */}
                  <div
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                      tier === "TIER_1"
                        ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                        : tier === "TIER_2"
                        ? "border-blue-400 bg-blue-50 text-blue-800"
                        : tier === "TIER_3"
                        ? "border-amber-400 bg-amber-50 text-amber-800"
                        : tier === "TIER_4"
                        ? "border-red-300 bg-red-50 text-red-800"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {score ?? "–"}
                  </div>

                  {/* Name + status */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm truncate leading-tight ${
                        isCurrent ? "font-semibold text-[#1a6bbf]" : "font-medium text-slate-800"
                      }`}
                    >
                      {name}
                    </p>
                    <p className="text-xs text-slate-400 truncate leading-tight mt-0.5">
                      {c.status.replace(/_/g, " ")}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── -mt-8 removes the py-8 gap from main layout so sub nav sits flush under the main navbar ── */}
      <div className="-mt-8">
      {/* ── Sticky sub nav bar — z-[35] keeps it above the panel at all times ── */}
      <div className="sticky top-16 z-[35] bg-white border-b border-slate-200 shadow-sm -mx-6 lg:-mx-10 px-6 lg:px-10 h-12 flex items-center mb-5">
        <div className="flex items-center justify-between w-full">
          {/* Left: back + list toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              ← Back
            </Link>

            <button
              onClick={() => setPanelOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded border transition-colors ${
                panelOpen
                  ? "bg-slate-900 text-white border-slate-900"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              ☰{" "}
              {loading ? "…" : `${candidates.length} candidate${candidates.length !== 1 ? "s" : ""}`}
            </button>
          </div>

          {/* Center: tab bar */}
          {tabBar && (
            <div className="flex-1 flex items-stretch h-full overflow-x-auto mx-2">
              {tabBar}
            </div>
          )}

          {/* Right: Print Brief | ← Prev | counter | Next → */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={briefHref}
              target="_blank"
              className="text-sm text-slate-500 hover:text-[#1a6bbf] transition-colors mr-1"
            >
              Print Brief ↗
            </Link>

            {prev && (
              <button
                onClick={() => navigateTo(prev.id)}
                title={candidateName(prev)}
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                ← Prev
              </button>
            )}

            {!loading && currentIndex >= 0 && (
              <span className="text-xs text-slate-400 tabular-nums">
                {currentIndex + 1} / {candidates.length}
              </span>
            )}

            {next && (
              <button
                onClick={() => navigateTo(next.id)}
                title={candidateName(next)}
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Profile content — shifts right when panel opens (squeeze effect) ── */}
      <div className={`${ready ? "transition-all duration-200" : ""} ${panelOpen ? "ml-72" : ""}`}>
        <div className="space-y-5">
          {children}
        </div>
      </div>
      </div>{/* end -mt-8 wrapper */}
    </>
  );
}
