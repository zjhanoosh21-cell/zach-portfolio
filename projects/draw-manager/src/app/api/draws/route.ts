import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthenticated } from '@/lib/auth'

export async function POST(request: NextRequest) {
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()

  // Save draw draft — update project status to in_draw
  const project = await prisma.project.findUnique({ where: { id: body.project_id } })
  if (!project) return Response.json({ error: 'Project not found' }, { status: 404 })

  if (project.status === 'active') {
    await prisma.project.update({
      where: { id: body.project_id },
      data: { status: 'in_draw' },
    })
  }

  return Response.json({ success: true, draw_number: project.draw_number })
}
