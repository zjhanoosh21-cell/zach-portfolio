'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toDisplay } from '@/lib/money'
import type { LineItemAlert } from '@/lib/business-rules'
import type { AppSettings } from '@/lib/settings'
import PaymentForm from '@/app/(app)/payments/new/PaymentForm'
import ChangeOrderForm from '@/app/(app)/change-orders/new/ChangeOrderForm'
import DrawForm from '@/app/(app)/draws/new/DrawForm'
import Toast from '@/components/ui/Toast'

interface LineItem {
  id: string
  line_number: string
  work_description: string
  vendor: { id: string; name: string }
  original_contract_cents: number
  adjusted_contract_cents: number
  change_orders_total_cents: number
  total_paid_cents: number
  retention_withheld_cents: number
  status: string
}

interface ProjectData {
  id: string
  owner_name: string
  address: string
  county: string
  status: string
  draw_number: number
  notes: string | null
  line_items: LineItem[]
}

interface Props {
  project: ProjectData
  vendors: Array<{ id: string; name: string; typical_work?: string | null }>
  metrics: {
    totalContract: number
    totalPaid: number
    totalOwing: number
    leftToComplete: number
  }
  alerts: LineItemAlert[]
  settings: AppSettings
}

type Modal = 'payment' | 'change_order' | 'draw' | 'add_line' | null

const STATUS_OPTIONS = [
  { value: 'active',    label: 'Active' },
  { value: 'on_hold',  label: 'On hold' },
  { value: 'completed', label: 'Completed' },
] as const

type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'in_draw'

export default function ProjectDetailClient({ project, vendors, metrics, alerts, settings }: Props) {
  const router = useRouter()
  const [notes, setNotes] = useState(project.notes || '')
  const [editingNotes, setEditingNotes] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  const [modal, setModal] = useState<Modal>(null)
  const [activeVendorId, setActiveVendorId] = useState<string | undefined>(undefined)
  const [activeLineItemId, setActiveLineItemId] = useState<string | undefined>(undefined)
  const [showAllAlerts, setShowAllAlerts] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<ProjectStatus>(project.status as ProjectStatus)
  const [toast, setToast] = useState<string | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])
  const isCompleted = currentStatus === 'completed'

  function openModal(m: Modal, vendorId?: string, lineItemId?: string) {
    setActiveVendorId(vendorId)
    setActiveLineItemId(lineItemId)
    setModal(m)
  }

  function closeModal() {
    setModal(null)
    setActiveVendorId(undefined)
    setActiveLineItemId(undefined)
  }

  function handleFormSuccess(message?: string) {
    closeModal()
    if (message) setToast(message)
    router.refresh()
  }

  async function saveNotes() {
    setSavingNotes(true)
    await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    setSavingNotes(false)
    setEditingNotes(false)
    router.refresh()
  }

  async function changeStatus(newStatus: string) {
    setCurrentStatus(newStatus as ProjectStatus)
    const body: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'completed') body.completed_at = new Date().toISOString()
    await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    router.refresh()
  }

  const addressParts = project.address.split(',')
  const city = addressParts.slice(1).join(',').trim()

  const unsettledItems = project.line_items.filter(
    (li) => li.total_paid_cents < li.adjusted_contract_cents && li.adjusted_contract_cents > 0
  )

  const overBudget = alerts.filter((a) => a.type === 'over_budget')
  const nearLimit = alerts.filter((a) => a.type === 'near_limit')
  const summaryParts: string[] = []
  if (overBudget.length) summaryParts.push(`${overBudget.length} over budget`)
  if (nearLimit.length) summaryParts.push(`${nearLimit.length} near limit`)

  // Build a project-shaped object for DrawForm
  const projectForDraw = { ...project }

  const statusColors: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border-green-200',
    on_hold: 'bg-amber-50 text-amber-700 border-amber-200',
    completed: 'bg-gray-100 text-gray-500 border-gray-200',
    in_draw: 'bg-blue-50 text-blue-700 border-blue-200',
  }
  const statusLabel: Record<string, string> = {
    active: 'Active', on_hold: 'On hold', completed: 'Completed', in_draw: 'In draw',
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl pb-32 md:pb-6">
      <Toast message={toast} onDismiss={dismissToast} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/projects" className="text-sm text-gray-500 hover:text-gray-700">Projects</Link>
            <span className="text-gray-400">›</span>
            <span className="text-sm text-gray-900 truncate">{project.owner_name}</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 break-words">
            {project.owner_name} — {city || project.address}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 break-words">{project.address} · Draw #{project.draw_number}</p>
          {/* Status selector — works on both mobile and desktop */}
          <div className="mt-2 flex items-center gap-2">
            <select
              value={currentStatus === 'in_draw' ? 'active' : currentStatus}
              onChange={(e) => changeStatus(e.target.value)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${statusColors[currentStatus] ?? statusColors.active}`}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {currentStatus === 'in_draw' && (
              <span className="text-xs text-blue-600 font-medium">(draw in progress)</span>
            )}
          </div>
        </div>
        {/* Desktop action buttons — hidden on mobile (bottom bar handles it) */}
        <div className="hidden md:flex items-center gap-2 flex-wrap">
          <a
            href={`/api/projects/${project.id}/export`}
            download
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ↓ Export CSV
          </a>
          {!isCompleted && (
            <>
              <button
                onClick={() => openModal('payment')}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                + Payment
              </button>
              <button
                onClick={() => openModal('change_order')}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Change order
              </button>
              <button
                onClick={() => openModal('draw')}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Create draw
              </button>
            </>
          )}
        </div>
        {/* Mobile export link */}
        <div className="md:hidden">
          <a
            href={`/api/projects/${project.id}/export`}
            download
            className="text-xs text-gray-500 underline underline-offset-2"
          >
            ↓ Export CSV
          </a>
        </div>
      </div>

      {/* Alert banner */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl mb-4">
          <div className="px-4 py-2.5 flex items-center justify-between">
            <p className="text-sm font-medium text-amber-800">⚠ {summaryParts.join(' · ')}</p>
            <button
              onClick={() => setShowAllAlerts((v) => !v)}
              className="text-xs text-amber-700 hover:underline font-medium ml-4 flex-shrink-0"
            >
              {showAllAlerts ? 'Hide' : 'View all'}
            </button>
          </div>
          {showAllAlerts && (
            <div className="border-t border-amber-200 px-4 py-3 max-h-48 overflow-y-auto">
              <ul className="space-y-0.5">
                {alerts.map((alert, i) => (
                  <li key={i} className="text-xs text-amber-700">• {alert.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <MetricCard label="Total contract" value={toDisplay(metrics.totalContract)} />
        <MetricCard label="Already paid" value={toDisplay(metrics.totalPaid)} />
        <MetricCard label="Owing now" value={toDisplay(metrics.totalOwing)} highlight />
        <MetricCard label="Left to complete" value={toDisplay(metrics.leftToComplete)} />
      </div>

      {/* Vendor table */}
      <div className="bg-white rounded-xl border border-gray-200 mb-4">
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">
            Vendors {project.line_items.length > 0 && `(${project.line_items.length} lines)`}
          </h2>
          {!isCompleted && (
            <button
              onClick={() => openModal('add_line')}
              className="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 font-medium"
            >
              + Add line
            </button>
          )}
        </div>

        {project.line_items.length === 0 ? (
          /* Empty state */
          <div className="py-12 px-6 text-center">
            <p className="text-sm text-gray-500 mb-4">No vendor lines yet. Add your first vendor to get started.</p>
            {!isCompleted && (
              <button
                onClick={() => openModal('add_line')}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:bg-blue-800"
              >
                + Add vendor line
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {project.line_items.map((li) => (
                <VendorCard
                  key={li.id}
                  li={li}
                  isCompleted={isCompleted}
                  onPay={() => openModal('payment', li.vendor.id, li.id)}
                  onFix={() => openModal('change_order', li.vendor.id)}
                />
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-3 py-1.5 font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
                    <th className="text-left px-3 py-1.5 font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
                    <th className="text-left px-3 py-1.5 font-semibold text-gray-500 uppercase tracking-wider">Work</th>
                    {settings.show_col_original && (
                      <th className="text-right px-3 py-1.5 font-semibold text-gray-500 uppercase tracking-wider">Original</th>
                    )}
                    {settings.show_col_change_orders && (
                      <th className="text-right px-3 py-1.5 font-semibold text-gray-500 uppercase tracking-wider">Change Orders</th>
                    )}
                    {settings.show_col_active_contract && (
                      <th className="text-right px-3 py-1.5 font-semibold text-gray-500 uppercase tracking-wider">Active Contract</th>
                    )}
                    <th className="text-right px-3 py-1.5 font-semibold text-gray-500 uppercase tracking-wider">Paid</th>
                    <th className="text-right px-3 py-1.5 font-semibold text-gray-500 uppercase tracking-wider">Remaining</th>
                    <th className="px-3 py-1.5 w-14" />
                  </tr>
                </thead>
                <tbody>
                  {project.line_items.map((li, idx) => (
                    <VendorRow
                      key={li.id}
                      li={li}
                      isCompleted={isCompleted}
                      striped={idx % 2 === 1}
                      showOriginal={settings.show_col_original}
                      showChangeOrders={settings.show_col_change_orders}
                      showActiveContract={settings.show_col_active_contract}
                      onPay={() => openModal('payment', li.vendor.id, li.id)}
                      onFix={() => openModal('change_order', li.vendor.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Project notes */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-900 text-sm">Project notes</h2>
          {!isCompleted && !editingNotes && (
            <button onClick={() => setEditingNotes(true)} className="text-xs text-blue-600 hover:underline">
              Edit
            </button>
          )}
        </div>
        {editingNotes ? (
          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={saveNotes} disabled={savingNotes} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium">
                {savingNotes ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => { setEditingNotes(false); setNotes(project.notes || '') }}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600 whitespace-pre-line">
            {notes || <span className="text-gray-400 italic">No notes yet.</span>}
          </p>
        )}
      </div>

      {/* ── Mobile sticky bottom action bar ── */}
      {!isCompleted && (
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-4 py-3 z-20 safe-bottom">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => openModal('payment')}
              className="flex-1 py-3.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 active:bg-gray-100"
            >
              + Log payment
            </button>
            <button
              onClick={() => openModal('draw')}
              className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl text-sm font-semibold active:bg-blue-700"
            >
              Create draw
            </button>
          </div>
          <button
            onClick={() => openModal('change_order')}
            className="w-full py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 active:bg-gray-100"
          >
            Change order
          </button>
        </div>
      )}

      {/* ── Modals ── */}

      {/* Payment modal */}
      {modal === 'payment' && (
        <ModalShell title="Log a payment" onClose={closeModal} size="md">
          <PaymentForm
            projects={[{ id: project.id, owner_name: project.owner_name, address: project.address, draw_number: project.draw_number, status: project.status }]}
            defaultProjectId={project.id}
            defaultLineItemId={activeLineItemId}
            settings={settings}
            onSuccess={() => handleFormSuccess('Payment saved')}
          />
        </ModalShell>
      )}

      {/* Change order modal */}
      {modal === 'change_order' && (
        <ModalShell title="Add change order" onClose={closeModal} size="md">
          <p className="text-sm text-gray-500 mb-4">Use this when a vendor's scope or price changes from the original contract.</p>
          <ChangeOrderForm
            projects={[{ id: project.id, owner_name: project.owner_name, address: project.address, status: project.status }]}
            vendors={vendors}
            defaultProjectId={project.id}
            defaultVendorId={activeVendorId}
            settings={settings}
            onSuccess={() => handleFormSuccess('Change order saved')}
          />
        </ModalShell>
      )}

      {/* Draw modal */}
      {modal === 'draw' && (
        <ModalShell title="Create a draw" onClose={closeModal} size="lg">
          <DrawForm
            projects={[projectForDraw]}
            defaultProjectId={project.id}
            settings={settings}
            onSuccess={() => handleFormSuccess('Draw created')}
          />
        </ModalShell>
      )}

      {/* Add line modal */}
      {modal === 'add_line' && (
        <AddLineModal
          projectId={project.id}
          existingCount={project.line_items.length}
          onClose={closeModal}
          onSaved={() => handleFormSuccess('Vendor line added')}
        />
      )}
    </div>
  )
}

/* ── Shared modal shell ── */
function ModalShell({ title, onClose, children, size = 'md' }: {
  title: string
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl' }
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-xl w-full ${widths[size]} shadow-xl max-h-[90vh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>
        </div>
        <div className="overflow-y-auto px-6 py-5 flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}

/* ── Metric card ── */
function MetricCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

/* ── Vendor row ── */
function VendorRow({ li, isCompleted, striped, showOriginal, showChangeOrders, showActiveContract, onPay, onFix }: {
  li: LineItem
  isCompleted: boolean
  striped: boolean
  showOriginal: boolean
  showChangeOrders: boolean
  showActiveContract: boolean
  onPay: () => void
  onFix: () => void
}) {
  const isOverBudget = li.status === 'over_budget'
  const remaining = li.adjusted_contract_cents - li.total_paid_cents
  const notStarted = li.total_paid_cents === 0
  const isPaid = remaining === 0 && li.total_paid_cents > 0
  const isNearLimit = !isOverBudget && !isPaid && !notStarted &&
    li.adjusted_contract_cents > 0 &&
    remaining / li.adjusted_contract_cents < 0.1

  function remainingColor() {
    if (isOverBudget) return 'text-red-600 font-semibold'
    if (isNearLimit) return 'text-amber-600 font-medium'
    if (isPaid) return 'text-green-600'
    if (notStarted) return 'text-gray-400'
    return 'text-gray-700'
  }

  return (
    <tr className={`border-b border-gray-100 ${striped ? 'bg-gray-50/40' : 'bg-white'} hover:bg-blue-50/30`}>
      <td className="px-3 py-1.5 text-gray-400 font-mono">{li.line_number}</td>
      <td className="px-3 py-1.5 font-medium text-gray-900 whitespace-nowrap">{li.vendor.name}</td>
      <td className="px-3 py-1.5 text-gray-500 max-w-[160px] truncate">{li.work_description}</td>
      {showOriginal && (
        <td className="px-3 py-1.5 text-right text-gray-700 font-mono tabular-nums">{toDisplay(li.original_contract_cents)}</td>
      )}
      {showChangeOrders && (
        <td className="px-3 py-1.5 text-right font-mono tabular-nums">
          {li.change_orders_total_cents === 0 ? (
            <span className="text-gray-300">—</span>
          ) : (
            <span className={li.change_orders_total_cents > 0 ? 'text-green-600' : 'text-red-500'}>
              {li.change_orders_total_cents > 0 ? '+' : ''}{toDisplay(li.change_orders_total_cents)}
            </span>
          )}
        </td>
      )}
      {showActiveContract && (
        <td className="px-3 py-1.5 text-right text-gray-700 font-mono tabular-nums font-medium">{toDisplay(li.adjusted_contract_cents)}</td>
      )}
      <td className="px-3 py-1.5 text-right text-gray-700 font-mono tabular-nums">
        {toDisplay(li.total_paid_cents)}
      </td>
      <td className={`px-3 py-1.5 text-right font-mono tabular-nums ${remainingColor()}`}>
        {isPaid ? '✓ Paid' : isOverBudget ? `-${toDisplay(Math.abs(remaining))}` : toDisplay(remaining)}
      </td>
      <td className="px-3 py-1.5 text-right">
        {!isCompleted && (
          isOverBudget ? (
            <button
              onClick={onFix}
              className="text-xs px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100"
            >
              Fix
            </button>
          ) : (
            <button
              onClick={onPay}
              className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100"
            >
              Pay
            </button>
          )
        )}
      </td>
    </tr>
  )
}

/* ── Vendor card (mobile) ── */
function VendorCard({ li, isCompleted, onPay, onFix }: {
  li: LineItem
  isCompleted: boolean
  onPay: () => void
  onFix: () => void
}) {
  const isOverBudget = li.status === 'over_budget'
  const remaining = li.adjusted_contract_cents - li.total_paid_cents
  const isPaid = remaining === 0 && li.total_paid_cents > 0
  const remainingColor = isOverBudget
    ? 'text-red-600'
    : isPaid
    ? 'text-green-600'
    : 'text-gray-900'

  return (
    <div className="p-3">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 font-mono">#{li.line_number}</span>
            <p className="font-semibold text-gray-900 text-sm truncate">{li.vendor.name}</p>
          </div>
          <p className="text-xs text-gray-500 truncate">{li.work_description}</p>
        </div>
        {!isCompleted && (
          isOverBudget ? (
            <button
              onClick={onFix}
              className="flex-shrink-0 text-xs px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded font-medium"
            >
              Fix
            </button>
          ) : (
            <button
              onClick={onPay}
              className="flex-shrink-0 text-xs px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded font-medium"
            >
              Pay
            </button>
          )
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-gray-400 uppercase tracking-wide text-[10px]">Contract</p>
          <p className="text-gray-700 font-mono tabular-nums">{toDisplay(li.adjusted_contract_cents)}</p>
        </div>
        <div>
          <p className="text-gray-400 uppercase tracking-wide text-[10px]">Paid</p>
          <p className="text-gray-700 font-mono tabular-nums">{toDisplay(li.total_paid_cents)}</p>
        </div>
        <div>
          <p className="text-gray-400 uppercase tracking-wide text-[10px]">Remaining</p>
          <p className={`font-mono tabular-nums font-semibold ${remainingColor}`}>
            {isPaid ? '✓ Paid' : isOverBudget ? `-${toDisplay(Math.abs(remaining))}` : toDisplay(remaining)}
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── Add line modal ── */
function AddLineModal({ projectId, existingCount, onClose, onSaved }: {
  projectId: string
  existingCount: number
  onClose: () => void
  onSaved: () => void
}) {
  const [vendors, setVendors] = useState<Array<{ id: string; name: string; typical_work: string | null }>>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    vendor_id: '',
    new_vendor_name: '',
    work_description: '',
    line_number: String(existingCount + 1),
    original_contract: '',
    category: 'other',
  })
  const [mode, setMode] = useState<'existing' | 'new'>('existing')

  // Load vendors once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useState(() => {
    fetch('/api/vendors').then((r) => r.json()).then((v) => { setVendors(v); setLoaded(true) })
  })

  function onVendorChange(id: string) {
    const v = vendors.find((x) => x.id === id)
    setForm((f) => ({ ...f, vendor_id: id, work_description: f.work_description || v?.typical_work || '' }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      let vendor_id = form.vendor_id
      if (mode === 'new') {
        const res = await fetch('/api/vendors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.new_vendor_name }),
        })
        vendor_id = (await res.json()).id
      }
      await fetch('/api/line-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          vendor_id,
          work_description: form.work_description,
          line_number: form.line_number,
          original_contract: form.original_contract,
          category: form.category,
          sort_order: existingCount + 1,
        }),
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const isValid = form.work_description.trim() && form.original_contract.trim() &&
    (mode === 'existing' ? form.vendor_id : form.new_vendor_name.trim())

  return (
    <ModalShell title="Add vendor line" onClose={onClose} size="md">
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setMode('existing')}
          className={`flex-1 py-1 rounded-md text-sm font-medium transition-colors ${mode === 'existing' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
        >
          Existing vendor
        </button>
        <button
          onClick={() => setMode('new')}
          className={`flex-1 py-1 rounded-md text-sm font-medium transition-colors ${mode === 'new' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
        >
          New vendor
        </button>
      </div>
      <div className="space-y-3">
        {mode === 'existing' ? (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Vendor *</label>
            {!loaded ? <div className="text-xs text-gray-400 py-3">Loading...</div> : (
              <select
                value={form.vendor_id}
                onChange={(e) => onVendorChange(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select vendor...</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">New vendor name *</label>
            <input
              type="text"
              value={form.new_vendor_name}
              onChange={(e) => setForm((f) => ({ ...f, new_vendor_name: e.target.value }))}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Smith Roofing"
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Work description *</label>
          <input
            type="text"
            value={form.work_description}
            onChange={(e) => setForm((f) => ({ ...f, work_description: e.target.value }))}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Roofing materials"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Contract amount *</label>
            <input
              inputMode="decimal"
              value={form.original_contract}
              onChange={(e) => setForm((f) => ({ ...f, original_contract: e.target.value }))}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Line #</label>
            <input
              type="text"
              value={form.line_number}
              onChange={(e) => setForm((f) => ({ ...f, line_number: e.target.value }))}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="labor">Labor</option>
            <option value="materials">Materials</option>
            <option value="mep">MEP</option>
            <option value="permits">Permits</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 mt-5">
        <button onClick={onClose} className="flex-1 px-4 py-3.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 active:bg-gray-100">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!isValid || saving}
          className="flex-1 px-4 py-3.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 active:bg-blue-800"
        >
          {saving ? 'Adding...' : 'Add line'}
        </button>
      </div>
    </ModalShell>
  )
}
