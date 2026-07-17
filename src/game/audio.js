/* Sound is synthesised with the WebAudio API rather than shipped as files:
   zero bytes to download, instant to trigger (no decode, no buffering), and it
   works offline for free. Every cue is warm — there is no harsh "wrong" buzzer
   anywhere in this app by design. */

let ctx = null
let muted = false
let master = null

function ac() {
  if (ctx) return ctx
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = 0.32
  master.connect(ctx.destination)
  return ctx
}

/** iOS/Android start the AudioContext suspended until a real gesture. */
export function unlockAudio() {
  const c = ac()
  if (c && c.state === 'suspended') c.resume()
}

export function setMuted(v) {
  muted = !v
}

const NOTE = { C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.5, G6: 1568 }

function tone({ freq, start = 0, dur = 0.16, type = 'sine', gain = 0.5, slideTo = null }) {
  const c = ac()
  if (!c || muted) return
  const t0 = c.currentTime + start
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)

  // Soft attack + exponential tail: rounded, never a click or a beep.
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.014)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)

  osc.connect(g)
  g.connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

export const sfx = {
  /** Bright rising arpeggio — the sound the child hears hundreds of times. */
  correct() {
    tone({ freq: NOTE.C5, start: 0, dur: 0.11, type: 'triangle', gain: 0.42 })
    tone({ freq: NOTE.E5, start: 0.06, dur: 0.11, type: 'triangle', gain: 0.42 })
    tone({ freq: NOTE.G5, start: 0.12, dur: 0.22, type: 'triangle', gain: 0.46 })
    tone({ freq: NOTE.C6, start: 0.18, dur: 0.3, type: 'sine', gain: 0.34 })
  },

  /** Deliberately NOT a buzzer: a soft, curious two-note dip. Reads as
      "hmm, let's look again", not as failure. */
  soft() {
    tone({ freq: NOTE.E5, start: 0, dur: 0.13, type: 'sine', gain: 0.26 })
    tone({ freq: NOTE.C5, start: 0.09, dur: 0.2, type: 'sine', gain: 0.22 })
  },

  tap() {
    tone({ freq: 660, dur: 0.045, type: 'sine', gain: 0.16 })
  },

  pick() {
    tone({ freq: 880, dur: 0.06, type: 'triangle', gain: 0.18 })
  },

  star(i = 0) {
    const seq = [NOTE.C6, NOTE.E6, NOTE.G6]
    tone({ freq: seq[Math.min(i, 2)], dur: 0.34, type: 'triangle', gain: 0.4 })
  },

  heart() {
    tone({ freq: 420, dur: 0.12, type: 'sine', gain: 0.2, slideTo: 300 })
  },

  /** Lesson finished. */
  fanfare() {
    const seq = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6]
    seq.forEach((f, i) => tone({ freq: f, start: i * 0.085, dur: 0.3, type: 'triangle', gain: 0.4 }))
    tone({ freq: NOTE.E6, start: 0.34, dur: 0.5, type: 'triangle', gain: 0.36 })
    tone({ freq: NOTE.G6, start: 0.42, dur: 0.6, type: 'sine', gain: 0.28 })
  },

  /** Perfect lesson / new unit — bigger, longer, unmistakably special. */
  bigWin() {
    const seq = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.G5, NOTE.C6, NOTE.E6]
    seq.forEach((f, i) => tone({ freq: f, start: i * 0.09, dur: 0.34, type: 'triangle', gain: 0.42 }))
    tone({ freq: NOTE.G6, start: 0.66, dur: 0.9, type: 'sine', gain: 0.3 })
    tone({ freq: NOTE.C6, start: 0.66, dur: 0.9, type: 'triangle', gain: 0.26 })
  },

  unlock() {
    tone({ freq: NOTE.G5, dur: 0.14, type: 'triangle', gain: 0.34 })
    tone({ freq: NOTE.C6, start: 0.1, dur: 0.14, type: 'triangle', gain: 0.34 })
    tone({ freq: NOTE.E6, start: 0.2, dur: 0.4, type: 'triangle', gain: 0.36 })
  },

  tick() {
    tone({ freq: 1200, dur: 0.03, type: 'sine', gain: 0.08 })
  },
}

/* ── Narration (Web Speech API) ────────────────────────────────────────────
   Instructions can be multi-step, and the child is an early reader — so any
   instruction can be read aloud on demand. */

let voice = null
let voicesReady = false

function pickVoice() {
  if (!('speechSynthesis' in window)) return null
  const all = speechSynthesis.getVoices()
  if (!all.length) return null
  voicesReady = true
  const ru = all.filter((v) => /^ru/i.test(v.lang))
  if (!ru.length) return null
  // Prefer a local voice: it starts instantly and works with no network.
  return ru.find((v) => v.localService) || ru[0]
}

if ('speechSynthesis' in window) {
  voice = pickVoice()
  speechSynthesis.onvoiceschanged = () => {
    voice = pickVoice()
  }
}

export function canSpeak() {
  return 'speechSynthesis' in window
}

export function speak(text, { rate = 0.92, pitch = 1.15 } = {}) {
  if (!canSpeak() || !text) return
  speechSynthesis.cancel()
  if (!voicesReady) voice = pickVoice()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'ru-RU'
  if (voice) u.voice = voice
  u.rate = rate // a little slower than default — he's seven
  u.pitch = pitch // a little brighter — it's Лео talking
  speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if (canSpeak()) speechSynthesis.cancel()
}
