import Link from "next/link";
import { Target } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, EmptyState } from "@/components/ui";
import { AddGoalButton, GoalCard, type GoalData } from "@/components/goal-ui";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const goals = (await prisma.goal.findMany({
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  })) as GoalData[];

  const active = goals.filter((g) => g.status === "active");
  const done = goals.filter((g) => g.status === "achieved");
  const paused = goals.filter((g) => g.status === "paused");

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink">Goals</h1>
          <p className="text-sm text-ink-3 mt-0.5">
            What you&apos;re working toward, and the pace to get there.
          </p>
        </div>
        <AddGoalButton />
      </div>

      {goals.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Target size={28} />}
            title="No goals yet"
            body="Not sure what your goals should be? That's exactly what Sage is for — it'll ask the right questions and propose goals with real numbers and dates."
            action={
              <Link href="/advisor" className="text-sm font-medium text-accent-strong hover:underline">
                Figure them out with Sage →
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {active.map((g) => (
                <GoalCard key={g.id} goal={g} />
              ))}
            </div>
          )}
          {paused.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-ink-2 mb-3">Paused</h2>
              <div className="grid grid-cols-2 gap-4">
                {paused.map((g) => (
                  <GoalCard key={g.id} goal={g} />
                ))}
              </div>
            </div>
          )}
          {done.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-ink-2 mb-3">Achieved 🎉</h2>
              <div className="grid grid-cols-2 gap-4">
                {done.map((g) => (
                  <GoalCard key={g.id} goal={g} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
