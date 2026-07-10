import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  candidateId: z.string().min(1),
  jobOrderId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  const { candidateId, jobOrderId } = parsed.data;

  // Verify both exist
  const [candidate, job] = await Promise.all([
    prisma.candidate.findUnique({ where: { id: candidateId }, select: { id: true, displayName: true, firstName: true, lastName: true } }),
    prisma.jobOrder.findUnique({ where: { id: jobOrderId }, select: { id: true, title: true, clientName: true } }),
  ]);

  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Create submission (unique constraint handles duplicate)
  let submission;
  try {
    submission = await prisma.submission.create({
      data: {
        candidateId,
        jobOrderId,
        submittedById: token.id as string,
        status: "SUBMITTED",
      },
    });
  } catch {
    return NextResponse.json({ error: "Candidate already submitted to this job" }, { status: 409 });
  }

  // Log activity
  const candidateName = candidate.displayName || [candidate.firstName, candidate.lastName].filter(Boolean).join(" ") || "Candidate";
  await Promise.all([
    prisma.activityLog.create({
      data: {
        type: "SUBMITTED_TO_JOB",
        description: `Submitted to ${job.title} at ${job.clientName}`,
        candidateId,
        userId: token.id as string,
        metadata: { jobOrderId, jobTitle: job.title, clientName: job.clientName },
      },
    }),
    prisma.activityLog.create({
      data: {
        type: "SUBMITTED_TO_JOB",
        description: `${candidateName} submitted`,
        jobOrderId,
        userId: token.id as string,
        metadata: { candidateId, candidateName },
      },
    }),
  ]).catch((e) => console.error("[AUDIT] Activity log write failed:", e));

  return NextResponse.json(submission, { status: 201 });
}
