'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toDisplay } from '@/lib/money'
import type { AppSettings } from '@/lib/settings'

interface Project {
  id: string
  owner_name: string
  address: string
  draw_number: number
  status: string
}

interface LineItemInfo {
  id: string
  vendor_id: string
  vendor_name: string
  work_description: string
  adjusted_contract_cents: number
  total_paid_cents: number
}

export default function PaymentForm({
  projects,
  defaultProjectId,
  defaultLineItemId,
  settings,
  onSuccess,
}: {
  projects: Project[]
  vendors?: unknown[] // kept for API compat, unused
  defaultProjectId?: string
  defaultVendorId?: string // kept for API compat, unused
  defaultLineItemId?: string
  settings: AppSettings
  onSuccess?: () => void
}) {
  const router = useRouter()
  const [projectId, setProjectId] = useState(defaultProjectId || projects[0]?.id || '')
  const [lineItemId, setLineItemId] = useState(defaultLineItemId || '')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [projectLineItems, setProjectLineItems] = useState<LineItemInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [overBudgetWarning, setOverBudgetWarning] = useState<{ message: string; overBy: number } | null>(null)

  // Load line items when project changes
  useEffect(() => {
    if (!projectId) return
    fetch(`/api/line-items?project_id=${projectId}`)
      .then((r) => r.json())
      .then((items) => {
        const mapped: LineItemInfo[] = items.map((li: any) => ({
          id: li.id,
          vendor_id: li.vendor_id,
          vendor_name: li.vendor.name,
          work_description: li.work_description,
          adjusted_contract_cents: li.adjusted_contract_cents,
          total_paid_cents: li.total_paid_cents,
        }))
        setProjectLineItems(mapped)
        // If defaultLineItemId set, keep it; otherwise reset
        if (!defaultLineItemId) setLineItemId('')
      })
  }, [projectId])

  const lineItem = projectLineItems.find((li) => li.id === lineItemId) || null
  const remaining = lineItem ? lineItem.adjusted_contract_cents - lineItem.total_paid_cents : 0
  const amountCents = amount ? Math.round(parseFloat(amount.replace(/,/g, '')) * 100) : 0
  const newTotal = lineItem ? lineItem.total_paid_cents + amountCents : 0

  function getPreviewMessage() {
    if (!lineItem || !amountCents) return null
    if (newTotal > lineItem.adjusted_contract_cents) {
      const over = newTotal - lineItem.adjusted_contract_cents
      return { type: 'error', text: `This payment exceeds the contract by ${toDisplay(over)}` }
    }
    if (newTotal === lineItem.adjusted_contract_cents) {
      return { type: 'success', text: `After this payment, ${lineItem.vendor_name} will be fully paid on this line` }
    }
    return { type: 'neutral', text: `After this payment, ${toDisplay(lineItem.adjusted_contract_cents - newTotal)} will remain` }
  }

  const preview = getPreviewMessage()

  async function handleSubmit(e: React.FormEvent, force = false) {
    e.preventDefault()
    setError('')
    setOverBudgetWarning(null)
    if (!lineItem) { setError('Select a vendor line'); return }
    setLoading(true)

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_item_id: lineItem.id,
          project_id: projectId,
          amount: parseFloat(amount.replace(/,/g, '')),
          payment_date: date,
          notes,
          force,
        }),
      })

      const data = await res.json()

      if (res.status === 409 && data.error === 'over_budget') {
        setOverBudgetWarning({ message: data.message, overBy: data.overBy })
        setLoading(false)
        return
      }

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setLoading(false)
        return
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/projects/${projectId}`)
        router.refresh()
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
          <select
            value={projectId}
            onChange={(e) => { setProjectId(e.target.value); setLineItemId('') }}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.owner_name} — {p.address.split(',')[0]}
              </option>
            ))}
          </select>
        </div>

        {/* Line item picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vendor line</label>
          <select
            value={lineItemId}
            onChange={(e) => setLineItemId(e.target.value)}
            required
            className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select line...</option>
            {projectLineItems.map((li) => (
              <option key={li.id} value={li.id}>
                {li.vendor_name} — {li.work_description}
              </option>
            ))}
          </select>
        </div>

        {/* Line item info box */}
        {lineItem && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-xs text-gray-500">Contract</p>
                <p className="font-medium">{toDisplay(lineItem.adjusted_contract_cents)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Paid so far</p>
                <p className="font-medium">{toDisplay(lineItem.total_paid_cents)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Remaining</p>
                <p className={`font-medium ${remaining < 0 ? 'text-red-600' : ''}`}>{toDisplay(remaining)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
          <input
            required
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={(e) => {
              const num = parseFloat(e.target.value.replace(/,/g, ''))
              if (!isNaN(num)) setAmount(num.toLocaleString())
            }}
            placeholder="0.00"
            className="w-full px-3 py-4 border border-gray-300 rounded-lg text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Preview */}
        {preview && (
          <div className={`p-3 rounded-lg text-sm font-medium ${
            preview.type === 'success' ? 'bg-green-50 text-green-700' :
            preview.type === 'error' ? 'bg-red-50 text-red-700' :
            'bg-gray-50 text-gray-700'
          }`}>
            {preview.text}
          </div>
        )}

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date paid</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional payment notes"
            className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        {/* Over-budget warning */}
        {overBudgetWarning && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-red-700 mb-2">{overBudgetWarning.message}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push(`/change-orders/new?project_id=${projectId}&vendor_id=${lineItem?.vendor_id}`)}
                className="flex-1 px-3 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium"
              >
                Add a change order first
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium"
              >
                Save anyway
              </button>
            </div>
          </div>
        )}

        {!overBudgetWarning && (
          <button
            type="submit"
            disabled={loading || !lineItemId}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-base hover:bg-blue-700 disabled:opacity-50 transition-colors active:bg-blue-800"
          >
            {loading ? 'Saving...' : 'Save payment'}
          </button>
        )}
      </form>
    </div>
  )
}
