"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const ACCEPTED = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-400 mb-1">{hint}</p>}
      {children}
    </div>
  );
}

const INPUT = "w-full h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400";
const TEXTAREA = "w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400";
const INPUT_SM = "h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400";

export function CandidateForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);

    // Send the form directly as multipart/form-data — the API reads formData()
    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/candidates", {
      method: "POST",
      body: formData, // no Content-Type header — browser sets multipart boundary automatically
    });

    setSaving(false);

    if (res.ok) {
      const data = await res.json();
      router.push(`/candidates/${data.id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create candidate.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">

      {/* ── Identity ── */}
      <Section title="Basic Information">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name *">
            <input name="firstName" required className={INPUT} />
          </Field>
          <Field label="Last name *">
            <input name="lastName" required className={INPUT} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email">
            <input name="resumeEmail" type="email" className={INPUT} />
          </Field>
          <Field label="Phone">
            <input name="resumePhone" type="tel" className={INPUT} placeholder="(312) 555-0100" />
          </Field>
        </div>
        <Field label="LinkedIn URL">
          <input name="linkedinUrl" type="url" className={INPUT} placeholder="https://linkedin.com/in/..." />
        </Field>
      </Section>

      {/* ── Location ── */}
      <Section title="Location">
        <Field label="Street address">
          <input name="candidateAddress" className={INPUT} />
        </Field>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <Field label="City">
              <input name="candidateCity" className={INPUT} />
            </Field>
          </div>
          <Field label="State">
            <input name="candidateState" className={INPUT_SM + " w-full"} placeholder="IL" maxLength={2} />
          </Field>
          <Field label="ZIP">
            <input name="candidateZip" className={INPUT_SM + " w-full"} placeholder="60601" maxLength={10} />
          </Field>
        </div>
      </Section>

      {/* ── Work History ── */}
      <Section title="Work History">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Current / most recent title">
            <input name="currentTitle" className={INPUT} />
          </Field>
          <Field label="Current / most recent employer">
            <input name="currentEmployer" className={INPUT} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Applied / target role">
            <input name="appliedRole" className={INPUT} />
          </Field>
          <Field label="Years of experience">
            <input name="yearsOfExperience" type="number" min="0" max="60" className={INPUT} />
          </Field>
        </div>
        <SourceField />
        <Field label="Work history summary">
          <textarea name="workHistorySummary" rows={3} className={TEXTAREA} placeholder="Brief overview of background..." />
        </Field>
      </Section>

      {/* ── Education ── */}
      <Section title="Education">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Degree">
            <input name="educationDegree" className={INPUT} placeholder="Bachelor of Science" />
          </Field>
          <Field label="Major / field of study">
            <input name="educationMajor" className={INPUT} placeholder="Political Science" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Institution">
            <input name="educationInstitution" className={INPUT} placeholder="DePaul University" />
          </Field>
          <Field label="Graduation year">
            <input name="educationYear" type="number" min="1950" max="2040" className={INPUT} placeholder="2018" />
          </Field>
        </div>
      </Section>

      {/* ── Credentials & Preferences ── */}
      <Section title="Credentials & Preferences">
        <Field label="Certifications" hint="Comma-separated — e.g. NALA Paralegal Certificate, Illinois Notary">
          <input name="certifications" className={INPUT} />
        </Field>
        <Field label="Bar admissions" hint="Comma-separated — e.g. Illinois, Federal - N.D. Ill.">
          <input name="barAdmissions" className={INPUT} />
        </Field>
        <Field label="Languages" hint="Comma-separated — e.g. English, Spanish (fluent)">
          <input name="languages" className={INPUT} placeholder="English" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Typing speed (WPM)">
            <input name="typingWpm" type="number" min="0" max="300" className={INPUT} />
          </Field>
          <Field label="Desired salary ($/year)">
            <input name="desiredSalary" type="number" min="0" className={INPUT} placeholder="65000" />
          </Field>
        </div>
        <Field label="Availability notes">
          <input name="availabilityNotes" className={INPUT} placeholder="Available immediately, hybrid only, etc." />
        </Field>
      </Section>

      {/* ── Resume Upload ── */}
      <Section title="Resume">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Upload resume <span className="text-slate-400 font-normal">(PDF or DOCX, max 15MB — optional)</span>
          </label>
          <div
            className="flex items-center gap-3 rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-4 cursor-pointer hover:border-slate-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <span className="text-slate-400 text-lg">📄</span>
            <span className="text-sm text-slate-600">
              {fileName ?? "Click to choose a file"}
            </span>
          </div>
          <input
            ref={fileRef}
            name="resume"
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </div>
      </Section>

      {/* ── Submit ── */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="h-9 px-6 text-sm font-medium bg-slate-900 text-white rounded hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Create candidate"}
        </button>
        <a
          href="/candidates"
          className="h-9 px-4 flex items-center text-sm text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="border-b border-slate-200 pb-2">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

const PRESET_SOURCES = [
  "LinkedIn",
  "Indeed",
  "ZipRecruiter",
  "Referral",
  "Direct Contact",
  "Website",
  "Career Fair",
  "Other",
];

function SourceField() {
  const [selected, setSelected] = useState("Manual Entry");
  const [customSource, setCustomSource] = useState("");
  const isOther = selected === "Other";

  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Source">
        <select
          name={isOther ? undefined : "source"}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full h-9 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="Manual Entry">Manual Entry</option>
          {PRESET_SOURCES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </Field>
      {isOther && (
        <Field label="Custom source">
          <input
            name="source"
            value={customSource}
            onChange={(e) => setCustomSource(e.target.value)}
            className={INPUT}
            placeholder="e.g. Bar Association Newsletter"
          />
        </Field>
      )}
      {/* Hidden input so non-Other selections always have a source field in the form */}
      {!isOther && <input type="hidden" name="source" value={selected} />}
    </div>
  );
}
