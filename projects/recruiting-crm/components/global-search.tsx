"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  candidates: {
    id: string;
    name: string;
    appliedRole: string | null;
    currentTitle: string | null;
    aiTier: string | null;
    status: string;
  }[];
  candidatesHasMore: boolean;
  jobs: {
    id: string;
    title: string;
    clientName: string;
    status: string;
    roleType: string | null;
  }[];
  jobsHasMore: boolean;
  clients: {
    id: string;
    name: string;
    industry: string | null;
    specialty: string | null;
    city: string | null;
    state: string | null;
  }[];
  clientsHasMore: boolean;
  submissions: {
    id: string;
    status: string;
    candidateName: string;
    candidate: { id: string };
    jobOrder: { id: string; title: string; clientName: string };
  }[];
  submissionsHasMore: boolean;
}

const TIER_DOT: Record<string, string> = {
  TIER_1: "bg-emerald-500",
  TIER_2: "bg-blue-500",
  TIER_3: "bg-amber-500",
  TIER_4: "bg-red-400",
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // CMD+K to open
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults(null);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 200);
  }

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  const hasResults = results && (
    results.candidates.length > 0 ||
    results.jobs.length > 0 ||
    results.clients.length > 0 ||
    (results.submissions?.length ?? 0) > 0
  );
  const noResults = results && !hasResults && query.length >= 2 && !loading;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm"
        title="Search (⌘K)"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline text-xs">Search</span>
        <kbd className="hidden md:inline text-[10px] px-1 py-0.5 rounded bg-white/10 text-white/40 font-mono">⌘K</kbd>
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: "rgba(15, 42, 74, 0.6)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-xl bg-white rounded shadow-2xl overflow-hidden">
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Search candidates, jobs, clients…"
                className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {loading && (
                <div className="h-4 w-4 border-2 border-slate-300 border-t-[#1a6bbf] rounded-full animate-spin shrink-0" />
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {noResults && (
                <div className="px-4 py-8 text-center text-sm text-slate-400">
                  No results for &ldquo;{query}&rdquo;
                </div>
              )}

              {results?.candidates && results.candidates.length > 0 && (
                <ResultSection
                  label="Candidates"
                  seeAllHref={results.candidatesHasMore ? `/candidates?q=${encodeURIComponent(query)}` : undefined}
                  onSeeAll={() => navigate(`/candidates?q=${encodeURIComponent(query)}`)}
                >
                  {results.candidates.map((c) => (
                    <ResultRow
                      key={c.id}
                      primary={c.name}
                      secondary={[c.currentTitle, c.appliedRole].filter(Boolean).join(" · ")}
                      badge={
                        <span className={cn("w-2 h-2 rounded-full shrink-0", c.aiTier ? (TIER_DOT[c.aiTier] ?? "bg-slate-300") : "bg-transparent")} />
                      }
                      onClick={() => navigate(`/candidates/${c.id}`)}
                    />
                  ))}
                </ResultSection>
              )}

              {results?.jobs && results.jobs.length > 0 && (
                <ResultSection
                  label="Jobs"
                  seeAllHref={results.jobsHasMore ? `/jobs?q=${encodeURIComponent(query)}` : undefined}
                  onSeeAll={() => navigate(`/jobs?q=${encodeURIComponent(query)}`)}
                >
                  {results.jobs.map((j) => (
                    <ResultRow
                      key={j.id}
                      primary={j.title}
                      secondary={j.clientName}
                      badge={
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0",
                          j.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        )}>
                          {j.status}
                        </span>
                      }
                      onClick={() => navigate(`/jobs/${j.id}`)}
                    />
                  ))}
                </ResultSection>
              )}

              {results?.clients && results.clients.length > 0 && (
                <ResultSection
                  label="Clients"
                  seeAllHref={results.clientsHasMore ? `/clients` : undefined}
                  onSeeAll={() => navigate(`/clients`)}
                >
                  {results.clients.map((c) => (
                    <ResultRow
                      key={c.id}
                      primary={c.name}
                      secondary={[c.specialty, c.city && c.state ? `${c.city}, ${c.state}` : (c.city || c.state)].filter(Boolean).join(" · ")}
                      onClick={() => navigate(`/clients/${c.id}`)}
                    />
                  ))}
                </ResultSection>
              )}

              {results?.submissions && results.submissions.length > 0 && (
                <ResultSection label="Submissions">
                  {results.submissions.map((s) => (
                    <ResultRow
                      key={s.id}
                      primary={s.candidateName}
                      secondary={`${s.jobOrder.title} · ${s.jobOrder.clientName}`}
                      badge={
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 bg-slate-100 text-slate-500 whitespace-nowrap">
                          {s.status.replace(/_/g, " ")}
                        </span>
                      }
                      onClick={() => navigate(`/candidates/${s.candidate.id}`)}
                    />
                  ))}
                </ResultSection>
              )}

              {!results && query.length < 2 && (
                <div className="px-4 py-6 text-center text-xs text-slate-400">
                  Type at least 2 characters to search
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ResultSection({
  label,
  seeAllHref,
  onSeeAll,
  children,
}: {
  label: string;
  seeAllHref?: string;
  onSeeAll?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      {children}
      {seeAllHref && (
        <button
          onClick={onSeeAll}
          className="w-full px-4 py-2 text-xs text-[#1a6bbf] hover:bg-slate-50 text-left transition-colors border-t border-slate-100"
        >
          See all {label.toLowerCase()} →
        </button>
      )}
    </div>
  );
}

function ResultRow({
  primary,
  secondary,
  badge,
  onClick,
}: {
  primary: string;
  secondary?: string;
  badge?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left transition-colors"
    >
      {badge && <span className="shrink-0">{badge}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{primary}</p>
        {secondary && <p className="text-xs text-slate-400 truncate">{secondary}</p>}
      </div>
    </button>
  );
}
