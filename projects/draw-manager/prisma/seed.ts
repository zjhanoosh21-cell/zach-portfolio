/**
 * Demo seed — entirely fictional project, vendors, and amounts.
 * Sign in with the demo password printed below.
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

function cents(dollars: number): number {
  return Math.round(dollars * 100)
}

async function main() {
  console.log('Seeding demo database...')

  // Clear existing data
  await prisma.document.deleteMany()
  await prisma.changeOrder.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.lineItem.deleteMany()
  await prisma.vendor.deleteMany()
  await prisma.project.deleteMany()
  await prisma.setting.deleteMany()

  // Seed settings
  const passwordHash = await bcrypt.hash('demo2026', 10)
  console.log('\n=== DEMO PASSWORD: demo2026 ===\n')

  await prisma.setting.createMany({
    data: [
      { key: 'app_password', value: passwordHash },
      { key: 'lien_waiver_tracking', value: 'true' },
      { key: 'low_balance_alerts', value: 'true' },
      { key: 'change_order_warnings', value: 'true' },
      { key: 'require_co_reason', value: 'true' },
      { key: 'auto_save_drafts', value: 'true' },
      { key: 'company_name', value: 'Odyssey Construction' },
      { key: 'contractor_name', value: 'Alex Morgan' },
      { key: 'contractor_phone', value: '(555) 014-7788' },
      { key: 'state', value: 'Michigan' },
    ],
  })

  // Demo project (fictional owner, address, and figures)
  const project = await prisma.project.create({
    data: {
      owner_name: 'Daniel & Priya Whitmore',
      address: '48 Juniper Ridge Ct, Birch Hollow, MI',
      county: 'Kent',
      contract_total_cents: cents(685000),
      status: 'in_draw',
      draw_number: 3,
      start_date: '2025-09-01',
      notes: 'Bank contact: Morgan Ellis at First Lakeshore Bank (555) 010-3344. Permit #2025-0417 Kent County.',
    },
  })

  // Fictional vendors
  const vendorData = [
    { name: 'Birch Hollow Excavating', typical_work: 'Excavating, backfill and grading' },
    { name: 'Kent County Permits', typical_work: 'Building permits' },
    { name: 'Odyssey Construction', typical_work: "Pre-construction, builder's fee, miscellaneous" },
    { name: 'Lakeshore Concrete Co.', typical_work: 'Foundation and basement walls' },
    { name: 'Northwind Lumber Supply', typical_work: 'Rough lumber, windows, truss materials' },
    { name: 'Ridgeline Framing Crew', typical_work: 'Carpentry, roofing, porches' },
    { name: 'Cedar & Stone Roofing', typical_work: 'Roof materials and labor' },
    { name: 'BlueFlame Mechanical', typical_work: 'Heating and cooling' },
    { name: 'Current Electric LLC', typical_work: 'Electrical labor and materials' },
    { name: 'ClearFlow Plumbing', typical_work: 'Plumbing labor and materials' },
    { name: 'Great Lakes Insulation', typical_work: 'Insulation labor and materials' },
    { name: 'Hollow Oak Drywall', typical_work: 'Drywall labor and materials' },
    { name: 'Maplecrest Cabinets', typical_work: 'Cabinetry materials' },
    { name: 'Harbor Tile & Flooring', typical_work: 'Tile and flooring, labor and materials' },
    { name: 'Summit Painting Co.', typical_work: 'Interior and exterior paint' },
    { name: 'Stonebridge Masonry', typical_work: 'Cultured stone and brick' },
  ]

  const vendorMap: Record<string, string> = {}
  for (const v of vendorData) {
    const vendor = await prisma.vendor.create({ data: v })
    vendorMap[v.name] = vendor.id
  }

  // Line items: [lineNumber, vendorName, workDescription, originalContract, alreadyPaid, category]
  const lineItemsData: Array<{
    lineNumber: string
    vendorName: string
    work: string
    original: number
    paid: number
    category: string
  }> = [
    { lineNumber: '1', vendorName: 'Kent County Permits', work: 'Building permits', original: 8500, paid: 9240, category: 'permits' },
    { lineNumber: '2', vendorName: 'Odyssey Construction', work: 'Pre-construction', original: 5000, paid: 5000, category: 'other' },
    { lineNumber: '3', vendorName: 'Birch Hollow Excavating', work: 'Excavating', original: 24500, paid: 24500, category: 'labor' },
    { lineNumber: '4', vendorName: 'Birch Hollow Excavating', work: 'Backfill and rough grading', original: 6200, paid: 0, category: 'labor' },
    { lineNumber: '5', vendorName: 'Lakeshore Concrete Co.', work: 'Basement walls and footings', original: 48750, paid: 52310, category: 'materials' },
    { lineNumber: '6', vendorName: 'Northwind Lumber Supply', work: 'Rough lumber materials & truss', original: 46800, paid: 51925, category: 'materials' },
    { lineNumber: '7', vendorName: 'Ridgeline Framing Crew', work: 'Rough carpentry labor', original: 38400, paid: 36000, category: 'labor' },
    { lineNumber: '8', vendorName: 'Northwind Lumber Supply', work: 'Window materials', original: 15600, paid: 15600, category: 'materials' },
    { lineNumber: '9', vendorName: 'Cedar & Stone Roofing', work: 'Roof materials', original: 9200, paid: 9850, category: 'materials' },
    { lineNumber: '9A', vendorName: 'Cedar & Stone Roofing', work: 'Roof labor', original: 7800, paid: 4100, category: 'labor' },
    { lineNumber: '10', vendorName: 'ClearFlow Plumbing', work: 'Plumbing L & M', original: 21400, paid: 6400, category: 'mep' },
    { lineNumber: '11', vendorName: 'Current Electric LLC', work: 'Electrical L & M', original: 19800, paid: 3200, category: 'mep' },
    { lineNumber: '12', vendorName: 'BlueFlame Mechanical', work: 'Heating and cooling', original: 22600, paid: 7500, category: 'mep' },
    { lineNumber: '13', vendorName: 'Great Lakes Insulation', work: 'Insulation L & M', original: 13200, paid: 0, category: 'materials' },
    { lineNumber: '14', vendorName: 'Hollow Oak Drywall', work: 'Drywall L & M', original: 25400, paid: 0, category: 'labor' },
    { lineNumber: '15', vendorName: 'Maplecrest Cabinets', work: 'Cabinetry materials', original: 19800, paid: 0, category: 'materials' },
    { lineNumber: '16', vendorName: 'Harbor Tile & Flooring', work: 'Tile and flooring L & M', original: 28900, paid: 0, category: 'materials' },
    { lineNumber: '17', vendorName: 'Summit Painting Co.', work: 'Interior paint L & M', original: 18400, paid: 0, category: 'labor' },
    { lineNumber: '18', vendorName: 'Summit Painting Co.', work: 'Exterior paint L & M', original: 4300, paid: 0, category: 'labor' },
    { lineNumber: '19', vendorName: 'Stonebridge Masonry', work: 'Cultured stone and brick L & M', original: 41500, paid: 0, category: 'labor' },
    { lineNumber: '20', vendorName: 'Ridgeline Framing Crew', work: 'Front porch and walkway', original: 6800, paid: 0, category: 'labor' },
    { lineNumber: '21', vendorName: 'Odyssey Construction', work: 'Miscellaneous/contingency reserve', original: 5000, paid: 0, category: 'other' },
    { lineNumber: '22', vendorName: 'Odyssey Construction', work: "Builder's fee", original: 128000, paid: 52000, category: 'other' },
  ]

  // Change orders to apply
  const changeOrderData = [
    { lineNumber: '1', vendorName: 'Kent County Permits', amount: 740, direction: 'add', reason: 'Permit fee increase', approvedBy: 'Daniel Whitmore (owner)', approvedDate: '2025-10-12' },
    { lineNumber: '5', vendorName: 'Lakeshore Concrete Co.', amount: 3560, direction: 'add', reason: 'Basement wall height change', approvedBy: 'Alex Morgan', approvedDate: '2025-10-28' },
    { lineNumber: '6', vendorName: 'Northwind Lumber Supply', amount: 5125, direction: 'add', reason: 'Additional truss materials due to revised roof pitch', approvedBy: 'Daniel Whitmore (owner)', approvedDate: '2026-01-22' },
    { lineNumber: '9', vendorName: 'Cedar & Stone Roofing', amount: 650, direction: 'add', reason: 'Roof material overage', approvedBy: 'Alex Morgan', approvedDate: '2025-11-14' },
  ]

  // Build CO lookup: lineNumber -> adjustmentCents
  const coAdjustments: Record<string, number> = {}
  for (const co of changeOrderData) {
    const key = co.lineNumber
    const adj = co.direction === 'add' ? cents(co.amount) : -cents(co.amount)
    coAdjustments[key] = (coAdjustments[key] ?? 0) + adj
  }

  // Create line items
  const lineItemMap: Record<string, string> = {} // lineNumber -> id
  for (let i = 0; i < lineItemsData.length; i++) {
    const li = lineItemsData[i]
    const vendorId = vendorMap[li.vendorName]
    if (!vendorId) {
      console.warn(`Warning: vendor not found: ${li.vendorName}`)
      continue
    }

    const originalCents = cents(li.original)
    const coAdj = coAdjustments[li.lineNumber] ?? 0
    const adjustedCents = originalCents + coAdj
    const paidCents = cents(li.paid)

    const lineItem = await prisma.lineItem.create({
      data: {
        project_id: project.id,
        vendor_id: vendorId,
        work_description: li.work,
        line_number: li.lineNumber,
        original_contract_cents: originalCents,
        adjusted_contract_cents: adjustedCents,
        total_paid_cents: paidCents,
        category: li.category,
        sort_order: i,
      },
    })
    lineItemMap[li.lineNumber] = lineItem.id
  }

  // Create change order records
  for (const co of changeOrderData) {
    const lineItemId = lineItemMap[co.lineNumber]
    if (!lineItemId) continue

    await prisma.changeOrder.create({
      data: {
        line_item_id: lineItemId,
        project_id: project.id,
        amount_cents: cents(co.amount),
        direction: co.direction,
        reason: co.reason,
        approved_by: co.approvedBy,
        approved_date: co.approvedDate,
      },
    })
  }

  // Create payment records for already-paid amounts (attributed to draw 2)
  for (const li of lineItemsData) {
    if (li.paid > 0) {
      const lineItemId = lineItemMap[li.lineNumber]
      if (!lineItemId) continue

      await prisma.payment.create({
        data: {
          line_item_id: lineItemId,
          project_id: project.id,
          amount_cents: cents(li.paid),
          payment_date: '2026-01-15',
          notes: 'Prior draw payment (seeded)',
          draw_number: 2,
        },
      })
    }
  }

  // ── SECOND PROJECT: completed build, so analytics have cross-project data ──
  const done = await prisma.project.create({
    data: {
      owner_name: 'Marcus & Elena Trujillo',
      address: '917 Foxglove Ln, Cedar Falls, MI',
      county: 'Ottawa',
      contract_total_cents: cents(512000),
      status: 'completed',
      draw_number: 5,
      start_date: '2024-11-15',
      completed_at: new Date('2026-02-27T12:00:00Z'),
      notes: 'Closed out February 2026. Final draw released after punch list sign-off.',
    },
  })

  const doneItems: Array<{ lineNumber: string; vendorName: string; work: string; contract: number; category: string }> = [
    { lineNumber: '1', vendorName: 'Kent County Permits', work: 'Building permits', contract: 7400, category: 'permits' },
    { lineNumber: '2', vendorName: 'Odyssey Construction', work: 'Pre-construction', contract: 5000, category: 'other' },
    { lineNumber: '3', vendorName: 'Birch Hollow Excavating', work: 'Excavating and grading', contract: 21800, category: 'labor' },
    { lineNumber: '4', vendorName: 'Lakeshore Concrete Co.', work: 'Foundation and flatwork', contract: 43200, category: 'materials' },
    { lineNumber: '5', vendorName: 'Northwind Lumber Supply', work: 'Lumber, windows and truss package', contract: 52600, category: 'materials' },
    { lineNumber: '6', vendorName: 'Ridgeline Framing Crew', work: 'Framing and porches', contract: 41500, category: 'labor' },
    { lineNumber: '7', vendorName: 'Cedar & Stone Roofing', work: 'Roofing L & M', contract: 15300, category: 'materials' },
    { lineNumber: '8', vendorName: 'ClearFlow Plumbing', work: 'Plumbing L & M', contract: 19700, category: 'mep' },
    { lineNumber: '9', vendorName: 'Current Electric LLC', work: 'Electrical L & M', contract: 18200, category: 'mep' },
    { lineNumber: '10', vendorName: 'BlueFlame Mechanical', work: 'HVAC', contract: 20400, category: 'mep' },
    { lineNumber: '11', vendorName: 'Hollow Oak Drywall', work: 'Insulation and drywall', contract: 31900, category: 'labor' },
    { lineNumber: '12', vendorName: 'Maplecrest Cabinets', work: 'Cabinetry and countertops', contract: 27300, category: 'materials' },
    { lineNumber: '13', vendorName: 'Harbor Tile & Flooring', work: 'Flooring throughout', contract: 24100, category: 'materials' },
    { lineNumber: '14', vendorName: 'Summit Painting Co.', work: 'Paint, interior and exterior', contract: 17800, category: 'labor' },
    { lineNumber: '15', vendorName: 'Stonebridge Masonry', work: 'Brick and stone veneer', contract: 33600, category: 'labor' },
    { lineNumber: '16', vendorName: 'Odyssey Construction', work: "Builder's fee", contract: 96000, category: 'other' },
  ]

  // One modest change order on the completed project
  const doneCO = { lineNumber: '12', amount: 2150, reason: 'Island countertop upgrade to quartz', approvedBy: 'Elena Trujillo (owner)', approvedDate: '2025-08-04' }

  for (let i = 0; i < doneItems.length; i++) {
    const li = doneItems[i]
    const vendorId = vendorMap[li.vendorName]
    if (!vendorId) continue

    const originalCents = cents(li.contract)
    const coAdj = li.lineNumber === doneCO.lineNumber ? cents(doneCO.amount) : 0
    const adjustedCents = originalCents + coAdj

    const lineItem = await prisma.lineItem.create({
      data: {
        project_id: done.id,
        vendor_id: vendorId,
        work_description: li.work,
        line_number: li.lineNumber,
        original_contract_cents: originalCents,
        adjusted_contract_cents: adjustedCents,
        total_paid_cents: adjustedCents, // completed: everything paid in full
        lien_waiver_received: true,
        lien_waiver_date: '2026-02-20',
        category: li.category,
        sort_order: i,
      },
    })

    if (coAdj > 0) {
      await prisma.changeOrder.create({
        data: {
          line_item_id: lineItem.id,
          project_id: done.id,
          amount_cents: coAdj,
          direction: 'add',
          reason: doneCO.reason,
          approved_by: doneCO.approvedBy,
          approved_date: doneCO.approvedDate,
        },
      })
    }

    // Spread payments across draws 1–5 for a realistic history
    const draw = (i % 5) + 1
    await prisma.payment.create({
      data: {
        line_item_id: lineItem.id,
        project_id: done.id,
        amount_cents: adjustedCents,
        payment_date: `2025-0${Math.min(draw + 1, 9)}-15`,
        notes: `Draw ${draw} payment`,
        draw_number: draw,
      },
    })
  }

  console.log('Seed complete!')
  console.log(`Project 1 (in draw): ${project.address}`)
  console.log(`Project 2 (completed): ${done.address}`)
  console.log(`Line items: ${Object.keys(lineItemMap).length + doneItems.length}`)
  console.log(`Vendors: ${Object.keys(vendorMap).length}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
