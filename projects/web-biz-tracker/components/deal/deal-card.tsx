"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { cn, formatDollars, timeAgo } from "@/lib/utils";
import {
  DEAL_STATUS_CLASSES,
  DEAL_STATUS_LABELS,
  ASSIGNEE_COLORS,
  type DealStatus,
} from "@/lib/constants";

type Deal = {
  id: string;
  status: string;
  proposalAmount: number | null;
  retainerAmount: number | null;
  closeDate: string | null;
  notes: string | null;
  createdAt: string;
  prospect: {
    id: string;
    name: string;
    businessName: string | null;
    industry: string | null;
    email: string | null;
    assignee: { id: string; name: string } | null;
  };
};

export function DealCard({ deal }: { deal: Deal }) {
  const router = useRouter();

  async function updateStatus(status: DealStatus) {
    await fetch(`/api/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  const assigneeKey =
    deal.prospect.assignee?.name.toLowerCase().split(" ")[0] ?? "";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={`/prospects/${deal.prospect.id}`}
            className="font-medium text-slate-900 hover:text-blue-600 transition-colors"
          >
            {deal.prospect.name}
          </Link>
          {deal.prospect.businessName && (
            <p className="text-sm text-slate-500">{deal.prospect.businessName}</p>
          )}
          {deal.prospect.industry && (
            <p className="text-xs text-slate-400">{deal.prospect.industry}</p>
          )}
        </div>
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0",
            DEAL_STATUS_CLASSES[deal.status as DealStatus] ??
              "bg-slate-100 text-slate-600"
          )}
        >
          {DEAL_STATUS_LABELS[deal.status as DealStatus] ?? deal.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        {deal.proposalAmount != null && (
          <div>
            <p className="text-xs text-slate-400">Project</p>
            <p className="font-semibold text-slate-800">
              {formatDollars(deal.proposalAmount)}
            </p>
          </div>
        )}
        {deal.retainerAmount != null && (
          <div>
            <p className="text-xs text-slate-400">Retainer/mo</p>
            <p className="font-semibold text-green-700">
              {formatDollars(deal.retainerAmount)}/mo
            </p>
          </div>
        )}
      </div>

      {deal.prospect.assignee && (
        <span
          className={cn(
            "inline-flex text-xs font-medium px-2 py-0.5 rounded-full",
            ASSIGNEE_COLORS[assigneeKey] ?? "bg-slate-100 text-slate-600"
          )}
        >
          {deal.prospect.assignee.name.split(" ")[0]}
        </span>
      )}

      {deal.status === "active" && (
        <div className="flex gap-2 pt-1 border-t border-slate-100">
          <button
            onClick={() => updateStatus("won")}
            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
          >
            <Check className="h-3.5 w-3.5" />
            Mark Won
          </button>
          <button
            onClick={() => updateStatus("lost")}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium"
          >
            <X className="h-3.5 w-3.5" />
            Mark Lost
          </button>
        </div>
      )}
    </div>
  );
}
