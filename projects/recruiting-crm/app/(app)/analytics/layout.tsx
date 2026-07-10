import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AnalyticsTabs } from "@/components/analytics/analytics-tabs";
import { AnalyticsDateFilter } from "@/components/analytics/analytics-date-filter";

export default async function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const isAdmin = !!(session?.user as { isAdmin?: boolean })?.isAdmin;
  const isManager = !!(session?.user as { isManager?: boolean })?.isManager;
  const isElevated = isAdmin || isManager;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Recruiting performance and pipeline overview</p>
        </div>
        <Suspense fallback={null}>
          <AnalyticsDateFilter />
        </Suspense>
      </div>
      <AnalyticsTabs isElevated={isElevated} />
      <div>{children}</div>
    </div>
  );
}
