import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthenticated } from '@/lib/auth'
import { computeAdjustedContract } from '@/lib/business-rules'

export async function GET(request: NextRequest) {
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const projectId = request.nextUrl.searchParams.get('project_id')

  const changeOrders = await prisma.changeOrder.findMany({
    where: projectId ? { project_id: projectId } : undefined,
    include: { line_item: { include: { vendor: true } } },
    orderBy: { logged_at: 'desc' },
  })

  return Response.json(changeOrders)
}

export async function POST(request: NextRequest) {
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()

  const amountCents = Math.round(parseFloat(body.amount) * 100)

  // Create change order
  const changeOrder = await prisma.changeOrder.create({
    data: {
      line_item_id: body.line_item_id,
      project_id: body.project_id,
      amount_cents: amountCents,
      direction: body.direction,
      reason: body.reason || null,
      approved_by: body.approved_by || null,
      approved_date: body.approved_date || null,
    },
  })

  // Recalculate adjusted_contract_cents
  const lineItem = await prisma.lineItem.findUnique({
    where: { id: body.line_item_id },
    include: { change_orders: true },
  })

  if (lineItem) {
    const newAdjusted = computeAdjustedContract(lineItem.original_contract_cents, lineItem.change_orders)
    await prisma.lineItem.update({
      where: { id: body.line_item_id },
      data: { adjusted_contract_cents: newAdjusted },
    })
  }

  return Response.json(changeOrder, { status: 201 })
}
