"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CandidateTier } from "@prisma/client";
import { TIER_LABEL, TIER_CLASSES, TIER_SCORE_COLOR as SCORE_COLOR } from "@/lib/candidate-display";
import { fileAge } from "@/lib/utils";

// All toggleable field keys + their display labels
const FIELD_LABELS: Record<string, string> = {
  resumeEmail:        "Email",
  resumePhone:        "Phone",
  linkedinUrl:        "LinkedIn",
  candidateLocation:  "Location / Address",
  currentEmployer:    "Current Employer",
  currentTitle:       "Current Title",
  appliedRole:        "Applied Role",
  yearsOfExperience:  "Years of Experience",
  educationDegree:    "Education (Degree)",
  educationInstitution: "Education (Institution)",
  certifications:     "Certifications",
  barAdmissions:      "Bar Admissions",
  languages:          "Languages",
  typingWpm:          "Typing Speed (WPM)",
  desiredSalary:      "Desired Salary",
  availabilityNotes:  "Availability Notes",
  workHistorySummary: "Work History Summary",
};
const ALL_FIELDS = Object.keys(FIELD_LABELS);

type EditableCandidate = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  currentTitle: string | null;
  currentEmployer: string | null;
  appliedRole: string | null;
  resumeEmail: string | null;
  resumePhone: string | null;
  linkedinUrl: string | null;
  candidateAddress: string | null;
  candidateCity: string | null;
  candidateState: string | null;
  candidateZip: string | null;
  candidateLocation: string | null;
  yearsOfExperience: number | null;
  typingWpm: number | null;
  desiredSalary: number | null;
  availabilityNotes: string | null;
  workHistorySummary: string | null;
  // Education
  educationDegree: string | null;
  educationMajor: string | null;
  educationInstitution: string | null;
  educationYear: number | null;
  // Credentials
  languages: string[];
  certifications: string[];
  barAdmissions: string[];
  // Read-only display
  aiCompositeScore: number | null;
  aiTier: CandidateTier | null;
  source: string;
  createdAt: Date;
  originalEntryDate: Date | null;
};

interface Props {
  candidate: EditableCandidate;
  /** Which fields to show in view mode. If undefined, all fields are shown. */
  initialFieldPrefs?: string[];
}

export function CandidateEditor({ candidate, initialFieldPrefs }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  // Field visibility — defaults to all visible when no prefs saved
  const [visibleFields, setVisibleFields] = useState<Set<string>>(
    () => new Set(initialFieldPrefs ?? ALL_FIELDS)
  );
  const [showVisibility, setShowVisibility] = useState(false);

  const isVisible = (key: string) => visibleFields.has(key);
  const toggleField = (key: string) =>
    setVisibleFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Form state — starts from current candidate values
  const [form, setForm] = useState({
    firstName: candidate.firstName ?? "",
    lastName: candidate.lastName ?? "",
    currentTitle: candidate.currentTitle ?? "",
    currentEmployer: candidate.currentEmployer ?? "",
    appliedRole: candidate.appliedRole ?? "",
    resumeEmail: candidate.resumeEmail ?? "",
    resumePhone: candidate.resumePhone ?? "",
    linkedinUrl: candidate.linkedinUrl ?? "",
    candidateAddress: candidate.candidateAddress ?? "",
    candidateCity: candidate.candidateCity ?? "",
    candidateState: candidate.candidateState ?? "",
    candidateZip: candidate.candidateZip ?? "",
    yearsOfExperience: candidate.yearsOfExperience?.toString() ?? "",
    typingWpm: candidate.typingWpm?.toString() ?? "",
    desiredSalary: candidate.desiredSalary?.toString() ?? "",
    availabilityNotes: candidate.availabilityNotes ?? "",
    workHistorySummary: candidate.workHistorySummary ?? "",
    educationDegree: candidate.educationDegree ?? "",
    educationMajor: candidate.educationMajor ?? "",
    educationInstitution: candidate.educationInstitution ?? "",
    educationYear: candidate.educationYear?.toString() ?? "",
    languages: candidate.languages.join(", "),
    certifications: candidate.certifications.join(", "),
    barAdmissions: candidate.barAdmissions.join(", "),
  });

  const set = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const displayName =
    candidate.displayName ||
    [candidate.firstName, candidate.lastName].filter(Boolean).join(" ") ||
    "Unknown Candidate";

  const tier = candidate.aiTier;

  async function handleSave() {
    setError("");
    const payload: Record<string, unknown> = {
      firstName: form.firstName || null,
      lastName: form.lastName || null,
      // Clear the n8n-set displayName so firstName+lastName takes over for display
      displayName: null,
      currentTitle: form.currentTitle || null,
      currentEmployer: form.currentEmployer || null,
      appliedRole: form.appliedRole || null,
      resumeEmail: form.resumeEmail || null,
      resumePhone: form.resumePhone || null,
      linkedinUrl: form.linkedinUrl || null,
      candidateAddress: form.candidateAddress || null,
      candidateCity: form.candidateCity || null,
      candidateState: form.candidateState || null,
      candidateZip: form.candidateZip || null,
      yearsOfExperience: form.yearsOfExperience ? parseInt(form.yearsOfExperience) : null,
      typingWpm: form.typingWpm ? parseInt(form.typingWpm) : null,
      desiredSalary: form.desiredSalary ? parseInt(form.desiredSalary) : null,
      availabilityNotes: form.availabilityNotes || null,
      workHistorySummary: form.workHistorySummary || null,
      educationDegree: form.educationDegree || null,
      educationMajor: form.educationMajor || null,
      educationInstitution: form.educationInstitution || null,
      educationYear: form.educationYear ? parseInt(form.educationYear) : null,
      languages: form.languages ? form.languages.split(",").map((s) => s.trim()).filter(Boolean) : [],
      certifications: form.certifications ? form.certifications.split(",").map((s) => s.trim()).filter(Boolean) : [],
      barAdmissions: form.barAdmissions ? form.barAdmissions.split(",").map((s) => s.trim()).filter(Boolean) : [],
    };

    const [res] = await Promise.all([
      fetch(`/api/candidates/${candidate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      // Save field visibility prefs in parallel
      fetch("/api/users/me/field-prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: [...visibleFields] }),
      }),
    ]);

    if (res.ok) {
      startTransition(() => {
        router.refresh();
        setEditing(false);
      });
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save changes.");
    }
  }

  function handleCancel() {
    setEditing(false);
    setError("");
    // Reset form to original values
    setForm({
      firstName: candidate.firstName ?? "",
      lastName: candidate.lastName ?? "",
      currentTitle: candidate.currentTitle ?? "",
      currentEmployer: candidate.currentEmployer ?? "",
      appliedRole: candidate.appliedRole ?? "",
      resumeEmail: candidate.resumeEmail ?? "",
      resumePhone: candidate.resumePhone ?? "",
      linkedinUrl: candidate.linkedinUrl ?? "",
      candidateAddress: candidate.candidateAddress ?? "",
      candidateCity: candidate.candidateCity ?? "",
      candidateState: candidate.candidateState ?? "",
      candidateZip: candidate.candidateZip ?? "",
      yearsOfExperience: candidate.yearsOfExperience?.toString() ?? "",
      typingWpm: candidate.typingWpm?.toString() ?? "",
      desiredSalary: candidate.desiredSalary?.toString() ?? "",
      availabilityNotes: candidate.availabilityNotes ?? "",
      workHistorySummary: candidate.workHistorySummary ?? "",
      educationDegree: candidate.educationDegree ?? "",
      educationMajor: candidate.educationMajor ?? "",
      educationInstitution: candidate.educationInstitution ?? "",
      educationYear: candidate.educationYear?.toString() ?? "",
      languages: candidate.languages.join(", "),
      certifications: candidate.certifications.join(", "),
      barAdmissions: candidate.barAdmissions.join(", "),
    });
  }

  // ── VIEW MODE ──────────────────────────────────────────────────────────────

  if (!editing) {
    const location = [
      candidate.candidateLocation || [candidate.candidateCity, candidate.candidateState].filter(Boolean).join(", "),
      candidate.candidateZip,
    ].filter(Boolean).join(" ");

    return (
      <div className="rounded border border-slate-200 bg-white p-6 space-y-5">
        {/* Header: name + score + edit */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold text-slate-900 leading-tight">{displayName}</h2>
            {candidate.currentTitle && (
              <p className="text-sm text-slate-500 mt-0.5">
                {candidate.currentTitle}
                {candidate.currentEmployer && (
                  <span className="text-slate-400"> · {candidate.currentEmployer}</span>
                )}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {tier && (
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${TIER_CLASSES[tier]}`}>
                  {TIER_LABEL[tier]}
                </span>
              )}
              {candidate.appliedRole && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
                  Applied: {candidate.appliedRole}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-3 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition-colors"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Info grid */}
        <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-3">
          {/* Contact */}
          {isVisible("resumeEmail") && candidate.resumeEmail && (
            <InfoCell label="Email">
              <div className="flex items-center gap-1.5">
                <a href={`mailto:${candidate.resumeEmail}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                  {candidate.resumeEmail}
                </a>
                <CopyButton value={candidate.resumeEmail} />
              </div>
            </InfoCell>
          )}
          {isVisible("resumePhone") && candidate.resumePhone && (
            <InfoCell label="Phone">
              <div className="flex items-center gap-1.5">
                <a href={`tel:${candidate.resumePhone}`} target="_blank" rel="noopener noreferrer" className="text-slate-800 hover:underline">
                  {candidate.resumePhone}
                </a>
                <CopyButton value={candidate.resumePhone} />
              </div>
            </InfoCell>
          )}

          {/* Employment */}
          {isVisible("currentEmployer") && candidate.currentEmployer && (
            <InfoCell label="Employer">{candidate.currentEmployer}</InfoCell>
          )}
          {isVisible("currentTitle") && candidate.currentTitle && (
            <InfoCell label="Title">{candidate.currentTitle}</InfoCell>
          )}
          {isVisible("appliedRole") && candidate.appliedRole && (
            <InfoCell label="Applied Role">{candidate.appliedRole}</InfoCell>
          )}
          {isVisible("yearsOfExperience") && candidate.yearsOfExperience != null && (
            <InfoCell label="Experience">{candidate.yearsOfExperience} years</InfoCell>
          )}

          {/* Education */}
          {(isVisible("educationDegree") || isVisible("educationInstitution")) && (candidate.educationDegree || candidate.educationInstitution) && (
            <InfoCell label="Education" fullWidth>
              <div className="space-y-0.5">
                {isVisible("educationDegree") && (candidate.educationDegree || candidate.educationMajor) && (
                  <div>{[candidate.educationDegree, candidate.educationMajor].filter(Boolean).join(" · ")}</div>
                )}
                {isVisible("educationInstitution") && (candidate.educationInstitution || candidate.educationYear) && (
                  <div className="text-slate-500 text-xs">{[candidate.educationInstitution, candidate.educationYear?.toString()].filter(Boolean).join(" · ")}</div>
                )}
              </div>
            </InfoCell>
          )}
          {isVisible("certifications") && candidate.certifications.length > 0 && (
            <InfoCell label="Certifications" fullWidth>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {candidate.certifications.map((c) => (
                  <span key={c} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">{c}</span>
                ))}
              </div>
            </InfoCell>
          )}
          {isVisible("languages") && candidate.languages.length > 0 && (
            <InfoCell label="Languages" fullWidth>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {candidate.languages.map((l) => (
                  <span key={l} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">{l}</span>
                ))}
              </div>
            </InfoCell>
          )}
          {isVisible("barAdmissions") && candidate.barAdmissions.length > 0 && (
            <InfoCell label="Bar Admissions" fullWidth>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {candidate.barAdmissions.map((b) => (
                  <span key={b} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100">{b}</span>
                ))}
              </div>
            </InfoCell>
          )}

          {/* Compensation */}
          {isVisible("desiredSalary") && candidate.desiredSalary != null && (
            <InfoCell label="Desired Pay">${candidate.desiredSalary.toLocaleString()}</InfoCell>
          )}
          {isVisible("typingWpm") && candidate.typingWpm != null && (
            <InfoCell label="Typing Speed">{candidate.typingWpm} WPM</InfoCell>
          )}

          {/* Location */}
          {isVisible("candidateLocation") && candidate.candidateAddress && (
            <InfoCell label="Address" fullWidth>{candidate.candidateAddress}</InfoCell>
          )}
          {isVisible("candidateLocation") && location && (
            <InfoCell label="Location" fullWidth>{location}</InfoCell>
          )}

          {/* Other */}
          {isVisible("availabilityNotes") && candidate.availabilityNotes && (
            <InfoCell label="Availability" fullWidth>{candidate.availabilityNotes}</InfoCell>
          )}
          {isVisible("workHistorySummary") && candidate.workHistorySummary && (
            <InfoCell label="Work History Summary" fullWidth>
              <span className="font-normal leading-relaxed whitespace-pre-line text-slate-700">{candidate.workHistorySummary}</span>
            </InfoCell>
          )}
          {isVisible("linkedinUrl") && candidate.linkedinUrl && (
            <InfoCell label="LinkedIn" fullWidth>
              <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                {candidate.linkedinUrl}
              </a>
            </InfoCell>
          )}

          <InfoCell label="Source" fullWidth>
            <div className="space-y-0.5">
              <div>{candidate.source} · Added {new Date(candidate.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
              {candidate.originalEntryDate ? (
                <div className="text-amber-700 font-semibold">
                  CRI on file since {new Date(candidate.originalEntryDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {fileAge(new Date(candidate.originalEntryDate))}
                </div>
              ) : (
                <div className="text-slate-500">{fileAge(new Date(candidate.createdAt))} on file</div>
              )}
            </div>
          </InfoCell>
        </div>
      </div>
    );
  }

  // ── EDIT MODE ──────────────────────────────────────────────────────────────

  return (
    <div className="rounded border border-blue-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">Edit Profile</p>
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="text-xs px-2.5 py-1.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="text-xs px-2.5 py-1.5 rounded bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-3">
        <FieldGroup label="Name">
          <div className="grid grid-cols-2 gap-2">
            <TextInput label="First" value={form.firstName} onChange={set("firstName")} />
            <TextInput label="Last" value={form.lastName} onChange={set("lastName")} />
          </div>
        </FieldGroup>

        <TextInput label="Current title" value={form.currentTitle} onChange={set("currentTitle")} />
        <TextInput label="Current employer" value={form.currentEmployer} onChange={set("currentEmployer")} />
        <TextInput label="Applied for" value={form.appliedRole} onChange={set("appliedRole")} />

        <FieldGroup label="Location">
          <TextInput label="Street address" value={form.candidateAddress} onChange={set("candidateAddress")} />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <TextInput label="City" value={form.candidateCity} onChange={set("candidateCity")} />
            <TextInput label="State" value={form.candidateState} onChange={set("candidateState")} />
          </div>
          <div className="mt-2">
            <TextInput label="ZIP" value={form.candidateZip} onChange={set("candidateZip")} />
          </div>
        </FieldGroup>

        <TextInput label="Email" type="email" value={form.resumeEmail} onChange={set("resumeEmail")} />
        <TextInput label="Phone" type="tel" value={form.resumePhone} onChange={set("resumePhone")} />
        <TextInput label="LinkedIn URL" value={form.linkedinUrl} onChange={set("linkedinUrl")} />

        <div className="grid grid-cols-3 gap-2">
          <TextInput label="Years exp." type="number" value={form.yearsOfExperience} onChange={set("yearsOfExperience")} />
          <TextInput label="Typing WPM" type="number" value={form.typingWpm} onChange={set("typingWpm")} />
          <TextInput label="Desired salary $" type="number" value={form.desiredSalary} onChange={set("desiredSalary")} />
        </div>

        <FieldGroup label="Availability notes">
          <textarea
            value={form.availabilityNotes}
            onChange={set("availabilityNotes")}
            rows={2}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
        </FieldGroup>

        <FieldGroup label="Work history summary">
          <textarea
            value={form.workHistorySummary}
            onChange={set("workHistorySummary")}
            rows={5}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
          />
        </FieldGroup>

        <FieldGroup label="Education">
          <div className="grid grid-cols-2 gap-2">
            <TextInput label="Degree" value={form.educationDegree} onChange={set("educationDegree")} />
            <TextInput label="Major / Field of study" value={form.educationMajor} onChange={set("educationMajor")} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <TextInput label="Institution" value={form.educationInstitution} onChange={set("educationInstitution")} />
            <TextInput label="Graduation year" type="number" value={form.educationYear} onChange={set("educationYear")} />
          </div>
        </FieldGroup>

        <FieldGroup label="Credentials">
          <TextInput label="Languages (comma-separated)" value={form.languages} onChange={set("languages")} />
          <div className="mt-2">
            <TextInput label="Certifications (comma-separated)" value={form.certifications} onChange={set("certifications")} />
          </div>
          <div className="mt-2">
            <TextInput label="Bar admissions (comma-separated)" value={form.barAdmissions} onChange={set("barAdmissions")} />
          </div>
        </FieldGroup>

        {/* ── Field visibility ─────────────────────────────────────────── */}
        <div className="border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setShowVisibility((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Customize Profile View
            <span className="text-slate-400 ml-0.5">{showVisibility ? "▲" : "▼"}</span>
          </button>
          <p className="text-[11px] text-slate-400 mt-0.5">Choose which fields appear when viewing a profile. Applies to all candidates for your account.</p>

          {showVisibility && (
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
              {ALL_FIELDS.map((key) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={visibleFields.has(key)}
                    onChange={() => toggleField(key)}
                    className="rounded border-slate-300 text-slate-700 focus:ring-slate-400"
                  />
                  <span className="text-xs text-slate-600 group-hover:text-slate-800">{FIELD_LABELS[key]}</span>
                </label>
              ))}
              <div className="col-span-2 flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setVisibleFields(new Set(ALL_FIELDS))}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Show all
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleFields(new Set(["resumeEmail", "resumePhone", "currentEmployer", "currentTitle"]))}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Reset to minimal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function InfoCell({
  label,
  children,
  fullWidth = false,
}: {
  label: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={`${fullWidth ? "col-span-2" : ""} rounded bg-slate-50 border border-slate-100 px-3 py-2.5`}>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm font-medium text-slate-800">{children}</div>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }
  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      className="shrink-0 text-slate-300 hover:text-slate-500 transition-colors"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      {children}
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-0.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full h-8 rounded border border-slate-300 bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  );
}
