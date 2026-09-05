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

    const { data: sub } = sb.auth.onAuthStateChange((event, next) => {
      // A failed background refresh can emit TOKEN_REFRESHED with no session.
      // Don't bounce the Home Screen app to the login screen for that.
      if (event === 'TOKEN_REFRESHED' && !next) return
      setSession(next)
    })

    const restore = () => {
      void sb.auth.getSession().then(({ data }) => {
        if (data.session) setSession(data.session)
      })
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') restore()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pageshow', restore)

    return () => {
      sub.subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pageshow', restore)
    }
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
