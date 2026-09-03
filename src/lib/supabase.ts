import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const cloudEnabled = Boolean(url && anon)

let client: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (!cloudEnabled) throw new Error('Supabase is not configured')
  if (!client) client = createClient(url!, anon!, { auth: { persistSession: true, autoRefreshToken: true } })
  return client
}

export function functionsUrl(name: string): string {
  return `${url!.replace(/\/$/, '')}/functions/v1/${name}`
}
