"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const themes = [
  {
    id: "default",
    label: "Corporate Blue",
    description: "Classic CRI brand blue",
    color: "#1a6bbf",
    light: "#dbeafe",
  },
  {
    id: "emerald",
    label: "Emerald",
    description: "Fresh professional green",
    color: "#059669",
    light: "#d1fae5",
  },
  {
    id: "violet",
    label: "Violet",
    description: "Bold and modern purple",
    color: "#7c3aed",
    light: "#ede9fe",
  },
  {
    id: "rose",
    label: "Rose",
    description: "Confident and energetic",
    color: "#e11d48",
    light: "#ffe4e6",
  },
  {
    id: "amber",
    label: "Amber",
    description: "Warm and approachable",
    color: "#d97706",
    light: "#fef3c7",
  },
  {
    id: "slate",
    label: "Slate",
    description: "Neutral and understated",
    color: "#475569",
    light: "#e2e8f0",
  },
];

function applyThemeToPage(id: string) {
  if (id === "default") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", id);
  }
}

export function ThemePicker() {
  // savedTheme = what's in the database (confirmed saved)
  // previewTheme = what the user is currently looking at (may not be saved yet)
  const [savedTheme, setSavedTheme] = useState<string>("default");
  const [previewTheme, setPreviewTheme] = useState<string>("default");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [loading, setLoading] = useState(true);

  // Load the user's saved theme from the server on mount
  useEffect(() => {
    fetch("/api/preferences/theme")
      .then((r) => r.json())
      .then((data) => {
        const t = data.theme ?? "default";
        setSavedTheme(t);
        setPreviewTheme(t);
        applyThemeToPage(t);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleSelect(id: string) {
    setPreviewTheme(id);
    applyThemeToPage(id);
    setSaveStatus("idle");
  }

  async function handleSave() {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/preferences/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: previewTheme }),
      });
      if (!res.ok) throw new Error("Failed");
      setSavedTheme(previewTheme);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  const hasUnsavedChange = previewTheme !== savedTheme;
  const activeTheme = themes.find((t) => t.id === previewTheme) ?? themes[0];

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your theme preference…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-medium text-slate-900">Accent Color</h3>
        <p className="text-sm text-slate-500 mt-0.5">
          Each user can choose their own accent color. Click a theme to preview, then save.
        </p>
      </div>

      {/* Swatches grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {themes.map((theme) => {
          const isSelected = previewTheme === theme.id;
          const isSaved = savedTheme === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => handleSelect(theme.id)}
              className={cn(
                "relative flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all cursor-pointer",
                isSelected
                  ? "border-slate-900 shadow-sm bg-white"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
              )}
            >
              {/* Color swatch */}
              <div className="flex flex-col gap-1 shrink-0">
                <div
                  className="h-7 w-7 rounded-full shadow-sm ring-1 ring-black/10"
                  style={{ backgroundColor: theme.color }}
                />
                <div
                  className="h-2 w-7 rounded-full"
                  style={{ backgroundColor: theme.light }}
                />
              </div>

              {/* Label */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 leading-tight">
                  {theme.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                  {theme.description}
                </p>
              </div>

              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-slate-900 flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                </div>
              )}

              {/* Saved indicator (when saved but not selected preview) */}
              {isSaved && !isSelected && (
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] font-medium text-slate-400 leading-none">saved</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Live preview */}
      <div className="rounded-lg border border-slate-200 p-4 bg-slate-50 space-y-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Preview</p>
        <div className="flex flex-wrap gap-2 items-center">
          <span
            className="inline-flex items-center px-3 py-1.5 rounded text-sm font-medium text-white"
            style={{ backgroundColor: activeTheme.color }}
          >
            Primary Button
          </span>
          <span
            className="inline-flex items-center px-3 py-1.5 rounded text-sm font-medium"
            style={{ color: activeTheme.color, backgroundColor: activeTheme.light }}
          >
            Active State
          </span>
          <span
            className="text-sm font-medium underline underline-offset-2"
            style={{ color: activeTheme.color }}
          >
            Link Text
          </span>
        </div>
      </div>

      {/* Save row */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving || !hasUnsavedChange}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all",
            hasUnsavedChange && !saving
              ? "bg-slate-900 text-white hover:bg-slate-700 cursor-pointer"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {saving ? "Saving…" : "Save Theme"}
        </button>

        {saveStatus === "saved" && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            Saved
          </span>
        )}
        {saveStatus === "error" && (
          <span className="text-sm text-red-600">Failed to save — try again</span>
        )}
        {hasUnsavedChange && saveStatus === "idle" && !saving && (
          <span className="text-xs text-slate-400">Unsaved preview</span>
        )}
      </div>
    </div>
  );
}
