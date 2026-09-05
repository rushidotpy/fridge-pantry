import type { SupportedStorage } from '@supabase/supabase-js'

const DB = 'fridge-pantry-auth'
const STORE = 'kv'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbGet(key: string): Promise<string | null> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
        req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : null)
        req.onerror = () => reject(req.error)
      }),
  )
}

function idbSet(key: string, value: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).put(value, key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
  )
}

function idbRemove(key: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        tx.objectStore(STORE).delete(key)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
  )
}

/** Dual-write IndexedDB + localStorage. iOS Home Screen apps often evict localStorage. */
export const authStorage: SupportedStorage = {
  async getItem(key) {
    try {
      const fromIdb = await idbGet(key)
      if (fromIdb != null) return fromIdb
    } catch {
      /* fall through */
    }
    const fromLs = localStorage.getItem(key)
    if (fromLs != null) {
      void idbSet(key, fromLs).catch(() => undefined)
    }
    return fromLs
  },
  async setItem(key, value) {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* quota / private mode */
    }
    try {
      await idbSet(key, value)
    } catch {
      /* IndexedDB blocked */
    }
  },
  async removeItem(key) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
    try {
      await idbRemove(key)
    } catch {
      /* ignore */
    }
  },
}

/** Ask iOS/Safari not to evict this origin's data. May no-op without a user gesture. */
export function requestPersistentStorage(): void {
  void navigator.storage?.persist?.()
}
