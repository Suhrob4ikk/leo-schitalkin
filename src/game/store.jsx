import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { setMuted, unlockAudio, stopSpeaking } from './audio.js'
import { canNotify, syncStateToWorker, checkReminderNow, scheduleLocalNudge } from './notify.js'

/* Kept here rather than imported from Cub.jsx: the store must not depend on a
   component, and a reminder only needs the name. */
const BUDDY_NAMES = { fox: 'Лео', leopard: 'Пятныш', tiger: 'Тиг' }

const KEY = 'leo-schitalkin/v1'
const VERSION = 1

/* ── Dates ─────────────────────────────────────────────────────────────────
   Always local wall-clock, never UTC — a child's "today" is the day on the
   kitchen clock, and a UTC rollover would silently break a streak at bedtime. */
export function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function shiftDay(key, delta) {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d + delta)
  return dayKey(dt)
}

export function lastNDays(n) {
  const out = []
  let k = dayKey()
  for (let i = 0; i < n; i++) {
    out.unshift(k)
    k = shiftDay(k, -1)
  }
  return out
}

/* ── Shape ─────────────────────────────────────────────────────────────── */
const initial = () => ({
  version: VERSION,
  xp: 0,
  /* lessonId -> { done, stars, best, plays, perfect, lastPlayed } */
  lessons: {},
  /* topic -> { correct, total } — powers the tutor's "struggling" flags */
  topics: {},
  /* "7x8" -> { correct, total } — powers weakness-weighted mixed practice */
  facts: {},
  /* "YYYY-MM-DD" -> { seconds, xp, correct, total } */
  days: {},
  streak: { current: 0, longest: 0, lastDay: null },
  /* Correct-in-a-row, carried across lessons and sessions rather than reset at
     every finish line. A run of 20 spanning three lessons is a real
     achievement; the same 20 chopped into per-lesson counters is three
     forgettable fives. */
  combo: 0,
  bestCombo: 0,
  stickers: [],
  sessions: [],
  // buddy: null means "hasn't chosen yet" and triggers the picker on first run.
  // notify defaults to false: a permission prompt on first launch, before the
  // child has any reason to want reminders, is how permission gets denied
  // permanently. It's offered after the first finished lesson instead.
  settings: { sound: true, voice: true, textScale: 1, buddy: null, notify: false, notifyHour: 18 },
  createdAt: new Date().toISOString(),
})

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initial()
    const saved = JSON.parse(raw)
    if (saved.version !== VERSION) return initial()
    // Merge over defaults so a field added in a later build can't crash an old save.
    return {
      ...initial(),
      ...saved,
      settings: { ...initial().settings, ...(saved.settings || {}) },
      streak: { ...initial().streak, ...(saved.streak || {}) },
    }
  } catch {
    return initial()
  }
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* Private mode or a full quota: the app must keep working, just forgetfully. */
  }
}

/* ── Helpers ───────────────────────────────────────────────────────────── */
export function starsFor(accuracy) {
  if (accuracy >= 0.9) return 3
  if (accuracy >= 0.7) return 2
  return 1
}

/** Stars for a passed test-out exam, by mistakes spent. Deliberately stricter
    than a lesson's accuracy scale: one exam awards stars across a whole unit,
    so a flawless run is what it takes to claim three. Three mistakes is a
    fail, so this only ever sees 0–2. */
export function examStars(mistakes) {
  if (mistakes <= 0) return 3
  if (mistakes === 1) return 2
  return 1
}

/** Bonus XP scales with the stars earned, for the same reason. */
export const EXAM_XP = { 3: 80, 2: 55, 1: 35 }

const bump = (rec = { correct: 0, total: 0 }, correct) => ({
  correct: rec.correct + (correct ? 1 : 0),
  total: rec.total + 1,
})

function touchDay(days, patch) {
  const k = dayKey()
  const cur = days[k] || { seconds: 0, xp: 0, correct: 0, total: 0 }
  return { ...days, [k]: { ...cur, ...patch(cur) } }
}

function advanceStreak(streak) {
  const today = dayKey()
  if (streak.lastDay === today) return streak
  const continued = streak.lastDay === shiftDay(today, -1)
  const current = continued ? streak.current + 1 : 1
  return { current, longest: Math.max(current, streak.longest), lastDay: today }
}

/* ── Reducer ───────────────────────────────────────────────────────────── */
function reducer(state, action) {
  switch (action.type) {
    /* One graded answer. `firstTry` is what accuracy and stars are scored on —
       a correct retry still counts as correct for XP, just not for mastery. */
    case 'answer': {
      const { topic, fact, correct, firstTry } = action
      const gain = correct ? (firstTry ? 4 : 2) : 0
      // Only a clean first try extends the run; a correct retry keeps its XP
      // but breaks the chain, same rule the stars use.
      const combo = correct && firstTry ? state.combo + 1 : 0
      return {
        ...state,
        xp: state.xp + gain,
        combo,
        bestCombo: Math.max(state.bestCombo ?? 0, combo),
        topics: topic ? { ...state.topics, [topic]: bump(state.topics[topic], firstTry) } : state.topics,
        facts: fact ? { ...state.facts, [fact]: bump(state.facts[fact], firstTry) } : state.facts,
        days: touchDay(state.days, (d) => ({
          xp: d.xp + gain,
          correct: d.correct + (firstTry ? 1 : 0),
          total: d.total + 1,
        })),
      }
    }

    case 'finishLesson': {
      const { lessonId, correct, total, seconds, bonusXp = 0 } = action
      const accuracy = total > 0 ? correct / total : 1
      const stars = starsFor(accuracy)
      const prev = state.lessons[lessonId] || { stars: 0, best: 0, plays: 0, perfect: false }
      return {
        ...state,
        xp: state.xp + bonusXp,
        lessons: {
          ...state.lessons,
          [lessonId]: {
            done: true,
            stars: Math.max(stars, prev.stars),
            best: Math.max(accuracy, prev.best),
            plays: prev.plays + 1,
            perfect: prev.perfect || accuracy === 1,
            lastAccuracy: accuracy,
            lastPlayed: new Date().toISOString(),
          },
        },
        streak: advanceStreak(state.streak),
        days: touchDay(state.days, (d) => ({ seconds: d.seconds + seconds, xp: d.xp + bonusXp })),
        sessions: [
          ...state.sessions.slice(-199),
          { lessonId, at: new Date().toISOString(), seconds, correct, total },
        ],
      }
    }

    /* Passed a unit's test-out exam: every lesson in it counts as done, with
       stars earned by how cleanly it was passed (see examStars). A flat award
       would either undervalue a flawless run or make skipping pay better than
       learning — this way three stars still have to be earned without a slip. */
    case 'passExam': {
      const { unitId, lessonIds, seconds, accuracy, mistakes } = action
      const stars = examStars(mistakes)
      const bonusXp = EXAM_XP[stars] ?? 40
      const lessons = { ...state.lessons }
      for (const id of lessonIds) {
        const prev = lessons[id]
        if (prev?.done) continue
        lessons[id] = {
          done: true,
          // Never lower what was already earned by actually playing the lesson.
          stars: Math.max(stars, prev?.stars ?? 0),
          best: Math.max(accuracy, prev?.best ?? 0),
          plays: prev?.plays ?? 0,
          perfect: prev?.perfect || mistakes === 0,
          lastAccuracy: accuracy,
          lastPlayed: new Date().toISOString(),
          // Flagged so the tutor dashboard can distinguish "tested out of" from
          // "practised", which are very different things to a parent.
          viaExam: true,
        }
      }
      return {
        ...state,
        lessons,
        xp: state.xp + bonusXp,
        streak: advanceStreak(state.streak),
        days: touchDay(state.days, (d) => ({ seconds: d.seconds + seconds, xp: d.xp + bonusXp })),
        sessions: [
          ...state.sessions.slice(-199),
          { lessonId: `exam-${unitId}`, at: new Date().toISOString(), seconds, correct: 0, total: 0, exam: true },
        ],
      }
    }

    /* Time spent in a lesson the child backed out of — still real practice. */
    case 'addTime':
      return { ...state, days: touchDay(state.days, (d) => ({ seconds: d.seconds + action.seconds })) }

    /* A mismatch in the matching exercise is a mistake too, but it doesn't go
       through `answer` — the pair is retried inside the same question. */
    case 'breakCombo':
      return state.combo === 0 ? state : { ...state, combo: 0 }

    case 'unlockSticker':
      return state.stickers.includes(action.id)
        ? state
        : { ...state, stickers: [...state.stickers, action.id] }

    case 'setSetting':
      return { ...state, settings: { ...state.settings, [action.key]: action.value } }

    /* Play the path again from the start, keeping who they are: XP, stickers,
       best run, the daily streak and the chosen buddy all stay. Only the map
       resets. Wiping a 40-day streak to replay a lesson would be a punishment
       for wanting more practice. */
    case 'replay':
      return { ...state, lessons: {}, combo: 0 }

    case 'reset':
      return { ...initial(), settings: state.settings }

    default:
      return state
  }
}

/* ── Context ───────────────────────────────────────────────────────────── */
const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, load)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    save(state)
  }, [state])

  // The text-size setting scales the entire layout, not just glyphs.
  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', state.settings.textScale)
  }, [state.settings.textScale])

  useEffect(() => {
    setMuted(state.settings.sound)
  }, [state.settings.sound])

  useEffect(() => {
    if (!state.settings.voice) stopSpeaking()
  }, [state.settings.voice])

  /* Keep the service worker's copy of the reminder facts current: it can't read
     localStorage, and a stale copy means reminding a child who already
     practised today. Also schedules the same-day nudge. */
  useEffect(() => {
    if (!canNotify()) return
    const buddyName = BUDDY_NAMES[state.settings.buddy] ?? 'Лео'
    const enabled = Boolean(state.settings.notify) && Notification.permission === 'granted'
    syncStateToWorker({
      enabled,
      lastPracticeDay: state.streak.lastDay,
      streak: state.streak.current,
      buddyName,
    })
    if (enabled) {
      checkReminderNow()
      scheduleLocalNudge({
        hour: state.settings.notifyHour ?? 18,
        streak: state.streak.current,
        buddyName,
        practicedToday: state.streak.lastDay === dayKey(),
      })
    }
  }, [state.settings.notify, state.settings.notifyHour, state.settings.buddy, state.streak])

  // Mobile browsers keep the AudioContext suspended until a real gesture, so the
  // very first tap anywhere is what makes every later sound instant.
  useEffect(() => {
    const go = () => unlockAudio()
    window.addEventListener('pointerdown', go, { once: true })
    window.addEventListener('keydown', go, { once: true })
    return () => {
      window.removeEventListener('pointerdown', go)
      window.removeEventListener('keydown', go)
    }
  }, [])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}

/* ── Derived ───────────────────────────────────────────────────────────── */
export function usePracticedToday() {
  const { state } = useStore()
  return (state.days[dayKey()]?.total ?? 0) > 0
}

/** Streak, but self-healing: a missed day reads as 0 without needing a write. */
export function useStreak() {
  const { state } = useStore()
  const { current, longest, lastDay } = state.streak
  const today = dayKey()
  const alive = lastDay === today || lastDay === shiftDay(today, -1)
  return { current: alive ? current : 0, longest, activeToday: lastDay === today }
}
