import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

const url = Deno.env.get('SUPABASE_URL')!
const anon = Deno.env.get('SUPABASE_ANON_KEY')!
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/** Client acting as the calling user (RLS applies). */
export function userClient(req: Request): SupabaseClient {
  return createClient(url, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  })
}

/** Privileged client for cron jobs and token-based feeds. */
export function adminClient(): SupabaseClient {
  return createClient(url, service, { auth: { persistSession: false } })
}

export async function requireUser(req: Request) {
  const sb = userClient(req)
  const { data, error } = await sb.auth.getUser()
  if (error || !data.user) throw new Response('Unauthorized', { status: 401 })
  return { sb, user: data.user }
}
