import { differenceInCalendarDays, format, parseISO, isValid, addDays } from 'date-fns'

export type ExpiryLevel = 'expired' | 'urgent' | 'soon' | 'ok' | 'none'

export function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function plusDaysIso(days: number): string {
  return format(addDays(new Date(), days), 'yyyy-MM-dd')
}

export function daysUntil(dateIso: string | null | undefined): number | null {
  if (!dateIso) return null
  const d = parseISO(dateIso)
  if (!isValid(d)) return null
  return differenceInCalendarDays(d, new Date())
}

export function expiryLevel(dateIso: string | null | undefined): ExpiryLevel {
  const days = daysUntil(dateIso)
  if (days === null) return 'none'
  if (days < 0) return 'expired'
  if (days <= 3) return 'urgent'
  if (days <= 7) return 'soon'
  return 'ok'
}

export function expiryLabel(dateIso: string | null | undefined): string {
  const days = daysUntil(dateIso)
  if (days === null) return 'No date'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  if (days < 0) return `${-days}d ago`
  if (days < 14) return `${days}d`
  if (days < 60) return `${Math.round(days / 7)}w`
  return `${Math.round(days / 30)}mo`
}

export function expiryLongLabel(dateIso: string | null | undefined): string {
  const days = daysUntil(dateIso)
  if (days === null) return 'No expiration date'
  if (days === 0) return 'Expires today'
  if (days === 1) return 'Expires tomorrow'
  if (days < 0) return `Expired ${-days === 1 ? 'yesterday' : `${-days} days ago`}`
  return `Expires in ${days} days`
}

export function formatDate(dateIso: string | null | undefined, pattern = 'MMM d'): string {
  if (!dateIso) return ''
  const d = parseISO(dateIso)
  return isValid(d) ? format(d, pattern) : ''
}

export const LEVEL_STYLES: Record<ExpiryLevel, { chip: string; dot: string; text: string; ring: string }> = {
  expired: {
    chip: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
    dot: 'bg-red-500',
    text: 'text-red-700 dark:text-red-300',
    ring: 'ring-red-300 dark:ring-red-800',
  },
  urgent: {
    chip: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
    dot: 'bg-orange-500',
    text: 'text-orange-700 dark:text-orange-300',
    ring: 'ring-orange-300 dark:ring-orange-800',
  },
  soon: {
    chip: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    dot: 'bg-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
    ring: 'ring-amber-300 dark:ring-amber-800',
  },
  ok: {
    chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
    ring: 'ring-emerald-300 dark:ring-emerald-800',
  },
  none: {
    chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    dot: 'bg-slate-400',
    text: 'text-slate-500',
    ring: 'ring-slate-200 dark:ring-slate-700',
  },
}

export const LEVEL_TITLES: Record<ExpiryLevel, string> = {
  expired: 'Expired',
  urgent: 'Use in 3 days',
  soon: 'This week',
  ok: 'Good',
  none: 'No date',
}
