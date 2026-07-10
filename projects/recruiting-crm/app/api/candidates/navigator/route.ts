import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { VALID_TIERS, VALID_STATUSES, VALID_ROLES } from "@/lib/candidate-display";

const WINDOW_MS: Record<string, number> = {
  "1d":  24 * 60 * 60 * 1000,
  "3d":  3  * 24 * 60 * 60 * 1000,
  "7d":  7  * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

const NAV_SELECT = {
  id: true,
  displayName: true,
  firstName: true,
  lastName: true,
  status: true,
  aiCompositeScore: true,
  manualScore: true,
  useManualScore: true,
  aiTier: true,
} as const;

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;

  try {
    // ── Dashboard context shortcuts ──────────────────────────────────────────
    const ctx = sp.get("ctx");
    if (ctx === "recent" || ctx === "priority") {
      let candidates;
      if (ctx === "recent") {
        const windowParam = sp.get("window") ?? "1d";
        const windowMs = WINDOW_MS[windowParam] ?? WINDOW_MS["1d"];
        const windowStart = new Date(Date.now() - windowMs);
        candidates = await prisma.candidate.findMany({
          where: { createdAt: { gte: windowStart } },
          orderBy: { createdAt: "desc" },
          take: 100,
          select: NAV_SELECT,
        });
      } else if (ctx === "priority") {
        candidates = await prisma.candidate.findMany({
          where: { status: "NEW", aiTier: { in: ["TIER_1", "TIER_2"] } },
          orderBy: { effectiveScore: { sort: "desc", nulls: "last" } },
          take: 100,
          select: NAV_SELECT,
        });
      }
      return NextResponse.json(candidates);
    }
  const query = sp.get("q")?.trim() ?? "";
  const tierFilter = sp.get("tier") ?? undefined;
  const statusFilter = sp.get("status") ?? undefined;
  const roleFilter = sp.get("role") ?? undefined;
  const appliedRoleFilter = sp.get("appliedRole") ?? undefined;
  const stateFilter = sp.get("state")?.trim() ?? undefined;
  const sort = sp.get("sort") ?? "date";
  const filterPreset = sp.get("filter") ?? undefined;
  const minExp = sp.get("minExp") ? parseInt(sp.get("minExp")!) : undefined;
  const maxExp = sp.get("maxExp") ? parseInt(sp.get("maxExp")!) : undefined;
  const archived = sp.get("archived") === "1";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (filterPreset === "today") {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    where.createdAt = { gte: todayStart };
  } else if (filterPreset === "needs-attention") {
    where.status = "NEW";
    where.aiTier = { in: ["TIER_1", "TIER_2", "TIER_3"] };
  }

  const validTiers = VALID_TIERS;
  const validStatuses = VALID_STATUSES;
  const validRoles = VALID_ROLES;

  const tierValues = tierFilter ? tierFilter.split(",").filter((v) => validTiers.includes(v)) : [];
  const statusValues = statusFilter ? statusFilter.split(",").filter((v) => validStatuses.includes(v)) : [];
  const roleValues = roleFilter ? roleFilter.split(",").filter((v) => validRoles.includes(v)) : [];
  const appliedRoleValues = appliedRoleFilter ? appliedRoleFilter.split(",").map((v) => v.trim()).filter(Boolean) : [];

  if (tierValues.length > 0) where.aiTier = { in: tierValues };
  if (archived) {
    where.status = { in: ["PLACED", "REJECTED", "DO_NOT_CONSIDER"] };
  } else if (statusValues.length > 0) {
    where.status = { in: statusValues };
  } else if (!statusFilter && filterPreset !== "needs-attention") {
    where.status = { in: ["NEW", "REVIEWED", "ACTIVE", "ON_HOLD"] };
  }

  if (minExp != null || maxExp != null) {
    where.yearsOfExperience = {
      ...(minExp != null ? { gte: minExp } : {}),
      ...(maxExp != null ? { lte: maxExp } : {}),
    };
  }
  if (roleValues.length > 0) where.aiDetectedRoleType = { in: roleValues };
  if (appliedRoleValues.length > 0) where.appliedRole = { in: appliedRoleValues };
  if (stateFilter) where.candidateState = { contains: stateFilter, mode: "insensitive" };

  if (query) {
    where.OR = [
      { displayName: { contains: query, mode: "insensitive" } },
      { firstName: { contains: query, mode: "insensitive" } },
      { lastName: { contains: query, mode: "insensitive" } },
      { appliedRole: { contains: query, mode: "insensitive" } },
      { currentTitle: { contains: query, mode: "insensitive" } },
      { currentEmployer: { contains: query, mode: "insensitive" } },
    ];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderBy: any =
    sort === "date"       ? { createdAt: "desc" }
    : sort === "date_asc" ? { createdAt: "asc" }
    : sort === "name"     ? { displayName: { sort: "asc",  nulls: "last" } }
    : sort === "name_desc"? { displayName: { sort: "desc", nulls: "last" } }
    : sort === "score_asc"? { effectiveScore: { sort: "asc",  nulls: "last" } }
    : /* score desc */      { effectiveScore: { sort: "desc", nulls: "last" } };

    const candidates = await prisma.candidate.findMany({
      where,
      orderBy,
      take: 500,
      select: {
        id: true,
        displayName: true,
        firstName: true,
        lastName: true,
        status: true,
        aiCompositeScore: true,
        manualScore: true,
        useManualScore: true,
        aiTier: true,
      },
    });

    return NextResponse.json(candidates);
  } catch (e: unknown) {
    console.error("[Navigator] Query failed:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
