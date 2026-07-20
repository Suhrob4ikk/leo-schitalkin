import { chooseMessage } from './messages.js'

/*  Reminders, without a server.
 *
 *  What this can honestly do:
 *    · ask permission and remember the answer
 *    · register Periodic Background Sync, which lets Chrome on Android wake the
 *      service worker roughly daily and post a reminder while the app is closed
 *    · catch up on open: if a day was missed, say so the moment they return
 *    · fire a same-day nudge if the app is left in the background
 *
 *  What it cannot do: guarantee a notification lands while the app is fully
 *  closed. That needs a push server. Periodic Background Sync is best-effort by
 *  specification — the browser decides if and when to run it, requires the PWA
 *  to be installed, and iOS does not implement it at all.
 */

const STATE_CACHE = 'leo-reminder-state'
const STATE_KEY = '/__reminder-state'
const SYNC_TAG = 'leo-daily-reminder'

export const canNotify = () => typeof Notification !== 'undefined' && 'serviceWorker' in navigator

export const notifyPermission = () => (canNotify() ? Notification.permission : 'unsupported')

/** Asks the browser. Must be called from a real user gesture on iOS/Safari. */
export async function requestNotifications() {
  if (!canNotify()) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/** Registers the daily wake-up. Silently no-ops where unsupported. */
export async function registerDailySync() {
  try {
    const reg = await navigator.serviceWorker.ready
    if (!('periodicSync' in reg)) return false
    const status = await navigator.permissions?.query({ name: 'periodic-background-sync' })
    if (status && status.state !== 'granted') return false
    // 20h rather than 24: the browser treats this as a floor, and asking for a
    // full day means a reminder can slip to the day after.
    await reg.periodicSync.register(SYNC_TAG, { minInterval: 20 * 60 * 60 * 1000 })
    return true
  } catch {
    return false
  }
}

export async function unregisterDailySync() {
  try {
    const reg = await navigator.serviceWorker.ready
    await reg.periodicSync?.unregister(SYNC_TAG)
  } catch {
    /* nothing registered */
  }
}

/*  The service worker can't read localStorage, so the page mirrors the few
 *  fields a reminder needs into the Cache API, which both sides can reach. */
export async function syncStateToWorker({ enabled, lastPracticeDay, streak, buddyName }) {
  const payload = { enabled, lastPracticeDay, streak, buddyName }
  try {
    const cache = await caches.open(STATE_CACHE)
    const prev = await cache.match(STATE_KEY)
    const cur = prev ? await prev.json() : {}
    await cache.put(STATE_KEY, new Response(JSON.stringify({ ...cur, ...payload })))
  } catch {
    /* storage disabled */
  }
  try {
    const reg = await navigator.serviceWorker.ready
    reg.active?.postMessage({ type: 'reminder-state', payload })
  } catch {
    /* worker not ready yet — the cache write above is what matters */
  }
}

/** Asks the worker to consider posting a reminder right now. */
export async function checkReminderNow() {
  try {
    const reg = await navigator.serviceWorker.ready
    reg.active?.postMessage({ type: 'check-reminder' })
  } catch {
    /* ignore */
  }
}

/*  A same-day nudge while the app is merely backgrounded.
 *
 *  Deliberately conservative: it fires only if the tab is still alive at the
 *  chosen hour and nothing has been practised. Mobile browsers freeze
 *  background tabs, so this often won't run — which is fine, it is a bonus on
 *  top of the sync, not the mechanism.
 */
let pendingTimer = null

export function scheduleLocalNudge({ hour = 18, streak = 0, buddyName = 'Лео', practicedToday }) {
  clearTimeout(pendingTimer)
  if (!canNotify() || Notification.permission !== 'granted' || practicedToday) return

  const now = new Date()
  const at = new Date(now)
  at.setHours(hour, 0, 0, 0)
  if (at <= now) return // that hour has already passed today

  const ms = at - now
  // setTimeout beyond ~24 days overflows; irrelevant here but cheap to guard.
  if (ms > 20 * 60 * 60 * 1000) return

  pendingTimer = setTimeout(async () => {
    if (Notification.permission !== 'granted') return
    const { title, body } = chooseMessage({ daysAway: 0, streak, hour, name: buddyName })
    try {
      const reg = await navigator.serviceWorker.ready
      reg.showNotification(title, {
        body,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        tag: 'leo-daily',
        data: { url: './' },
      })
    } catch {
      /* ignore */
    }
  }, ms)
}

/** Fires one immediately, so the toggle proves itself. */
export async function sendTestNotification(buddyName = 'Лео') {
  if (!canNotify() || Notification.permission !== 'granted') return false
  try {
    const reg = await navigator.serviceWorker.ready
    await reg.showNotification('Напоминания включены! 🎉', {
      body: `${buddyName} будет звать тебя заниматься.`,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: 'leo-test',
      data: { url: './' },
    })
    return true
  } catch {
    return false
  }
}
