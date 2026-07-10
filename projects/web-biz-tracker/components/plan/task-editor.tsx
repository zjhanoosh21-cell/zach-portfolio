"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Pencil, Check, X, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_CLASSES,
  TASK_STATUSES,
  ASSIGNEE_COLORS,
  type TaskStatus,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  assignee: { id: string; name: string } | null;
};

type User = { id: string; name: string };

export function TaskEditor({ task, users }: { task: Task; users: User[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState(task.status);
  const [assigneeId, setAssigneeId] = useState(task.assignee?.id ?? "");
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""
  );

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

  async function saveEdits() {
    if (!title.trim()) return;
    setLoading(true);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        status,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      }),
    });
    setEditing(false);
    setLoading(false);
    router.refresh();
  }

  function cancelEdit() {
    setEditing(false);
    setTitle(task.title);
    setDescription(task.description ?? "");
    setStatus(task.status);
    setAssigneeId(task.assignee?.id ?? "");
    setDueDate(
      task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""
    );
  }

  async function deleteTask() {
    if (!confirm(`Delete "${task.title}"?`)) return;
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    router.refresh();
  }

  const isOverdue =
    task.dueDate &&
    task.status !== "done" &&
    new Date(task.dueDate) < new Date();

  const assigneeKey = task.assignee?.name.toLowerCase().split(" ")[0] ?? "";

  if (editing) {
    return (
      <div className="border border-blue-200 rounded-lg bg-blue-50/60 p-4 space-y-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="font-medium bg-white"
          autoFocus
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="resize-none text-sm bg-white"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {TASK_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={assigneeId} onValueChange={setAssigneeId}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Unassigned</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={saveEdits} disabled={loading || !title.trim()}>
            <Check className="h-3.5 w-3.5 mr-1" />
            {loading ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" variant="ghost" onClick={cancelEdit}>
            <X className="h-3.5 w-3.5 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border rounded-lg bg-white transition-all",
        task.status === "done"
          ? "border-slate-100 opacity-60"
          : isOverdue
          ? "border-red-200"
          : "border-slate-200"
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <button
          onClick={cycleStatus}
          disabled={loading}
          className={cn(
            "flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer mt-0.5",
            TASK_STATUS_CLASSES[task.status as TaskStatus] ??
              "bg-slate-100 text-slate-600"
          )}
        >
          {TASK_STATUS_LABELS[task.status as TaskStatus] ?? task.status}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium text-slate-800",
              task.status === "done" && "line-through text-slate-400"
            )}
          >
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

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
            <span
              className={cn(
                "text-xs flex items-center gap-1",
                isOverdue ? "text-red-500 font-semibold" : "text-slate-400"
              )}
            >
              <Calendar className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          <button
            onClick={() => setEditing(true)}
            className="text-slate-300 hover:text-slate-600 transition-colors"
            title="Edit task"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={deleteTask}
            className="text-slate-300 hover:text-red-500 transition-colors"
            title="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
