import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthenticated } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { computeAdjustedContract } from '@/lib/business-rules'

export async function GET(request: NextRequest) {
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const projectId = request.nextUrl.searchParams.get('project_id')

  const payments = await prisma.payment.findMany({
    where: projectId ? { project_id: projectId } : undefined,
    include: {
      line_item: { include: { vendor: true } },
      project: true,
    },
    orderBy: { logged_at: 'desc' },
  })

  return Response.json(payments)
}

export async function POST(request: NextRequest) {
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const settings = await getSettings()

  const amountCents = Math.round(parseFloat(body.amount) * 100)

  const lineItem = await prisma.lineItem.findUnique({
    where: { id: body.line_item_id },
    include: { change_orders: true },
  })

  if (!lineItem) return Response.json({ error: 'Line item not found' }, { status: 404 })

  const adjustedContract = computeAdjustedContract(
    lineItem.original_contract_cents,
    lineItem.change_orders
  )
  const newTotal = lineItem.total_paid_cents + amountCents

  // Over-budget check
  if (newTotal > adjustedContract && settings.change_order_warnings && !body.force) {
    const overBy = newTotal - adjustedContract
    return Response.json(
      {
        error: 'over_budget',
        message: `This payment would exceed the contract by $${(overBy / 100).toLocaleString()}. Add a change order first or confirm to proceed.`,
        overBy,
      },
      { status: 409 }
    )
  }

  // Create payment
  const payment = await prisma.payment.create({
    data: {
      line_item_id: body.line_item_id,
      project_id: body.project_id,
      amount_cents: amountCents,
      payment_date: body.payment_date,
      notes: body.notes || null,
      draw_number: body.draw_number || lineItem ? await getProjectDrawNumber(body.project_id) : 1,
    },
  })

  // Update line item total_paid_cents
  await prisma.lineItem.update({
    where: { id: body.line_item_id },
    data: { total_paid_cents: newTotal },
  })

  return Response.json(payment, { status: 201 })
}

async function getProjectDrawNumber(projectId: string): Promise<number> {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { draw_number: true } })
  return project?.draw_number ?? 1
}
