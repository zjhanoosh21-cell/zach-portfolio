'use client'

import { useState } from 'react'
import { toDisplay } from '@/lib/money'

interface TimelineEntry {
  id: string
  type: 'payment' | 'change_order'
  vendor: string
  work: string
  amount: number
  project: string
  project_id: string
  draw_number: number | null
  notes: string | null
  date: string
  isOverBudget: boolean
}

interface Project { id: string; owner_name: string; address: string }

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function HistoryClient({ timeline, projects }: { timeline: TimelineEntry[]; projects: Project[] }) {
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? timeline : timeline.filter((e) => e.project_id === filter)

  return (
    <div>
      <div className="mb-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.owner_name} — {p.address.split(',')[0]}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 && (
        <p className="text-gray-500 text-sm">No payments or change orders recorded yet.</p>
      )}

      <div className="space-y-1">
        {filtered.map((entry) => (
          <div key={entry.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
              entry.type === 'change_order' ? 'bg-purple-500' :
              entry.isOverBudget ? 'bg-amber-500' : 'bg-green-500'
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{entry.vendor}</p>
                  {entry.work && <p className="text-xs text-gray-500">{entry.work}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{entry.project}</p>
                  {entry.notes && <p className="text-xs text-gray-500 mt-0.5 italic">{entry.notes}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`font-semibold text-sm ${
                    entry.type === 'change_order' ? 'text-purple-700' :
                    entry.isOverBudget ? 'text-amber-700' : 'text-green-700'
                  }`}>
                    {entry.type === 'change_order' && entry.amount > 0 ? '+' : ''}
                    {toDisplay(Math.abs(entry.amount))}
                  </p>
                  {entry.type === 'change_order' && (
                    <p className="text-xs text-purple-600">Change order</p>
                  )}
                  {entry.draw_number && (
                    <p className="text-xs text-gray-400">Draw {entry.draw_number}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">{formatDate(entry.date)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
