"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
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
  phase: { id: string; title: string };
};

type User = { id: string; name: string };

function groupTasks(tasks: Task[]) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const overdue: Task[] = [];
  const today: Task[] = [];
  const thisWeek: Task[] = [];
  const later: Task[] = [];
  const noDate: Task[] = [];

  for (const task of tasks) {
    if (task.status === "done") continue;
    if (!task.dueDate) {
      noDate.push(task);
      continue;
    }
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    if (due < now) overdue.push(task);
    else if (due <= endOfToday) today.push(task);
    else if (due <= endOfWeek) thisWeek.push(task);
    else later.push(task);
  }

  return { overdue, today, thisWeek, later, noDate };
}

function TaskCard({
  task,
  urgent,
  onCycle,
  cycling,
}: {
  task: Task;
  urgent?: boolean;
  onCycle: (task: Task) => void;
  cycling: boolean;
}) {
  const assigneeKey = task.assignee?.name.toLowerCase().split(" ")[0] ?? "";

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 bg-white border rounded-lg",
        urgent ? "border-red-200" : "border-slate-200"
      )}
    >
      <button
        onClick={() => onCycle(task)}
        disabled={cycling}
        className={cn(
          "flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer",
          TASK_STATUS_CLASSES[task.status as TaskStatus] ??
            "bg-slate-100 text-slate-600"
        )}
      >
        {TASK_STATUS_LABELS[task.status as TaskStatus] ?? task.status}
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">
          {task.title}
        </p>
        <Link
          href={`/plan/${task.phase.id}`}
          className="text-xs text-slate-400 hover:text-blue-600 transition-colors"
        >
          {task.phase.title}
        </Link>
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
              "text-xs",
              urgent ? "text-red-500 font-semibold" : "text-slate-400"
            )}
          >
            {new Date(task.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
        <Link
          href={`/plan/${task.phase.id}`}
          className="text-xs text-slate-400 hover:text-blue-600 transition-colors border border-slate-200 rounded px-1.5 py-0.5"
        >
          Edit
        </Link>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  tasks,
  urgent,
  emptyText,
  onCycle,
  cyclingId,
}: {
  title: string;
  count: number;
  tasks: Task[];
  urgent?: boolean;
  emptyText?: string;
  onCycle: (task: Task) => void;
  cyclingId: string | null;
}) {
  if (tasks.length === 0 && !emptyText) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        {urgent && <AlertTriangle className="h-4 w-4 text-red-500" />}
        <h2
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            urgent ? "text-red-600" : "text-slate-400"
          )}
        >
          {title}
        </h2>
        <span
          className={cn(
            "text-xs px-1.5 py-0.5 rounded-full font-medium",
            urgent ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"
          )}
        >
          {count}
        </span>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-slate-400 px-1">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              urgent={urgent}
              onCycle={onCycle}
              cycling={cyclingId === t.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const nextStatus: Record<TaskStatus, TaskStatus> = {
  pending: "in_progress",
  in_progress: "done",
  done: "pending",
};

export function ScheduleView({
  tasks,
  users,
}: {
  tasks: Task[];
  users: User[];
}) {
  const router = useRouter();
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [cyclingId, setCyclingId] = useState<string | null>(null);

  const filteredTasks =
    assigneeFilter === "all"
      ? tasks
      : tasks.filter((t) => {
          const key = t.assignee?.name.toLowerCase().split(" ")[0] ?? "";
          return key === assigneeFilter;
        });

  const groups = groupTasks(filteredTasks);

  const totalOpen =
    groups.overdue.length +
    groups.today.length +
    groups.thisWeek.length +
    groups.later.length +
    groups.noDate.length;

  async function cycleStatus(task: Task) {
    setCyclingId(task.id);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus[task.status as TaskStatus] }),
    });
    router.refresh();
    setCyclingId(null);
  }

  const filterButtons = [
    { key: "all", label: "All" },
    ...users.map((u) => ({
      key: u.name.toLowerCase().split(" ")[0],
      label: u.name.split(" ")[0],
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-slate-500" />
            Schedule
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalOpen} open task{totalOpen !== 1 ? "s" : ""}
            {groups.overdue.length > 0 && (
              <span className="text-red-500 font-medium ml-2">
                · {groups.overdue.length} overdue
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setAssigneeFilter(key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                assigneeFilter === key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        <Section
          title="Overdue"
          count={groups.overdue.length}
          tasks={groups.overdue}
          urgent
          onCycle={cycleStatus}
          cyclingId={cyclingId}
        />
        <Section
          title="Today"
          count={groups.today.length}
          tasks={groups.today}
          emptyText="Nothing due today."
          onCycle={cycleStatus}
          cyclingId={cyclingId}
        />
        <Section
          title="This Week"
          count={groups.thisWeek.length}
          tasks={groups.thisWeek}
          onCycle={cycleStatus}
          cyclingId={cyclingId}
        />
        <Section
          title="Later"
          count={groups.later.length}
          tasks={groups.later}
          onCycle={cycleStatus}
          cyclingId={cyclingId}
        />
        <Section
          title="No Due Date"
          count={groups.noDate.length}
          tasks={groups.noDate}
          onCycle={cycleStatus}
          cyclingId={cyclingId}
        />
      </div>

      {totalOpen === 0 && (
        <div className="text-center py-12">
          <CalendarDays className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            {assigneeFilter === "all"
              ? "All tasks complete — great work!"
              : "No open tasks for this person."}
          </p>
        </div>
      )}
    </div>
  );
}
