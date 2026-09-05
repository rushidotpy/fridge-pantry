import { useEffect, useState, type FormEvent } from 'react'
import { Mail, Refrigerator } from 'lucide-react'
import { requestPersistentStorage } from '../lib/authStorage'
import { isIOS, isStandalone } from '../lib/push'
import { supabase } from '../lib/supabase'

const RESEND_SECONDS = 60

export function SignIn() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
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

  async function sendEmail() {
    requestPersistentStorage()
    const { error } = await supabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL, shouldCreateUser: true },
    })
    if (error) throw error
    setSent(true)
    setCooldown(RESEND_SECONDS)
    setNotice('A new email is on its way.')
  }

  async function sendLink(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    setNotice(null)
    try {
      await sendEmail()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function requestAgain() {
    if (cooldown > 0 || busy) return
    setBusy(true)
    setErr(null)
    setNotice(null)
    try {
      await sendEmail()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    setNotice(null)
    requestPersistentStorage()
    const token = code.replace(/\s/g, '')
    if (/^https?:\/\//i.test(token)) {
      // Opening the email link inside this app keeps the session here, not in Safari.
      window.location.assign(token)
      return
    }
    const { error } = await supabase().auth.verifyOtp({ email, token, type: 'email' })
    setBusy(false)
    if (error) setErr(error.message)
  }

  return (
    <div className="safe-top safe-bottom flex min-h-full flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-brand-700 text-white shadow-lg shadow-brand-700/30">
          <Refrigerator className="size-8" />
        </div>
        <h1 className="text-center text-2xl font-semibold tracking-tight">Fridge &amp; Pantry</h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          Sign in with your email. The same list shows on every device you sign into.
        </p>

        {sent ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-2xl bg-emerald-50 p-5 text-center text-sm text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900">
              <Mail className="mx-auto mb-2 size-6" />
              Check <strong>{email}</strong> for a sign-in email.
              {homeScreen ? (
                <p className="mt-2 text-emerald-900/80 dark:text-emerald-100/80">
                  On iPhone the link often opens Safari instead of this app. Type the 6-digit code, or long-press the link, copy it, and paste it below.
                </p>
              ) : (
                <p className="mt-2">Enter the 6-digit code from the email, or paste the sign-in link.</p>
              )}
            </div>
            <form onSubmit={verifyCode} className="space-y-3">
              <input
                type="text"
                inputMode="text"
                autoComplete="one-time-code"
                required
                autoFocus
                placeholder="6-digit code or paste the link"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border-0 bg-white px-4 py-3 text-center shadow-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:ring-slate-700"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-brand-700 px-4 py-3 font-medium text-white shadow-sm transition active:scale-[.98] disabled:opacity-60"
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
              <button
                type="button"
                disabled={busy || cooldown > 0}
                onClick={() => void requestAgain()}
                className="w-full rounded-xl bg-white px-4 py-3 font-medium text-brand-800 shadow-sm ring-1 ring-slate-200 transition active:scale-[.98] disabled:opacity-60 dark:bg-slate-900 dark:text-teal-200 dark:ring-slate-700"
              >
                {cooldown > 0 ? `Request code again in ${cooldown}s` : 'Request code again'}
              </button>
              {notice && <p className="text-center text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}
              {err && <p className="text-center text-sm text-red-600">{err}</p>}
            </form>
            <button
              type="button"
              className="w-full text-center text-xs text-slate-500"
              onClick={() => {
                setSent(false)
                setErr(null)
                setNotice(null)
                setCode('')
              }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={sendLink} className="mt-8 space-y-3">
            <input
              type="email"
              required
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border-0 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:ring-slate-700"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-brand-700 px-4 py-3 font-medium text-white shadow-sm transition active:scale-[.98] disabled:opacity-60"
            >
              {busy ? 'Sending…' : 'Send sign-in email'}
            </button>
            {err && <p className="text-center text-sm text-red-600">{err}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
