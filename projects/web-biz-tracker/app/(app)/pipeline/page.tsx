import { prisma } from "@/lib/prisma";
import { DealCard } from "@/components/deal/deal-card";
import { CreateDealForm } from "@/components/deal/create-deal-form";
import { formatDollars } from "@/lib/utils";

export default async function PipelinePage() {
  const [deals, prospectsWithoutDeal] = await Promise.all([
    prisma.deal.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        prospect: {
          select: {
            id: true,
            name: true,
            businessName: true,
            industry: true,
            email: true,
            assignee: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.prospect.findMany({
      where: { deal: null },
      select: { id: true, name: true, businessName: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const active = deals.filter((d) => d.status === "active");
  const won = deals.filter((d) => d.status === "won");
  const lost = deals.filter((d) => d.status === "lost");

  const totalWon = won.reduce((s, d) => s + (d.proposalAmount ?? 0), 0);
  const pipelineValue = active.reduce(
    (s, d) => s + (d.proposalAmount ?? 0),
    0
  );
  const mrr = won.reduce((s, d) => s + (d.retainerAmount ?? 0), 0);

  const serialized = deals.map((d) => ({
    ...d,
    closeDate: d.closeDate?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
          <p className="text-sm text-slate-500 mt-0.5">{deals.length} deals</p>
        </div>
        <CreateDealForm prospects={prospectsWithoutDeal} />
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
            Won
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatDollars(totalWon)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{won.length} deals</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
            In Pipeline
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {formatDollars(pipelineValue)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{active.length} active</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
            Monthly Retainers
          </p>
          <p className="text-2xl font-bold text-green-700 mt-1">
            {formatDollars(mrr)}/mo
          </p>
          <p className="text-xs text-slate-400 mt-0.5">recurring revenue</p>
        </div>
      </div>

      {deals.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg font-medium">No deals yet</p>
          <p className="text-sm mt-1">
            Create a deal from a prospect to start tracking revenue.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          <DealColumn
            title="Active"
            deals={serialized.filter((d) => d.status === "active")}
          />
          <DealColumn
            title="Won"
            deals={serialized.filter((d) => d.status === "won")}
          />
          <DealColumn
            title="Lost"
            deals={serialized.filter((d) => d.status === "lost")}
          />
        </div>
      )}
    </div>
  );
}

function DealColumn({
  title,
  deals,
}: {
  title: string;
  deals: Parameters<typeof DealCard>[0]["deal"][];
}) {
  return (
    <div>
      <h2 className="font-semibold text-slate-700 mb-3 text-sm uppercase tracking-wide">
        {title} ({deals.length})
      </h2>
      <div className="space-y-3">
        {deals.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Empty</p>
        ) : (
          deals.map((d) => <DealCard key={d.id} deal={d} />)
        )}
      </div>
    </div>
  );
}
