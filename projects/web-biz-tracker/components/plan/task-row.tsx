"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_CLASSES,
  ASSIGNEE_COLORS,
  type TaskStatus,
} from "@/lib/constants";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  assignee: { id: string; name: string } | null;
};

export function TaskRow({ task }: { task: Task }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const nextStatus: Record<TaskStatus, TaskStatus> = {
    pending: "in_progress",
    in_progress: "done",
    done: "pending",
  };

  async function cycleStatus() {
    setLoading(true);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus[task.status as TaskStatus] }),
    });
    router.refresh();
    setLoading(false);
  }

  async function deleteTask() {
    if (!confirm(`Delete "${task.title}"?`)) return;
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    router.refresh();
  }

  const assigneeKey = task.assignee?.name.toLowerCase().split(" ")[0] ?? "";

  return (
    <div
      className={cn(
        "border border-slate-200 rounded-lg bg-white transition-all",
        task.status === "done" && "opacity-60"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={cycleStatus}
          disabled={loading}
          className={cn(
            "flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer",
            TASK_STATUS_CLASSES[task.status as TaskStatus] ??
              "bg-slate-100 text-slate-600"
          )}
        >
          {TASK_STATUS_LABELS[task.status as TaskStatus] ?? task.status}
        </button>

        <span
          className={cn(
            "flex-1 text-sm font-medium text-slate-800",
            task.status === "done" && "line-through text-slate-400"
          )}
        >
          {task.title}
        </span>

        <div className="flex items-center gap-2 flex-shrink-0">
          {task.assignee && (
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                ASSIGNEE_COLORS[assigneeKey] ?? "bg-slate-100 text-slate-600"
              )}
            >
              {task.assignee.name.split(" ")[0]}
            </span>
          )}
          {task.dueDate && (
            <span className="text-xs text-slate-400">
              {new Date(task.dueDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          {task.description && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-slate-400 hover:text-slate-600"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
          <button
            onClick={deleteTask}
            className="text-slate-300 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {expanded && task.description && (
        <div className="px-4 pb-3 text-sm text-slate-500 border-t border-slate-100 pt-2">
          {task.description}
        </div>
      )}
    </div>
  );
}
