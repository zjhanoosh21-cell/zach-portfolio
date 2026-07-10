export type StatusBadge = 'not_started' | 'partial' | 'near_limit' | 'paid' | 'over_budget'

export function getStatusBadge(
  totalPaidCents: number,
  adjustedContractCents: number,
  lowBalanceAlertsEnabled: boolean
): StatusBadge {
  if (adjustedContractCents === 0 && totalPaidCents === 0) return 'not_started'
  if (totalPaidCents === 0) return 'not_started'
  if (totalPaidCents > adjustedContractCents) return 'over_budget'
  if (totalPaidCents === adjustedContractCents) return 'paid'

  if (lowBalanceAlertsEnabled && adjustedContractCents > 0) {
    const remaining = adjustedContractCents - totalPaidCents
    if (remaining / adjustedContractCents < 0.1) return 'near_limit'
  }

  return 'partial'
}

export interface LineItemAlert {
  type: 'over_budget' | 'near_limit'
  vendorName: string
  amount?: number
  message: string
}

export function computeLineItemAlerts(
  lineItems: Array<{
    vendor: { name: string }
    adjusted_contract_cents: number
    total_paid_cents: number
  }>,
  settings: { low_balance_alerts: boolean }
): LineItemAlert[] {
  const alerts: LineItemAlert[] = []

  for (const li of lineItems) {
    if (li.total_paid_cents > li.adjusted_contract_cents) {
      const overBy = li.total_paid_cents - li.adjusted_contract_cents
      alerts.push({
        type: 'over_budget',
        vendorName: li.vendor.name,
        amount: overBy,
        message: `${li.vendor.name} is over contract by $${(overBy / 100).toLocaleString()}`,
      })
    } else if (
      settings.low_balance_alerts &&
      li.adjusted_contract_cents > 0 &&
      li.total_paid_cents > 0
    ) {
      const remaining = li.adjusted_contract_cents - li.total_paid_cents
      if (remaining / li.adjusted_contract_cents < 0.1) {
        alerts.push({
          type: 'near_limit',
          vendorName: li.vendor.name,
          amount: remaining,
          message: `${li.vendor.name} is within 10% of contract ceiling ($${(remaining / 100).toLocaleString()} remaining)`,
        })
      }
    }

  }

  return alerts
}

export function computeAdjustedContract(
  originalCents: number,
  changeOrders: Array<{ direction: string; amount_cents: number }>
): number {
  return changeOrders.reduce((acc, co) => {
    return co.direction === 'add' ? acc + co.amount_cents : acc - co.amount_cents
  }, originalCents)
}
