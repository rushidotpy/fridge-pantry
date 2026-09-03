import { Bell, CalendarPlus, Check, Cloud, CloudOff, Copy, Download, KeyRound, LogOut, Mail, Share, Smartphone, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, Field, cx, inputCls } from '../components/ui'
import { downloadIcs } from '../lib/ics'
import { getProfile, updateProfile, type Profile } from '../lib/profile'
import { currentSubscription, isIOS, isStandalone, pushSupport, subscribePush, unsubscribePush } from '../lib/push'
import { getLocalGeminiKey, setLocalGeminiKey } from '../lib/scan'
import { cloudEnabled, functionsUrl, supabase } from '../lib/supabase'
import type { Snapshot } from '../lib/types'
import { useData } from '../state/DataProvider'

export function SettingsView() {
  const data = useData()
  return (
    <div className="space-y-4">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500">{data.mode === 'cloud' ? 'Synced across your devices' : 'Stored in this browser only'}</p>
      </header>

      <SyncCard />
      <RemindersCard />
      <ScanCard />
      <InstallCard />
      <DataCard />
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="grid size-7 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{icon}</span>
        {title}
      </h2>
      <div className="space-y-3 text-sm">{children}</div>
    </section>
  )
}

function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label className={cx('flex items-center justify-between gap-3', disabled && 'opacity-50')}>
      <div>
        <div className="font-medium">{label}</div>
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700')}
      >
        <span className={cx('absolute top-0.5 size-6 rounded-full bg-white shadow transition', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </label>
  )
}

/* ---------------- Sync ---------------- */

function SyncCard() {
  const [email, setEmail] = useState<string | null>(null)
  useEffect(() => {
    if (cloudEnabled) supabase().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [])

  if (!cloudEnabled)
    return (
      <Card title="Sync" icon={<CloudOff className="size-4" />}>
        <p className="text-slate-600 dark:text-slate-300">
          This copy runs in <strong>local mode</strong>: your list lives in this browser and won't appear on other devices.
        </p>
        <p className="text-xs text-slate-500">
          To sync your Mac and iPhone, connect a free Supabase project and redeploy. The README walks through it in a few minutes.
        </p>
      </Card>
    )

  return (
    <Card title="Sync" icon={<Cloud className="size-4" />}>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Signed in</div>
          <div className="text-xs text-slate-500">{email}</div>
        </div>
        <Button variant="secondary" onClick={() => supabase().auth.signOut()}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
      <p className="text-xs text-slate-500">Sign in with the same email on every device and the list stays in sync in real time.</p>
    </Card>
  )
}

/* ---------------- Reminders ---------------- */

function RemindersCard() {
  const { items } = useData()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [pushOn, setPushOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const support = pushSupport()

  useEffect(() => {
    if (!cloudEnabled) return
    getProfile().then(setProfile).catch((e) => setMsg(String(e.message ?? e)))
    currentSubscription().then((s) => setPushOn(Boolean(s)))
  }, [])

  const patch = async (p: Partial<Profile>) => {
    if (!profile) return
    setProfile({ ...profile, ...p })
    await updateProfile(p)
  }

  const calendarUrl = profile ? `${functionsUrl('calendar-feed')}?token=${profile.calendar_token}` : null
  const webcal = calendarUrl?.replace(/^https?:\/\//, 'webcal://')

  async function togglePush(v: boolean) {
    setBusy(true)
    setMsg(null)
    try {
      if (v) await subscribePush()
      else await unsubscribePush()
      setPushOn(v)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Expiry reminders" icon={<Bell className="size-4" />}>
      {/* Calendar */}
      <div>
        <div className="font-medium">Apple Calendar</div>
        {cloudEnabled ? (
          <>
            <p className="mb-2 text-xs text-slate-500">
              Subscribe once on your Mac; iCloud pushes it to your iPhone. Each item becomes an all-day event with an alert{' '}
              {profile?.alert_days ?? 2} days before, and the feed updates itself.
            </p>
            {webcal && (
              <div className="flex gap-2">
                <a href={webcal} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-medium text-white">
                  <CalendarPlus className="size-4" /> Subscribe in Calendar
                </a>
                <Button
                  variant="secondary"
                  className="px-3"
                  onClick={async () => {
                    await navigator.clipboard.writeText(webcal)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1500)
                  }}
                  aria-label="Copy feed URL"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-slate-400">If the button does nothing, copy the link and use Calendar → File → New Calendar Subscription.</p>
          </>
        ) : (
          <>
            <p className="mb-2 text-xs text-slate-500">Download a calendar file with every dated item and a 2-day-ahead alert. Re-download after big changes.</p>
            <Button variant="secondary" onClick={() => downloadIcs(items)}>
              <Download className="size-4" /> Download .ics
            </Button>
          </>
        )}
      </div>

      <hr className="border-slate-100 dark:border-slate-800" />

      {/* Push */}
      <div>
        <Toggle
          label="Push notifications"
          hint={
            support === 'ready'
              ? 'A daily heads-up on this device when something is close to expiring.'
              : support === 'needs-install'
                ? 'On iPhone, add this app to your Home Screen first (Share → Add to Home Screen), then open it from there.'
                : support === 'unsupported'
                  ? 'This browser does not support web push.'
                  : 'Available once Supabase and push keys are configured.'
          }
          checked={pushOn}
          onChange={togglePush}
          disabled={support !== 'ready' || busy}
        />
      </div>

      {cloudEnabled && profile && (
        <>
          <hr className="border-slate-100 dark:border-slate-800" />
          <Toggle
            label="Daily email"
            hint={`A short digest to ${profile.email ?? 'your email'} on days when something needs using.`}
            checked={profile.email_digest}
            onChange={(v) => patch({ email_digest: v })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Send at">
              <select className={inputCls} value={profile.digest_hour} onChange={(e) => patch({ digest_hour: Number(e.target.value) })}>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {h === 0 ? '12 am' : h < 12 ? `${h} am` : h === 12 ? '12 pm' : `${h - 12} pm`}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Warn me">
              <select className={inputCls} value={profile.alert_days} onChange={(e) => patch({ alert_days: Number(e.target.value) })}>
                {[1, 2, 3, 5, 7].map((d) => (
                  <option key={d} value={d}>
                    {d} day{d > 1 && 's'} before
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p className="text-[11px] text-slate-400">Timezone: {profile.timezone}</p>
        </>
      )}
      {msg && <p className="text-xs text-red-600">{msg}</p>}
    </Card>
  )
}

/* ---------------- Scan ---------------- */

function ScanCard() {
  const [key, setKey] = useState(getLocalGeminiKey())
  const [saved, setSaved] = useState(false)
  if (cloudEnabled)
    return (
      <Card title="Label scanning" icon={<KeyRound className="size-4" />}>
        <p className="text-slate-600 dark:text-slate-300">Photos are read by Gemini through your Supabase project. The API key never leaves the server.</p>
      </Card>
    )
  return (
    <Card title="Label scanning" icon={<KeyRound className="size-4" />}>
      <p className="text-xs text-slate-500">
        Paste a free Gemini API key from{' '}
        <a className="text-brand-700 underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
          Google AI Studio
        </a>{' '}
        to read expiration dates from photos and get recipe ideas. It is stored only in this browser.
      </p>
      <div className="flex gap-2">
        <input className={inputCls} type="password" placeholder="AIza…" value={key} onChange={(e) => setKey(e.target.value)} />
        <Button
          onClick={() => {
            setLocalGeminiKey(key)
            setSaved(true)
            setTimeout(() => setSaved(false), 1500)
          }}
        >
          {saved ? <Check className="size-4" /> : 'Save'}
        </Button>
      </div>
    </Card>
  )
}

/* ---------------- Install ---------------- */

function InstallCard() {
  if (isStandalone())
    return (
      <Card title="Installed" icon={<Smartphone className="size-4" />}>
        <p className="text-slate-600 dark:text-slate-300">You're running the installed app. Nice.</p>
      </Card>
    )
  return (
    <Card title="Add to your Home Screen or Dock" icon={<Smartphone className="size-4" />}>
      {isIOS() ? (
        <ol className="list-decimal space-y-1 pl-5 text-slate-600 dark:text-slate-300">
          <li>
            Tap the <Share className="inline size-4 align-text-bottom" /> Share button in Safari.
          </li>
          <li>Choose “Add to Home Screen”.</li>
          <li>Open it from the icon: it runs full screen and can send notifications.</li>
        </ol>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-300">
          <li>
            <strong>Safari:</strong> File → Add to Dock.
          </li>
          <li>
            <strong>Chrome / Edge:</strong> click the install icon in the address bar.
          </li>
          <li>
            <strong>iPhone:</strong> open this URL in Safari, then Share → Add to Home Screen.
          </li>
        </ul>
      )}
    </Card>
  )
}

/* ---------------- Data ---------------- */

function DataCard() {
  const data = useData()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)

  function exportJson() {
    const snap: Snapshot = { items: data.items, staples: data.staples, shopping: data.shopping }
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `fridge-pantry-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }

  async function importJson(file?: File) {
    if (!file) return
    try {
      const snap = JSON.parse(await file.text()) as Partial<Snapshot>
      let n = 0
      for (const i of snap.items ?? []) {
        await data.addItem({ ...i })
        n++
      }
      for (const s of snap.staples ?? []) await data.addStaple(s)
      for (const r of snap.shopping ?? []) await data.addShopping(r)
      setMsg(`Imported ${n} items.`)
    } catch (e) {
      setMsg(`Import failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <Card title="Your data" icon={<Mail className="size-4" />}>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={exportJson}>
          <Download className="size-4" /> Export JSON
        </Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          <Upload className="size-4" /> Import JSON
        </Button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => importJson(e.target.files?.[0])} />
      </div>
      <p className="text-xs text-slate-500">
        {data.items.length} items · {data.staples.length} favorites · {data.shopping.length} on the list. Export before switching from local to synced mode to carry your data over.
      </p>
      {msg && <p className="text-xs text-slate-600">{msg}</p>}
    </Card>
  )
}
