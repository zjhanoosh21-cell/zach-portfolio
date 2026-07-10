import { prisma } from "@/lib/prisma";
import { Prisma, CandidateTier, CandidateStatus, RoleType } from "@prisma/client";
import { VALID_TIERS, VALID_STATUSES, VALID_ROLES } from "@/lib/candidate-display";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BulkCandidateList } from "@/components/candidate/bulk-candidate-list";
import { SavedViewsBar } from "@/components/candidate/saved-views";
import { PinnedViewRedirect } from "@/components/candidate/pinned-view-redirect";
import { CandidateFilterBar } from "@/components/candidate/candidate-filter-bar";

const PAGE_SIZE = 50;

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    q?: string;
    tier?: string;
    status?: string;
    role?: string;
    appliedRole?: string;
    state?: string;
    sort?: string;
    filter?: string;
    page?: string;
    minExp?: string;
    maxExp?: string;
    archived?: string;
    tab?: string; // "crm" (default) | "all" | "resumate"
    duplicate?: string;
    priority?: string;
  }>;
}

export default async function CandidatesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.isAdmin ?? false;
  const isManager = session?.user?.isManager ?? false;
  const canDelete = isAdmin || isManager;
  const userId = session?.user?.id ?? "";
  const query = params.q?.trim() ?? "";
  const tierFilter = params.tier;
  const statusFilter = params.status;
  const roleFilter = params.role;
  const appliedRoleFilter = params.appliedRole;
  const stateFilter = params.state?.trim();
  const sort = params.sort ?? "date";
  const filterPreset = params.filter;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const minExp = params.minExp ? parseInt(params.minExp) : undefined;
  const maxExp = params.maxExp ? parseInt(params.maxExp) : undefined;
  const archived = params.archived === "1";
  const duplicateOnly = params.duplicate === "1";
  const priorityOnly = params.priority === "1";
  const tab = (params.tab === "all" || params.tab === "resumate") ? params.tab : "crm";

  // Build where clause
  const where: Prisma.CandidateWhereInput = {};

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

  // Parse comma-separated multi-select values
  const tierValues = tierFilter
    ? tierFilter.split(",").filter((v) => validTiers.includes(v))
    : [];
  const statusValues = statusFilter
    ? statusFilter.split(",").filter((v) => validStatuses.includes(v))
    : [];
  const roleValues = roleFilter
    ? roleFilter.split(",").filter((v) => validRoles.includes(v))
    : [];
  // Applied-role values are dynamic (free-text roles the scanner brought in), so they
  // aren't validated against a fixed list — they're matched exactly against stored values.
  const appliedRoleValues = appliedRoleFilter
    ? appliedRoleFilter.split(",").map((v) => v.trim()).filter(Boolean)
    : [];

  if (tierValues.length > 0) {
    where.aiTier = { in: tierValues as CandidateTier[] };
  }

  // Source filter based on tab
  if (tab === "crm") {
    where.source = { not: "RESUMate" };
  } else if (tab === "resumate") {
    where.source = "RESUMate";
  }
  // tab === "all": no source restriction

  // Status filter — RESUMate tab shows all statuses by default (they're historical imports)
  if (archived && tab !== "resumate") {
    where.status = { in: ["PLACED", "REJECTED", "DO_NOT_CONSIDER"] };
  } else if (statusValues.length > 0) {
    where.status = { in: statusValues as CandidateStatus[] };
  } else if (!statusFilter && filterPreset !== "needs-attention" && tab !== "resumate") {
    where.status = { in: ["NEW", "REVIEWED", "ACTIVE", "ON_HOLD"] };
  }

  if (minExp != null || maxExp != null) {
    where.yearsOfExperience = {
      ...(minExp != null ? { gte: minExp } : {}),
      ...(maxExp != null ? { lte: maxExp } : {}),
    };
  }
  if (roleValues.length > 0) {
    where.aiDetectedRoleType = { in: roleValues as RoleType[] };
  }
  if (appliedRoleValues.length > 0) {
    where.appliedRole = { in: appliedRoleValues };
  }
  if (stateFilter) {
    where.candidateState = { contains: stateFilter, mode: "insensitive" };
  }
  if (duplicateOnly) {
    where.isDuplicate = true;
  }
  if (priorityOnly) {
    where.priorityCall = true;
  }

  if (query) {
    where.OR = [
      { displayName: { contains: query, mode: "insensitive" } },
      { firstName: { contains: query, mode: "insensitive" } },
      { lastName: { contains: query, mode: "insensitive" } },
      { appliedRole: { contains: query, mode: "insensitive" } },
      { currentTitle: { contains: query, mode: "insensitive" } },
      { currentEmployer: { contains: query, mode: "insensitive" } },
      { keySkills: { has: query } },
      { practiceAreas: { has: query } },
    ];
  }

  const orderBy: Prisma.CandidateOrderByWithRelationInput =
    sort === "date"         ? { createdAt: "desc" }
    : sort === "date_asc"   ? { createdAt: "asc" }
    : sort === "name"       ? { displayName: { sort: "asc",  nulls: "last" } }
    : sort === "name_desc"  ? { displayName: { sort: "desc", nulls: "last" } }
    : sort === "score_asc"  ? { effectiveScore: { sort: "asc",  nulls: "last" } }
    : sort === "onfile_asc" ? { originalEntryDate: { sort: "desc", nulls: "last" } }
    : sort === "onfile_desc"? { originalEntryDate: { sort: "asc",  nulls: "last" } }
    : /* score desc */        { effectiveScore: { sort: "desc", nulls: "last" } };

  const [candidates, total, appSettings, appliedRoleRows] = await Promise.all([
    prisma.candidate.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        displayName: true,
        firstName: true,
        lastName: true,
        appliedRole: true,
        candidateLocation: true,
        candidateState: true,
        currentTitle: true,
        currentEmployer: true,
        yearsOfExperience: true,
        status: true,
        aiCompositeScore: true,
        manualScore: true,
        useManualScore: true,
        aiTier: true,
        aiTriageAction: true,
        priorityCall: true,
        aiSummary: true,
        keySkills: true,
        practiceAreas: true,
        riskFlags: true,
        source: true,
        createdAt: true,
        originalEntryDate: true,
        isDuplicate: true,
      },
    }),
    prisma.candidate.count({ where }),
    prisma.appSettings.findUnique({ where: { id: "singleton" } }),
    // Distinct applied roles across ALL candidates — drives the dynamic "Applied role"
    // filter so every role the scanner brings in is selectable (incl. brand-new ones).
    prisma.candidate.findMany({
      where: { appliedRole: { not: null } },
      select: { appliedRole: true },
      distinct: ["appliedRole"],
      orderBy: { appliedRole: "asc" },
    }),
  ]);
  const aiScoringEnabled = appSettings?.aiScoringEnabled ?? true;

  // Build options from the distinct applied roles (value = exact stored string for an
  // exact-match filter; label = trimmed for display). Empty/whitespace-only are dropped.
  const appliedRoleOptions = appliedRoleRows
    .map((r) => r.appliedRole)
    .filter((r): r is string => !!r && r.trim().length > 0)
    .map((r) => ({ value: r, label: r.trim() }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Build query string for pagination links (preserves all active filters)
  const filterParams = new URLSearchParams();
  if (query) filterParams.set("q", query);
  if (tierValues.length > 0) filterParams.set("tier", tierValues.join(","));
  if (statusValues.length > 0) filterParams.set("status", statusValues.join(","));
  if (roleValues.length > 0) filterParams.set("role", roleValues.join(","));
  if (appliedRoleValues.length > 0) filterParams.set("appliedRole", appliedRoleValues.join(","));
  if (stateFilter) filterParams.set("state", stateFilter);
  if (sort !== "date") filterParams.set("sort", sort);
  if (minExp != null) filterParams.set("minExp", String(minExp));
  if (maxExp != null) filterParams.set("maxExp", String(maxExp));
  if (archived && tab !== "resumate") filterParams.set("archived", "1");
  if (tab !== "crm") filterParams.set("tab", tab);
  if (duplicateOnly) filterParams.set("duplicate", "1");
  if (priorityOnly) filterParams.set("priority", "1");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Candidates</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total.toLocaleString()} result{total !== 1 ? "s" : ""}
            {totalPages > 1 && ` · page ${page} of ${totalPages}`}
          </p>
        </div>
        <Link
          href="/candidates/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-slate-900 text-white rounded hover:bg-slate-700 transition-colors"
        >
          + Add manually
        </Link>
      </div>

      {/* Redirect to pinned view on bare /candidates */}
      <PinnedViewRedirect userId={userId} />

      {/* Saved views */}
      <SavedViewsBar userId={userId} />

      {/* Source tabs */}
      <div className="flex gap-2">
        <a
          href="/candidates"
          className={`text-sm px-3 py-1 rounded font-medium border transition-colors ${
            tab === "crm"
              ? "bg-slate-900 text-white border-slate-900"
              : "border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Active Pipeline
        </a>
        <a
          href="/candidates?tab=all"
          className={`text-sm px-3 py-1 rounded font-medium border transition-colors ${
            tab === "all"
              ? "bg-slate-900 text-white border-slate-900"
              : "border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          All Candidates
        </a>
        <a
          href="/candidates?tab=resumate"
          className={`text-sm px-3 py-1 rounded font-medium border transition-colors ${
            tab === "resumate"
              ? "bg-slate-900 text-white border-slate-900"
              : "border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          RESUMate Archive
        </a>
      </div>

      {/* Active / Archived status toggle — only for CRM and All tabs */}
      {tab !== "resumate" && (
        <div className="flex gap-2">
          <a
            href={tab === "all" ? "/candidates?tab=all" : "/candidates"}
            className={`text-sm px-3 py-1 rounded font-medium border transition-colors ${
              !archived
                ? "bg-slate-900 text-white border-slate-900"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Active
          </a>
          <a
            href={tab === "all" ? "/candidates?tab=all&archived=1" : "/candidates?archived=1"}
            className={`text-sm px-3 py-1 rounded font-medium border transition-colors ${
              archived
                ? "bg-slate-900 text-white border-slate-900"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            Archived
          </a>
        </div>
      )}

      {/* Filters */}
      <CandidateFilterBar
        key={`${tab}-${tierFilter ?? ""}-${archived && tab !== "resumate" ? "" : statusFilter ?? ""}-${roleFilter ?? ""}-${appliedRoleFilter ?? ""}-${sort}-${stateFilter ?? ""}-${params.minExp ?? ""}-${params.maxExp ?? ""}-${duplicateOnly}-${priorityOnly}`}
        query={query}
        tier={tierFilter}
        status={archived && tab !== "resumate" ? undefined : statusFilter}
        role={roleFilter}
        appliedRole={appliedRoleFilter}
        appliedRoleOptions={appliedRoleOptions}
        state={stateFilter}
        sort={sort}
        minExp={minExp}
        maxExp={maxExp}
        archived={archived && tab !== "resumate"}
        tab={tab}
        duplicateOnly={duplicateOnly}
        priorityOnly={priorityOnly}
      />

      {/* Results */}
      {candidates.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-500 font-medium">No candidates found</p>
          <p className="text-sm text-slate-400 mt-1">
            {query
              ? `No results for "${query}" — try a different search term.`
              : statusFilter
              ? `No candidates with status "${statusFilter.replace(/_/g, " ").toLowerCase()}".`
              : "No active candidates yet. They'll appear here automatically when n8n processes new applications."}
          </p>
        </div>
      ) : (
        <>
          <BulkCandidateList candidates={candidates} isAdmin={canDelete} aiScoringEnabled={aiScoringEnabled} />
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} filterParams={filterParams} />
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  filterParams,
}: {
  page: number;
  totalPages: number;
  filterParams: URLSearchParams;
}) {
  const pageUrl = (p: number) => {
    const qs = new URLSearchParams(filterParams);
    if (p > 1) qs.set("page", String(p));
    else qs.delete("page");
    const str = qs.toString();
    return `/candidates${str ? `?${str}` : ""}`;
  };

  // Build visible page numbers: always show first, last, current ±2
  const pages: (number | "…")[] = [];
  const add = new Set<number>();
  [1, totalPages, page - 2, page - 1, page, page + 1, page + 2].forEach((n) => {
    if (n >= 1 && n <= totalPages) add.add(n);
  });
  const sorted = Array.from(add).sort((a, b) => a - b);
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) pages.push("…");
    pages.push(n);
  });

  return (
    <div className="flex items-center justify-center gap-1 pt-2 pb-6">
      {/* Prev */}
      {page > 1 ? (
        <Link
          href={pageUrl(page - 1)}
          className="h-8 px-3 flex items-center text-sm text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
        >
          ← Prev
        </Link>
      ) : (
        <span className="h-8 px-3 flex items-center text-sm text-slate-300 border border-slate-200 rounded cursor-not-allowed">
          ← Prev
        </span>
      )}

      {/* Page numbers */}
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="h-8 px-2 flex items-center text-sm text-slate-400">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={pageUrl(p)}
            className={`h-8 w-8 flex items-center justify-center text-sm rounded border ${
              p === page
                ? "bg-slate-900 text-white border-slate-900 font-medium"
                : "text-slate-600 border-slate-300 hover:bg-slate-50"
            }`}
          >
            {p}
          </Link>
        )
      )}

      {/* Next */}
      {page < totalPages ? (
        <Link
          href={pageUrl(page + 1)}
          className="h-8 px-3 flex items-center text-sm text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
        >
          Next →
        </Link>
      ) : (
        <span className="h-8 px-3 flex items-center text-sm text-slate-300 border border-slate-200 rounded cursor-not-allowed">
          Next →
        </span>
      )}
    </div>
  );
}

