export type Location = 'fridge' | 'freezer' | 'pantry'
export type ItemStatus = 'in_stock' | 'used' | 'tossed'
export type DateKind = 'use_by' | 'best_before'

export const LOCATIONS: { id: Location; label: string }[] = [
  { id: 'fridge', label: 'Fridge' },
  { id: 'freezer', label: 'Freezer' },
  { id: 'pantry', label: 'Pantry' },
]

export const CATEGORIES = [
  'produce',
  'dairy',
  'eggs',
  'meat',
  'seafood',
  'bakery',
  'grains',
  'legumes',
  'canned',
  'condiments',
  'snacks',
  'beverages',
  'frozen',
  'leftovers',
  'spices',
  'other',
] as const
export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_EMOJI: Record<Category, string> = {
  produce: '🥬',
  dairy: '🥛',
  eggs: '🥚',
  meat: '🥩',
  seafood: '🐟',
  bakery: '🍞',
  grains: '🌾',
  legumes: '🫘',
  canned: '🥫',
  condiments: '🫙',
  snacks: '🍿',
  beverages: '🧃',
  frozen: '🧊',
  leftovers: '🍱',
  spices: '🧂',
  other: '🛒',
}

export const UNITS = ['pcs', 'pack', 'lb', 'oz', 'kg', 'g', 'L', 'ml', 'cup', 'bunch', 'dozen', 'can', 'jar', 'bag', 'box', 'bottle'] as const

export interface Item {
  id: string
  name: string
  quantity: number
  unit: string
  location: Location
  category: Category
  expires_on: string | null
  date_kind: DateKind | null
  opened_on: string | null
  photo_url: string | null
  notes: string | null
  status: ItemStatus
  created_at: string
  updated_at: string
}

export interface Staple {
  id: string
  name: string
  category: Category
  target_quantity: number
  unit: string
  created_at: string
}

export interface ShoppingItem {
  id: string
  name: string
  quantity: number
  unit: string
  category: Category
  checked: boolean
  auto_added: boolean
  created_at: string
}

export interface Snapshot {
  items: Item[]
  staples: Staple[]
  shopping: ShoppingItem[]
}

export const emptySnapshot = (): Snapshot => ({ items: [], staples: [], shopping: [] })

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function nowIso(): string {
  return new Date().toISOString()
}
