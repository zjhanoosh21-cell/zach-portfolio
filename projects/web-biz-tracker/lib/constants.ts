export const TASK_STATUSES = ["pending", "in_progress", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PROSPECT_STATUSES = [
  "scraped",
  "email_sent",
  "replied",
  "call_scheduled",
  "call_completed",
  "proposal_sent",
  "won",
  "lost",
  "on_hold",
] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export const DEAL_STATUSES = ["active", "won", "lost"] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];

export const PROSPECT_SOURCES = ["manual", "scraped", "referral"] as const;
export type ProspectSource = (typeof PROSPECT_SOURCES)[number];

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  scraped: "Scraped",
  email_sent: "Email Sent",
  replied: "Replied",
  call_scheduled: "Call Scheduled",
  call_completed: "Call Completed",
  proposal_sent: "Proposal Sent",
  won: "Won",
  lost: "Lost",
  on_hold: "On Hold",
};

export const PROSPECT_STATUS_CLASSES: Record<ProspectStatus, string> = {
  scraped: "bg-slate-100 text-slate-700",
  email_sent: "bg-blue-100 text-blue-700",
  replied: "bg-purple-100 text-purple-700",
  call_scheduled: "bg-yellow-100 text-yellow-700",
  call_completed: "bg-orange-100 text-orange-700",
  proposal_sent: "bg-indigo-100 text-indigo-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
  on_hold: "bg-slate-100 text-slate-500",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  done: "Done",
};

export const TASK_STATUS_CLASSES: Record<TaskStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
};

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  active: "Active",
  won: "Won",
  lost: "Lost",
};

export const DEAL_STATUS_CLASSES: Record<DealStatus, string> = {
  active: "bg-blue-100 text-blue-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

export const ASSIGNEE_COLORS: Record<string, string> = {
  zachary: "bg-blue-100 text-blue-800",
  james: "bg-green-100 text-green-800",
};

export const SOURCE_LABELS: Record<ProspectSource, string> = {
  manual: "Manual",
  scraped: "Scraped",
  referral: "Referral",
};
