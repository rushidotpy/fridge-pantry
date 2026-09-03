import { CalendarClock, Refrigerator, Settings, ShoppingCart, Sparkles } from 'lucide-react'
import { AuthGate } from './state/AuthGate'
import { useView, type View } from './lib/hash'
import { cx } from './components/ui'
import { Inventory } from './views/Inventory'
import { Shopping } from './views/Shopping'
import { GoodFoods } from './views/GoodFoods'
import { Expiry } from './views/Expiry'
import { SettingsView } from './views/Settings'
import { useData } from './state/DataProvider'

const NAV: { id: View; label: string; icon: typeof Refrigerator }[] = [
  { id: 'have', label: 'Have', icon: Refrigerator },
  { id: 'need', label: 'Need', icon: ShoppingCart },
  { id: 'good', label: 'Good', icon: Sparkles },
  { id: 'dates', label: 'Dates', icon: CalendarClock },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function App() {
  return (
    <AuthGate>
      <Shell />
    </AuthGate>
  )
}

function Shell() {
  const [view, setView] = useView()
  const { error } = useData()

  return (
    <div className="flex h-full min-h-dvh">
      <aside className="safe-top hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white/70 px-3 py-6 md:flex dark:border-slate-800 dark:bg-slate-900/60">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="grid size-8 place-items-center rounded-lg bg-brand-700 text-white">
            <Refrigerator className="size-4" />
          </div>
          <span className="font-semibold">Pantry</span>
        </div>
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => setView(n.id)}
            className={cx(
              'mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition',
              view === n.id
                ? 'bg-brand-700/10 text-brand-800 dark:bg-brand-700/20 dark:text-brand-100'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
          >
            <n.icon className="size-4" />
            {n.label}
          </button>
        ))}
      </aside>

      <main className="safe-top flex min-w-0 flex-1 flex-col">
        {error && (
          <div className="mx-4 mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-900">
            {error}
          </div>
        )}
        <div className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-28 md:pb-10">
          {view === 'have' && <Inventory />}
          {view === 'need' && <Shopping />}
          {view === 'good' && <GoodFoods />}
          {view === 'dates' && <Expiry />}
          {view === 'settings' && <SettingsView />}
        </div>
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/85 backdrop-blur-xl md:hidden dark:border-slate-800 dark:bg-slate-900/85">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={cx(
                'flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition',
                view === n.id ? 'text-brand-700 dark:text-brand-100' : 'text-slate-500',
              )}
            >
              <n.icon className={cx('size-5', view === n.id && 'scale-110')} strokeWidth={view === n.id ? 2.4 : 2} />
              {n.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
