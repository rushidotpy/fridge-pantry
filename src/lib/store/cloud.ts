import { supabase } from '../supabase'
import type { Item, ShoppingItem, Snapshot, Staple } from '../types'
import type { Store } from './types'

const CACHE_KEY = 'fridge-pantry:cloud-cache'

/** Supabase-backed persistence with realtime change notifications. */
export class CloudStore implements Store {
  readonly mode = 'cloud' as const
  constructor(private userId: string) {}

  private cache(snap: Snapshot) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(snap))
    } catch {
      /* quota - ignore */
    }
  }

  static cached(): Snapshot | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      return raw ? (JSON.parse(raw) as Snapshot) : null
    } catch {
      return null
    }
  }

  async load(): Promise<Snapshot> {
    const sb = supabase()
    const [items, staples, shopping] = await Promise.all([
      sb.from('items').select('*').order('created_at'),
      sb.from('staples').select('*').order('created_at'),
      sb.from('shopping_list').select('*').order('created_at'),
    ])
    const err = items.error ?? staples.error ?? shopping.error
    if (err) throw err
    const snap: Snapshot = {
      items: (items.data ?? []) as Item[],
      staples: (staples.data ?? []) as Staple[],
      shopping: (shopping.data ?? []) as ShoppingItem[],
    }
    this.cache(snap)
    return snap
  }

  private withUser<T extends object>(row: T) {
    return { ...row, user_id: this.userId }
  }

  async upsertItem(item: Item) {
    const { error } = await supabase().from('items').upsert(this.withUser(item))
    if (error) throw error
  }
  async deleteItem(id: string) {
    const { error } = await supabase().from('items').delete().eq('id', id)
    if (error) throw error
  }
  async upsertStaple(staple: Staple) {
    const { error } = await supabase().from('staples').upsert(this.withUser(staple))
    if (error) throw error
  }
  async deleteStaple(id: string) {
    const { error } = await supabase().from('staples').delete().eq('id', id)
    if (error) throw error
  }
  async upsertShopping(row: ShoppingItem) {
    const { error } = await supabase().from('shopping_list').upsert(this.withUser(row))
    if (error) throw error
  }
  async deleteShopping(id: string) {
    const { error } = await supabase().from('shopping_list').delete().eq('id', id)
    if (error) throw error
  }

  async uploadPhoto(blob: Blob, itemId: string) {
    const path = `${this.userId}/${itemId}-${Date.now()}.jpg`
    const { error } = await supabase().storage.from('photos').upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: '31536000',
    })
    if (error) throw error
    return supabase().storage.from('photos').getPublicUrl(path).data.publicUrl
  }

  onRemoteChange(cb: () => void) {
    const channel = supabase()
      .channel(`inventory-${this.userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, cb)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staples' }, cb)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list' }, cb)
      .subscribe()
    return () => {
      void supabase().removeChannel(channel)
    }
  }
}
