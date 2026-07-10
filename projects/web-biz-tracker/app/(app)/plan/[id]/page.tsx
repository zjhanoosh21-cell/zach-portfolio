import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TaskEditor } from "@/components/plan/task-editor";
import { AddTaskForm } from "@/components/plan/add-task-form";
import { ArrowLeft } from "lucide-react";

export default async function PhaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [phase, users] = await Promise.all([
    prisma.phase.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { order: "asc" },
          include: { assignee: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ]);

  if (!phase) notFound();

  const total = phase.tasks.length;
  const done = phase.tasks.filter((t) => t.status === "done").length;
  const inProgress = phase.tasks.filter((t) => t.status === "in_progress").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start gap-4">
        <Link
          href="/plan"
          className="text-slate-400 hover:text-slate-600 transition-colors mt-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{phase.title}</h1>
          {phase.description && (
            <p className="text-sm text-slate-500 mt-1">{phase.description}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-semibold text-slate-700">{pct}%</p>
          <p className="text-xs text-slate-400">
            {done} done · {inProgress} in progress · {total - done - inProgress} pending
          </p>
        </div>
      </div>

      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-slate-700 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {total === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          No tasks yet. Add one below.
        </p>
      ) : (
        <div className="space-y-2">
          {phase.tasks.map((task) => (
            <TaskEditor
              key={task.id}
              task={{
                ...task,
                dueDate: task.dueDate?.toISOString() ?? null,
              }}
              users={users}
            />
          ))}
        </div>
      )}

      <AddTaskForm phaseId={phase.id} users={users} />
    </div>
  );
}
