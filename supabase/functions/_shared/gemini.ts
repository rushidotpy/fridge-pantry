const API_KEY = Deno.env.get('GEMINI_API_KEY')
const MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash'

export type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } }

/** Call Gemini with a JSON response schema and parse the result. */
export async function geminiJson<T>(parts: GeminiPart[], schema: unknown, temperature = 0.2): Promise<T> {
  if (!API_KEY) throw new Error('GEMINI_API_KEY secret is not set')
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(API_KEY)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature, responseMimeType: 'application/json', responseSchema: schema },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
  const body = await res.json()
  const text: string | undefined = body?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini returned no content')
  return JSON.parse(text) as T
}
