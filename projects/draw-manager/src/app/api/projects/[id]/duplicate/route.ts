import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthenticated } from '@/lib/auth'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const source = await prisma.project.findUnique({
    where: { id },
    include: { line_items: true },
  })
  if (!source) return Response.json({ error: 'Not found' }, { status: 404 })

  const newProject = await prisma.project.create({
    data: {
      owner_name: source.owner_name + ' (copy)',
      address: source.address,
      county: source.county,
      contract_total_cents: source.contract_total_cents,
      status: 'active',
      draw_number: 1,
      notes: source.notes,
    },
  })

  // Duplicate line items (no payments or change orders — fresh start)
  if (source.line_items.length > 0) {
    await prisma.lineItem.createMany({
      data: source.line_items.map((li) => ({
        project_id: newProject.id,
        vendor_id: li.vendor_id,
        work_description: li.work_description,
        line_number: li.line_number,
        original_contract_cents: li.original_contract_cents,
        adjusted_contract_cents: li.original_contract_cents, // reset COs
        category: li.category,
        sort_order: li.sort_order,
      })),
    })
  }

  return Response.json(newProject, { status: 201 })
}
