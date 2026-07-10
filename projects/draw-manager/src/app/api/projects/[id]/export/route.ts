import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthenticated } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      line_items: {
        include: { vendor: true, change_orders: true },
        orderBy: { sort_order: 'asc' },
      },
    },
  })

  if (!project) return Response.json({ error: 'Not found' }, { status: 404 })

  type LineItemWithRelations = typeof project.line_items[number]

  const fmt = (cents: number) => (cents / 100).toFixed(2)

  const header = ['Line #', 'Vendor', 'Work Description', 'Original Contract', 'Change Orders', 'Active Contract', 'Paid', 'Remaining']

  const rows = project.line_items.map((li) => {
    const coTotal = li.change_orders.reduce((sum, co) => {
      return co.direction === 'add' ? sum + co.amount_cents : sum - co.amount_cents
    }, 0)
    const remaining = li.adjusted_contract_cents - li.total_paid_cents
    return [
      li.line_number,
      `"${li.vendor.name.replace(/"/g, '""')}"`,
      `"${li.work_description.replace(/"/g, '""')}"`,
      fmt(li.original_contract_cents),
      fmt(coTotal),
      fmt(li.adjusted_contract_cents),
      fmt(li.total_paid_cents),
      fmt(remaining),
    ]
  })

  // Totals row
  const total = (fn: (li: LineItemWithRelations) => number) =>
    fmt(project.line_items.reduce((s, li) => s + fn(li), 0))

  const totalsRow = [
    'TOTALS', '', '',
    total((li) => li.original_contract_cents),
    total((li) => li.change_orders.reduce((s, co) => co.direction === 'add' ? s + co.amount_cents : s - co.amount_cents, 0)),
    total((li) => li.adjusted_contract_cents),
    total((li) => li.total_paid_cents),
    total((li) => li.adjusted_contract_cents - li.total_paid_cents),
  ]

  const csv = [
    [`"${project.owner_name} — ${project.address}"`],
    [`"Draw #${project.draw_number}"`],
    [],
    header,
    ...rows,
    [],
    totalsRow,
  ].map((row) => row.join(',')).join('\r\n')

  const filename = `${project.owner_name.replace(/[^a-z0-9]/gi, '_')}_draw${project.draw_number}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
