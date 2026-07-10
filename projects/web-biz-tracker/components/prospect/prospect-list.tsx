"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn, timeAgo } from "@/lib/utils";
import { InlineStatusUpdater } from "./inline-status-updater";
import {
  PROSPECT_STATUSES,
  PROSPECT_STATUS_LABELS,
  ASSIGNEE_COLORS,
  SOURCE_LABELS,
  type ProspectStatus,
  type ProspectSource,
} from "@/lib/constants";
import { Calendar, Globe } from "lucide-react";

type Prospect = {
  id: string;
  name: string;
  businessName: string | null;
  industry: string | null;
  email: string | null;
  status: string;
  source: string;
  followUpDate: string | null;
  outreachSentAt: string | null;
  outreachTemplate: string | null;
  createdAt: string;
  assignee: { id: string; name: string } | null;
  deal: { id: string; status: string; proposalAmount: number | null } | null;
};

export function ProspectList({ prospects }: { prospects: Prospect[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") ?? "all";

  function setFilter(status: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const counts = prospects.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "px-3 py-1 rounded-full text-sm transition-colors",
            currentStatus === "all"
              ? "bg-slate-800 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          All ({prospects.length})
        </button>
        {PROSPECT_STATUSES.map((s) =>
          counts[s] ? (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "px-3 py-1 rounded-full text-sm transition-colors",
                currentStatus === s
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {PROSPECT_STATUS_LABELS[s]} ({counts[s]})
            </button>
          ) : null
        )}
      </div>

      {prospects.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg font-medium">No prospects yet</p>
          <p className="text-sm mt-1">Add one manually or set up the intake API to auto-import from your scraper.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {prospects.map((p) => {
            const assigneeKey = p.assignee?.name.toLowerCase().split(" ")[0] ?? "";
            const isOverdue =
              p.followUpDate && new Date(p.followUpDate) < new Date();
            return (
              <Link
                key={p.id}
                href={`/prospects/${p.id}`}
                className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 truncate">
                        {p.name}
                      </span>
                      {p.businessName && (
                        <span className="text-slate-400 text-sm truncate">
                          — {p.businessName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <InlineStatusUpdater
                        prospectId={p.id}
                        currentStatus={p.status}
                      />
                      {p.industry && (
                        <span className="text-xs text-slate-500">
                          {p.industry}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                        {SOURCE_LABELS[p.source as ProspectSource] ?? p.source}
                      </span>
                      {p.outreachSentAt && (
                        <span className="text-xs text-blue-500">
                          Email sent {timeAgo(new Date(p.outreachSentAt))}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {p.assignee && (
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full",
                          ASSIGNEE_COLORS[assigneeKey] ??
                            "bg-slate-100 text-slate-600"
                        )}
                      >
                        {p.assignee.name.split(" ")[0]}
                      </span>
                    )}
                    {p.followUpDate && (
                      <span
                        className={cn(
                          "flex items-center gap-1 text-xs",
                          isOverdue ? "text-red-500" : "text-slate-400"
                        )}
                      >
                        <Calendar className="h-3 w-3" />
                        {new Date(p.followUpDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
