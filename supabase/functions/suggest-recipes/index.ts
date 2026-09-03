// Suggests meals from the user's current inventory, favoring soon-to-expire items.
import { json, preflight } from '../_shared/cors.ts'
import { geminiJson } from '../_shared/gemini.ts'
import { requireUser } from '../_shared/supabase.ts'

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    recipes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          minutes: { type: 'INTEGER' },
          uses: { type: 'ARRAY', items: { type: 'STRING' } },
          missing: { type: 'ARRAY', items: { type: 'STRING' } },
          steps: { type: 'ARRAY', items: { type: 'STRING' } },
          why: { type: 'STRING' },
        },
        required: ['title', 'minutes', 'uses', 'missing', 'steps', 'why'],
      },
    },
  },
  required: ['recipes'],
}

Deno.serve(async (req) => {
  const pf = preflight(req)
  if (pf) return pf
  try {
    await requireUser(req)
    const { inventory } = await req.json()
    if (typeof inventory !== 'string') return json({ error: 'inventory is required' }, 400)
    const text = [
      'You are a practical home cook. Below is what is in my fridge, freezer and pantry.',
      'Suggest 4 realistic meals I can make mostly from these items, prioritizing anything expiring soonest.',
      'Assume I have salt, pepper, oil and water. Keep "missing" to at most 2 cheap staples per recipe, preferably none.',
      'Steps should be concise (3-6). Vary the meals.',
      '',
      'Inventory:',
      inventory.slice(0, 6000) || '- (empty)',
    ].join('\n')
    const result = await geminiJson([{ text }], SCHEMA, 0.4)
    return json(result)
  } catch (e) {
    if (e instanceof Response) return e
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
