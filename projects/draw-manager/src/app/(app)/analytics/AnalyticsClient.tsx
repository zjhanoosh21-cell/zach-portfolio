'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { toDisplay } from '@/lib/money'

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#84cc16', '#f97316', '#ef4444']

interface Props {
  summary: {
    totalManaged: number
    avgProjectValue: number
    projectCount: number
    overrunProjects: number
    totalCOs: number
  }
  topVendors: Array<{ name: string; total: number }>
  categoryData: Array<{ name: string; total: number }>
}

const CATEGORY_LABELS: Record<string, string> = {
  labor: 'Labor',
  materials: 'Materials',
  mep: 'MEP',
  permits: 'Permits',
  other: 'Other',
}

export default function AnalyticsClient({ summary, topVendors, categoryData }: Props) {
  const categoryChart = categoryData.map((c) => ({ ...c, displayName: CATEGORY_LABELS[c.name] || c.name }))

  return (
    <div className="space-y-4">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total managed" value={toDisplay(summary.totalManaged)} />
        <MetricCard label="Avg project value" value={toDisplay(summary.avgProjectValue)} />
        <MetricCard label="Total projects" value={String(summary.projectCount)} />
        <MetricCard label="Change orders total" value={String(summary.totalCOs)} />
      </div>

      {/* Top vendors chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 text-sm mb-4">Top vendors by total paid</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={topVendors} layout="vertical" margin={{ left: 20, right: 20 }}>
            <XAxis type="number" tickFormatter={(v) => `$${(v / 100000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => toDisplay(v as number)} />
            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
              {topVendors.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Spend by category */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 text-sm mb-4">Spend by category</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={categoryChart} margin={{ top: 4 }}>
            <XAxis dataKey="displayName" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `$${(v / 100000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => toDisplay(v as number)} />
            <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
