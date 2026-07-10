import { prisma } from './prisma'

export interface AppSettings {
  low_balance_alerts: boolean
  change_order_warnings: boolean
  require_co_reason: boolean
  auto_save_drafts: boolean
  company_name: string
  contractor_name: string
  contractor_phone: string
  state: string
  // Vendor table column visibility (app view only — all columns always appear in CSV export)
  show_col_original: boolean
  show_col_change_orders: boolean
  show_col_active_contract: boolean
}

const DEFAULTS: AppSettings = {
  low_balance_alerts: true,
  change_order_warnings: true,
  require_co_reason: true,
  auto_save_drafts: true,
  company_name: 'Odyssey Construction',
  contractor_name: 'Alex Morgan',
  contractor_phone: '(555) 014-7788',
  state: 'Michigan',
  show_col_original: true,
  show_col_change_orders: true,
  show_col_active_contract: true,
}

export async function getSettings(): Promise<AppSettings> {
  const rows = await prisma.setting.findMany()
  const map: Record<string, string> = {}
  for (const row of rows) {
    map[row.key] = row.value
  }

  const bool = (key: string, def: boolean) =>
    map[key] !== undefined ? map[key] === 'true' : def

  return {
    low_balance_alerts: bool('low_balance_alerts', DEFAULTS.low_balance_alerts),
    change_order_warnings: bool('change_order_warnings', DEFAULTS.change_order_warnings),
    require_co_reason: bool('require_co_reason', DEFAULTS.require_co_reason),
    auto_save_drafts: bool('auto_save_drafts', DEFAULTS.auto_save_drafts),
    company_name: map.company_name ?? DEFAULTS.company_name,
    contractor_name: map.contractor_name ?? DEFAULTS.contractor_name,
    contractor_phone: map.contractor_phone ?? DEFAULTS.contractor_phone,
    state: map.state ?? DEFAULTS.state,
    show_col_original: bool('show_col_original', DEFAULTS.show_col_original),
    show_col_change_orders: bool('show_col_change_orders', DEFAULTS.show_col_change_orders),
    show_col_active_contract: bool('show_col_active_contract', DEFAULTS.show_col_active_contract),
  }
}
