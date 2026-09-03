import { Check, Plus, ShoppingCart, Sparkles, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { ItemForm } from '../components/ItemForm'
import { Button, EmptyState, Sheet, cx, inputCls } from '../components/ui'
import { CATEGORY_EMOJI, type Location, type ShoppingItem } from '../lib/types'
import { useData } from '../state/DataProvider'

export function Shopping() {
  const { shopping, staples, addShopping, updateShopping, removeShopping, clearChecked } = useData()
  const [text, setText] = useState('')
  const [stocking, setStocking] = useState<ShoppingItem | null>(null)
  const [detailed, setDetailed] = useState<ShoppingItem | null>(null)

  const open = useMemo(() => shopping.filter((r) => !r.checked).sort((a, b) => a.created_at.localeCompare(b.created_at)), [shopping])
  const done = useMemo(() => shopping.filter((r) => r.checked), [shopping])

  async function add(e: FormEvent) {
    e.preventDefault()
    const name = text.trim()
    if (!name) return
    const staple = staples.find((s) => s.name.toLowerCase() === name.toLowerCase())
    await addShopping({ name, category: staple?.category, unit: staple?.unit })
    setText('')
  }

  const missingStaples = useMemo(
    () => staples.filter((s) => !shopping.some((r) => r.name.toLowerCase() === s.name.toLowerCase())),
    [staples, shopping],
  )

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Need to Have</h1>
        <p className="text-sm text-slate-500">
          {open.length === 0 ? 'Nothing to buy' : `${open.length} to buy`}
          {done.length > 0 && ` · ${done.length} in the cart`}
        </p>
      </header>

      <form onSubmit={add} className="mb-4 flex gap-2">
        <input className={inputCls} placeholder="Add something to buy…" value={text} onChange={(e) => setText(e.target.value)} enterKeyHint="done" />
        <Button type="submit" disabled={!text.trim()} className="px-3" aria-label="Add">
          <Plus className="size-4" />
        </Button>
      </form>

      {open.length === 0 && done.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="size-7" />}
          title="List is empty"
          body="Items you mark as used up land here, and staples get added automatically when they run out."
        />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
          {open.map((r) => (
            <Row key={r.id} row={r} onToggle={() => updateShopping(r.id, { checked: true })} onOpen={() => setDetailed(r)} />
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <>
          <div className="mt-6 mb-2 flex items-baseline justify-between px-1">
            <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">In the cart</h2>
            <button onClick={clearChecked} className="text-xs font-medium text-slate-500 hover:text-red-600">
              Clear
            </button>
          </div>
          <p className="mb-2 px-1 text-xs text-slate-500">Tap "Stock it" to move an item into your fridge or pantry with a date.</p>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
            {done.map((r) => (
              <Row
                key={r.id}
                row={r}
                onToggle={() => updateShopping(r.id, { checked: false })}
                onOpen={() => setDetailed(r)}
                action={
                  <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setStocking(r)}>
                    Stock it
                  </Button>
                }
              />
            ))}
          </ul>
        </>
      )}

      {missingStaples.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 px-1 text-sm font-semibold tracking-wide text-slate-500 uppercase">Quick add from favorites</h2>
          <div className="flex flex-wrap gap-1.5">
            {missingStaples.map((s) => (
              <button
                key={s.id}
                onClick={() => addShopping({ name: s.name, category: s.category, unit: s.unit, quantity: s.target_quantity })}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {CATEGORY_EMOJI[s.category]} {s.name}
              </button>
            ))}
          </div>
        </>
      )}

      <ItemForm
        open={Boolean(stocking)}
        onClose={() => setStocking(null)}
        preset={stocking ? { name: stocking.name, quantity: stocking.quantity, unit: stocking.unit, category: stocking.category } : undefined}
        defaultLocation={guessLocation(stocking)}
        onSaved={() => {
          if (stocking) void removeShopping(stocking.id)
        }}
      />

      <Sheet open={Boolean(detailed)} onClose={() => setDetailed(null)} title={detailed?.name}>
        {detailed && (
          <div className="space-y-3 pb-2">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase">Qty</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  className={inputCls}
                  value={detailed.quantity}
                  onChange={(e) => {
                    const q = Number(e.target.value)
                    setDetailed({ ...detailed, quantity: q })
                    void updateShopping(detailed.id, { quantity: q })
                  }}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase">Unit</span>
                <input
                  className={inputCls}
                  value={detailed.unit}
                  onChange={(e) => {
                    setDetailed({ ...detailed, unit: e.target.value })
                    void updateShopping(detailed.id, { unit: e.target.value })
                  }}
                />
              </label>
            </div>
            <Button
              variant="danger"
              className="w-full"
              onClick={async () => {
                await removeShopping(detailed.id)
                setDetailed(null)
              }}
            >
              <Trash2 className="size-4" /> Remove from list
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}

function guessLocation(row: ShoppingItem | null): Location {
  if (!row) return 'fridge'
  if (row.category === 'frozen') return 'freezer'
  if (['grains', 'canned', 'snacks', 'spices', 'legumes', 'condiments', 'beverages'].includes(row.category)) return 'pantry'
  return 'fridge'
}

function Row({ row, onToggle, onOpen, action }: { row: ShoppingItem; onToggle: () => void; onOpen: () => void; action?: React.ReactNode }) {
  return (
    <li className={cx('flex items-center gap-3 px-3 py-2.5', row.checked && 'opacity-60')}>
      <button
        onClick={onToggle}
        className={cx(
          'grid size-6 shrink-0 place-items-center rounded-full border-2 transition',
          row.checked ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 dark:border-slate-600',
        )}
        aria-label={row.checked ? 'Uncheck' : 'Check'}
      >
        {row.checked && <Check className="size-3.5" strokeWidth={3} />}
      </button>
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className={cx('flex items-center gap-1.5 text-sm font-medium', row.checked && 'line-through')}>
          <span>{CATEGORY_EMOJI[row.category]}</span>
          <span className="truncate">{row.name}</span>
          {row.auto_added && <Sparkles className="size-3 text-amber-500" aria-label="Added automatically" />}
        </div>
        <div className="text-xs text-slate-500">
          {row.quantity} {row.unit}
          {row.auto_added && ' · staple ran out'}
        </div>
      </button>
      {action}
    </li>
  )
}
