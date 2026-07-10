import { prisma } from '@/lib/prisma'
import DocumentsClient from './DocumentsClient'

export default async function DocumentsPage() {
  const [documents, projects] = await Promise.all([
    prisma.document.findMany({
      include: { project: true },
      orderBy: { generated_at: 'desc' },
    }),
    prisma.project.findMany({ orderBy: { owner_name: 'asc' } }),
  ])

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Documents</h1>
      <p className="text-sm text-gray-500 mb-6">All draw documents saved automatically. Never lose a sworn statement again.</p>
      <DocumentsClient documents={documents} projects={projects} />
    </div>
  )
}
