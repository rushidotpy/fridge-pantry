import { blobToBase64 } from './image'
import { cloudEnabled, functionsUrl, supabase } from './supabase'
import { CATEGORIES, type Category, type DateKind } from './types'

export interface ScanResult {
  name: string | null
  category: Category | null
  expires_on: string | null
  date_kind: DateKind | null
  raw_date_text: string | null
  confidence: 'high' | 'medium' | 'low'
  notes: string | null
}

const LOCAL_KEY = 'fridge-pantry:gemini-key'
export const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash'

export function getLocalGeminiKey(): string {
  return localStorage.getItem(LOCAL_KEY) ?? ''
}
export function setLocalGeminiKey(v: string) {
  if (v.trim()) localStorage.setItem(LOCAL_KEY, v.trim())
  else localStorage.removeItem(LOCAL_KEY)
}

/** Scanning works in cloud mode (key held server-side) or locally with a key you paste in Settings. */
export function canScan(): boolean {
  return cloudEnabled || Boolean(getLocalGeminiKey())
}

export const SCAN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING', nullable: true, description: 'Short product name, e.g. "Whole milk", "Greek yogurt"' },
    category: { type: 'STRING', nullable: true, enum: [...CATEGORIES] },
    expires_on: { type: 'STRING', nullable: true, description: 'Expiration date as YYYY-MM-DD' },
    date_kind: { type: 'STRING', nullable: true, enum: ['use_by', 'best_before'] },
    raw_date_text: { type: 'STRING', nullable: true, description: 'The date text exactly as printed' },
    confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
    notes: { type: 'STRING', nullable: true },
  },
  required: ['confidence'],
} as const

export function scanPrompt(todayIso: string): string {
  return [
    `Today is ${todayIso}. You are reading a photo of a food package or label.`,
    'Extract the product name, a category, and the expiration / use-by / best-before / sell-by date.',
    'Dates on packaging are often abbreviated (e.g. "SEP 12", "09/12/26", "12.09.2026", "BB 12SEP26", "EXP 0912").',
    'Resolve to a full YYYY-MM-DD. If the year is missing, pick the nearest future year that keeps the date within 24 months of today.',
    'For US products prefer MM/DD ordering unless the format is clearly DD.MM.YYYY.',
    'If words like "use by", "expires", "EXP" appear set date_kind to use_by; for "best before", "best by", "BB", "sell by" set best_before.',
    'If no date is visible, set expires_on to null and confidence to low.',
    'Return only JSON matching the schema.',
  ].join(' ')
}

export async function scanLabel(blob: Blob): Promise<ScanResult> {
  const base64 = await blobToBase64(blob)
  const today = new Date().toISOString().slice(0, 10)
  if (cloudEnabled) return normalize(await edgeJson('scan-label', { image: base64, mime: 'image/jpeg', today }))
  const key = getLocalGeminiKey()
  if (!key) throw new Error('Add a Gemini API key in Settings to scan labels')
  return normalize(
    await geminiJson(
      [{ text: scanPrompt(today) }, { inline_data: { mime_type: 'image/jpeg', data: base64 } }],
      SCAN_SCHEMA,
      key,
    ),
  )
}

/** Call a Supabase Edge Function with the signed-in user's token. */
export async function edgeJson<T = unknown>(name: string, body: unknown): Promise<T> {
  const { data } = await supabase().auth.getSession()
  const token = data.session?.access_token
  const res = await fetch(functionsUrl(name), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${name} failed (${res.status}): ${await res.text()}`)
  return (await res.json()) as T
}

type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } }

/** Direct browser call to Gemini with a JSON response schema (local mode only). */
export async function geminiJson<T = unknown>(
  parts: GeminiPart[],
  schema: unknown,
  apiKey: string,
  model = DEFAULT_GEMINI_MODEL,
): Promise<T> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: schema },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini error (${res.status}): ${await res.text()}`)
  const json = await res.json()
  const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned no result')
  return JSON.parse(text) as T
}

export function normalize(raw: Partial<ScanResult>): ScanResult {
  const cat = raw.category && (CATEGORIES as readonly string[]).includes(raw.category) ? raw.category : null
  const date = raw.expires_on && /^\d{4}-\d{2}-\d{2}$/.test(raw.expires_on) ? raw.expires_on : null
  return {
    name: raw.name?.trim() || null,
    category: cat,
    expires_on: date,
    date_kind: raw.date_kind === 'use_by' || raw.date_kind === 'best_before' ? raw.date_kind : null,
    raw_date_text: raw.raw_date_text ?? null,
    confidence: raw.confidence === 'high' || raw.confidence === 'medium' ? raw.confidence : 'low',
    notes: raw.notes ?? null,
  }
}
