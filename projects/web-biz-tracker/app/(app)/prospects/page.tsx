import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { ProspectList } from "@/components/prospect/prospect-list";
import { Suspense } from "react";

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const prospects = await prisma.prospect.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    include: {
      assignee: { select: { id: true, name: true } },
      deal: { select: { id: true, status: true, proposalAmount: true } },
    },
  });

  const total = await prisma.prospect.count();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Prospects</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} total</p>
        </div>
        <Button asChild>
          <Link href="/prospects/new">
            <Plus className="h-4 w-4 mr-1" />
            Add Prospect
          </Link>
        </Button>
      </div>
      <Suspense>
        <ProspectList
          prospects={prospects.map((p) => ({
            ...p,
            followUpDate: p.followUpDate?.toISOString() ?? null,
            outreachSentAt: p.outreachSentAt?.toISOString() ?? null,
            createdAt: p.createdAt.toISOString(),
          }))}
        />
      </Suspense>
    </div>
  );
}
