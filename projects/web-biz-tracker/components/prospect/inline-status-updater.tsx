"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  PROSPECT_STATUSES,
  PROSPECT_STATUS_LABELS,
  PROSPECT_STATUS_CLASSES,
  type ProspectStatus,
} from "@/lib/constants";

export function InlineStatusUpdater({
  prospectId,
  currentStatus,
}: {
  prospectId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: string) {
    setLoading(true);
    await fetch(`/api/prospects/${prospectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={loading}
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-opacity hover:opacity-80",
            PROSPECT_STATUS_CLASSES[currentStatus as ProspectStatus] ??
              "bg-slate-100 text-slate-600"
          )}
        >
          {PROSPECT_STATUS_LABELS[currentStatus as ProspectStatus] ??
            currentStatus}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {PROSPECT_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => updateStatus(s)}
            className={cn(
              "cursor-pointer",
              s === currentStatus && "font-medium"
            )}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full mr-2 flex-shrink-0 inline-block",
                PROSPECT_STATUS_CLASSES[s].replace("text-", "bg-").split(" ")[0]
              )}
            />
            {PROSPECT_STATUS_LABELS[s]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
