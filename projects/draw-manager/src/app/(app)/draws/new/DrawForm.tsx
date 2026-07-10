'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toDisplay } from '@/lib/money'
import type { AppSettings } from '@/lib/settings'

interface LineItem {
  id: string
  line_number: string
  work_description: string
  vendor: { name: string }
  adjusted_contract_cents: number
  total_paid_cents: number
  retention_withheld_cents: number
}

interface Project {
  id: string
  owner_name: string
  address: string
  draw_number: number
  status: string
  line_items: LineItem[]
}


export default function DrawForm({
  projects, defaultProjectId, settings, onSuccess,
}: {
  projects: Project[]
  defaultProjectId?: string
  settings: AppSettings
  onSuccess?: () => void
}) {
  const router = useRouter()
  const [projectId, setProjectId] = useState(defaultProjectId || projects[0]?.id || '')
  const [drawDate, setDrawDate] = useState(new Date().toISOString().split('T')[0])
  const [customAmount, setCustomAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const project = projects.find((p) => p.id === projectId)

  const totalOwing = useMemo(() => {
    if (!project) return 0
    return project.line_items.reduce((sum, li) => {
      return sum + Math.max(0, li.adjusted_contract_cents - li.total_paid_cents - li.retention_withheld_cents)
    }, 0)
  }, [project])

  const requestAmountCents = customAmount
    ? Math.round(parseFloat(customAmount.replace(/,/g, '')) * 100)
    : totalOwing

  // Warnings
  const overBudgetItems = project
    ? project.line_items.filter((li) => li.total_paid_cents > li.adjusted_contract_cents)
    : []

  async function saveDraw() {
    await fetch('/api/draws', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId }),
    })
  }

  async function handleDraft() {
    setError('')
    setLoading(true)
    try {
      await saveDraw()
      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/projects/${projectId}`)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadPDF() {
    setError('')
    setLoading(true)
    try {
      await saveDraw()

      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, draw_date: drawDate, is_draft: false }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.message || 'Failed to generate PDF')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sworn-statement-draw${project?.draw_number}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/projects/${projectId}`)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadSpreadsheet() {
    setError('')
    setLoading(true)
    try {
      await saveDraw()

      const res = await fetch(`/api/projects/${projectId}/export`)
      if (!res.ok) {
        setError('Failed to export spreadsheet')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sworn-statement-draw${project?.draw_number}.csv`
      a.click()
      URL.revokeObjectURL(url)

      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/projects/${projectId}`)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  if (!project) return <p className="text-gray-500">No active projects.</p>

  return (
    <div className="space-y-4">
      {/* Warnings */}
      {overBudgetItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-2">Review before generating</p>
          {overBudgetItems.map((li) => (
            <p key={li.id} className="text-sm text-amber-700">
              ⚠ {li.vendor.name} is over contract
            </p>
          ))}
          <p className="text-xs text-amber-600 mt-2">These warnings do not block generation. Your bank may still accept the document.</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Project selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.owner_name} — {p.address.split(',')[0]} (Draw #{p.draw_number})</option>
            ))}
          </select>
        </div>

        {/* Draw date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Draw date</label>
          <input
            type="date"
            value={drawDate}
            onChange={(e) => setDrawDate(e.target.value)}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Draw amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Draw request amount</label>
          <div className="bg-gray-50 rounded-lg p-3 mb-2 text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Total owing:</span>
              <span className="font-medium">{toDisplay(totalOwing)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">This draw request:</span>
              <span className="font-semibold text-blue-700">{toDisplay(requestAmountCents)}</span>
            </div>
            {customAmount && (
              <div className="flex justify-between">
                <span className="text-gray-500">Remaining to request later:</span>
                <span className="font-medium">{toDisplay(Math.max(0, totalOwing - requestAmountCents))}</span>
              </div>
            )}
          </div>
          <input
            inputMode="decimal"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder={`Default: ${(totalOwing / 100).toLocaleString()} (full amount owing)`}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Leave blank to request the full amount owing, or enter a lower amount.</p>
        </div>

        {/* Line items summary */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Summary</p>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-gray-500">#</th>
                  <th className="text-left px-3 py-2 text-gray-500">Vendor</th>
                  <th className="text-right px-3 py-2 text-gray-500">Adjusted</th>
                  <th className="text-right px-3 py-2 text-gray-500">Paid</th>
                  <th className="text-right px-3 py-2 text-gray-500">Owing</th>
                </tr>
              </thead>
              <tbody>
                {project.line_items
                  .filter((li) => li.adjusted_contract_cents > 0 || li.total_paid_cents > 0)
                  .map((li) => {
                    const owing = Math.max(0, li.adjusted_contract_cents - li.total_paid_cents)
                    return (
                      <tr key={li.id} className="border-b border-gray-100">
                        <td className="px-3 py-1.5 text-gray-500">{li.line_number}</td>
                        <td className="px-3 py-1.5 text-gray-900">{li.vendor.name}</td>
                        <td className="px-3 py-1.5 text-right">{toDisplay(li.adjusted_contract_cents)}</td>
                        <td className="px-3 py-1.5 text-right">{toDisplay(li.total_paid_cents)}</td>
                        <td className="px-3 py-1.5 text-right font-medium">{owing > 0 ? toDisplay(owing) : '—'}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={handleDraft}
            disabled={loading}
            className="py-4 px-5 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50 active:bg-gray-100"
          >
            Save draft
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={loading}
            className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 active:bg-blue-800"
          >
            {loading ? 'Generating...' : 'Download PDF'}
          </button>
          <button
            onClick={handleDownloadSpreadsheet}
            disabled={loading}
            className="flex-1 py-4 bg-white border border-blue-300 text-blue-700 rounded-xl font-semibold hover:bg-blue-50 disabled:opacity-50 active:bg-blue-100"
          >
            {loading ? '...' : 'Download CSV'}
          </button>
        </div>
      </div>
    </div>
  )
}
