import { emptySnapshot, type Item, type ShoppingItem, type Snapshot, type Staple } from '../types'
import type { Store } from './types'

const KEY = 'fridge-pantry:v1'

function read(): Snapshot {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptySnapshot()
    const parsed = JSON.parse(raw) as Partial<Snapshot>
    return { ...emptySnapshot(), ...parsed }
  } catch {
    return emptySnapshot()
  }
}

function write(snap: Snapshot) {
  localStorage.setItem(KEY, JSON.stringify(snap))
}

function upsert<T extends { id: string }>(list: T[], row: T): T[] {
  const i = list.findIndex((r) => r.id === row.id)
  if (i === -1) return [...list, row]
  const next = list.slice()
  next[i] = row
  return next
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

/** Browser-only persistence. Used when Supabase is not configured. */
export class LocalStore implements Store {
  readonly mode = 'local' as const

  async load() {
    return read()
  }
  async upsertItem(item: Item) {
    const s = read()
    write({ ...s, items: upsert(s.items, item) })
  }
  async deleteItem(id: string) {
    const s = read()
    write({ ...s, items: s.items.filter((i) => i.id !== id) })
  }
  async upsertStaple(staple: Staple) {
    const s = read()
    write({ ...s, staples: upsert(s.staples, staple) })
  }
  async deleteStaple(id: string) {
    const s = read()
    write({ ...s, staples: s.staples.filter((i) => i.id !== id) })
  }
  async upsertShopping(row: ShoppingItem) {
    const s = read()
    write({ ...s, shopping: upsert(s.shopping, row) })
  }
  async deleteShopping(id: string) {
    const s = read()
    write({ ...s, shopping: s.shopping.filter((i) => i.id !== id) })
  }
  async uploadPhoto(blob: Blob) {
    return blobToDataUrl(blob)
  }
  onRemoteChange(cb: () => void) {
    const handler = (e: StorageEvent) => {
      if (e.key === KEY) cb()
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }
}
