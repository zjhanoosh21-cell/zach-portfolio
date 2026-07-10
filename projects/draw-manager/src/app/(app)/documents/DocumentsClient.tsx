'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'

interface Document {
  id: string
  document_type: string
  draw_number: number | null
  vendor_name: string | null
  file_path: string
  is_draft: boolean
  generated_at: Date
  project: { owner_name: string; address: string }
  project_id: string
}

interface Project { id: string; owner_name: string; address: string }

const TYPE_LABELS: Record<string, string> = {
  sworn_statement: 'Sworn Statement',
  change_order_record: 'Change Order Record',
  final_report: 'Final Project Report',
}

export default function DocumentsClient({ documents, projects }: { documents: Document[]; projects: Project[] }) {
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? documents : documents.filter((d) => d.project_id === filter)

  return (
    <div>
      {/* Filter chips */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <FilterChip label="All projects" active={filter === 'all'} onClick={() => setFilter('all')} />
        {projects.map((p) => (
          <FilterChip
            key={p.id}
            label={p.owner_name.split(' ')[0]}
            active={filter === p.id}
            onClick={() => setFilter(p.id)}
          />
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Saved documents</h2>
        </div>
        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No documents yet. Generate a draw to create your first sworn statement.</p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Document</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Project</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Draw</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Generated</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{TYPE_LABELS[doc.document_type] || doc.document_type}</span>
                      {doc.is_draft && <Badge status="in_draw" label="draft" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{doc.project.owner_name.split(' ')[0]}</td>
                  <td className="px-4 py-3">
                    {doc.draw_number ? (
                      <Badge
                        status={doc.is_draft ? 'in_draw' : 'paid'}
                        label={`Draw ${doc.draw_number}${doc.is_draft ? ' — draft' : ' — final'}`}
                      />
                    ) : (
                      doc.vendor_name ? <span className="text-gray-600">{doc.vendor_name}</span> : '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(doc.generated_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}
                    <br />
                    {new Date(doc.generated_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={doc.file_path}
                      download
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200"
                    >
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
        active ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  )
}
