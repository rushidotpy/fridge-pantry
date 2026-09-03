// Hourly cron target. For every user whose local time matches their digest hour,
// sends a push notification and/or email listing items expiring within alert_days.
// Also serves as the keep-alive that stops the free-tier project from pausing.
import * as webpush from 'jsr:@negrel/webpush@^0.5.0'
import { json } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabase.ts'

const CRON_SECRET = Deno.env.get('CRON_SECRET')
const VAPID_KEYS = Deno.env.get('VAPID_KEYS') // JSON: { publicKey: JWK, privateKey: JWK }
const CONTACT = Deno.env.get('VAPID_CONTACT') ?? 'mailto:admin@example.com'
const RESEND_KEY = Deno.env.get('RESEND_API_KEY')
const FROM = Deno.env.get('DIGEST_FROM') ?? 'Fridge & Pantry <onboarding@resend.dev>'
const APP_URL = Deno.env.get('APP_URL') ?? ''

interface Profile {
  user_id: string
  email: string | null
  email_digest: boolean
  push_digest: boolean
  digest_hour: number
  timezone: string
  alert_days: number
  last_digest_on: string | null
}
interface Item {
  name: string
  quantity: number
  unit: string
  location: string
  expires_on: string
}

function localParts(tz: string, now = new Date()): { hour: number; date: string } {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
    }).formatToParts(now)
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
    return { hour: Number(get('hour')) % 24, date: `${get('year')}-${get('month')}-${get('day')}` }
  } catch {
    return { hour: now.getUTCHours(), date: now.toISOString().slice(0, 10) }
  }
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

function describe(items: Item[], today: string) {
  const expired = items.filter((i) => i.expires_on < today)
  const todayList = items.filter((i) => i.expires_on === today)
  const soon = items.filter((i) => i.expires_on > today)
  const line = (i: Item) => `${i.name} (${i.location})`
  const chunks: string[] = []
  if (expired.length) chunks.push(`Expired: ${expired.map(line).join(', ')}`)
  if (todayList.length) chunks.push(`Today: ${todayList.map(line).join(', ')}`)
  if (soon.length) chunks.push(`Soon: ${soon.map((i) => `${line(i)} ${i.expires_on.slice(5)}`).join(', ')}`)
  const title =
    expired.length + todayList.length > 0
      ? `${expired.length + todayList.length} item${expired.length + todayList.length > 1 ? 's' : ''} need using today`
      : `${soon.length} item${soon.length > 1 ? 's' : ''} expiring soon`
  return { title, body: chunks.join(' · '), expired, todayList, soon }
}

async function sendPush(appServer: webpush.ApplicationServer, sb: ReturnType<typeof adminClient>, userId: string, payload: unknown) {
  const { data: subs } = await sb.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', userId)
  let sent = 0
  for (const s of subs ?? []) {
    try {
      const subscriber = appServer.subscribe({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } })
      await subscriber.pushTextMessage(JSON.stringify(payload), { ttl: 60 * 60 * 12 })
      sent++
    } catch (e) {
      // 404/410 mean the browser dropped the subscription; clean it up.
      const msg = String(e)
      if (/\b(404|410)\b/.test(msg)) await sb.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
      console.warn('push failed', s.endpoint.slice(0, 40), msg)
    }
  }
  return sent
}

async function sendEmail(to: string, subject: string, d: ReturnType<typeof describe>) {
  if (!RESEND_KEY) return false
  const section = (label: string, list: Item[]) =>
    list.length
      ? `<h3 style="margin:16px 0 6px;font-size:14px;color:#334155">${label}</h3><ul style="margin:0;padding-left:18px">${list
          .map((i) => `<li>${esc(i.name)} <span style="color:#64748b">· ${i.quantity} ${esc(i.unit)} · ${esc(i.location)} · ${i.expires_on}</span></li>`)
          .join('')}</ul>`
      : ''
  const html = `<div style="font-family:-apple-system,system-ui,sans-serif;max-width:520px;margin:auto;padding:20px;color:#0f172a">
    <h2 style="margin:0 0 4px;font-size:18px">${esc(d.title)}</h2>
    <p style="margin:0;color:#64748b;font-size:13px">From your fridge and pantry</p>
    ${section('Expired', d.expired)}${section('Use today', d.todayList)}${section('Expiring soon', d.soon)}
    ${APP_URL ? `<p style="margin-top:20px"><a href="${APP_URL}#/dates" style="background:#0f766e;color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;font-size:14px">Open Pantry</a></p>` : ''}
  </div>`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!res.ok) console.warn('email failed', res.status, await res.text())
  return res.ok
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

Deno.serve(async (req) => {
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) return json({ error: 'forbidden' }, 403)
  const force = new URL(req.url).searchParams.get('force') === '1'

  const sb = adminClient()
  const { data: profiles, error } = await sb.from('profiles').select('*')
  if (error) return json({ error: error.message }, 500)

  let appServer: webpush.ApplicationServer | null = null
  if (VAPID_KEYS) {
    const vapidKeys = await webpush.importVapidKeys(JSON.parse(VAPID_KEYS), { extractable: false })
    appServer = await webpush.ApplicationServer.new({ contactInformation: CONTACT, vapidKeys })
  }

  const report: Record<string, unknown>[] = []
  for (const p of (profiles ?? []) as Profile[]) {
    const { hour, date: today } = localParts(p.timezone)
    if (!force && (hour !== p.digest_hour || p.last_digest_on === today)) continue

    const { data: items } = await sb
      .from('items')
      .select('name, quantity, unit, location, expires_on')
      .eq('user_id', p.user_id)
      .eq('status', 'in_stock')
      .not('expires_on', 'is', null)
      .lte('expires_on', addDays(today, p.alert_days))
      .order('expires_on')

    const list = (items ?? []) as Item[]
    const entry: Record<string, unknown> = { user: p.user_id, items: list.length }
    if (list.length > 0) {
      const d = describe(list, today)
      if (p.push_digest && appServer) {
        entry.push = await sendPush(appServer, sb, p.user_id, { title: d.title, body: d.body, url: `${APP_URL}#/dates`, tag: 'expiry-digest' })
      }
      if (p.email_digest && p.email) entry.email = await sendEmail(p.email, d.title, d)
    }
    await sb.from('profiles').update({ last_digest_on: today }).eq('user_id', p.user_id)
    report.push(entry)
  }
  return json({ ok: true, ran_at: new Date().toISOString(), processed: report })
})
