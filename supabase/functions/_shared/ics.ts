// Mirrors src/lib/ics.ts so the feed and the local download produce identical calendars.

export interface IcsItem {
  id: string
  name: string
  quantity: number
  unit: string
  location: string
  expires_on: string | null
  date_kind: string | null
  notes: string | null
  status: string
}

export function buildIcs(items: IcsItem[], opts: { name?: string; alarmDaysBefore?: number } = {}): string {
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
    const kind = i.date_kind === 'best_before' ? 'Best before' : 'Use by'
    lines.push(
      'BEGIN:VEVENT',
      `UID:${i.id}@fridge-pantry`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d}`,
      `DTEND;VALUE=DATE:${addDay(i.expires_on)}`,
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
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10).replace(/-/g, '')
}

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function fold(line: string): string {
  if (line.length <= 75) return line
  const out: string[] = []
  for (let i = 0; i < line.length; i += 74) out.push((i === 0 ? '' : ' ') + line.slice(i, i + 74))
  return out.join('\r\n')
}
