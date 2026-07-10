'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AppSettings } from '@/lib/settings'

interface Toggle {
  key: keyof AppSettings
  label: string
  description: string
}

const TOGGLES: Toggle[] = [
  {
    key: 'low_balance_alerts',
    label: 'Low-balance alerts',
    description: 'Warn when a vendor is within 10% of their contract ceiling.',
  },
  {
    key: 'change_order_warnings',
    label: 'Change order warnings',
    description: 'Block payments that would exceed the contract and prompt to add a change order first.',
  },
  {
    key: 'require_co_reason',
    label: 'Require reason on change orders',
    description: 'Make the reason field mandatory when creating a change order.',
  },
  {
    key: 'auto_save_drafts',
    label: 'Auto-save draw drafts',
    description: 'Automatically save draft sworn statements as you work through the draw creation process.',
  },
]

export default function SettingsClient({ initialSettings }: { initialSettings: AppSettings }) {
  const [settings, setSettings] = useState(initialSettings)
  const [saving, setSaving] = useState<string | null>(null)
  const [businessForm, setBusinessForm] = useState({
    company_name: initialSettings.company_name,
    contractor_name: initialSettings.contractor_name,
    contractor_phone: initialSettings.contractor_phone,
    state: initialSettings.state,
  })
  const [businessSaved, setBusinessSaved] = useState(false)
  const router = useRouter()

  async function toggleSetting(key: keyof AppSettings) {
    const newValue = !settings[key]
    setSaving(key)
    setSettings((prev) => ({ ...prev, [key]: newValue }))

    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: newValue }),
    })

    setSaving(null)
    router.refresh()
  }

  async function saveBusinessInfo(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(businessForm),
    })
    setBusinessSaved(true)
    setTimeout(() => setBusinessSaved(false), 2000)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Business Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Business information</h2>
        <form onSubmit={saveBusinessInfo} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company name</label>
            <input
              value={businessForm.company_name}
              onChange={(e) => setBusinessForm({ ...businessForm, company_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contractor name</label>
            <input
              value={businessForm.contractor_name}
              onChange={(e) => setBusinessForm({ ...businessForm, contractor_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              value={businessForm.contractor_phone}
              onChange={(e) => setBusinessForm({ ...businessForm, contractor_phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              value={businessForm.state}
              onChange={(e) => setBusinessForm({ ...businessForm, state: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            {businessSaved ? '✓ Saved' : 'Save business info'}
          </button>
        </form>
      </div>

      {/* Vendor table column visibility */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-1">Vendor table columns</h2>
        <p className="text-xs text-gray-500 mb-4">
          Choose which columns appear on the project page. All columns always appear in CSV exports.
        </p>
        <div className="space-y-4">
          {(
            [
              { key: 'show_col_original', label: 'Original contract', description: 'The original contracted amount before any change orders.' },
              { key: 'show_col_change_orders', label: 'Change orders', description: 'The net total of all change orders on each line.' },
              { key: 'show_col_active_contract', label: 'Active contract', description: 'Original contract adjusted for all change orders.' },
            ] as { key: keyof AppSettings; label: string; description: string }[]
          ).map((col) => (
            <div key={col.key} className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{col.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{col.description}</p>
              </div>
              <button
                onClick={() => toggleSetting(col.key)}
                disabled={saving === col.key}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                  settings[col.key] ? 'bg-blue-600' : 'bg-gray-200'
                } ${saving === col.key ? 'opacity-50' : ''}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                    settings[col.key] ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Feature toggles */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-1">Feature toggles</h2>
        <p className="text-xs text-gray-500 mb-4">Changes take effect immediately.</p>
        <div className="space-y-4">
          {TOGGLES.map((toggle) => (
            <div key={toggle.key} className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{toggle.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{toggle.description}</p>
              </div>
              <button
                onClick={() => toggleSetting(toggle.key as keyof AppSettings)}
                disabled={saving === toggle.key}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                  settings[toggle.key] ? 'bg-blue-600' : 'bg-gray-200'
                } ${saving === toggle.key ? 'opacity-50' : ''}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                    settings[toggle.key] ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
