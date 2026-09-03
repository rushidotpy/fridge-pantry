import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CloudStore } from '../lib/store/cloud'
import { LocalStore } from '../lib/store/local'
import type { Store } from '../lib/store/types'
import {
  emptySnapshot,
  newId,
  nowIso,
  type Category,
  type Item,
  type Location,
  type ShoppingItem,
  type Snapshot,
  type Staple,
} from '../lib/types'

export type ItemInput = {
  name: string
  quantity?: number
  unit?: string
  location: Location
  category?: Category
  expires_on?: string | null
  date_kind?: Item['date_kind']
  opened_on?: string | null
  photo_url?: string | null
  notes?: string | null
}

interface DataContextValue extends Snapshot {
  mode: Store['mode']
  loading: boolean
  error: string | null
  refresh(): Promise<void>

  addItem(input: ItemInput): Promise<Item>
  updateItem(id: string, patch: Partial<Item>): Promise<void>
  removeItem(id: string): Promise<void>
  /** Mark an item used (or tossed). Optionally queue it on the shopping list. */
  finishItem(id: string, status: 'used' | 'tossed', addToShopping: boolean): Promise<void>
  restoreItem(id: string): Promise<void>
  uploadPhoto(blob: Blob, itemId: string): Promise<string>

  addStaple(input: Pick<Staple, 'name'> & Partial<Staple>): Promise<void>
  updateStaple(id: string, patch: Partial<Staple>): Promise<void>
  removeStaple(id: string): Promise<void>
  isStaple(name: string): Staple | undefined
  stapleInStockCount(name: string): number

  addShopping(input: Pick<ShoppingItem, 'name'> & Partial<ShoppingItem>): Promise<void>
  updateShopping(id: string, patch: Partial<ShoppingItem>): Promise<void>
  removeShopping(id: string): Promise<void>
  clearChecked(): Promise<void>
  /** Move a checked shopping row into inventory. */
  stockShopping(id: string, location: Location, expires_on?: string | null): Promise<Item>
}

const DataContext = createContext<DataContextValue | null>(null)

const norm = (s: string) => s.trim().toLowerCase()

export function DataProvider({ store, children }: { store: Store; children: ReactNode }) {
  const [snap, setSnap] = useState<Snapshot>(() =>
    store.mode === 'cloud' ? (CloudStore.cached() ?? emptySnapshot()) : emptySnapshot(),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const snapRef = useRef(snap)
  snapRef.current = snap

  const refresh = useCallback(async () => {
    try {
      const next = await store.load()
      setSnap(next)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [store])

  useEffect(() => {
    void refresh()
    let t: ReturnType<typeof setTimeout> | undefined
    const off = store.onRemoteChange(() => {
      clearTimeout(t)
      t = setTimeout(() => void refresh(), 150)
    })
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    return () => {
      off()
      clearTimeout(t)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
    }
  }, [store, refresh])

  /** Optimistically apply a change, then persist. Reload on failure. */
  const commit = useCallback(
    async (apply: (s: Snapshot) => Snapshot, persist: () => Promise<void>) => {
      setSnap((s) => apply(s))
      try {
        await persist()
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        await refresh()
        throw e
      }
    },
    [refresh],
  )

  const isStaple = useCallback(
    (name: string) => snapRef.current.staples.find((s) => norm(s.name) === norm(name)),
    [],
  )
  const stapleInStockCount = useCallback(
    (name: string) =>
      snapRef.current.items.filter((i) => i.status === 'in_stock' && norm(i.name) === norm(name)).length,
    [],
  )

  const addShopping = useCallback<DataContextValue['addShopping']>(
    async (input) => {
      const existing = snapRef.current.shopping.find((r) => norm(r.name) === norm(input.name) && !r.checked)
      if (existing) return
      const row: ShoppingItem = {
        id: newId(),
        name: input.name.trim(),
        quantity: input.quantity ?? 1,
        unit: input.unit ?? 'pcs',
        category: input.category ?? 'other',
        checked: false,
        auto_added: input.auto_added ?? false,
        created_at: nowIso(),
      }
      await commit((s) => ({ ...s, shopping: [...s.shopping, row] }), () => store.upsertShopping(row))
    },
    [commit, store],
  )

  /** If a staple has run out, queue it for shopping. */
  const reconcileStaple = useCallback(
    async (name: string) => {
      const staple = isStaple(name)
      if (!staple) return
      const inStock = snapRef.current.items.filter(
        (i) => i.status === 'in_stock' && norm(i.name) === norm(name),
      )
      const qty = inStock.reduce((n, i) => n + i.quantity, 0)
      if (qty < staple.target_quantity) {
        await addShopping({
          name: staple.name,
          quantity: Math.max(1, staple.target_quantity - qty),
          unit: staple.unit,
          category: staple.category,
          auto_added: true,
        })
      }
    },
    [addShopping, isStaple],
  )

  const addItem = useCallback<DataContextValue['addItem']>(
    async (input) => {
      const ts = nowIso()
      const item: Item = {
        id: newId(),
        name: input.name.trim(),
        quantity: input.quantity ?? 1,
        unit: input.unit ?? 'pcs',
        location: input.location,
        category: input.category ?? 'other',
        expires_on: input.expires_on ?? null,
        date_kind: input.date_kind ?? null,
        opened_on: input.opened_on ?? null,
        photo_url: input.photo_url ?? null,
        notes: input.notes ?? null,
        status: 'in_stock',
        created_at: ts,
        updated_at: ts,
      }
      await commit((s) => ({ ...s, items: [...s.items, item] }), () => store.upsertItem(item))
      return item
    },
    [commit, store],
  )

  const updateItem = useCallback<DataContextValue['updateItem']>(
    async (id, patch) => {
      const cur = snapRef.current.items.find((i) => i.id === id)
      if (!cur) return
      const next: Item = { ...cur, ...patch, updated_at: nowIso() }
      await commit(
        (s) => ({ ...s, items: s.items.map((i) => (i.id === id ? next : i)) }),
        () => store.upsertItem(next),
      )
    },
    [commit, store],
  )

  const removeItem = useCallback<DataContextValue['removeItem']>(
    async (id) => {
      await commit((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }), () => store.deleteItem(id))
    },
    [commit, store],
  )

  const finishItem = useCallback<DataContextValue['finishItem']>(
    async (id, status, addToShopping) => {
      const cur = snapRef.current.items.find((i) => i.id === id)
      if (!cur) return
      const next: Item = { ...cur, status, updated_at: nowIso() }
      await commit(
        (s) => ({ ...s, items: s.items.map((i) => (i.id === id ? next : i)) }),
        () => store.upsertItem(next),
      )
      if (addToShopping) {
        await addShopping({ name: cur.name, quantity: 1, unit: cur.unit, category: cur.category })
      } else {
        await reconcileStaple(cur.name)
      }
    },
    [addShopping, commit, reconcileStaple, store],
  )

  const restoreItem = useCallback<DataContextValue['restoreItem']>(
    async (id) => {
      const cur = snapRef.current.items.find((i) => i.id === id)
      if (!cur) return
      const next: Item = { ...cur, status: 'in_stock', quantity: Math.max(1, cur.quantity), updated_at: nowIso() }
      await commit(
        (s) => ({ ...s, items: s.items.map((i) => (i.id === id ? next : i)) }),
        () => store.upsertItem(next),
      )
    },
    [commit, store],
  )

  const uploadPhoto = useCallback<DataContextValue['uploadPhoto']>(
    (blob, itemId) => store.uploadPhoto(blob, itemId),
    [store],
  )

  const addStaple = useCallback<DataContextValue['addStaple']>(
    async (input) => {
      if (isStaple(input.name)) return
      const row: Staple = {
        id: newId(),
        name: input.name.trim(),
        category: input.category ?? 'other',
        target_quantity: input.target_quantity ?? 1,
        unit: input.unit ?? 'pcs',
        created_at: nowIso(),
      }
      await commit((s) => ({ ...s, staples: [...s.staples, row] }), () => store.upsertStaple(row))
      await reconcileStaple(row.name)
    },
    [commit, isStaple, reconcileStaple, store],
  )

  const updateStaple = useCallback<DataContextValue['updateStaple']>(
    async (id, patch) => {
      const cur = snapRef.current.staples.find((i) => i.id === id)
      if (!cur) return
      const next = { ...cur, ...patch }
      await commit(
        (s) => ({ ...s, staples: s.staples.map((i) => (i.id === id ? next : i)) }),
        () => store.upsertStaple(next),
      )
    },
    [commit, store],
  )

  const removeStaple = useCallback<DataContextValue['removeStaple']>(
    async (id) => {
      await commit((s) => ({ ...s, staples: s.staples.filter((i) => i.id !== id) }), () => store.deleteStaple(id))
    },
    [commit, store],
  )

  const updateShopping = useCallback<DataContextValue['updateShopping']>(
    async (id, patch) => {
      const cur = snapRef.current.shopping.find((i) => i.id === id)
      if (!cur) return
      const next = { ...cur, ...patch }
      await commit(
        (s) => ({ ...s, shopping: s.shopping.map((i) => (i.id === id ? next : i)) }),
        () => store.upsertShopping(next),
      )
    },
    [commit, store],
  )

  const removeShopping = useCallback<DataContextValue['removeShopping']>(
    async (id) => {
      await commit(
        (s) => ({ ...s, shopping: s.shopping.filter((i) => i.id !== id) }),
        () => store.deleteShopping(id),
      )
    },
    [commit, store],
  )

  const clearChecked = useCallback(async () => {
    const ids = snapRef.current.shopping.filter((r) => r.checked).map((r) => r.id)
    await commit(
      (s) => ({ ...s, shopping: s.shopping.filter((r) => !r.checked) }),
      async () => {
        await Promise.all(ids.map((id) => store.deleteShopping(id)))
      },
    )
  }, [commit, store])

  const stockShopping = useCallback<DataContextValue['stockShopping']>(
    async (id, location, expires_on = null) => {
      const row = snapRef.current.shopping.find((r) => r.id === id)
      if (!row) throw new Error('Shopping row not found')
      const item = await addItem({
        name: row.name,
        quantity: row.quantity,
        unit: row.unit,
        category: row.category,
        location,
        expires_on,
      })
      await removeShopping(id)
      return item
    },
    [addItem, removeShopping],
  )

  const value = useMemo<DataContextValue>(
    () => ({
      ...snap,
      mode: store.mode,
      loading,
      error,
      refresh,
      addItem,
      updateItem,
      removeItem,
      finishItem,
      restoreItem,
      uploadPhoto,
      addStaple,
      updateStaple,
      removeStaple,
      isStaple,
      stapleInStockCount,
      addShopping,
      updateShopping,
      removeShopping,
      clearChecked,
      stockShopping,
    }),
    [
      snap,
      store.mode,
      loading,
      error,
      refresh,
      addItem,
      updateItem,
      removeItem,
      finishItem,
      restoreItem,
      uploadPhoto,
      addStaple,
      updateStaple,
      removeStaple,
      isStaple,
      stapleInStockCount,
      addShopping,
      updateShopping,
      removeShopping,
      clearChecked,
      stockShopping,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}

export { LocalStore, CloudStore }
