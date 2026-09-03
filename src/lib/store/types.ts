import type { Item, ShoppingItem, Snapshot, Staple } from '../types'

export interface Store {
  readonly mode: 'local' | 'cloud'
  load(): Promise<Snapshot>
  upsertItem(item: Item): Promise<void>
  deleteItem(id: string): Promise<void>
  upsertStaple(staple: Staple): Promise<void>
  deleteStaple(id: string): Promise<void>
  upsertShopping(row: ShoppingItem): Promise<void>
  deleteShopping(id: string): Promise<void>
  /** Upload a photo and return a URL that can be stored on the item. */
  uploadPhoto(blob: Blob, itemId: string): Promise<string>
  /** Subscribe to changes made elsewhere (other device / tab). */
  onRemoteChange(cb: () => void): () => void
}
