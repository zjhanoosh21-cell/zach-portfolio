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
  return Response.json(project)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  // Cascade: delete payments, change orders, line items, documents, then project
  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { project_id: id } }),
    prisma.changeOrder.deleteMany({ where: { project_id: id } }),
    prisma.lineItem.deleteMany({ where: { project_id: id } }),
    prisma.document.deleteMany({ where: { project_id: id } }),
    prisma.project.delete({ where: { id } }),
  ])
  return new Response(null, { status: 204 })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (body.notes !== undefined) data.notes = body.notes
  if (body.status !== undefined) data.status = body.status
  if (body.draw_number !== undefined) data.draw_number = body.draw_number
  if (body.completed_at !== undefined) data.completed_at = body.completed_at ? new Date(body.completed_at) : null

  const project = await prisma.project.update({ where: { id }, data })
  return Response.json(project)
}
