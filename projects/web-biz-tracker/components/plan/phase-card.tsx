import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TaskRow } from "./task-row";
import { AddTaskForm } from "./add-task-form";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  assignee: { id: string; name: string } | null;
};

type Phase = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  tasks: Task[];
};

type User = { id: string; name: string };

export function PhaseCard({ phase, users }: { phase: Phase; users: User[] }) {
  const total = phase.tasks.length;
  const done = phase.tasks.filter((t) => t.status === "done").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <Link
            href={`/plan/${phase.id}`}
            className="font-semibold text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-1 group"
          >
            {phase.title}
            <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          {phase.description && (
            <p className="text-sm text-slate-500 mt-0.5">{phase.description}</p>
          )}
        </div>
        <span className="text-sm font-medium text-slate-500 flex-shrink-0 ml-4">
          {done}/{total}
        </span>
      </div>

      <div className="h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-slate-700 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-2">
        {phase.tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </div>

      <AddTaskForm phaseId={phase.id} users={users} />
    </div>
  );
}
