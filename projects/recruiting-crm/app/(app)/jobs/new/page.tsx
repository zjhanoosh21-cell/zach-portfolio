import { prisma } from "@/lib/prisma";
import { JobForm } from "@/components/job/job-form";

interface PageProps {
  searchParams: Promise<{ clientId?: string; clientName?: string }>;
}

export default async function NewJobPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [clients, users] = await Promise.all([
    prisma.client.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <a href="/jobs" className="text-sm text-slate-500 hover:text-slate-800">
        ← Back to job orders
      </a>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">New Job Order</h1>
        <p className="text-sm text-slate-500 mt-1">Create an open role to track candidate submissions.</p>
      </div>
      <JobForm
        clients={clients}
        users={users}
        defaultClientId={params.clientId}
        defaultClientName={params.clientName}
      />
    </div>
  );
}
