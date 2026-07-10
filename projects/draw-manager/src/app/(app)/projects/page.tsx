import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import ProjectsGrid from './ProjectsGrid'

export default async function ProjectsPage() {
  const [projects, settings] = await Promise.all([
    prisma.project.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        line_items: {
          include: { vendor: true, change_orders: true },
        },
      },
    }),
    getSettings(),
  ])

  // Compute stats for each project
  const projectsWithStats = projects.map((p) => {
    const totalPaid = p.line_items.reduce((sum, li) => sum + li.total_paid_cents, 0)
    const alertCount = p.line_items.filter((li) => {
      const isOverBudget = li.total_paid_cents > li.adjusted_contract_cents
      const remaining = li.adjusted_contract_cents - li.total_paid_cents
      const isNearLimit =
        settings.low_balance_alerts &&
        li.adjusted_contract_cents > 0 &&
        li.total_paid_cents > 0 &&
        remaining / li.adjusted_contract_cents < 0.1
      return isOverBudget || isNearLimit
    }).length

    return {
      ...p,
      total_paid_cents: totalPaid,
      alert_count: alertCount,
    }
  })

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">My projects</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tap a project to open it.</p>
      </div>
      <ProjectsGrid projects={projectsWithStats} />
    </div>
  )
}
