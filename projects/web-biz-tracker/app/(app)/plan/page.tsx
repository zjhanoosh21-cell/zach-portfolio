import { prisma } from "@/lib/prisma";
import { PhaseCard } from "@/components/plan/phase-card";
import { AddPhaseForm } from "@/components/plan/add-phase-form";

export default async function PlanPage() {
  const [phases, users] = await Promise.all([
    prisma.phase.findMany({
      orderBy: { order: "asc" },
      include: {
        tasks: {
          orderBy: { order: "asc" },
          include: { assignee: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ]);

  const totalTasks = phases.reduce((s, p) => s + p.tasks.length, 0);
  const doneTasks = phases.reduce(
    (s, p) => s + p.tasks.filter((t) => t.status === "done").length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Plan</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {doneTasks} of {totalTasks} tasks complete
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {phases.map((phase) => (
          <PhaseCard
            key={phase.id}
            phase={{
              ...phase,
              tasks: phase.tasks.map((t) => ({
                ...t,
                dueDate: t.dueDate?.toISOString() ?? null,
              })),
            }}
            users={users}
          />
        ))}
        <AddPhaseForm />
      </div>
    </div>
  );
}
