import { AlertTriangle, ArrowUpDown, CalendarClock, CalendarPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ItemForm } from '../components/ItemForm'
import { EmptyState, ExpiryChip, cx } from '../components/ui'
import { daysUntil, expiryLevel, expiryLongLabel, formatDate, LEVEL_STYLES, LEVEL_TITLES, type ExpiryLevel } from '../lib/dates'
import { CATEGORY_EMOJI, type Item } from '../lib/types'
import { useData } from '../state/DataProvider'

type SortKey = 'date' | 'name' | 'location'

export function Expiry() {
  const { items } = useData()
  const [editing, setEditing] = useState<Item | null>(null)
  const [sort, setSort] = useState<SortKey>('date')
  const [dir, setDir] = useState<1 | -1>(1)

  const inStock = useMemo(() => items.filter((i) => i.status === 'in_stock'), [items])
  const dated = useMemo(() => inStock.filter((i) => i.expires_on), [inStock])
  const undated = useMemo(() => inStock.filter((i) => !i.expires_on), [inStock])

  const sorted = useMemo(
    () =>
      dated.slice().sort((a, b) => {
        let c = 0
        if (sort === 'date') c = (daysUntil(a.expires_on) ?? 0) - (daysUntil(b.expires_on) ?? 0)
        else if (sort === 'name') c = a.name.localeCompare(b.name)
        else c = a.location.localeCompare(b.location)
        return (c || a.name.localeCompare(b.name)) * dir
      }),
    [dated, sort, dir],
  )

  const urgent = useMemo(
    () => dated.filter((i) => ['expired', 'urgent'].includes(expiryLevel(i.expires_on))).sort((a, b) => (daysUntil(a.expires_on) ?? 0) - (daysUntil(b.expires_on) ?? 0)),
    [dated],
  )

  const counts = useMemo(() => {
    const c: Record<ExpiryLevel, number> = { expired: 0, urgent: 0, soon: 0, ok: 0, none: undated.length }
    for (const i of dated) c[expiryLevel(i.expires_on)]++
    return c
  }, [dated, undated])

  const toggleSort = (k: SortKey) => {
    if (sort === k) setDir((d) => (d === 1 ? -1 : 1))
    else {
      setSort(k)
      setDir(1)
    }
  }

  // Timeline grouping (mobile): by relative day bucket.
  const groups = useMemo(() => {
    const g = new Map<string, Item[]>()
    for (const i of sorted) {
      const d = daysUntil(i.expires_on)!
      const key =
        d < 0 ? 'Expired' : d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : d <= 7 ? 'This week' : d <= 30 ? 'This month' : d <= 90 ? 'Next 3 months' : 'Later'
      ;(g.get(key) ?? g.set(key, []).get(key)!).push(i)
    }
    return [...g.entries()]
  }, [sorted])

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Expiration Dates</h1>
        <p className="text-sm text-slate-500">{dated.length} dated items · {undated.length} without a date</p>
      </header>

      {/* Summary bands */}
      <div className="grid grid-cols-4 gap-2">
        {(['expired', 'urgent', 'soon', 'ok'] as ExpiryLevel[]).map((lvl) => (
          <div key={lvl} className={cx('rounded-xl px-2 py-2 text-center', LEVEL_STYLES[lvl].chip)}>
            <div className="text-lg font-semibold tabular-nums">{counts[lvl]}</div>
            <div className="text-[10px] font-medium uppercase opacity-80">{LEVEL_TITLES[lvl]}</div>
          </div>
        ))}
      </div>

      {/* Use these first */}
      {urgent.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold tracking-wide text-orange-700 uppercase dark:text-orange-300">
            <AlertTriangle className="size-3.5" /> Use these first
          </h2>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {urgent.map((i) => {
              const lvl = expiryLevel(i.expires_on)
              return (
                <button
                  key={i.id}
                  onClick={() => setEditing(i)}
                  className={cx('w-36 shrink-0 rounded-2xl bg-white p-3 text-left shadow-sm ring-2 dark:bg-slate-900', LEVEL_STYLES[lvl].ring)}
                >
                  <div className="grid size-12 place-items-center overflow-hidden rounded-xl bg-slate-100 text-2xl dark:bg-slate-800">
                    {i.photo_url ? <img src={i.photo_url} alt="" className="size-full object-cover" /> : CATEGORY_EMOJI[i.category]}
                  </div>
                  <div className="mt-2 truncate text-sm font-medium">{i.name}</div>
                  <div className={cx('text-xs font-medium', LEVEL_STYLES[lvl].text)}>{expiryLongLabel(i.expires_on)}</div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {dated.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="size-7" />}
          title="No dates yet"
          body="Add expiration dates to items (or scan a label) and they'll line up here, soonest first."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-5 hidden overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 md:block dark:bg-slate-900 dark:ring-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase dark:bg-slate-800/60">
                <tr>
                  <Th active={sort === 'name'} onClick={() => toggleSort('name')}>
                    Item
                  </Th>
                  <Th active={sort === 'location'} onClick={() => toggleSort('location')}>
                    Where
                  </Th>
                  <th className="px-4 py-2.5 font-semibold">Qty</th>
                  <Th active={sort === 'date'} onClick={() => toggleSort('date')}>
                    Expires
                  </Th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((i) => {
                  const lvl = expiryLevel(i.expires_on)
                  return (
                    <tr key={i.id} onClick={() => setEditing(i)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={cx('size-2 rounded-full', LEVEL_STYLES[lvl].dot)} />
                          <span>{CATEGORY_EMOJI[i.category]}</span>
                          <span className="font-medium">{i.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 capitalize text-slate-500">{i.location}</td>
                      <td className="px-4 py-2.5 tabular-nums text-slate-500">
                        {i.quantity} {i.unit}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {formatDate(i.expires_on, 'EEE, MMM d, yyyy')}
                        {i.date_kind && <span className="ml-1 text-xs text-slate-400">({i.date_kind === 'use_by' ? 'use by' : 'best before'})</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <ExpiryChip date={i.expires_on} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile timeline */}
          <div className="mt-5 md:hidden">
            {groups.map(([label, list]) => (
              <section key={label} className="mb-4">
                <h3 className="mb-1.5 px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</h3>
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
                  {list.map((i) => {
                    const lvl = expiryLevel(i.expires_on)
                    return (
                      <li key={i.id}>
                        <button onClick={() => setEditing(i)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
                          <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-slate-100 py-1 leading-none dark:bg-slate-800">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase">{formatDate(i.expires_on, 'MMM')}</span>
                            <span className="text-base font-semibold tabular-nums">{formatDate(i.expires_on, 'd')}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {CATEGORY_EMOJI[i.category]} {i.name}
                            </div>
                            <div className={cx('text-xs', LEVEL_STYLES[lvl].text)}>
                              {expiryLongLabel(i.expires_on)} · <span className="capitalize text-slate-500">{i.location}</span>
                            </div>
                          </div>
                          <ExpiryChip date={i.expires_on} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      {undated.length > 0 && (
        <section className="mt-4">
          <h3 className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <CalendarPlus className="size-3.5" /> Missing a date ({undated.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {undated.map((i) => (
              <button
                key={i.id}
                onClick={() => setEditing(i)}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {CATEGORY_EMOJI[i.category]} {i.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <ItemForm open={Boolean(editing)} onClose={() => setEditing(null)} item={editing} />
    </div>
  )
}

function Th({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <th className="px-4 py-2.5 font-semibold">
      <button onClick={onClick} className={cx('inline-flex items-center gap-1 uppercase', active && 'text-slate-900 dark:text-white')}>
        {children} <ArrowUpDown className="size-3" />
      </button>
    </th>
  )
}
