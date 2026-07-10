import { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between px-5 pt-4 pb-1">
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {subtitle && <p className="text-xs text-ink-3 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatTile({
  label,
  value,
  detail,
  detailTone = "muted",
}: {
  label: string;
  value: string;
  detail?: string;
  detailTone?: "good" | "serious" | "muted";
}) {
  const toneClass =
    detailTone === "good"
      ? "text-good-text"
      : detailTone === "serious"
        ? "text-critical"
        : "text-ink-3";
  return (
    <Card className="px-5 py-4">
      <p className="text-xs font-medium text-ink-3 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold mt-1 text-ink">{value}</p>
      {detail && <p className={`text-xs mt-1 ${toneClass}`}>{detail}</p>}
    </Card>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {icon && <div className="mb-3 text-ink-3">{icon}</div>}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="text-sm text-ink-2 mt-1 max-w-sm">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ProgressBar({
  fraction,
  tone = "accent",
}: {
  fraction: number;
  tone?: "accent" | "good" | "warning";
}) {
  const pct = Math.min(Math.max(fraction, 0), 1) * 100;
  const color =
    tone === "good" ? "bg-good" : tone === "warning" ? "bg-warning" : "bg-accent";
  return (
    <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
      <div
        className={`h-full rounded-full ${color} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warning" | "serious" | "accent";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-2 text-ink-2",
    good: "bg-[rgba(12,163,12,0.12)] text-good-text",
    warning: "bg-[rgba(250,178,25,0.15)] text-ink",
    serious: "bg-[rgba(208,59,59,0.12)] text-critical",
    accent: "bg-accent-soft text-accent-strong",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent";

export const buttonPrimary =
  "inline-flex items-center gap-1.5 rounded-lg bg-accent-strong px-3.5 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer";

export const buttonGhost =
  "inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2 transition-colors cursor-pointer";

export const buttonDanger =
  "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-critical hover:bg-[rgba(208,59,59,0.08)] transition-colors cursor-pointer";
