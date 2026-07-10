"use client";

import { useState, useRef, useEffect } from "react";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  allLabel: string;
  /** Show a search box at the top of the dropdown (useful for long, dynamic lists). */
  searchable?: boolean;
  searchPlaceholder?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  allLabel,
  searchable = false,
  searchPlaceholder = "Search…",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const q = search.trim().toLowerCase();
  const visible = searchable && q
    ? options.filter((o) => o.label.toLowerCase().includes(q))
    : options;

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function toggle(value: string) {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    );
  }

  const label =
    selected.length === 0
      ? allLabel
      : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? selected[0]
      : `${selected.length} selected`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`h-9 rounded border px-2.5 text-sm flex items-center gap-1.5 whitespace-nowrap transition-colors focus:outline-none ${
          selected.length > 0
            ? "border-[#1a6bbf] bg-blue-50 text-[#1a6bbf] font-medium"
            : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
        }`}
      >
        {label}
        <svg
          className="w-3 h-3 opacity-60 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-10 left-0 z-50 min-w-[12rem] rounded border border-slate-200 bg-white shadow-lg py-1">
          {searchable && (
            <div className="px-2 pb-1.5 pt-0.5">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 w-full rounded border border-slate-300 px-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          )}
          <div className="max-h-64 overflow-auto">
            {visible.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">No matches</div>
            ) : (
              visible.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(opt.value)}
                    onChange={() => toggle(opt.value)}
                    className="h-3.5 w-3.5 rounded border-slate-300 accent-[#1a6bbf]"
                  />
                  <span className="text-sm text-slate-700">{opt.label}</span>
                </label>
              ))
            )}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-slate-100 mt-1 pt-1 px-3 pb-1">
              <button
                type="button"
                onClick={() => {
                  onChange([]);
                  setOpen(false);
                }}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
