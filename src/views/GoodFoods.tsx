import { ChefHat, Clock, Leaf, Plus, RefreshCw, Sparkles, Star, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button, EmptyState, ExpiryChip, Segmented, cx, inputCls } from '../components/ui'
import { HEALTHY_FOODS, HEALTH_TAGS, type HealthTag, type HealthyFood } from '../data/healthyFoods'
import { daysUntil, expiryLevel, formatDate } from '../lib/dates'
import { cachedRecipes, suggestRecipes, type Recipe } from '../lib/recipes'
import { canScan } from '../lib/scan'
import { CATEGORY_EMOJI, type Item, type Staple } from '../lib/types'
import { useData } from '../state/DataProvider'

type Tab = 'fresh' | 'healthy' | 'favorites' | 'cook'

export function GoodFoods() {
  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem('fp:good') as Tab) || 'fresh')
  const pick = (t: Tab) => {
    setTab(t)
    localStorage.setItem('fp:good', t)
  }
  return (
    <div>
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Good Foods</h1>
        <p className="text-sm text-slate-500">What's fresh, what's worth stocking, and what to cook.</p>
      </header>
      <Segmented
        value={tab}
        onChange={pick}
        options={[
          { id: 'fresh', label: 'Fresh' },
          { id: 'healthy', label: 'Healthy' },
          { id: 'favorites', label: 'Favorites' },
          { id: 'cook', label: 'Cook' },
        ]}
      />
      <div className="mt-4">
        {tab === 'fresh' && <Fresh />}
        {tab === 'healthy' && <Healthy />}
        {tab === 'favorites' && <Favorites />}
        {tab === 'cook' && <CookNow />}
      </div>
    </div>
  )
}

/* ---------------- Fresh ---------------- */

function Fresh() {
  const { items } = useData()
  const fresh = useMemo(
    () =>
      items
        .filter((i) => i.status === 'in_stock' && (daysUntil(i.expires_on) ?? 0) > 3)
        .sort((a, b) => (daysUntil(b.expires_on) ?? 0) - (daysUntil(a.expires_on) ?? 0)),
    [items],
  )
  if (fresh.length === 0)
    return <EmptyState icon={<Leaf className="size-7" />} title="Nothing tracked as fresh yet" body="Items with more than 3 days left show up here, freshest first." />
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {fresh.map((i) => (
        <MiniItem key={i.id} item={i} />
      ))}
    </div>
  )
}

function MiniItem({ item }: { item: Item }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
      <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-xl dark:bg-slate-800">
        {item.photo_url ? <img src={item.photo_url} alt="" className="size-full object-cover" /> : CATEGORY_EMOJI[item.category]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{item.name}</div>
        <div className="text-xs text-slate-500">
          <span className="capitalize">{item.location}</span> · {item.quantity} {item.unit}
        </div>
      </div>
      <div className="text-right">
        <ExpiryChip date={item.expires_on} />
        {item.expires_on && <div className="mt-0.5 text-[11px] text-slate-400">{formatDate(item.expires_on)}</div>}
      </div>
    </div>
  )
}

/* ---------------- Healthy ---------------- */

const norm = (s: string) => s.trim().toLowerCase()

function Healthy() {
  const { items, addShopping, shopping } = useData()
  const [tag, setTag] = useState<HealthTag | 'all'>('all')
  const [showStocked, setShowStocked] = useState(false)

  const inStockNames = useMemo(
    () => new Set(items.filter((i) => i.status === 'in_stock').map((i) => norm(i.name))),
    [items],
  )
  const onList = useMemo(() => new Set(shopping.filter((r) => !r.checked).map((r) => norm(r.name))), [shopping])

  const has = (f: HealthyFood) =>
    [f.name, ...(f.aliases ?? [])].some((n) => {
      const k = norm(n)
      for (const s of inStockNames) if (s === k || s.includes(k) || k.includes(s)) return true
      return false
    })

  const list = HEALTHY_FOODS.filter((f) => tag === 'all' || f.tags.includes(tag))
  const stocked = list.filter(has)
  const gaps = list.filter((f) => !has(f))

  return (
    <div>
      <div className="no-scrollbar -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4">
        {(['all', ...HEALTH_TAGS] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTag(t)}
            className={cx(
              'shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize transition',
              tag === t ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 text-sm ring-1 ring-emerald-200 dark:bg-emerald-950 dark:ring-emerald-900">
        <div>
          <div className="font-medium text-emerald-900 dark:text-emerald-100">
            {stocked.length} of {list.length} stocked
          </div>
          <div className="text-xs text-emerald-700 dark:text-emerald-300">Nutrient-dense staples worth keeping around.</div>
        </div>
        <Leaf className="size-6 text-emerald-600" />
      </div>

      <h3 className="mb-2 px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Worth adding</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {gaps.map((f) => (
          <HealthyCard
            key={f.name}
            food={f}
            state={onList.has(norm(f.name)) ? 'listed' : 'gap'}
            onAdd={() => addShopping({ name: f.name, category: f.category })}
          />
        ))}
      </div>

      {stocked.length > 0 && (
        <>
          <button onClick={() => setShowStocked((s) => !s)} className="mt-5 mb-2 px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Already stocked ({stocked.length}) {showStocked ? '▾' : '▸'}
          </button>
          {showStocked && (
            <div className="grid gap-2 sm:grid-cols-2">
              {stocked.map((f) => (
                <HealthyCard key={f.name} food={f} state="stocked" />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function HealthyCard({ food, state, onAdd }: { food: HealthyFood; state: 'gap' | 'listed' | 'stocked'; onAdd?: () => void }) {
  return (
    <div className={cx('flex items-start gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800', state === 'stocked' && 'opacity-70')}>
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-xl dark:bg-slate-800">{CATEGORY_EMOJI[food.category]}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{food.name}</div>
        <p className="text-xs text-slate-500">{food.why}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {food.tags.map((t) => (
            <span key={t} className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              {t}
            </span>
          ))}
        </div>
      </div>
      {state === 'gap' && (
        <button onClick={onAdd} className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-700 text-white" aria-label="Add to shopping list">
          <Plus className="size-4" />
        </button>
      )}
      {state === 'listed' && <span className="shrink-0 text-[11px] font-medium text-slate-500">On list</span>}
      {state === 'stocked' && <span className="shrink-0 text-[11px] font-medium text-emerald-600">In stock</span>}
    </div>
  )
}

/* ---------------- Favorites ---------------- */

function Favorites() {
  const { staples, items, addStaple, updateStaple, removeStaple, addShopping, shopping } = useData()
  const [text, setText] = useState('')

  const stockOf = (s: Staple) =>
    items.filter((i) => i.status === 'in_stock' && norm(i.name) === norm(s.name)).reduce((n, i) => n + i.quantity, 0)
  const listed = (s: Staple) => shopping.some((r) => !r.checked && norm(r.name) === norm(s.name))

  return (
    <div>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!text.trim()) return
          await addStaple({ name: text })
          setText('')
        }}
        className="mb-3 flex gap-2"
      >
        <input className={inputCls} placeholder="Add a staple you always want…" value={text} onChange={(e) => setText(e.target.value)} />
        <Button type="submit" disabled={!text.trim()} className="px-3">
          <Plus className="size-4" />
        </Button>
      </form>
      <p className="mb-3 px-1 text-xs text-slate-500">When a favorite drops below its target, it lands on your shopping list automatically.</p>

      {staples.length === 0 ? (
        <EmptyState icon={<Star className="size-7" />} title="No favorites yet" body='Add staples here, or tick "Always keep stocked" when adding an item.' />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
          {staples
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((s) => {
              const have = stockOf(s)
              const low = have < s.target_quantity
              return (
                <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="text-xl">{CATEGORY_EMOJI[s.category]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.name}</div>
                    <div className={cx('text-xs', low ? 'text-orange-600' : 'text-slate-500')}>
                      {have} of {s.target_quantity} {s.unit}
                      {low && (listed(s) ? ' · on shopping list' : ' · running low')}
                    </div>
                  </div>
                  <label className="flex items-center gap-1 text-xs text-slate-500">
                    keep
                    <input
                      type="number"
                      min={1}
                      value={s.target_quantity}
                      onChange={(e) => updateStaple(s.id, { target_quantity: Math.max(1, Number(e.target.value)) })}
                      className="w-12 rounded-md bg-slate-100 px-1.5 py-1 text-center text-sm outline-none dark:bg-slate-800"
                    />
                  </label>
                  {low && !listed(s) && (
                    <button
                      onClick={() => addShopping({ name: s.name, category: s.category, unit: s.unit, quantity: s.target_quantity - have, auto_added: true })}
                      className="rounded-lg bg-brand-700/10 px-2 py-1 text-xs font-medium text-brand-800 dark:text-brand-100"
                    >
                      Buy
                    </button>
                  )}
                  <button onClick={() => removeStaple(s.id)} className="rounded-lg p-1.5 text-slate-400 hover:text-red-600" aria-label="Remove">
                    <Trash2 className="size-4" />
                  </button>
                </li>
              )
            })}
        </ul>
      )}
    </div>
  )
}

/* ---------------- Cook now ---------------- */

function CookNow() {
  const { items, addShopping } = useData()
  const inStock = useMemo(() => items.filter((i) => i.status === 'in_stock'), [items])
  const [recipes, setRecipes] = useState<Recipe[] | null>(() => cachedRecipes(items))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setRecipes(cachedRecipes(items))
  }, [items])

  async function run() {
    setBusy(true)
    setErr(null)
    try {
      setRecipes(await suggestRecipes(items))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const urgent = inStock.filter((i) => ['expired', 'urgent', 'soon'].includes(expiryLevel(i.expires_on)))

  if (inStock.length === 0)
    return <EmptyState icon={<ChefHat className="size-7" />} title="Add some food first" body="Recipe ideas are built from what you actually have." />

  return (
    <div>
      {urgent.length > 0 && (
        <div className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm ring-1 ring-amber-200 dark:bg-amber-950 dark:ring-amber-900">
          <div className="font-medium text-amber-900 dark:text-amber-100">Use soon</div>
          <div className="text-xs text-amber-800 dark:text-amber-200">{urgent.map((i) => i.name).join(', ')}</div>
        </div>
      )}

      {!canScan() && (
        <p className="mb-3 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Recipe ideas use Gemini. Add a free API key in Settings, or connect Supabase.
        </p>
      )}

      <Button onClick={run} disabled={busy || !canScan()} className="w-full">
        {busy ? <RefreshCw className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {recipes ? 'Refresh ideas' : `What can I make with ${inStock.length} items?`}
      </Button>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}

      {recipes && (
        <div className="mt-4 grid gap-3">
          {recipes.map((r, idx) => (
            <RecipeCard key={idx} recipe={r} onAddMissing={(n) => addShopping({ name: n })} />
          ))}
        </div>
      )}
    </div>
  )
}

function RecipeCard({ recipe, onAddMissing }: { recipe: Recipe; onAddMissing: (name: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="animate-fade-up rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">{recipe.title}</h3>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-500">
            <Clock className="size-3.5" /> {recipe.minutes} min
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">{recipe.why}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {recipe.uses.map((u) => (
            <span key={u} className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              {u}
            </span>
          ))}
          {recipe.missing.map((m) => (
            <span key={m} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800">
              + {m}
            </span>
          ))}
        </div>
      </button>
      {open && (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <ol className="list-decimal space-y-1.5 pl-5 text-sm">
            {recipe.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          {recipe.missing.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {recipe.missing.map((m) => (
                <button
                  key={m}
                  onClick={() => onAddMissing(m)}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  + Add {m} to list
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
