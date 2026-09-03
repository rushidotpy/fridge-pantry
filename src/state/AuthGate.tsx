import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { cloudEnabled, supabase } from '../lib/supabase'
import { CloudStore, DataProvider, LocalStore } from './DataProvider'
import { SignIn } from '../views/SignIn'

/**
 * Picks the storage backend. With Supabase configured, requires a session and
 * uses CloudStore; otherwise falls back to browser-local storage.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(cloudEnabled ? undefined : null)

  useEffect(() => {
    if (!cloudEnabled) return
    const sb = supabase()
    sb.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const store = useMemo(() => {
    if (!cloudEnabled) return new LocalStore()
    return session ? new CloudStore(session.user.id) : null
  }, [session])

  if (cloudEnabled && session === undefined) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <span className="animate-pulse">Loading…</span>
      </div>
    )
  }
  if (cloudEnabled && !session) return <SignIn />
  return <DataProvider store={store!}>{children}</DataProvider>
}
