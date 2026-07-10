import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthenticated } from '@/lib/auth'

export async function GET(request: NextRequest) {
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const projectId = request.nextUrl.searchParams.get('project_id')

  const documents = await prisma.document.findMany({
    where: projectId ? { project_id: projectId } : undefined,
    include: { project: true },
    orderBy: { generated_at: 'desc' },
  })

  return Response.json(documents)
}

export async function POST(request: NextRequest) {
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()

  const doc = await prisma.document.create({
    data: {
      project_id: body.project_id,
      document_type: body.document_type,
      draw_number: body.draw_number || null,
      vendor_name: body.vendor_name || null,
      file_path: body.file_path,
      is_draft: body.is_draft ?? false,
    },
  })

  return Response.json(doc, { status: 201 })
}
