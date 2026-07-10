import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthenticated } from '@/lib/auth'

export async function GET() {
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const vendors = await prisma.vendor.findMany({ orderBy: { name: 'asc' } })
  return Response.json(vendors)
}

export async function POST(request: NextRequest) {
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const vendor = await prisma.vendor.create({
    data: {
      name: body.name,
      typical_work: body.typical_work || null,
      phone: body.phone || null,
    },
  })
  return Response.json(vendor, { status: 201 })
}
