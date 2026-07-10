import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import ChangeOrderForm from './ChangeOrderForm'
import BackButton from '@/components/ui/BackButton'

export default async function ChangeOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ project_id?: string; vendor_id?: string }>
}) {
  const { project_id, vendor_id } = await searchParams

  const [projects, vendors, settings] = await Promise.all([
    prisma.project.findMany({
      where: { status: { in: ['active', 'in_draw'] } },
      orderBy: { updated_at: 'desc' },
    }),
    prisma.vendor.findMany({ orderBy: { name: 'asc' } }),
    getSettings(),
  ])

  return (
    <div className="p-6 max-w-xl">
      <BackButton />
      <h1 className="text-xl font-bold text-gray-900 mb-2">Add change order</h1>
      <p className="text-sm text-gray-500 mb-6">Use this when a vendor&apos;s scope or price changes from the original contract.</p>
      <ChangeOrderForm
        projects={projects}
        vendors={vendors}
        defaultProjectId={project_id}
        defaultVendorId={vendor_id}
        settings={settings}
      />
    </div>
  )
}
