/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    // Let the auth callback hit the network so ?code= / ?token= are not swallowed.
    denylist: [/[?&]code=/, /[?&]token=/],
  }),
)

registerRoute(
  ({ url }) => url.pathname.includes('/storage/v1/object/public/'),
  new CacheFirst({
    cacheName: 'photos',
    plugins: [new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 90 })],
  }),
)

interface PushPayload {
  title?: string
  body?: string
  url?: string
  tag?: string
}

self.addEventListener('push', (event) => {
  let data: PushPayload = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    data = { body: event.data?.text() }
  }
  // Safari revokes permission if a push arrives and nothing is shown.
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Fridge & Pantry', {
      body: data.body ?? 'Something is expiring soon.',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: data.tag ?? 'expiry-digest',
      data: { url: data.url ?? self.registration.scope + '#/dates' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url: string = event.notification.data?.url ?? self.registration.scope
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => 'focus' in c)
      if (existing) {
        existing.navigate?.(url)
        return existing.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})

self.skipWaiting()
clientsClaim()
