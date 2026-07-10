"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface GeneralSettingsProps {
  companyName: string;
  intakeEnabled: boolean;
  aiScoringEnabled: boolean;
  hasDeletionPin: boolean;
  isAdmin: boolean;
}

export function GeneralSettings({
  companyName: initialCompanyName,
  intakeEnabled: initialIntakeEnabled,
  aiScoringEnabled: initialAiScoringEnabled,
  hasDeletionPin,
  isAdmin,
}: GeneralSettingsProps) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [intakeEnabled, setIntakeEnabled] = useState(initialIntakeEnabled);
  const [aiScoringEnabled, setAiScoringEnabled] = useState(initialAiScoringEnabled);
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = hasDeletionPin && companyName.trim().length > 0 && pin.length === 4;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_general",
          pin,
          companyName: companyName.trim(),
          intakeEnabled,
          aiScoringEnabled,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save settings");
        return;
      }
      setSaved(true);
      setPin("");
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="space-y-5 opacity-60 pointer-events-none select-none">
        <p className="text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 rounded px-3 py-2 !opacity-100 pointer-events-auto select-auto">
          View only — System Admins can edit these settings.
        </p>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Company Name</label>
          <input type="text" value={companyName} disabled readOnly className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed" />
        </div>
        <div className="space-y-3 pt-1">
          <Toggle label="Resume Intake" description="Accept new candidates from the n8n workflow." checked={intakeEnabled} onChange={() => {}} offLabel="Paused" onLabel="Active" disabled />
          <Toggle label="AI Scoring" description="Show tier badges, score circles, and the AI Analysis section." checked={aiScoringEnabled} onChange={() => {}} offLabel="Hidden" onLabel="Visible" disabled />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Company name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Company Name</label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          maxLength={100}
          className="w-full rounded border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1a6bbf]"
        />
        <p className="text-xs text-slate-400">Used in email templates and system messages.</p>
      </div>

      {/* Toggles */}
      <div className="space-y-3 pt-1">
        <Toggle
          label="Resume Intake"
          description="Accept new candidates from the n8n workflow. Disable to pause intake during maintenance."
          checked={intakeEnabled}
          onChange={setIntakeEnabled}
          offLabel="Paused"
          onLabel="Active"
        />
        <Toggle
          label="AI Scoring"
          description="Show tier badges, score circles, and the AI Analysis section. Disable if n8n scoring is not in use."
          checked={aiScoringEnabled}
          onChange={setAiScoringEnabled}
          offLabel="Hidden"
          onLabel="Visible"
        />
      </div>

      {/* PIN confirmation */}
      {!hasDeletionPin ? (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          A Deletion PIN must be set before you can change these settings. Set one in the <strong>Candidate Deletion PIN</strong> section below.
        </p>
      ) : (
        <div className="space-y-2 pt-2">
          <label className="block text-sm font-medium text-slate-700">Confirm with Deletion PIN</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="Enter 4-digit PIN"
            className="w-40 rounded border border-slate-200 px-3 py-2 text-sm text-slate-800 tracking-widest focus:outline-none focus:ring-2 focus:ring-[#1a6bbf]"
          />
        </div>
      )}

      {/* Save button */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saving || !canSave}
          className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  onLabel,
  offLabel,
  disabled = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  onLabel: string;
  offLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded border border-slate-200 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs font-medium ${checked ? "text-green-600" : "text-slate-400"}`}>
          {checked ? onLabel : offLabel}
        </span>
        <button
          role="switch"
          aria-checked={checked}
          onClick={() => !disabled && onChange(!checked)}
          disabled={disabled}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            checked ? "bg-green-500" : "bg-slate-300"
          } ${disabled ? "cursor-not-allowed" : ""}`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              checked ? "translate-x-4.5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
