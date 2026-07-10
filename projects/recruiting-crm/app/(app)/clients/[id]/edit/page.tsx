import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ClientForm } from "@/components/client/client-form";

export default async function ClientEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      industry: true,
      specialty: true,
      city: true,
      state: true,
      website: true,
      notes: true,
    },
  });

  if (!client) notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href={`/clients/${id}`} className="text-sm text-slate-500 hover:text-slate-800">
          ← Back to {client.name}
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Edit Client</h1>
        <p className="text-sm text-slate-500 mt-0.5">{client.name}</p>
      </div>
      <ClientForm
        mode="edit"
        clientId={id}
        defaultValues={{
          name: client.name,
          industry: client.industry,
          specialty: client.specialty,
          city: client.city,
          state: client.state,
          website: client.website,
          notes: client.notes,
        }}
      />
    </div>
  );
}
