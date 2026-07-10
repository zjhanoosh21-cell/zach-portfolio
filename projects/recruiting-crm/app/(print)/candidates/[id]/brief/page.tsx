import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/candidate/print-button";
import { effectiveScore, effectiveTier } from "@/lib/candidate-display";

const TIER_LABEL: Record<string, string> = {
  TIER_1: "Tier 1 — Strong Match",
  TIER_2: "Tier 2 — Good Match",
  TIER_3: "Tier 3 — Possible Match",
  TIER_4: "Tier 4 — Poor Match",
};

const ROLE_TYPE_LABELS: Record<string, string> = {
  LEGAL_SECRETARY: "Legal Secretary",
  LEGAL_ASSISTANT: "Legal Assistant",
  PARALEGAL: "Paralegal",
  BILLING_CLERK: "Billing Clerk",
  BILLING_COORDINATOR: "Billing Coordinator",
  OTHER_LEGAL: "Other Legal",
  OTHER_PROFESSIONAL: "Other Professional",
  NON_LEGAL: "Non-Legal",
};

export default async function CandidateBriefPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) notFound();

  const name =
    candidate.displayName ||
    [candidate.firstName, candidate.lastName].filter(Boolean).join(" ") ||
    "Unknown Candidate";

  const contactItems = [
    candidate.resumeEmail,
    candidate.resumePhone,
    candidate.linkedinUrl,
  ].filter(Boolean);

  const locationParts = [
    candidate.candidateCity && candidate.candidateState
      ? `${candidate.candidateCity}, ${candidate.candidateState}`
      : candidate.candidateCity || candidate.candidateState,
    candidate.candidateZip,
  ].filter(Boolean);

  const effScore = effectiveScore(candidate.aiCompositeScore, candidate.manualScore, candidate.useManualScore);
  const tier = effectiveTier(candidate.aiTier, candidate.aiCompositeScore, candidate.manualScore, candidate.useManualScore);

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "2.5rem 2rem", fontFamily: "Arial, Helvetica, sans-serif", color: "#1e293b" }}>

      {/* Print button */}
      <div style={{ textAlign: "right", marginBottom: "1.5rem" }} className="no-print">
        <PrintButton />
      </div>

      {/* ── Header ── */}
      <div style={{ borderBottom: "2px solid #0f2a4a", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0f2a4a", margin: 0 }}>{name}</h1>

        {(candidate.currentTitle || candidate.currentEmployer) && (
          <p style={{ fontSize: "1rem", color: "#475569", marginTop: "0.3rem", marginBottom: 0 }}>
            {[candidate.currentTitle, candidate.currentEmployer].filter(Boolean).join(" · ")}
          </p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1.5rem", marginTop: "0.4rem", fontSize: "0.875rem", color: "#64748b" }}>
          {locationParts.length > 0 && <span>📍 {locationParts.join(", ")}</span>}
          {candidate.yearsOfExperience != null && (
            <span>⏱ {candidate.yearsOfExperience} yrs experience</span>
          )}
          {candidate.appliedRole && (
            <span>🎯 Applying for: <strong style={{ color: "#0f2a4a" }}>{candidate.appliedRole}</strong></span>
          )}
          {candidate.aiDetectedRoleType && (
            <span>👤 {ROLE_TYPE_LABELS[candidate.aiDetectedRoleType] ?? candidate.aiDetectedRoleType.replace(/_/g, " ")}</span>
          )}
        </div>
      </div>

      {/* ── Contact ── */}
      {contactItems.length > 0 && (
        <Section title="Contact">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem 2rem" }}>
            {contactItems.map((item, i) => (
              <span key={i} style={{ fontSize: "0.875rem", color: "#334155" }}>{item}</span>
            ))}
          </div>
        </Section>
      )}

      {/* ── Professional Summary ── */}
      {candidate.aiSummary && (
        <Section title="Professional Summary">
          <p style={{ fontSize: "0.9rem", color: "#334155", lineHeight: 1.65, margin: 0 }}>{candidate.aiSummary}</p>
        </Section>
      )}

      {/* ── Work History ── */}
      {candidate.workHistorySummary && (
        <Section title="Work History">
          <div style={{ fontSize: "0.9rem", color: "#334155", lineHeight: 1.7, whiteSpace: "pre-line" }}>
            {candidate.workHistorySummary}
          </div>
        </Section>
      )}

      {/* ── Current Position (if no work history block but has employer) ── */}
      {!candidate.workHistorySummary && (candidate.currentTitle || candidate.currentEmployer) && (
        <Section title="Current Position">
          <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1e293b", margin: 0 }}>
            {[candidate.currentTitle, candidate.currentEmployer].filter(Boolean).join(" at ")}
          </p>
        </Section>
      )}

      {/* ── Education ── */}
      {(candidate.educationDegree || candidate.educationInstitution || candidate.educationMajor) && (
        <Section title="Education">
          {(candidate.educationDegree || candidate.educationMajor) && (
            <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "#1e293b", margin: "0 0 0.15rem 0" }}>
              {[candidate.educationDegree, candidate.educationMajor].filter(Boolean).join(" · ")}
            </p>
          )}
          {candidate.educationInstitution && (
            <p style={{ fontSize: "0.875rem", color: "#475569", margin: 0 }}>
              {[candidate.educationInstitution, candidate.educationYear].filter(Boolean).join(", ")}
            </p>
          )}
        </Section>
      )}

      {/* ── Skills & Practice Areas ── */}
      {(candidate.keySkills.length > 0 || candidate.practiceAreas.length > 0) && (
        <Section title="Skills & Practice Areas">
          {candidate.practiceAreas.length > 0 && (
            <div style={{ marginBottom: "0.4rem" }}>
              <TagList label="Practice Areas" items={candidate.practiceAreas} />
            </div>
          )}
          {candidate.keySkills.length > 0 && (
            <TagList label="Key Skills" items={candidate.keySkills} />
          )}
        </Section>
      )}

      {/* ── Credentials ── */}
      {(candidate.certifications.length > 0 || candidate.barAdmissions.length > 0 || candidate.languages.length > 0) && (
        <Section title="Credentials">
          {candidate.certifications.length > 0 && (
            <div style={{ marginBottom: "0.3rem" }}>
              <TagList label="Certifications" items={candidate.certifications} />
            </div>
          )}
          {candidate.barAdmissions.length > 0 && (
            <div style={{ marginBottom: "0.3rem" }}>
              <TagList label="Bar Admissions" items={candidate.barAdmissions} />
            </div>
          )}
          {candidate.languages.length > 0 && (
            <TagList label="Languages" items={candidate.languages} />
          )}
        </Section>
      )}

      {/* ── Additional Details ── */}
      {(candidate.typingWpm != null || candidate.desiredSalary != null || candidate.availabilityNotes) && (
        <Section title="Additional Details">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.4rem 1.5rem" }}>
            {candidate.typingWpm != null && (
              <p style={{ fontSize: "0.875rem", color: "#334155", margin: 0 }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>Typing Speed: </span>
                {candidate.typingWpm} WPM
              </p>
            )}
            {candidate.desiredSalary != null && (
              <p style={{ fontSize: "0.875rem", color: "#334155", margin: 0 }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>Desired Salary: </span>
                ${candidate.desiredSalary.toLocaleString()}
              </p>
            )}
            {candidate.availabilityNotes && (
              <p style={{ fontSize: "0.875rem", color: "#334155", margin: 0 }}>
                <span style={{ fontWeight: 600, color: "#475569" }}>Availability: </span>
                {candidate.availabilityNotes}
              </p>
            )}
          </div>
        </Section>
      )}

      {/* ── Recruiter Observations (AI-assisted) ── */}
      {(candidate.topStrengths.length > 0 || candidate.topConcerns.length > 0 || candidate.riskFlags.length > 0) && (
        <Section title="Recruiter Observations">
          {candidate.topStrengths.length > 0 && (
            <div style={{ marginBottom: "0.6rem" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#16a34a", margin: "0 0 0.2rem 0" }}>Strengths</p>
              <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                {candidate.topStrengths.map((s, i) => (
                  <li key={i} style={{ fontSize: "0.875rem", color: "#334155", marginBottom: "0.1rem" }}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {candidate.topConcerns.length > 0 && (
            <div style={{ marginBottom: candidate.riskFlags.length > 0 ? "0.6rem" : 0 }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#d97706", margin: "0 0 0.2rem 0" }}>Areas to Discuss</p>
              <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                {candidate.topConcerns.map((c, i) => (
                  <li key={i} style={{ fontSize: "0.875rem", color: "#334155", marginBottom: "0.1rem" }}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {candidate.riskFlags.length > 0 && (
            <div>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#dc2626", margin: "0 0 0.2rem 0" }}>Flags</p>
              <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                {candidate.riskFlags.map((r, i) => (
                  <li key={i} style={{ fontSize: "0.875rem", color: "#334155", marginBottom: "0.1rem" }}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}

      {/* ── CRI Assessment (internal) ── */}
      {(effScore != null || tier) && (
        <Section title="CRI Assessment">
          <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
            {effScore != null && (
              <div>
                <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "0 0 0.1rem 0" }}>Composite Score</p>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f2a4a", margin: 0 }}>{effScore}<span style={{ fontSize: "0.875rem", fontWeight: 400, color: "#94a3b8" }}>/100</span></p>
              </div>
            )}
            {tier && (
              <div>
                <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "0 0 0.1rem 0" }}>Candidate Tier</p>
                <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f2a4a", margin: 0 }}>{TIER_LABEL[tier] ?? tier}</p>
              </div>
            )}
            {(candidate.useManualScore && candidate.manualScore != null) && (
              <div>
                <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "0 0 0.1rem 0" }}>Score Type</p>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#475569", margin: 0 }}>Manual Override</p>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Footer ── */}
      <div style={{ borderTop: "1px solid #e2e8f0", marginTop: "2rem", paddingTop: "0.75rem", fontSize: "0.75rem", color: "#94a3b8", textAlign: "center" }}>
        Corporate Recruiters Inc. · Confidential Candidate Profile
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 0.75in; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1.4rem" }}>
      <h2 style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", marginBottom: "0.4rem", marginTop: 0 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function TagList({ label, items }: { label: string; items: string[] }) {
  return (
    <p style={{ fontSize: "0.875rem", color: "#334155", margin: 0 }}>
      <span style={{ fontWeight: 600, color: "#475569" }}>{label}: </span>
      {items.join(" · ")}
    </p>
  );
}
