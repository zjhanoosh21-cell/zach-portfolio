import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ candidates: [], jobs: [], clients: [], submissions: [] });
  }

  // Fetch 9 per category — if we get 9 back there are more than 8, show "See all"
  const LIMIT = 8;
  const FETCH = LIMIT + 1;

  const [candidates, jobs, clients, submissions] = await Promise.all([
    prisma.candidate.findMany({
      where: {
        OR: [
          { displayName: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { resumeEmail: { contains: q, mode: "insensitive" } },
          { appliedRole: { contains: q, mode: "insensitive" } },
          { currentEmployer: { contains: q, mode: "insensitive" } },
        ],
        status: { notIn: ["REJECTED", "DO_NOT_CONSIDER"] },
      },
      select: {
        id: true,
        displayName: true,
        firstName: true,
        lastName: true,
        appliedRole: true,
        currentTitle: true,
        aiTier: true,
        status: true,
      },
      take: FETCH,
      orderBy: { aiCompositeScore: "desc" },
    }),

    prisma.jobOrder.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { clientName: { contains: q, mode: "insensitive" } },
          { location: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        clientName: true,
        status: true,
        roleType: true,
      },
      take: FETCH,
      orderBy: { createdAt: "desc" },
    }),

    prisma.client.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { specialty: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
        ],
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        industry: true,
        specialty: true,
        city: true,
        state: true,
      },
      take: FETCH,
      orderBy: { name: "asc" },
    }),

    prisma.submission.findMany({
      where: {
        OR: [
          { jobOrder: { title: { contains: q, mode: "insensitive" } } },
          { jobOrder: { clientName: { contains: q, mode: "insensitive" } } },
          { candidate: { displayName: { contains: q, mode: "insensitive" } } },
          { candidate: { firstName: { contains: q, mode: "insensitive" } } },
          { candidate: { lastName: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        jobOrder: { select: { id: true, title: true, clientName: true } },
        candidate: { select: { id: true, displayName: true, firstName: true, lastName: true } },
      },
      take: FETCH,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Normalize candidate names
  const normalizedCandidates = candidates.slice(0, LIMIT).map((c) => ({
    ...c,
    name: c.displayName || [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unknown",
  }));

  const normalizedSubmissions = submissions.slice(0, LIMIT).map((s) => ({
    ...s,
    candidateName: s.candidate.displayName ||
      [s.candidate.firstName, s.candidate.lastName].filter(Boolean).join(" ") ||
      "Unknown",
  }));

  return NextResponse.json({
    candidates: normalizedCandidates,
    candidatesHasMore: candidates.length > LIMIT,
    jobs: jobs.slice(0, LIMIT),
    jobsHasMore: jobs.length > LIMIT,
    clients: clients.slice(0, LIMIT),
    clientsHasMore: clients.length > LIMIT,
    submissions: normalizedSubmissions,
    submissionsHasMore: submissions.length > LIMIT,
  });
}
