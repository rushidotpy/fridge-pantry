import type { Item } from './types'

/**
 * Build an iCalendar feed with one all-day event per dated item and an alarm
 * `alarmDaysBefore` days ahead at 9am local. Mirrors supabase/functions/_shared/ics.ts.
 */
export function buildIcs(items: Item[], opts: { name?: string; alarmDaysBefore?: number } = {}): string {
  const { name = 'Fridge & Pantry', alarmDaysBefore = 2 } = opts
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//fridge-pantry//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(name)}`,
    'X-WR-CALDESC:Expiration dates from your fridge and pantry',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
  ]
  for (const i of items) {
    if (!i.expires_on || i.status !== 'in_stock') continue
    const d = i.expires_on.replace(/-/g, '')
    const next = addDay(i.expires_on)
    const kind = i.date_kind === 'best_before' ? 'Best before' : 'Use by'
    lines.push(
      'BEGIN:VEVENT',
      `UID:${i.id}@fridge-pantry`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d}`,
      `DTEND;VALUE=DATE:${next}`,
      `SUMMARY:${esc(`${i.name} expires`)}`,
      `DESCRIPTION:${esc(`${kind} ${i.expires_on}. ${i.quantity} ${i.unit} in the ${i.location}.${i.notes ? ` ${i.notes}` : ''}`)}`,
      `CATEGORIES:${esc(i.location)}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(`Use ${i.name} soon`)}`,
      `TRIGGER;VALUE=DURATION:-P${Math.max(0, alarmDaysBefore - 1)}DT15H`,
      'END:VALARM',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}

function addDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + 1))
  return dt.toISOString().slice(0, 10).replace(/-/g, '')
}

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function fold(line: string): string {
  if (line.length <= 75) return line
  const out: string[] = []
  let i = 0
  while (i < line.length) {
    out.push((i === 0 ? '' : ' ') + line.slice(i, i + 74))
    i += 74
  }
  return out.join('\r\n')
}

export function downloadIcs(items: Item[]) {
  const blob = new Blob([buildIcs(items)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'fridge-pantry.ics'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
