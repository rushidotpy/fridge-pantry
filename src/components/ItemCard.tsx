import { Check, Minus, Plus, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { expiryLevel, formatDate, LEVEL_STYLES } from '../lib/dates'
import { CATEGORY_EMOJI, type Item } from '../lib/types'
import { useData } from '../state/DataProvider'
import { Button, ExpiryChip, Sheet, cx } from './ui'

export function ItemCard({ item, onEdit }: { item: Item; onEdit: (item: Item) => void }) {
  const { updateItem, finishItem, isStaple } = useData()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const level = expiryLevel(item.expires_on)
  const staple = isStaple(item.name)

  const bump = (d: number) => {
    const next = +(item.quantity + d).toFixed(2)
    // Hitting zero asks what happened instead of silently zeroing the row.
    if (next <= 0) return setConfirmOpen(true)
    return updateItem(item.id, { quantity: next })
  }

  return (
    <>
      <div
        className={cx(
          'animate-fade-up group relative flex gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 transition hover:shadow-md dark:bg-slate-900',
          level === 'expired' || level === 'urgent' ? LEVEL_STYLES[level].ring : 'ring-slate-200/70 dark:ring-slate-800',
        )}
      >
        <button
          onClick={() => onEdit(item)}
          className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-2xl dark:bg-slate-800"
        >
          {item.photo_url ? <img src={item.photo_url} alt="" className="size-full object-cover" loading="lazy" /> : CATEGORY_EMOJI[item.category]}
        </button>
        <div className="min-w-0 flex-1">
          <button onClick={() => onEdit(item)} className="block w-full text-left">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-medium">{item.name}</span>
              {staple && <Star className="size-3 shrink-0 fill-amber-400 text-amber-400" />}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <ExpiryChip date={item.expires_on} />
              {item.expires_on && <span>{formatDate(item.expires_on, 'MMM d')}</span>}
              {item.notes && <span className="truncate">· {item.notes}</span>}
            </div>
          </button>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center overflow-hidden rounded-lg bg-slate-100 text-sm dark:bg-slate-800">
              <button className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => bump(-1)} aria-label="Decrease">
                <Minus className="size-3.5" />
              </button>
              <span className="min-w-12 px-1 text-center font-medium tabular-nums">
                {item.quantity} <span className="text-slate-400">{item.unit}</span>
              </span>
              <button className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => bump(1)} aria-label="Increase">
                <Plus className="size-3.5" />
              </button>
            </div>
            <button
              onClick={() => setConfirmOpen(true)}
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Check className="size-3.5" /> Used up
            </button>
          </div>
        </div>
      </div>

      <Sheet open={confirmOpen} onClose={() => setConfirmOpen(false)} title={item.name}>
        <p className="mb-4 text-sm text-slate-500">Mark it finished and choose whether to put it on your shopping list.</p>
        <div className="grid gap-2 pb-2">
          <Button
            onClick={async () => {
              await finishItem(item.id, 'used', true)
              setConfirmOpen(false)
            }}
          >
            <Check className="size-4" /> Used up, add to shopping list
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              await finishItem(item.id, 'used', false)
              setConfirmOpen(false)
            }}
          >
            Used up, don't need more
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              await finishItem(item.id, 'tossed', false)
              setConfirmOpen(false)
            }}
          >
            <Trash2 className="size-4" /> Went bad, tossed it
          </Button>
        </div>
      </Sheet>
    </>
  )
}
