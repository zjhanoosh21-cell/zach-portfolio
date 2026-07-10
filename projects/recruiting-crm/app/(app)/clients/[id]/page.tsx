import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContactManager } from "@/components/client/contact-manager";
import { ClientActions } from "@/components/client/client-actions";

const JOB_STATUS_CLASSES: Record<string, string> = {
  OPEN: "bg-emerald-100 text-emerald-800",
  ON_HOLD: "bg-amber-100 text-amber-800",
  FILLED: "bg-blue-100 text-blue-800",
  FILLED_BY_COMPETITOR: "bg-orange-100 text-orange-800",
  CANCELLED: "bg-slate-100 text-slate-500",
};

const JOB_STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  ON_HOLD: "On Hold",
  FILLED: "Filled by CRI",
  FILLED_BY_COMPETITOR: "Filled by Competitor",
  CANCELLED: "Cancelled",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const isAdminOrManager = (session?.user?.isAdmin || session?.user?.isManager) ?? false;

  const [client, appSettings] = await Promise.all([
    prisma.client.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
      jobOrders: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          status: true,
          jobType: true,
          location: true,
          createdAt: true,
          _count: { select: { submissions: true } },
        },
      },
    },
    }),
    prisma.appSettings.findUnique({ where: { id: "singleton" }, select: { deletionPinHash: true } }),
  ]);

  if (!client) notFound();

  const hasDeletionPin = !!appSettings?.deletionPinHash;

  const openJobs = client.jobOrders.filter((j) => j.status === "OPEN").length;

  return (
    <div className="space-y-6">
      <a href="/clients" className="text-sm text-slate-500 hover:text-slate-800">
        ← Back to clients
      </a>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold text-slate-900">{client.name}</h1>
            {!client.isActive && (
              <span className="text-xs font-semibold uppercase tracking-wide bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                Inactive
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {[client.industry, client.specialty, [client.city, client.state].filter(Boolean).join(", ")]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <Link
            href={`/clients/${id}/edit`}
            className="h-8 px-3 text-sm border border-slate-300 rounded hover:bg-slate-50 flex items-center"
          >
            Edit
          </Link>
          {openJobs > 0 && (
            <span className="text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              {openJobs} open job{openJobs !== 1 ? "s" : ""}
            </span>
          )}
          <ClientActions clientId={id} isActive={client.isActive} isAdminOrManager={isAdminOrManager} hasDeletionPin={hasDeletionPin} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left: details + contacts */}
        <div className="space-y-4">
          {/* Info card */}
          <div className="rounded border border-slate-200 bg-white p-5 space-y-3">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Details</p>
            <dl className="space-y-2 text-sm">
              {client.industry && <DetailRow label="Industry" value={client.industry} />}
              {client.specialty && <DetailRow label="Specialty" value={client.specialty} />}
              {(client.city || client.state) && (
                <DetailRow
                  label="Location"
                  value={[client.city, client.state].filter(Boolean).join(", ")}
                />
              )}
              {client.website && (
                <div className="flex gap-2">
                  <dt className="text-slate-400 shrink-0 w-20">Website</dt>
                  <dd>
                    <a
                      href={client.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm break-all"
                    >
                      {client.website.replace(/^https?:\/\//, "")}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            {client.notes && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Notes</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </div>

          {/* Contacts */}
          <div className="rounded border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
              Contacts
            </p>
            <ContactManager clientId={id} contacts={client.contacts} />
          </div>
        </div>

        {/* Right: job orders */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-slate-900">Job Orders</h2>
            <Link
              href={`/jobs/new?clientId=${id}&clientName=${encodeURIComponent(client.name)}`}
              className="text-sm text-blue-600 hover:underline"
            >
              + New job order
            </Link>
          </div>

          {client.jobOrders.length === 0 ? (
            <div className="rounded border border-dashed border-slate-300 p-8 text-center">
              <p className="text-sm text-slate-500">No job orders for this client yet.</p>
              <Link
                href={`/jobs/new?clientId=${id}&clientName=${encodeURIComponent(client.name)}`}
                className="inline-block mt-3 text-sm text-blue-600 hover:underline"
              >
                Create first job order →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {client.jobOrders.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center justify-between rounded border border-slate-200 bg-white px-4 py-3 hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{job.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {job.jobType.replace(/_/g, " ")}
                      {job.location ? ` · ${job.location}` : ""}
                      {" · "}
                      {job._count.submissions} submission{job._count.submissions !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ml-3 ${
                      JOB_STATUS_CLASSES[job.status] ?? "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {JOB_STATUS_LABEL[job.status] ?? job.status.replace(/_/g, " ")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-slate-400 shrink-0 w-20">{label}</dt>
      <dd className="text-slate-800 font-medium text-sm">{value}</dd>
    </div>
  );
}
