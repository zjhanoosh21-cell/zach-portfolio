/** Convert dollar amount (string or number) to integer cents */
export function toCents(dollars: string | number): number {
  const num = typeof dollars === 'string' ? parseFloat(dollars.replace(/,/g, '')) : dollars
  return Math.round(num * 100)
}

/** Convert integer cents to display string like "$52,358" */
export function toDisplay(cents: number): string {
  const dollars = cents / 100
  return '$' + dollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

/** Convert integer cents to display with 2 decimal places */
export function toDisplayDecimal(cents: number): string {
  const dollars = cents / 100
  return '$' + dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Format raw number as dollar string for display */
export function formatDollars(amount: number): string {
  return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
