import { getSettings } from '@/lib/settings'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const settings = await getSettings()
  return (
    <div className="p-4 sm:p-6 max-w-xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Settings</h1>
      <SettingsClient initialSettings={settings} />
    </div>
  )
}
