import { useRef, useState } from 'react'
import { sfx } from '../game/audio.js'

const shuffle = (a) => {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

/*  Tap a fact, tap its answer. One question made of several small wins, so the
 *  feedback stays inside the exercise: a mismatch wobbles and clears rather than
 *  interrupting with the full Лео panel, which would fire four times per screen.
 *  Misses still cost a heart via onMiss so the effort is recorded honestly.
 */
export default function MatchPairs({ q, onAnswer, onMiss, locked }) {
  const { pairs } = q.data
  const [lefts] = useState(() => shuffle(pairs.map((p, i) => ({ id: i, text: p.left }))))
  const [rights] = useState(() => shuffle(pairs.map((p, i) => ({ id: i, text: String(p.right) }))))
  const [sel, setSel] = useState(null)
  const [matched, setMatched] = useState(() => new Set())
  const [miss, setMiss] = useState(null)
  const timer = useRef(null)

  const tap = (side, id) => {
    if (locked || matched.has(id) || miss) return

    if (!sel || sel.side === side) {
      sfx.pick()
      setSel({ side, id })
      return
    }

    if (sel.id === id) {
      const next = new Set(matched)
      next.add(id)
      sfx.star(Math.min(next.size - 1, 2))
      setMatched(next)
      setSel(null)
      if (next.size === pairs.length) onAnswer(true)
      return
    }

    sfx.soft()
    onMiss?.()
    setMiss({ a: sel, b: { side, id } })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setMiss(null)
      setSel(null)
    }, 480)
  }

  const cls = (side, id) => {
    if (matched.has(id)) return 'is-matched'
    if (miss && ((miss.a.side === side && miss.a.id === id) || (miss.b.side === side && miss.b.id === id)))
      return 'is-miss'
    if (sel && sel.side === side && sel.id === id) return 'is-sel'
    return ''
  }

  return (
    <div className="mp">
      <div className="mp-col">
        {lefts.map((it) => (
          <button
            key={it.id}
            type="button"
            className={`mp-card ${cls('l', it.id)}`}
            onClick={() => tap('l', it.id)}
            disabled={locked}
          >
            {it.text}
          </button>
        ))}
      </div>
      <div className="mp-col">
        {rights.map((it) => (
          <button
            key={it.id}
            type="button"
            className={`mp-card mp-card--ans ${cls('r', it.id)}`}
            onClick={() => tap('r', it.id)}
            disabled={locked}
          >
            {it.text}
          </button>
        ))}
      </div>
    </div>
  )
}
