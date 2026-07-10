import type { StatusBadge } from '@/lib/business-rules'

const BADGE_STYLES: Record<StatusBadge | string, string> = {
  not_started: 'bg-gray-100 text-gray-600',
  partial: 'bg-amber-100 text-amber-700',
  near_limit: 'bg-red-50 text-red-600 border border-red-300',
  paid: 'bg-green-100 text-green-700',
  over_budget: 'bg-red-100 text-red-700',
  active: 'bg-green-100 text-green-700',
  in_draw: 'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-600',
  archived: 'bg-gray-100 text-gray-500',
}

const BADGE_LABELS: Record<string, string> = {
  not_started: 'Not started',
  partial: 'Partial',
  near_limit: 'Near limit',
  paid: 'Paid',
  over_budget: 'Over budget',
  active: 'Active',
  in_draw: 'In draw',
  completed: 'Completed',
  archived: 'Archived',
}

interface BadgeProps {
  status: string
  label?: string
  className?: string
}

export function Badge({ status, label, className = '' }: BadgeProps) {
  const style = BADGE_STYLES[status] ?? 'bg-gray-100 text-gray-600'
  const text = label ?? BADGE_LABELS[status] ?? status

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style} ${className}`}>
      {text}
    </span>
  )
}
