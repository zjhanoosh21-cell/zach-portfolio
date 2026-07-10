import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthenticated } from '@/lib/auth'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (body.lien_waiver_received !== undefined) data.lien_waiver_received = body.lien_waiver_received
  if (body.lien_waiver_date !== undefined) data.lien_waiver_date = body.lien_waiver_date
  if (body.retention_withheld_cents !== undefined) data.retention_withheld_cents = body.retention_withheld_cents
  if (body.adjusted_contract_cents !== undefined) data.adjusted_contract_cents = body.adjusted_contract_cents
  if (body.total_paid_cents !== undefined) data.total_paid_cents = body.total_paid_cents

  const lineItem = await prisma.lineItem.update({ where: { id }, data })
  return Response.json(lineItem)
}
