import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { notFound } from 'next/navigation'
import { toDisplay } from '@/lib/money'
import { getStatusBadge, computeLineItemAlerts } from '@/lib/business-rules'
import ProjectDetailClient from './ProjectDetailClient'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [project, vendors, settings] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        line_items: {
          include: { vendor: true, change_orders: true },
          orderBy: { sort_order: 'asc' },
        },
      },
    }),
    prisma.vendor.findMany({ orderBy: { name: 'asc' } }),
    getSettings(),
  ])

  if (!project) notFound()

  // Compute metrics
  const totalPaid = project.line_items.reduce((s, li) => s + li.total_paid_cents, 0)
  const totalOwing = project.line_items.reduce((s, li) => {
    const owing = Math.max(0, li.adjusted_contract_cents - li.total_paid_cents - li.retention_withheld_cents)
    return s + owing
  }, 0)
  const leftToComplete = project.contract_total_cents - totalPaid

  const alerts = computeLineItemAlerts(
    project.line_items.map((li) => ({
      vendor: li.vendor,
      adjusted_contract_cents: li.adjusted_contract_cents,
      total_paid_cents: li.total_paid_cents,
    })),
    settings
  )

  const lineItemsWithStatus = project.line_items.map((li) => {
    const coTotal = li.change_orders.reduce((sum, co) => {
      return co.direction === 'add' ? sum + co.amount_cents : sum - co.amount_cents
    }, 0)
    return {
      ...li,
      change_orders_total_cents: coTotal,
      status: getStatusBadge(li.total_paid_cents, li.adjusted_contract_cents, settings.low_balance_alerts),
    }
  })

  return (
    <ProjectDetailClient
      project={{ ...project, line_items: lineItemsWithStatus }}
      vendors={vendors}
      metrics={{
        totalContract: project.contract_total_cents,
        totalPaid,
        totalOwing,
        leftToComplete,
      }}
      alerts={alerts}
      settings={settings}
    />
  )
}
