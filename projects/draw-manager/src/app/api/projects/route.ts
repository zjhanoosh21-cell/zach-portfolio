import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthenticated } from '@/lib/auth'

export async function GET() {
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const projects = await prisma.project.findMany({
    orderBy: { created_at: 'desc' },
    include: {
      line_items: {
        include: { vendor: true, change_orders: true },
      },
    },
  })

  return Response.json(projects)
}

export async function POST(request: NextRequest) {
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const project = await prisma.project.create({
    data: {
      owner_name: body.owner_name,
      address: body.address,
      county: body.county,
      contract_total_cents: Math.round(parseFloat(body.contract_total) * 100),
      status: 'active',
      draw_number: 1,
      start_date: body.start_date || null,
      notes: body.notes || null,
    },
  })

  return Response.json(project, { status: 201 })
}
