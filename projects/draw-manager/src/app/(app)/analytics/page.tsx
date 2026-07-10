import { prisma } from '@/lib/prisma'
import AnalyticsClient from './AnalyticsClient'

export default async function AnalyticsPage() {
  const projects = await prisma.project.findMany({
    include: {
      line_items: {
        include: { vendor: true, change_orders: true },
      },
      payments: true,
    },
  })

  if (projects.length < 2) {
    return (
      <div className="p-4 sm:p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Analytics</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-4xl mb-4">📊</p>
          <p className="text-lg font-semibold text-gray-900 mb-2">Not enough data yet</p>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Analytics become meaningful once you have 2 or more projects. Add another project to unlock insights like avg project value, cost overruns, and top vendors.
          </p>
        </div>
      </div>
    )
  }

  // Compute analytics data
  const totalManaged = projects.reduce((s, p) => s + p.contract_total_cents, 0)
  const avgProjectValue = Math.round(totalManaged / projects.length)

  const vendorTotals: Record<string, number> = {}
  const categoryTotals: Record<string, number> = {}
  let totalCOs = 0
  let overrunProjects = 0

  for (const project of projects) {
    const totalPaid = project.line_items.reduce((s, li) => s + li.total_paid_cents, 0)
    if (totalPaid > project.contract_total_cents) overrunProjects++

    for (const li of project.line_items) {
      vendorTotals[li.vendor.name] = (vendorTotals[li.vendor.name] || 0) + li.total_paid_cents
      categoryTotals[li.category] = (categoryTotals[li.category] || 0) + li.total_paid_cents
      totalCOs += li.change_orders.length
    }
  }

  const topVendors = Object.entries(vendorTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, total]) => ({ name, total }))

  const categoryData = Object.entries(categoryTotals).map(([name, total]) => ({ name, total }))

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Analytics</h1>
      <AnalyticsClient
        summary={{ totalManaged, avgProjectValue, projectCount: projects.length, overrunProjects, totalCOs }}
        topVendors={topVendors}
        categoryData={categoryData}
      />
    </div>
  )
}
