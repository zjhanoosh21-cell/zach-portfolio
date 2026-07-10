import { prisma } from "@/lib/prisma";
import { ScheduleView } from "@/components/plan/schedule-view";

export default async function SchedulePage() {
  const [tasks, users] = await Promise.all([
    prisma.task.findMany({
      orderBy: [{ dueDate: "asc" }, { order: "asc" }],
      include: {
        assignee: { select: { id: true, name: true } },
        phase: { select: { id: true, title: true } },
      },
    }),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ]);

  const serialized = tasks.map((t) => ({
    ...t,
    dueDate: t.dueDate?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return <ScheduleView tasks={serialized} users={users} />;
}
