import { History, Plus, Refrigerator, RotateCcw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ItemCard } from '../components/ItemCard'
import { ItemForm } from '../components/ItemForm'
import { Button, EmptyState, Segmented, Sheet, cx, inputCls } from '../components/ui'
import { daysUntil, expiryLevel } from '../lib/dates'
import { CATEGORY_EMOJI, LOCATIONS, type Item, type Location } from '../lib/types'
import { useData } from '../state/DataProvider'

type Sort = 'expiry' | 'name' | 'recent'

export function Inventory() {
  const { items, loading, restoreItem, removeItem } = useData()
  const [location, setLocation] = useState<Location>(() => (localStorage.getItem('fp:loc') as Location) || 'fridge')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('expiry')
  const [editing, setEditing] = useState<Item | null>(null)
  const [adding, setAdding] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const pick = (l: Location) => {
    setLocation(l)
    localStorage.setItem('fp:loc', l)
  }

  const inStock = useMemo(() => items.filter((i) => i.status === 'in_stock'), [items])
  const counts = useMemo(
    () => Object.fromEntries(LOCATIONS.map((l) => [l.id, inStock.filter((i) => i.location === l.id).length])),
    [inStock],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = inStock.filter((i) => (q ? i.name.toLowerCase().includes(q) || i.category.includes(q) : i.location === location))
    list = list.slice().sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'recent') return b.created_at.localeCompare(a.created_at)
      const da = daysUntil(a.expires_on) ?? 9999
      const db = daysUntil(b.expires_on) ?? 9999
      return da - db || a.name.localeCompare(b.name)
    })
    return list
  }, [inStock, location, query, sort])

  const grouped = useMemo(() => {
    if (sort !== 'expiry') return null
    const g: Record<string, Item[]> = {}
    for (const i of visible) (g[expiryLevel(i.expires_on)] ??= []).push(i)
    return g
  }, [visible, sort])

  const history = useMemo(
    () => items.filter((i) => i.status !== 'in_stock').sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 50),
    [items],
  )

  return (
    <div>
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">What I Have</h1>
          <p className="text-sm text-slate-500">{inStock.length} items in stock</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setHistoryOpen(true)} className="px-3" aria-label="History">
            <History className="size-4" />
          </Button>
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
      </header>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <input
          className={cx(inputCls, 'pl-9')}
          placeholder="Search everything…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!query && (
        <Segmented
          value={location}
          onChange={pick}
          options={LOCATIONS.map((l) => ({
            id: l.id,
            label: (
              <span>
                {l.label} <span className="text-slate-400">{counts[l.id]}</span>
              </span>
            ),
          }))}
        />
      )}

      <div className="mt-3 flex items-center justify-between px-1 text-xs text-slate-500">
        <span>{visible.length} shown</span>
        <div className="flex gap-1">
          {(['expiry', 'name', 'recent'] as Sort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={cx('rounded-md px-2 py-0.5 capitalize', sort === s ? 'bg-slate-200 font-medium text-slate-800 dark:bg-slate-700 dark:text-white' : '')}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="mt-3 grid gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Refrigerator className="size-7" />}
          title={query ? 'Nothing matches' : `Your ${location} is empty`}
          body={query ? 'Try a different search.' : 'Add what you have so you always know what to use first.'}
          action={
            !query && (
              <Button onClick={() => setAdding(true)}>
                <Plus className="size-4" /> Add to {location}
              </Button>
            )
          }
        />
      ) : grouped ? (
        <div className="mt-3 space-y-5">
          {(['expired', 'urgent', 'soon', 'ok', 'none'] as const).map((lvl) =>
            grouped[lvl]?.length ? (
              <section key={lvl}>
                <h3 className="mb-2 px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  {{ expired: 'Expired', urgent: 'Use in the next 3 days', soon: 'This week', ok: 'Good for a while', none: 'No date set' }[lvl]}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {grouped[lvl].map((i) => (
                    <ItemCard key={i.id} item={i} onEdit={setEditing} />
                  ))}
                </div>
              </section>
            ) : null,
          )}
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {visible.map((i) => (
            <ItemCard key={i.id} item={i} onEdit={setEditing} />
          ))}
        </div>
      )}

      <ItemForm open={adding} onClose={() => setAdding(false)} defaultLocation={location} />
      <ItemForm open={Boolean(editing)} onClose={() => setEditing(null)} item={editing} />

      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="Recently finished">
        {history.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Nothing finished yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 pb-2 dark:divide-slate-800">
            {history.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-2.5">
                <span className="text-xl">{CATEGORY_EMOJI[i.category]}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{i.name}</div>
                  <div className="text-xs text-slate-500">{i.status === 'tossed' ? 'Tossed' : 'Used up'} · {i.location}</div>
                </div>
                <button
                  onClick={() => restoreItem(i.id)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Restore"
                >
                  <RotateCcw className="size-4" />
                </button>
                <button
                  onClick={() => removeItem(i.id)}
                  className="rounded-lg p-2 text-xs text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </div>
  )
}
