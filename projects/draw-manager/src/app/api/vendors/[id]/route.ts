import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthenticated } from '@/lib/auth'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json()
  const vendor = await prisma.vendor.update({
    where: { id },
    data: {
      name: body.name,
      typical_work: body.typical_work ?? undefined,
      phone: body.phone ?? undefined,
    },
  })
  return Response.json(vendor)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  // Check if vendor has any line items
  const count = await prisma.lineItem.count({ where: { vendor_id: id } })
  if (count > 0) {
    return Response.json({ error: 'Vendor has existing line items and cannot be deleted.' }, { status: 409 })
  }
  await prisma.vendor.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
