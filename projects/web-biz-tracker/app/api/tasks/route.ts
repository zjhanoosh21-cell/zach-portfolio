import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { TASK_STATUSES } from "@/lib/constants";

const CreateTaskSchema = z.object({
  phaseId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const lastTask = await prisma.task.findFirst({
    where: { phaseId: parsed.data.phaseId },
    orderBy: { order: "desc" },
  });
  const order = (lastTask?.order ?? 0) + 1;

  const task = await prisma.task.create({
    data: {
      ...parsed.data,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      order,
    },
    include: { assignee: { select: { id: true, name: true } } },
  });

  return NextResponse.json(task, { status: 201 });
}
