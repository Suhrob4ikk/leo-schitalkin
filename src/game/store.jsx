import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { setMuted, unlockAudio, stopSpeaking } from './audio.js'

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
  stickers: [],
  sessions: [],
  // buddy: null means "hasn't chosen yet" and triggers the picker on first run.
  settings: { sound: true, voice: true, textScale: 1, buddy: null },
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
      return {
        ...state,
        xp: state.xp + gain,
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

    /* Time spent in a lesson the child backed out of — still real practice. */
    case 'addTime':
      return { ...state, days: touchDay(state.days, (d) => ({ seconds: d.seconds + action.seconds })) }

    case 'unlockSticker':
      return state.stickers.includes(action.id)
        ? state
        : { ...state, stickers: [...state.stickers, action.id] }

    case 'setSetting':
      return { ...state, settings: { ...state.settings, [action.key]: action.value } }

    case 'reset':
      return initial()

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
