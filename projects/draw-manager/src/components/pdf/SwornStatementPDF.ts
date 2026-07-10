import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { AppSettings } from '@/lib/settings'

interface LineItem {
  line_number: string
  work_description: string
  original_contract_cents: number
  adjusted_contract_cents: number
  total_paid_cents: number
  retention_withheld_cents: number
  change_orders: Array<{ direction: string; amount_cents: number }>
  vendor: { name: string; phone?: string | null }
}

interface Project {
  owner_name: string
  address: string
  county: string
  draw_number: number
  line_items: LineItem[]
}

function fmt(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getChangeOrderTotal(li: LineItem): number {
  return li.change_orders.reduce((sum, co) => {
    return co.direction === 'add' ? sum + co.amount_cents : sum - co.amount_cents
  }, 0)
}

export async function generateSwornStatementPDF(options: {
  project: Project
  settings: AppSettings
  drawDate: string
}): Promise<Uint8Array> {
  const { project, settings, drawDate } = options

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 30

  // ── Header ──
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('RESIDENTIAL NEW CONSTRUCTION PROJECT', pageW / 2, 30, { align: 'center' })
  doc.text('SWORN STATEMENT FOR CONTRACTOR OR SUBCONTRACTOR', pageW / 2, 43, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`OWNER: ${project.owner_name}`, margin, 62)
  doc.text(`CONTRACTOR'S NAME: ${settings.contractor_name}`, margin, 74)
  doc.text(`COMPANY: ${settings.company_name}`, margin, 86)
  doc.text(`PERIOD FROM: ${drawDate}`, margin + 300, 62)
  doc.text(`REQUEST NO.: ${project.draw_number}`, margin + 300, 74)
  doc.text(`STATE OF ${settings.state.toUpperCase()}`, margin + 300, 86)
  doc.text(`COUNTY OF ${project.county}`, margin + 300, 98)
  doc.text(`PROPERTY: ${project.address}`, margin, 98)

  doc.setFontSize(8)
  doc.text(
    `${settings.contractor_name.toLowerCase()}, being duly sworn, deposes and says that ${settings.company_name} is the contractor for an improvement to the following described real property situated in ${project.county} County, ${settings.state}, more commonly known as: ${project.address}`,
    margin,
    116,
    { maxWidth: pageW - margin * 2 }
  )

  // ── Line Items Table ──
  const colHeaders = [
    'No.',
    'Name, Address & Telephone\nof Subcontractor, Laborer or Supplier',
    'Type of\nImprovement',
    'Total\nContract',
    'Change Orders\n(+) or (-)',
    'Adjusted\nContract',
    'Amount\nAlready Paid',
    'Amount\nCurrently Owing',
    'Total Retention\nWithheld',
    'Balance to\nComplete',
    'Laborer Wages\nDue But Unpaid',
    'Laborer Fringe\nBenefits Due',
  ]

  const rows: string[][] = []
  let totalContract = 0
  let totalChanges = 0
  let totalAdjusted = 0
  let totalPaid = 0
  let totalOwing = 0
  let totalRetention = 0
  let totalBalance = 0

  for (const li of project.line_items) {
    if (li.original_contract_cents === 0 && li.total_paid_cents === 0 && !li.work_description) continue

    const changeTotal = getChangeOrderTotal(li)
    const adjustedContract = li.adjusted_contract_cents
    const currentlyOwing = Math.max(0, adjustedContract - li.total_paid_cents)
    const balanceToComplete = adjustedContract - li.total_paid_cents - li.retention_withheld_cents

    totalContract += li.original_contract_cents
    totalChanges += changeTotal
    totalAdjusted += adjustedContract
    totalPaid += li.total_paid_cents
    totalOwing += currentlyOwing
    totalRetention += li.retention_withheld_cents
    totalBalance += balanceToComplete

    const changeStr = changeTotal !== 0
      ? (changeTotal > 0 ? '+' : '') + fmt(changeTotal)
      : ''

    rows.push([
      li.line_number,
      li.vendor.name + (li.vendor.phone ? `\n${li.vendor.phone}` : ''),
      li.work_description,
      li.original_contract_cents > 0 ? fmt(li.original_contract_cents) : '',
      changeStr,
      li.adjusted_contract_cents > 0 ? fmt(li.adjusted_contract_cents) : '',
      li.total_paid_cents > 0 ? fmt(li.total_paid_cents) : '',
      currentlyOwing > 0 ? fmt(currentlyOwing) : '',
      li.retention_withheld_cents > 0 ? fmt(li.retention_withheld_cents) : '',
      balanceToComplete !== 0 ? fmt(balanceToComplete) : '',
      '0.00',
      '0.00',
    ])
  }

  // Totals row
  rows.push([
    '',
    'TOTALS',
    'CONTRACT PRICE',
    fmt(totalContract),
    totalChanges !== 0 ? (totalChanges > 0 ? '+' : '') + fmt(totalChanges) : '',
    fmt(totalAdjusted),
    fmt(totalPaid),
    fmt(totalOwing),
    fmt(totalRetention),
    fmt(totalBalance),
    '0.00',
    '0.00',
  ])

  autoTable(doc, {
    startY: 130,
    head: [colHeaders],
    body: rows,
    styles: { fontSize: 6.5, cellPadding: 2 },
    headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', halign: 'center', valign: 'middle' },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 110 },
      2: { cellWidth: 90 },
      3: { cellWidth: 55, halign: 'right' },
      4: { cellWidth: 50, halign: 'right' },
      5: { cellWidth: 55, halign: 'right' },
      6: { cellWidth: 55, halign: 'right' },
      7: { cellWidth: 55, halign: 'right' },
      8: { cellWidth: 50, halign: 'right' },
      9: { cellWidth: 50, halign: 'right' },
      10: { cellWidth: 50, halign: 'right' },
      11: { cellWidth: 50, halign: 'right' },
    },
    didParseCell: (data) => {
      // Bold totals row
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [248, 248, 248]
      }
    },
    margin: { left: margin, right: margin },
    tableWidth: pageW - margin * 2,
  })

  // ── Legal Text ──
  const finalY = (doc as any).lastAutoTable.finalY + 12
  doc.setFontSize(6.5)
  const legalText = [
    'The contractor has not procured material from, or subcontracted with, any person other than those set forth and owes no money for the improvement other than the sums set forth. (Some columns are not applicable to all persons listed)',
    'I make this statement as the contractor to represent to the owner or lessee of the property and his or her agents that the property is free from claims of construction liens, or the possibility of construction liens, except as specifically set forth in this statement and except for claims of constructions liens by laborers that may be provided under section 109 of the Construction Lien Act, 1980 PA 497, MCL 570.1109.',
    'WARNING TO OWNER: AN OWNER OR LESSEE OF THE ABOVE-DESCRIBED PROPERTY MAY NOT RELY ON THIS SWORN STATEMENT TO AVOID THE CLAIM OF SUBCONTRACTOR, SUPPLIER, OR LABORER WHO HAS PROVIDED A NOTICE OF FURNISHING OR A LABORER WHO MAY PROVIDE A NOTICE OF FURNISHING PURSUANT TO SECTION 109 OF THE CONSTRUCTION LIEN ACT, 1980 PA 497, MCL 570.1109.',
    'WARNING TO DEPONENT: A person who gives a false sworn statement with intent to defraud is subject to criminal penalties as provided in Section 110 of the Construction Lien Act, 1980 PA 497, MCL 570.1110.',
  ]

  let y = finalY
  for (const text of legalText) {
    const lines = doc.splitTextToSize(text, pageW - margin * 2)
    doc.text(lines, margin, y)
    y += lines.length * 8 + 4
  }

  // ── Signature Block ──
  y += 10
  doc.setFontSize(8)
  doc.line(margin, y, margin + 200, y)
  doc.text('Deponent signature', margin, y + 10)
  doc.text(settings.contractor_name, margin + 60, y + 10)

  doc.line(pageW - margin - 200, y, pageW - margin, y)
  doc.text('Subscribed and sworn to before me this _____ day of _____________, 20____', pageW - margin - 200, y + 10)

  y += 30
  doc.line(margin, y, margin + 200, y)
  doc.text('Date', margin, y + 10)

  doc.line(pageW - margin - 200, y, pageW - margin, y)
  doc.text(`Notary Public, State of ${settings.state}, County of _________________`, pageW - margin - 200, y + 10)
  doc.text('My commission expires: _______________', pageW - margin - 200, y + 20)
  doc.text('Acting in the county of: _______________', pageW - margin - 200, y + 30)

  return doc.output('arraybuffer') as unknown as Uint8Array
}
