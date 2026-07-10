import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mine = req.nextUrl.searchParams.get("mine") === "true";
  const userId = token.id as string;

  const interviews = await prisma.submission.findMany({
    where: {
      interviewDate: { not: null },
      ...(mine ? { jobOrder: { assignedToId: userId } } : {}),
    },
    select: {
      id: true,
      interviewDate: true,
      candidate: { select: { id: true, displayName: true, firstName: true, lastName: true } },
      jobOrder: { select: { id: true, title: true, clientName: true } },
    },
    orderBy: { interviewDate: "asc" },
  });

  const events = interviews.map((s) => ({
    type: "interview" as const,
    date: s.interviewDate!.toISOString().split("T")[0],
    candidateId: s.candidate.id,
    candidateName:
      s.candidate.displayName ||
      [s.candidate.firstName, s.candidate.lastName].filter(Boolean).join(" ") ||
      "Unknown",
    jobId: s.jobOrder.id,
    jobTitle: s.jobOrder.title,
    clientName: s.jobOrder.clientName,
  })).sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({ events });
}
