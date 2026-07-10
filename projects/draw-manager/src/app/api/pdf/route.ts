import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthenticated } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { generateSwornStatementPDF } from '@/components/pdf/SwornStatementPDF'

export async function POST(request: NextRequest) {
  if (!await isAuthenticated()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { project_id, draw_date, is_draft = false } = body

  const project = await prisma.project.findUnique({
    where: { id: project_id },
    include: {
      line_items: {
        include: { vendor: true, change_orders: true },
        orderBy: { sort_order: 'asc' },
      },
    },
  })

  if (!project) return Response.json({ error: 'Project not found' }, { status: 404 })

  // Validation: block if any line item is over-budget without a change order
  const overBudgetWithoutCO = project.line_items.filter(
    (li) => li.total_paid_cents > li.adjusted_contract_cents && li.change_orders.length === 0
  )
  if (overBudgetWithoutCO.length > 0) {
    return Response.json(
      {
        error: 'validation_failed',
        message: `Cannot generate PDF: ${overBudgetWithoutCO.map((li) => li.vendor.name).join(', ')} ${overBudgetWithoutCO.length === 1 ? 'is' : 'are'} over contract with no change order on file.`,
      },
      { status: 422 }
    )
  }

  const settings = await getSettings()

  const pdfBytes = await generateSwornStatementPDF({
    project,
    settings,
    drawDate: draw_date || new Date().toISOString().split('T')[0],
  })

  const filename = `sworn-statement-draw${project.draw_number}.pdf`

  // Save document record (file not persisted on disk — serverless environment)
  const doc = await prisma.document.create({
    data: {
      project_id,
      document_type: 'sworn_statement',
      draw_number: project.draw_number,
      file_path: filename,
      is_draft,
    },
  })

  // Stream PDF to client
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Document-Id': doc.id,
    },
  })
}
