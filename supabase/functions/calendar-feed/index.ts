// Live iCalendar feed for Apple Calendar. Authenticated by the per-user
// calendar_token (a UUID) instead of a JWT, since Calendar can't send headers.
import { buildIcs, type IcsItem } from '../_shared/ics.ts'
import { adminClient } from '../_shared/supabase.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get('token') ?? ''
  if (!UUID.test(token)) return new Response('Not found', { status: 404 })

  const sb = adminClient()
  const { data: profile } = await sb.from('profiles').select('user_id, alert_days').eq('calendar_token', token).maybeSingle()
  if (!profile) return new Response('Not found', { status: 404 })

  const { data: items, error } = await sb
    .from('items')
    .select('id, name, quantity, unit, location, expires_on, date_kind, notes, status')
    .eq('user_id', profile.user_id)
    .eq('status', 'in_stock')
    .not('expires_on', 'is', null)
  if (error) return new Response(error.message, { status: 500 })

  const ics = buildIcs((items ?? []) as IcsItem[], { alarmDaysBefore: profile.alert_days ?? 2 })
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="fridge-pantry.ics"',
      'Cache-Control': 'private, max-age=900',
    },
  })
})
