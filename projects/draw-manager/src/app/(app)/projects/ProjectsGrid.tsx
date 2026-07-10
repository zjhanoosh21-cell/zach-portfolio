'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { toDisplay } from '@/lib/money'
import NewProjectModal from './NewProjectModal'

type FilterStatus = 'all' | 'active' | 'in_draw' | 'completed'

interface Project {
  id: string
  owner_name: string
  address: string
  status: string
  contract_total_cents: number
  draw_number: number
  total_paid_cents: number
  alert_count: number
}

export default function ProjectsGrid({ projects }: { projects: Project[] }) {
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [showNewProject, setShowNewProject] = useState(false)

  const filters: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: `All (${projects.length})` },
    { key: 'active', label: `Active (${projects.filter((p) => p.status === 'active').length})` },
    { key: 'in_draw', label: `In draw (${projects.filter((p) => p.status === 'in_draw').length})` },
    { key: 'completed', label: `Completed (${projects.filter((p) => p.status === 'completed').length})` },
  ]

  const filtered = filter === 'all' ? projects : projects.filter((p) => p.status === filter)

  return (
    <>
      {/* Filter chips */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Project grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
        <button
          onClick={() => setShowNewProject(true)}
          className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-blue-300 hover:text-blue-500 transition-colors min-h-[160px] active:bg-gray-50"
        >
          <span className="text-3xl font-light">+</span>
          <span className="text-sm font-semibold">New project</span>
        </button>
      </div>

      {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} />}
    </>
  )
}

function ProjectCard({ project }: { project: Project }) {
  const pct = project.contract_total_cents > 0
    ? Math.min(100, Math.round((project.total_paid_cents / project.contract_total_cents) * 100))
    : 0
  const isCompleted = project.status === 'completed'
  const isInDraw = project.status === 'in_draw'

  const addressParts = project.address.split(',')
  const city = addressParts.slice(1).join(',').trim()
  const street = addressParts[0]

  return (
    <Link
      href={`/projects/${project.id}`}
      className={`bg-white rounded-xl border p-4 hover:shadow-sm transition-all block ${
        isInDraw ? 'border-blue-300 shadow-sm' : 'border-gray-200'
      } ${isCompleted ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm leading-tight">
            {project.owner_name} — {city || project.address}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{street}</p>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <Badge status={project.status} label={
            project.status === 'in_draw' ? `Draw ${project.draw_number}` :
            project.status === 'active' ? 'Active' :
            project.status === 'completed' ? 'Completed' : project.status
          } />
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3">{toDisplay(project.contract_total_cents)} contract</p>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">{pct}% paid</p>
      </div>

      {project.alert_count > 0 && (
        <p className="text-xs text-amber-600 font-medium">{project.alert_count} alert{project.alert_count !== 1 ? 's' : ''}</p>
      )}
      {project.alert_count === 0 && <p className="text-xs text-gray-400">No alerts</p>}
    </Link>
  )
}
