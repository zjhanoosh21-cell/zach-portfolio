import { cn } from "@/lib/utils";
import {
  PROSPECT_STATUS_LABELS,
  PROSPECT_STATUS_CLASSES,
  type ProspectStatus,
} from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        PROSPECT_STATUS_CLASSES[status as ProspectStatus] ??
          "bg-slate-100 text-slate-600"
      )}
    >
      {PROSPECT_STATUS_LABELS[status as ProspectStatus] ?? status}
    </span>
  );
}
