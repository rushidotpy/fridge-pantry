import { supabase } from './supabase'

export interface Profile {
  user_id: string
  email: string | null
  calendar_token: string
  email_digest: boolean
  push_digest: boolean
  digest_hour: number
  timezone: string
  alert_days: number
}

export async function getProfile(): Promise<Profile> {
  const sb = supabase()
  const { data: auth } = await sb.auth.getUser()
  const uid = auth.user!.id
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const { data, error } = await sb.from('profiles').select('*').eq('user_id', uid).maybeSingle()
  if (error) throw error
  if (data) {
    // The signup trigger can't know the device timezone; adopt it on first load.
    if (data.timezone !== tz && tz) {
      await sb.from('profiles').update({ timezone: tz }).eq('user_id', uid)
      return { ...(data as Profile), timezone: tz }
    }
    return data as Profile
  }
  // Fallback for projects where the trigger hasn't run yet: create the row.
  const { data: created, error: e2 } = await sb
    .from('profiles')
    .insert({ user_id: uid, email: auth.user!.email, timezone: tz })
    .select()
    .single()
  if (e2) throw e2
  return created as Profile
}

export async function updateProfile(patch: Partial<Profile>): Promise<void> {
  const sb = supabase()
  const { data: auth } = await sb.auth.getUser()
  const { error } = await sb.from('profiles').update(patch).eq('user_id', auth.user!.id)
  if (error) throw error
}
