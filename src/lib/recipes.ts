import { daysUntil } from './dates'
import { edgeJson, geminiJson, getLocalGeminiKey } from './scan'
import { cloudEnabled } from './supabase'
import type { Item } from './types'

export interface Recipe {
  title: string
  minutes: number
  uses: string[]
  missing: string[]
  steps: string[]
  why: string
}

export const RECIPES_SCHEMA = {
  type: 'OBJECT',
  properties: {
    recipes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          minutes: { type: 'INTEGER' },
          uses: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Inventory items this recipe uses, by name' },
          missing: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Common extras not in inventory, ideally none' },
          steps: { type: 'ARRAY', items: { type: 'STRING' }, description: '3-6 short steps' },
          why: { type: 'STRING', description: 'One sentence on why now, e.g. uses items expiring soon' },
        },
        required: ['title', 'minutes', 'uses', 'missing', 'steps', 'why'],
      },
    },
  },
  required: ['recipes'],
} as const

export function inventoryForPrompt(items: Item[]): string {
  return items
    .filter((i) => i.status === 'in_stock')
    .map((i) => {
      const d = daysUntil(i.expires_on)
      const when = d === null ? '' : d < 0 ? ' (expired)' : ` (expires in ${d}d)`
      return `- ${i.name}, ${i.quantity} ${i.unit}, ${i.location}${when}`
    })
    .join('\n')
}

export function recipesPrompt(inventory: string): string {
  return [
    'You are a practical home cook. Below is what is in my fridge, freezer and pantry.',
    'Suggest 4 realistic meals I can make mostly from these items, prioritizing anything expiring soonest.',
    'Assume I have salt, pepper, oil and water. Keep "missing" to at most 2 cheap staples per recipe, preferably none.',
    'Steps should be concise. Vary the meals (not four of the same thing).',
    '',
    'Inventory:',
    inventory || '- (empty)',
  ].join('\n')
}

const CACHE_KEY = 'fridge-pantry:recipes'
interface Cache {
  key: string
  at: number
  recipes: Recipe[]
}

export function cachedRecipes(items: Item[]): Recipe[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as Cache
    return c.key === inventoryForPrompt(items) && Date.now() - c.at < 1000 * 60 * 60 * 12 ? c.recipes : null
  } catch {
    return null
  }
}

export async function suggestRecipes(items: Item[]): Promise<Recipe[]> {
  const inventory = inventoryForPrompt(items)
  let out: { recipes: Recipe[] }
  if (cloudEnabled) {
    out = await edgeJson('suggest-recipes', { inventory })
  } else {
    const key = getLocalGeminiKey()
    if (!key) throw new Error('Add a Gemini API key in Settings to get recipe ideas')
    out = await geminiJson([{ text: recipesPrompt(inventory) }], RECIPES_SCHEMA, key)
  }
  const recipes = out.recipes ?? []
  localStorage.setItem(CACHE_KEY, JSON.stringify({ key: inventory, at: Date.now(), recipes } satisfies Cache))
  return recipes
}
