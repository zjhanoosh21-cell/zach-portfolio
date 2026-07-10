import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { JobsFilterBar } from "@/components/job/jobs-filter-bar";
import { DeleteJobButton } from "@/components/job/delete-job-button";

const STATUS_CLASSES: Record<string, string> = {
  OPEN: "bg-emerald-100 text-emerald-800",
  ON_HOLD: "bg-amber-100 text-amber-800",
  FILLED: "bg-blue-100 text-blue-800",
  FILLED_BY_COMPETITOR: "bg-orange-100 text-orange-800",
  CANCELLED: "bg-slate-100 text-slate-500",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  ON_HOLD: "On Hold",
  FILLED: "Filled by CRI",
  FILLED_BY_COMPETITOR: "Filled by Competitor",
  CANCELLED: "Cancelled",
};

const PRIORITY_LABEL: Record<number, string> = {
  1: "Urgent",
  2: "Normal",
  3: "Low",
};

const PRIORITY_CLASSES: Record<number, string> = {
  1: "text-red-600 font-semibold",
  2: "text-slate-500",
  3: "text-slate-400",
};

const VALID_STATUSES = ["OPEN", "ON_HOLD", "FILLED", "FILLED_BY_COMPETITOR", "CANCELLED"];

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string; assignedTo?: string; sort?: string }>;
}

export default async function JobsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  const canDelete = (session?.user?.isAdmin || session?.user?.isManager) ?? false;
  const appSettings = canDelete
    ? await prisma.appSettings.findUnique({ where: { id: "singleton" }, select: { deletionPinHash: true } })
    : null;
  const hasDeletionPin = !!appSettings?.deletionPinHash;
  const statusFilter = params.status;
  const query = params.q?.trim();
  const assignedTo = params.assignedTo;
  const sort = params.sort ?? "priority";

  // Parse comma-separated multi-select status values
  const statusValues = statusFilter
    ? statusFilter.split(",").filter((v) => VALID_STATUSES.includes(v))
    : [];

  // Resolve recruiter name for the filter banner
  const assignedUser = assignedTo
    ? await prisma.user.findUnique({ where: { id: assignedTo }, select: { name: true } })
    : null;

  const jobs = await prisma.jobOrder.findMany({
    where: {
      ...(statusValues.length > 0
        ? { status: { in: statusValues as ("OPEN" | "ON_HOLD" | "FILLED" | "FILLED_BY_COMPETITOR" | "CANCELLED")[] } }
        : { status: { in: ["OPEN", "ON_HOLD"] } }),
      ...(assignedTo && { assignedToId: assignedTo }),
      ...(query && {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { clientName: { contains: query, mode: "insensitive" } },
          { location: { contains: query, mode: "insensitive" } },
        ],
      }),
    },
    orderBy:
      sort === "date"      ? [{ createdAt: "desc" as const }]
      : sort === "date_asc"  ? [{ createdAt: "asc" as const }]
      : sort === "title"     ? [{ title: "asc" as const }]
      : sort === "title_desc"? [{ title: "desc" as const }]
      : [{ priority: "asc" as const }, { createdAt: "desc" as const }],
    select: {
      id: true,
      title: true,
      clientName: true,
      location: true,
      status: true,
      priority: true,
      jobType: true,
      openedAt: true,
      filledAt: true,
      createdAt: true,
      _count: { select: { submissions: true } },
    },
  });

  const openCount = await prisma.jobOrder.count({ where: { status: "OPEN" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Job Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">{openCount} open</p>
        </div>
        <Link
          href="/jobs/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-slate-900 text-white rounded hover:bg-slate-700 transition-colors"
        >
          + New job order
        </Link>
      </div>

      {/* Recruiter filter banner */}
      {assignedUser && (
        <div className="flex items-center gap-2 rounded border border-[#1a6bbf] bg-blue-50 px-4 py-2 text-sm text-[#1a6bbf]">
          <span>Showing jobs assigned to <strong>{assignedUser.name}</strong></span>
          <Link href="/jobs" className="ml-auto text-xs underline hover:no-underline">Clear filter</Link>
        </div>
      )}

      {/* Filters */}
      <JobsFilterBar
        key={`${statusFilter ?? ""}-${query ?? ""}-${sort}`}
        query={query}
        status={statusFilter}
        sort={sort}
      />

      {jobs.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-500 font-medium">No job orders found</p>
          <p className="text-sm text-slate-400 mt-1">Create your first job order to start tracking candidates against open roles.</p>
          <Link href="/jobs/new" className="inline-block mt-4 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded hover:bg-slate-700">
            Create job order
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2 px-4 py-2.5">
                <Link href={`/jobs/${job.id}`} className="flex-1 min-w-0 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-sm">{job.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASSES[job.status] ?? "bg-slate-100 text-slate-700"}`}>
                        {STATUS_LABEL[job.status] ?? job.status.replace(/_/g, " ")}
                      </span>
                      <span className={`text-xs ${PRIORITY_CLASSES[job.priority] ?? "text-slate-500"}`}>
                        {PRIORITY_LABEL[job.priority]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {job.clientName}
                      {job.location ? ` · ${job.location}` : ""}
                      {" · "}
                      {job.jobType.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <p className="font-medium text-slate-700">{job._count.submissions} submitted</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {job.status === "OPEN" || job.status === "ON_HOLD" ? (
                        (() => {
                          const days = Math.floor((Date.now() - job.openedAt.getTime()) / 86400000);
                          return (
                            <span className={days >= 30 ? "text-amber-600 font-medium" : ""}>
                              {days === 0 ? "Opened today" : `${days}d open`}
                            </span>
                          );
                        })()
                      ) : (job.status === "FILLED" || job.status === "FILLED_BY_COMPETITOR") && job.filledAt ? (
                        (() => {
                          const days = Math.floor((job.filledAt.getTime() - job.openedAt.getTime()) / 86400000);
                          return <span className="text-blue-600">{days}d to fill</span>;
                        })()
                      ) : (
                        job.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      )}
                    </p>
                  </div>
                </Link>
                {canDelete && (
                  <div className="shrink-0">
                    <DeleteJobButton jobId={job.id} hasDeletionPin={hasDeletionPin} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
