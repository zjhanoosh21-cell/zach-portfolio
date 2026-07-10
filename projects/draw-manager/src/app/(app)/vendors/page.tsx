import { prisma } from '@/lib/prisma'
import VendorsClient from './VendorsClient'

export default async function VendorsPage() {
  const vendors = await prisma.vendor.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { line_items: true } } },
  })

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vendors</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your vendor list. These appear as options when adding line items to a project.</p>
        </div>
      </div>
      <VendorsClient vendors={vendors} />
    </div>
  )
}
