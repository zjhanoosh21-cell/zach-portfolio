'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toDisplay } from '@/lib/money'
import type { AppSettings } from '@/lib/settings'

interface Project { id: string; owner_name: string; address: string; status: string }
interface Vendor { id: string; name: string }
interface LineItemInfo {
  id: string
  vendor_id: string
  work_description: string
  original_contract_cents: number
  adjusted_contract_cents: number
  total_paid_cents: number
}

export default function ChangeOrderForm({
  projects, vendors, defaultProjectId, defaultVendorId, settings, onSuccess,
}: {
  projects: Project[]
  vendors: Vendor[]
  defaultProjectId?: string
  defaultVendorId?: string
  settings: AppSettings
  onSuccess?: () => void
}) {
  const router = useRouter()
  const [projectId, setProjectId] = useState(defaultProjectId || projects[0]?.id || '')
  const [vendorId, setVendorId] = useState(defaultVendorId || '')
  const [amount, setAmount] = useState('')
  const [direction, setDirection] = useState<'add' | 'reduce'>('add')
  const [reason, setReason] = useState('')
  const [approvedBy, setApprovedBy] = useState('')
  const [approvedDate, setApprovedDate] = useState(new Date().toISOString().split('T')[0])
  const [projectLineItems, setProjectLineItems] = useState<LineItemInfo[]>([])
  const [lineItem, setLineItem] = useState<LineItemInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!projectId) return
    fetch(`/api/line-items?project_id=${projectId}`)
      .then((r) => r.json())
      .then(setProjectLineItems)
  }, [projectId])

  useEffect(() => {
    if (!vendorId) { setLineItem(null); return }
    const item = projectLineItems.find((li) => li.vendor_id === vendorId)
    setLineItem(item || null)
  }, [vendorId, projectLineItems])

  const projectVendorIds = new Set(projectLineItems.map((li) => li.vendor_id))
  const availableVendors = vendors.filter((v) => projectVendorIds.has(v.id))

  const amountCents = amount ? Math.round(parseFloat(amount.replace(/,/g, '')) * 100) : 0
  const newAdjusted = lineItem
    ? direction === 'add'
      ? lineItem.adjusted_contract_cents + amountCents
      : lineItem.adjusted_contract_cents - amountCents
    : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (settings.require_co_reason && !reason.trim()) {
      setError('Reason is required.')
      return
    }

    const currentLineItem = projectLineItems.find((li) => li.vendor_id === vendorId)
    if (!currentLineItem) { setError('Vendor not found'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/change-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_item_id: currentLineItem.id,
          project_id: projectId,
          amount: parseFloat(amount.replace(/,/g, '')),
          direction,
          reason,
          approved_by: approvedBy,
          approved_date: approvedDate,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Something went wrong')
        return
      }
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

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
          <select
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setVendorId('') }}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.owner_name} — {p.address.split(',')[0]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
          <select
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            required
            className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select vendor...</option>
            {availableVendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        {lineItem && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
            <p className="font-medium text-gray-700 mb-1">
              {availableVendors.find((v) => v.id === vendorId)?.name} — {lineItem.work_description}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-xs text-gray-500">Original</p>
                <p className="font-medium">{toDisplay(lineItem.original_contract_cents)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Paid</p>
                <p className={`font-medium ${lineItem.total_paid_cents > lineItem.adjusted_contract_cents ? 'text-red-600' : ''}`}>
                  {toDisplay(lineItem.total_paid_cents)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">
                  {lineItem.total_paid_cents > lineItem.adjusted_contract_cents ? 'Over by' : 'Remaining'}
                </p>
                <p className={`font-medium ${lineItem.total_paid_cents > lineItem.adjusted_contract_cents ? 'text-red-600' : ''}`}>
                  {toDisplay(Math.abs(lineItem.adjusted_contract_cents - lineItem.total_paid_cents))}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Change order amount ($)</label>
            <input
              required
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as 'add' | 'reduce')}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="add">Add to contract (+)</option>
              <option value="reduce">Reduce contract (−)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason for change order {settings.require_co_reason && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date approved</label>
            <input
              type="date"
              value={approvedDate}
              onChange={(e) => setApprovedDate(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Approved by</label>
            <input
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              placeholder="e.g. Daniel Whitmore (owner)"
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Preview */}
        {lineItem && amountCents > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
            <p className="text-green-800">
              After this change order, {availableVendors.find((v) => v.id === vendorId)?.name}&apos;s adjusted contract will be{' '}
              <strong>{toDisplay(newAdjusted)}</strong>
              {lineItem.total_paid_cents === newAdjusted && ' — matching what was paid. Balance will be $0.'}
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <button
          type="submit"
          disabled={loading || !vendorId}
          className="w-full px-4 py-4 bg-blue-600 text-white rounded-xl text-base font-semibold hover:bg-blue-700 disabled:opacity-50 active:bg-blue-800"
        >
          {loading ? 'Saving...' : 'Save change order'}
        </button>
      </form>
    </div>
  )
}
