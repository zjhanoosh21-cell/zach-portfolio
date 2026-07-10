'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Project {
  id: string
  owner_name: string
  status: string
}

export default function ProjectActionMenu({ project, onComplete }: {
  project: Project
  onComplete?: () => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState<'delete' | 'complete' | null>(null)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function markComplete() {
    setLoading(true)
    await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', completed_at: new Date().toISOString() }),
    })
    setLoading(false)
    setConfirm(null)
    setOpen(false)
    if (onComplete) onComplete()
    router.refresh()
  }

  async function duplicate() {
    setLoading(true)
    const res = await fetch(`/api/projects/${project.id}/duplicate`, { method: 'POST' })
    const newProject = await res.json()
    setLoading(false)
    setOpen(false)
    router.push(`/projects/${newProject.id}`)
    router.refresh()
  }

  async function deleteProject() {
    setLoading(true)
    await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
    setLoading(false)
    setConfirm(null)
    setOpen(false)
    router.push('/projects')
    router.refresh()
  }

  const isCompleted = project.status === 'completed'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setConfirm(null) }}
        className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-700 text-sm"
        title="Project actions"
      >
        ···
      </button>

      {open && !confirm && (
        <div className="absolute left-0 top-9 z-50 bg-white border border-gray-200 rounded-xl shadow-lg w-52 py-1">
          {!isCompleted && (
            <button
              type="button"
              onClick={() => setConfirm('complete')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              ✓ Mark as complete
            </button>
          )}
          <a
            href={`/api/projects/${project.id}/export`}
            download
            onClick={() => setOpen(false)}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            ↓ Export CSV
          </a>
          <button
            type="button"
            onClick={duplicate}
            disabled={loading}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            ⧉ Duplicate project
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button
            type="button"
            onClick={() => setConfirm('delete')}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            ✕ Delete project
          </button>
        </div>
      )}

      {/* Mark complete confirm */}
      {open && confirm === 'complete' && (
        <div className="absolute left-0 top-9 z-50 bg-white border border-amber-200 rounded-xl shadow-lg w-64 p-4">
          <p className="text-sm font-medium text-gray-900 mb-1">Mark as complete?</p>
          <p className="text-xs text-gray-500 mb-3">This will archive the project. You can still view it.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirm(null)} className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600">
              Cancel
            </button>
            <button type="button" onClick={markComplete} disabled={loading} className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium disabled:opacity-50">
              {loading ? '...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {open && confirm === 'delete' && (
        <div className="absolute left-0 top-9 z-50 bg-white border border-red-200 rounded-xl shadow-lg w-64 p-4">
          <p className="text-sm font-medium text-gray-900 mb-1">Delete "{project.owner_name}"?</p>
          <p className="text-xs text-red-600 mb-3">This permanently deletes the project and all payments. Cannot be undone.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirm(null)} className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600">
              Cancel
            </button>
            <button type="button" onClick={deleteProject} disabled={loading} className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium disabled:opacity-50">
              {loading ? '...' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
