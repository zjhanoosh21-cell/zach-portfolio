import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { JobForm } from "@/components/job/job-form";

export default async function JobEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [job, clients, users] = await Promise.all([
    prisma.jobOrder.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        clientId: true,
        clientName: true,
        location: true,
        jobType: true,
        roleType: true,
        salaryMin: true,
        salaryMax: true,
        priority: true,
        description: true,
        internalNotes: true,
        practiceAreas: true,
        requiredSkills: true,
        targetFillDate: true,
        status: true,
        assignedToId: true,
      },
    }),
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

  if (!job) notFound();

  return (
    <div className="space-y-6">
      <Link href={`/jobs/${id}`} className="text-sm text-slate-500 hover:text-slate-800">
        ← Back to {job.title}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Edit Job Order</h1>
        <p className="text-sm text-slate-500 mt-0.5">{job.title} · {job.clientName}</p>
      </div>
      <JobForm
        mode="edit"
        jobId={id}
        clients={clients}
        users={users}
        defaultValues={{
          title: job.title,
          clientId: job.clientId,
          clientName: job.clientName,
          location: job.location,
          jobType: job.jobType,
          roleType: job.roleType,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          priority: job.priority,
          description: job.description,
          internalNotes: job.internalNotes,
          practiceAreas: job.practiceAreas,
          requiredSkills: job.requiredSkills,
          targetFillDate: job.targetFillDate
            ? job.targetFillDate.toISOString().split("T")[0]
            : null,
          status: job.status,
          assignedToId: job.assignedToId,
        }}
      />
    </div>
  );
}
