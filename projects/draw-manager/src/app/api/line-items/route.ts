import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthenticated } from '@/lib/auth'

export async function GET(request: NextRequest) {
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const projectId = request.nextUrl.searchParams.get('project_id')

  const lineItems = await prisma.lineItem.findMany({
    where: projectId ? { project_id: projectId } : undefined,
    include: { vendor: true, change_orders: true },
    orderBy: { sort_order: 'asc' },
  })

  return Response.json(lineItems)
}

export async function POST(request: NextRequest) {
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()

  const originalCents = Math.round(parseFloat(body.original_contract) * 100)
  const lineItem = await prisma.lineItem.create({
    data: {
      project_id: body.project_id,
      vendor_id: body.vendor_id,
      work_description: body.work_description,
      line_number: body.line_number,
      original_contract_cents: originalCents,
      adjusted_contract_cents: originalCents,
      category: body.category || 'other',
      sort_order: body.sort_order || 0,
    },
  })

  return Response.json(lineItem, { status: 201 })
}
