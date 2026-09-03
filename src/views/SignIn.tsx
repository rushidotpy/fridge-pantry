import { useState, type FormEvent } from 'react'
import { Mail, Refrigerator } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function SignIn() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr(null)
    const { error } = await supabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    setBusy(false)
    if (error) setErr(error.message)
    else setSent(true)
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
          <div className="mt-8 rounded-2xl bg-emerald-50 p-5 text-center text-sm text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900">
            <Mail className="mx-auto mb-2 size-6" />
            Check <strong>{email}</strong> for a sign-in link. Open it on this device.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-3">
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
              {busy ? 'Sending…' : 'Send sign-in link'}
            </button>
            {err && <p className="text-center text-sm text-red-600">{err}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
