import { prisma } from "@/lib/prisma";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ inactive?: string }>;
}

export default async function ClientsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const showInactive = params.inactive === "1";

  const clients = await prisma.client.findMany({
    where: showInactive ? { isActive: false } : { isActive: true },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { jobOrders: true } },
      contacts: {
        where: { isPrimary: true },
        take: 1,
        select: { name: true, email: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {clients.length} firm{clients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-slate-900 text-white rounded hover:bg-slate-700 transition-colors"
        >
          + Add client
        </Link>
      </div>

      {/* Active / Inactive toggle */}
      <div className="flex gap-2">
        <a
          href="/clients"
          className={`text-sm px-3 py-1 rounded font-medium border transition-colors ${
            !showInactive
              ? "bg-slate-900 text-white border-slate-900"
              : "border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Active
        </a>
        <a
          href="/clients?inactive=1"
          className={`text-sm px-3 py-1 rounded font-medium border transition-colors ${
            showInactive
              ? "bg-slate-900 text-white border-slate-900"
              : "border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Inactive
        </a>
      </div>

      {clients.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-500 font-medium">
            {showInactive ? "No inactive clients" : "No clients yet"}
          </p>
          {!showInactive && (
            <>
              <p className="text-sm text-slate-400 mt-1">
                Add law firms, corporate HR contacts, and other hiring managers here.
              </p>
              <Link
                href="/clients/new"
                className="inline-block mt-4 px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded hover:bg-slate-700"
              >
                Add your first client
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="block rounded border border-slate-200 bg-white px-4 py-2.5 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 text-sm">{c.name}</span>
                    {c.industry && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {c.industry}
                      </span>
                    )}
                    {c.specialty && (
                      <span className="text-xs text-slate-500">{c.specialty}</span>
                    )}
                    {!c.isActive && (
                      <span className="text-xs font-semibold uppercase tracking-wide bg-slate-200 text-slate-500 px-2 py-0.5 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {[c.city, c.state].filter(Boolean).join(", ")}
                    {c.contacts[0] && (
                      <span className="ml-3 text-slate-400">
                        {c.contacts[0].name}
                        {c.contacts[0].email && ` · ${c.contacts[0].email}`}
                      </span>
                    )}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium text-slate-700">
                    {c._count.jobOrders} job order{c._count.jobOrders !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
