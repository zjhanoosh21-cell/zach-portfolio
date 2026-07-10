import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreatePhaseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const phases = await prisma.phase.findMany({
    orderBy: { order: "asc" },
    include: {
      tasks: {
        orderBy: { order: "asc" },
        include: { assignee: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json(phases);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreatePhaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const lastPhase = await prisma.phase.findFirst({ orderBy: { order: "desc" } });
  const order = (lastPhase?.order ?? 0) + 1;

  const phase = await prisma.phase.create({
    data: { ...parsed.data, order },
    include: { tasks: true },
  });

  return NextResponse.json(phase, { status: 201 });
}
