import { prisma } from "@/lib/prisma";
import { ProspectForm } from "@/components/prospect/prospect-form";

export default async function NewProspectPage() {
  const users = await prisma.user.findMany({ select: { id: true, name: true } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Add Prospect</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manually add a new prospect to the pipeline.
        </p>
      </div>
      <ProspectForm users={users} />
    </div>
  );
}
