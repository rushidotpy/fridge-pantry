import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { expiryLabel, expiryLevel, LEVEL_STYLES } from '../lib/dates'

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

/** Bottom sheet on phones, centered dialog on desktop. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-sheet-in relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl dark:bg-slate-900">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-200 sm:hidden dark:bg-slate-700" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-5 pb-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && (
          <div className="safe-bottom border-t border-slate-100 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: { id: T; label: ReactNode }[]
  size?: 'sm' | 'md'
}) {
  return (
    <div
      className={cx(
        'grid rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800',
        size === 'sm' ? 'text-xs' : 'text-sm',
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cx(
            'truncate rounded-lg px-3 font-medium transition',
            size === 'sm' ? 'py-1' : 'py-1.5',
            value === o.id
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ExpiryChip({ date, showDate = false }: { date: string | null; showDate?: boolean }) {
  const level = expiryLevel(date)
  const s = LEVEL_STYLES[level]
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', s.chip)}>
      <span className={cx('size-1.5 rounded-full', s.dot)} />
      {showDate && date ? `${expiryLabel(date)}` : expiryLabel(date)}
    </span>
  )
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="animate-fade-up flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      {body && <p className="mt-1 max-w-xs text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Button({
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const styles = {
    primary: 'bg-brand-700 text-white shadow-sm hover:bg-brand-800',
    secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300',
  }[variant]
  return (
    <button
      {...props}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition active:scale-[.98] disabled:opacity-50',
        styles,
        className,
      )}
    />
  )
}

export const inputCls =
  'w-full rounded-xl border-0 bg-slate-100 px-3.5 py-2.5 text-[15px] outline-none ring-0 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-500 dark:bg-slate-800 dark:focus:bg-slate-800'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mt-6 mb-2 flex items-baseline justify-between px-1 first:mt-0">
      <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">{children}</h2>
      {right}
    </div>
  )
}
