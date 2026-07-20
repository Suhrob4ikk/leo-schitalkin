/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { createHandlerBoundToURL } from 'workbox-precaching'
import { chooseMessage } from './game/messages.js'

/*  Custom service worker.
 *
 *  Written by hand instead of generated, because it does two things a generated
 *  one can't: wake up on Periodic Background Sync to post a reminder, and open
 *  the app when that reminder is tapped.
 *
 *  A service worker cannot read localStorage, where all the progress lives. So
 *  the page writes a small summary into the Cache API — readable from both
 *  sides — every time it starts or finishes a lesson. See game/notify.js.
 */

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

const STATE_CACHE = 'leo-reminder-state'
const STATE_KEY = '/__reminder-state'

async function readState() {
  try {
    const cache = await caches.open(STATE_CACHE)
    const res = await cache.match(STATE_KEY)
    return res ? await res.json() : null
  } catch {
    return null
  }
}

async function writeState(patch) {
  try {
    const cache = await caches.open(STATE_CACHE)
    const cur = (await readState()) ?? {}
    await cache.put(STATE_KEY, new Response(JSON.stringify({ ...cur, ...patch })))
  } catch {
    /* storage disabled — reminders simply won't fire */
  }
}

const dayKey = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const daysBetween = (a, b) => {
  if (!a || !b) return 99
  const [y1, m1, d1] = a.split('-').map(Number)
  const [y2, m2, d2] = b.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
}

/** Decides whether a reminder is due, and posts it. */
async function maybeRemind(reason) {
  const s = await readState()
  if (!s || !s.enabled) return

  const today = dayKey()
  // Already practised today: nothing to nag about.
  if (s.lastPracticeDay === today) return
  // One reminder per day, whatever wakes us.
  if (s.lastNotifiedDay === today) return

  const hour = new Date().getHours()
  // Never in the night or during school hours. A reminder at 3am is how an app
  // gets its notifications switched off for good.
  if (hour < 9 || hour >= 21) return

  const daysAway = daysBetween(s.lastPracticeDay, today)
  const { title, body } = chooseMessage({
    daysAway,
    streak: s.streak ?? 0,
    hour,
    name: s.buddyName ?? 'Лео',
  })

  await self.registration.showNotification(title, {
    body,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: 'leo-daily', // replaces rather than stacking
    renotify: false,
    requireInteraction: false,
    data: { url: './', reason },
  })

  await writeState({ lastNotifiedDay: today })
}

/*  Periodic Background Sync: the only way to wake a service worker on a
 *  schedule without a push server. Chrome/Android, installed PWA only, and the
 *  browser decides the actual timing — so this is best-effort by design. */
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'leo-daily-reminder') {
    event.waitUntil(maybeRemind('periodicsync'))
  }
})

// The page asks for a check whenever it starts, and pushes fresh state.
self.addEventListener('message', (event) => {
  const msg = event.data || {}
  if (msg.type === 'reminder-state') {
    event.waitUntil(writeState(msg.payload))
  }
  if (msg.type === 'check-reminder') {
    event.waitUntil(maybeRemind('message'))
  }
  if (msg.type === 'skip-waiting') self.skipWaiting()
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? './'
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      // Focus an open tab rather than piling up new ones.
      for (const c of all) {
        if ('focus' in c) return c.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })(),
  )
})

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
