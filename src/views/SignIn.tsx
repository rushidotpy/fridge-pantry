import { useEffect, useState, type FormEvent } from 'react'
import { Mail, Refrigerator } from 'lucide-react'
import { requestPersistentStorage } from '../lib/authStorage'
import { isIOS, isStandalone } from '../lib/push'
import { supabase } from '../lib/supabase'

const RESEND_SECONDS = 60

type Mode = 'password' | 'link' | 'paste'

export function SignIn() {
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const homeScreen = isIOS() && isStandalone()

  useEffect(() => {
    if (cooldown <= 0) return
    const t = window.setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [cooldown])

  function resetMessages() {
    setErr(null)
    setNotice(null)
  }

  async function sendMagicLink() {
    requestPersistentStorage()
    const { error } = await supabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL, shouldCreateUser: true },
    })
    if (error) throw error
    setCooldown(RESEND_SECONDS)
    setMode('paste')
    setNotice('Email sent. Long-press the Sign in link, copy it, and paste it below.')
  }

  async function onPassword(action: 'in' | 'up') {
    setBusy(true)
    resetMessages()
    requestPersistentStorage()
    try {
      const sb = supabase()
      const { error } =
        action === 'in'
          ? await sb.auth.signInWithPassword({ email, password })
          : await sb.auth.signUp({ email, password })
      if (error) throw error
      if (action === 'up') {
        const { data } = await sb.auth.getSession()
        if (!data.session) {
          setNotice('Account created. If you are not signed in yet, use “Email me a link” once, then set a password in Settings.')
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (/invalid login credentials/i.test(msg)) {
        setErr('Wrong email or password. If you have never set a password, create one with “Create account”, or use the email link once.')
      } else {
        setErr(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  async function onSendLink(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    resetMessages()
    try {
      await sendMagicLink()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function requestAgain() {
    if (cooldown > 0 || busy) return
    setBusy(true)
    resetMessages()
    try {
      await sendMagicLink()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function openPastedLink(e: FormEvent) {
    e.preventDefault()
    const url = link.trim()
    if (!/^https?:\/\//i.test(url)) {
      setErr('Paste the full Sign in link from the email.')
      return
    }
    requestPersistentStorage()
    window.location.assign(url)
  }

  const fieldCls =
    'w-full rounded-xl border-0 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:ring-slate-700'
  const primaryCls =
    'w-full rounded-xl bg-brand-700 px-4 py-3 font-medium text-white shadow-sm transition active:scale-[.98] disabled:opacity-60'
  const secondaryCls =
    'w-full rounded-xl bg-white px-4 py-3 font-medium text-brand-800 shadow-sm ring-1 ring-slate-200 transition active:scale-[.98] disabled:opacity-60 dark:bg-slate-900 dark:text-teal-200 dark:ring-slate-700'

  return (
    <div className="safe-top safe-bottom flex min-h-full flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-brand-700 text-white shadow-lg shadow-brand-700/30">
          <Refrigerator className="size-8" />
        </div>
        <h1 className="text-center text-2xl font-semibold tracking-tight">Fridge &amp; Pantry</h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          {homeScreen
            ? 'Use an email and password so this Home Screen app stays signed in. The email link opens Safari and does not count.'
            : 'Sign in with the same email on every device and the list stays in sync.'}
        </p>

        {mode === 'password' && (
          <form className="mt-8 space-y-3" onSubmit={(e) => { e.preventDefault(); void onPassword('in') }}>
            <input type="email" required autoFocus autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldCls} />
            <input type="password" required autoComplete="current-password" minLength={6} placeholder="Password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} className={fieldCls} />
            <button type="submit" disabled={busy} className={primaryCls}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <button type="button" disabled={busy} className={secondaryCls} onClick={() => void onPassword('up')}>
              Create account
            </button>
            {notice && <p className="text-center text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}
            {err && <p className="text-center text-sm text-red-600">{err}</p>}
            <button
              type="button"
              className="w-full text-center text-xs text-slate-500"
              onClick={() => {
                resetMessages()
                setMode('link')
              }}
            >
              Email me a link instead
            </button>
          </form>
        )}

        {mode === 'link' && (
          <form onSubmit={(e) => void onSendLink(e)} className="mt-8 space-y-3">
            <p className="text-center text-sm text-slate-500">
              The email only has a link — there is no code. After it arrives, come back here and paste the link.
            </p>
            <input type="email" required autoFocus autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldCls} />
            <button type="submit" disabled={busy} className={primaryCls}>
              {busy ? 'Sending…' : 'Send sign-in email'}
            </button>
            {err && <p className="text-center text-sm text-red-600">{err}</p>}
            <button type="button" className="w-full text-center text-xs text-slate-500" onClick={() => { resetMessages(); setMode('password') }}>
              Use a password instead
            </button>
          </form>
        )}

        {mode === 'paste' && (
          <div className="mt-8 space-y-4">
            <div className="rounded-2xl bg-emerald-50 p-5 text-center text-sm text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900">
              <Mail className="mx-auto mb-2 size-6" />
              Email sent to <strong>{email}</strong>.
              <p className="mt-2 text-emerald-900/80 dark:text-emerald-100/80">
                Do not tap the blue link — that opens Safari and this app stays logged out. Long-press <strong>Sign in</strong>, tap Copy, then paste it below.
              </p>
            </div>
            <form onSubmit={openPastedLink} className="space-y-3">
              <input
                type="url"
                required
                autoFocus
                inputMode="url"
                autoComplete="off"
                placeholder="Paste the Sign in link here"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className={fieldCls}
              />
              <button type="submit" disabled={busy} className={primaryCls}>
                Sign in with pasted link
              </button>
              <button type="button" disabled={busy || cooldown > 0} onClick={() => void requestAgain()} className={secondaryCls}>
                {cooldown > 0 ? `Request email again in ${cooldown}s` : 'Request email again'}
              </button>
              {notice && <p className="text-center text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}
              {err && <p className="text-center text-sm text-red-600">{err}</p>}
            </form>
            <button
              type="button"
              className="w-full text-center text-xs text-slate-500"
              onClick={() => {
                resetMessages()
                setLink('')
                setMode('password')
              }}
            >
              Use a password instead
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
