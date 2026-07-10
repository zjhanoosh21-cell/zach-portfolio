'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Vendor {
  id: string
  name: string
  typical_work: string | null
  phone: string | null
  _count: { line_items: number }
}

export default function VendorsClient({ vendors: initial }: { vendors: Vendor[] }) {
  const router = useRouter()
  const [vendors, setVendors] = useState(initial)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [form, setForm] = useState({ name: '', typical_work: '', phone: '' })

  function openNew() {
    setEditing(null)
    setForm({ name: '', typical_work: '', phone: '' })
    setShowModal(true)
  }

  function openEdit(v: Vendor) {
    setEditing(v)
    setForm({ name: v.name, typical_work: v.typical_work || '', phone: v.phone || '' })
    setShowModal(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (editing) {
        const res = await fetch(`/api/vendors/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const updated = await res.json()
        setVendors((vs) => vs.map((v) => v.id === editing.id ? { ...v, ...updated } : v))
      } else {
        const res = await fetch('/api/vendors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const created = await res.json()
        setVendors((vs) => [...vs, { ...created, _count: { line_items: 0 } }].sort((a, b) => a.name.localeCompare(b.name)))
      }
      setShowModal(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(v: Vendor) {
    setDeleteError(null)
    const res = await fetch(`/api/vendors/${v.id}`, { method: 'DELETE' })
    if (res.status === 409) {
      const data = await res.json()
      setDeleteError(data.error)
      return
    }
    setVendors((vs) => vs.filter((x) => x.id !== v.id))
    router.refresh()
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">{vendors.length} vendors</span>
          <button
            onClick={openNew}
            className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800"
          >
            + New vendor
          </button>
        </div>

        {deleteError && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-sm text-red-700">{deleteError}</div>
        )}

        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Typical work</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lines</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 font-medium text-gray-900">{v.name}</td>
                <td className="px-4 py-2.5 text-gray-600">{v.typical_work || <span className="text-gray-400">—</span>}</td>
                <td className="px-4 py-2.5 text-gray-600">{v.phone || <span className="text-gray-400">—</span>}</td>
                <td className="px-4 py-2.5 text-right text-gray-500">{v._count.line_items}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => openEdit(v)}
                      className="text-xs px-2 py-1 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 text-gray-700"
                    >
                      Edit
                    </button>
                    {v._count.line_items === 0 && (
                      <button
                        onClick={() => handleDelete(v)}
                        className="text-xs px-2 py-1 bg-red-50 border border-red-200 rounded hover:bg-red-100 text-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl p-6">
            <h2 className="font-semibold text-gray-900 mb-4">{editing ? 'Edit vendor' : 'New vendor'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Guntherie Lumber"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Typical work</label>
                <input
                  type="text"
                  value={form.typical_work}
                  onChange={(e) => setForm((f) => ({ ...f, typical_work: e.target.value }))}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Lumber and framing materials"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. (248) 555-1234"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 active:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || saving}
                className="flex-1 px-4 py-3.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 active:bg-blue-800"
              >
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Create vendor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
