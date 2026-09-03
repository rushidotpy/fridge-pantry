// Reads a product name and expiration date off a label photo with Gemini.
// The API key lives in the GEMINI_API_KEY secret and never reaches the browser.
import { json, preflight } from '../_shared/cors.ts'
import { geminiJson } from '../_shared/gemini.ts'
import { requireUser } from '../_shared/supabase.ts'

const CATEGORIES = [
  'produce', 'dairy', 'eggs', 'meat', 'seafood', 'bakery', 'grains', 'legumes', 'canned',
  'condiments', 'snacks', 'beverages', 'frozen', 'leftovers', 'spices', 'other',
]

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING', nullable: true, description: 'Short product name, e.g. "Whole milk", "Greek yogurt"' },
    category: { type: 'STRING', nullable: true, enum: CATEGORIES },
    expires_on: { type: 'STRING', nullable: true, description: 'Expiration date as YYYY-MM-DD' },
    date_kind: { type: 'STRING', nullable: true, enum: ['use_by', 'best_before'] },
    raw_date_text: { type: 'STRING', nullable: true, description: 'The date text exactly as printed' },
    confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
    notes: { type: 'STRING', nullable: true },
  },
  required: ['confidence'],
}

function prompt(today: string): string {
  return [
    `Today is ${today}. You are reading a photo of a food package or label.`,
    'Extract the product name, a category, and the expiration / use-by / best-before / sell-by date.',
    'Dates on packaging are often abbreviated (e.g. "SEP 12", "09/12/26", "12.09.2026", "BB 12SEP26", "EXP 0912").',
    'Resolve to a full YYYY-MM-DD. If the year is missing, pick the nearest future year that keeps the date within 24 months of today.',
    'For US products prefer MM/DD ordering unless the format is clearly DD.MM.YYYY.',
    'If words like "use by", "expires", "EXP" appear set date_kind to use_by; for "best before", "best by", "BB", "sell by" set best_before.',
    'If no date is visible, set expires_on to null and confidence to low.',
    'Return only JSON matching the schema.',
  ].join(' ')
}

Deno.serve(async (req) => {
  const pf = preflight(req)
  if (pf) return pf
  try {
    await requireUser(req)
    const { image, mime = 'image/jpeg', today } = await req.json()
    if (typeof image !== 'string' || image.length < 100) return json({ error: 'image (base64) is required' }, 400)
    if (image.length > 8_000_000) return json({ error: 'image too large' }, 413)

    const result = await geminiJson(
      [{ text: prompt(today ?? new Date().toISOString().slice(0, 10)) }, { inline_data: { mime_type: mime, data: image } }],
      SCHEMA,
      0,
    )
    return json(result)
  } catch (e) {
    if (e instanceof Response) return e
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
