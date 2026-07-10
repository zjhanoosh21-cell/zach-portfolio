import { prisma } from '@/lib/prisma'
import HistoryClient from './HistoryClient'

export default async function HistoryPage() {
  const [payments, changeOrders, projects] = await Promise.all([
    prisma.payment.findMany({
      include: { line_item: { include: { vendor: true } }, project: true },
      orderBy: { logged_at: 'desc' },
    }),
    prisma.changeOrder.findMany({
      include: { line_item: { include: { vendor: true } }, project: true },
      orderBy: { logged_at: 'desc' },
    }),
    prisma.project.findMany({ orderBy: { owner_name: 'asc' } }),
  ])

  // Merge into timeline
  const timeline = [
    ...payments.map((p) => ({
      id: p.id,
      type: 'payment' as const,
      vendor: p.line_item.vendor.name,
      work: p.line_item.work_description,
      amount: p.amount_cents,
      project: p.project.owner_name + ' — ' + p.project.address.split(',')[0],
      project_id: p.project_id,
      draw_number: p.draw_number,
      notes: p.notes,
      date: p.logged_at.toISOString(),
      isOverBudget: false,
    })),
    ...changeOrders.map((co) => ({
      id: co.id,
      type: 'change_order' as const,
      vendor: co.line_item.vendor.name,
      work: co.line_item.work_description,
      amount: co.direction === 'add' ? co.amount_cents : -co.amount_cents,
      project: co.project.owner_name + ' — ' + co.project.address.split(',')[0],
      project_id: co.project_id,
      draw_number: null,
      notes: co.reason,
      date: co.logged_at.toISOString(),
      isOverBudget: false,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Payment history</h1>
      <HistoryClient timeline={timeline} projects={projects} />
    </div>
  )
}
