import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SubmissionStatus } from "@prisma/client";

const schema = z.object({
  status: z.nativeEnum(SubmissionStatus).optional(),
  clientFeedback: z.string().max(2000).nullish(),
  interviewDate: z.string().nullish(),
  offerAmount: z.number().int().min(0).nullish(),
  placementFee: z.number().min(0).nullish(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  const existing = await prisma.submission.findUnique({
    where: { id },
    select: { status: true, candidateId: true, clientFeedback: true, jobOrder: { select: { title: true } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { interviewDate, status, ...rest } = parsed.data;
  const submission = await prisma.submission.update({
    where: { id },
    data: {
      ...rest,
      ...(status !== undefined && { status }),
      ...(interviewDate !== undefined && { interviewDate: interviewDate ? new Date(interviewDate) : null }),
      ...(status === "PLACED" && { placedAt: new Date() }),
    },
  });

  // Sync clientFeedback → Note so it appears on the candidate profile
  const newFeedback = parsed.data.clientFeedback ?? null;
  if (newFeedback !== existing.clientFeedback) {
    const existingNote = await prisma.note.findFirst({
      where: { submissionId: id, type: "CLIENT_FEEDBACK", candidateId: existing.candidateId },
      select: { id: true },
    });
    if (newFeedback) {
      const jobLabel = existing.jobOrder?.title ? ` (${existing.jobOrder.title})` : "";
      const content = `Client Feedback${jobLabel}: ${newFeedback}`;
      if (existingNote) {
        await prisma.note.update({
          where: { id: existingNote.id },
          data: { content, authorId: token.id as string },
        });
      } else {
        await prisma.note.create({
          data: {
            content,
            type: "CLIENT_FEEDBACK",
            submissionId: id,
            candidateId: existing.candidateId,
            authorId: token.id as string,
          },
        });
      }
    } else if (existingNote) {
      // Feedback was cleared — remove the note
      await prisma.note.delete({ where: { id: existingNote.id } });
    }
  }

  // Only sync PLACED to the candidate profile — everything else is managed independently
  if (status === "PLACED") {
    await prisma.candidate.update({
      where: { id: existing.candidateId },
      data: { status: "PLACED", placedAt: new Date() },
    }).catch((e) => console.error("[SYNC] Failed to sync PLACED status to candidate:", e));
  }

  // Log
  await prisma.activityLog.create({
    data: {
      type: "SUBMISSION_STATUS_CHANGED",
      description: status ? `Submission status changed from ${existing.status} to ${status}` : "Submission updated",
      candidateId: existing.candidateId,
      userId: token.id as string,
      metadata: status ? { from: existing.status, to: status } : {},
    },
  }).catch((e) => console.error("[AUDIT] Activity log write failed:", e));

  return NextResponse.json({
    ...submission,
    placementFee: submission.placementFee ? Number(submission.placementFee) : null,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.submission.findUnique({
    where: { id },
    select: { id: true, status: true, candidateId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.submission.delete({ where: { id } });

  await prisma.activityLog.create({
    data: {
      type: "SUBMISSION_STATUS_CHANGED",
      description: "Submission removed",
      candidateId: existing.candidateId,
      userId: token.id as string,
    },
  }).catch((e) => console.error("[AUDIT] Activity log write failed:", e));

  return NextResponse.json({ success: true });
}
