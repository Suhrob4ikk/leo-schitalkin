import { useEffect, useRef, useState } from 'react'
import Leo from '../components/Leo.jsx'
import { sfx } from '../game/audio.js'

/*  Лео hops the line himself, one step per tap, rather than the child tapping a
 *  destination tick. Two reasons:
 *    — 16 ticks across a phone is a ~22px target. Way under the 60px floor.
 *    — Counting on ("7… 8, 9, 10, 11, 12") IS the skill this lesson teaches.
 *      Hopping performs it; tapping the answer skips it.
 */
export default function NumberLine({ q, onAnswer, locked, phase }) {
  const { min, max, step, start, delta } = q.data
  const [pos, setPos] = useState(start)
  const [hopping, setHopping] = useState(false)
  const hopTimer = useRef(null)

  // A new question remounts this component (the Lesson keys it by index), so
  // only the retry case needs handling: send him back to the start so the child
  // re-counts the hops instead of nudging one tick from a near miss.
  useEffect(() => {
    if (phase === 'retry') setPos(start)
  }, [phase, start])

  useEffect(() => () => clearTimeout(hopTimer.current), [])

  const ticks = []
  for (let v = min; v <= max; v += step) ticks.push(v)
  const span = max - min || 1
  const pct = (v) => ((v - min) / span) * 100

  // Keep labels readable: on a long line, only every other number gets one.
  const labelEvery = ticks.length > 13 ? 2 : 1

  // Functional update, not `pos + dir * step`: a child mashes this button, and
  // reading `pos` from the render closure makes every tap in a burst compute the
  // same result — six quick taps would move him one step.
  const hop = (dir) => {
    if (locked) return
    sfx.pick()
    setPos((p) => {
      const next = p + dir * step
      return next < min || next > max ? p : next
    })
    setHopping(true)
    clearTimeout(hopTimer.current)
    hopTimer.current = setTimeout(() => setHopping(false), 340)
  }

  const moved = pos !== start
  const label = `${delta > 0 ? '+' : '−'}${Math.abs(delta)}`

  return (
    <div className="nline">
      <div className="nline-op">{label}</div>

      <div className="nline-track">
        {/* A plain div, not an SVG: the rail has to line up exactly with the top
            of the tick marks, and a stretched viewBox makes that a guess. */}
        <div className="nline-rail" aria-hidden="true" />

        {ticks.map((v, i) => (
          <div key={v} className="nline-tick" style={{ left: `${pct(v)}%` }}>
            <span className={`nline-mark ${v === start ? 'is-start' : ''}`} />
            {i % labelEvery === 0 && <span className="nline-num tnum">{v}</span>}
          </div>
        ))}

        {/* Where he set off from, so the child can see the distance covered. */}
        <div className="nline-flag" style={{ left: `${pct(start)}%` }} aria-hidden="true">
          <span className="nline-flag-dot" />
        </div>

        <div
          className={`nline-leo ${hopping ? 'is-hopping' : ''}`}
          style={{ left: `${pct(pos)}%` }}
        >
          <Leo size={62} state={phase === 'correct' ? 'happy' : 'idle'} />
        </div>
      </div>

      <div className="nline-readout">
        Лео на числе <b className="tnum">{pos}</b>
      </div>

      <div className="nline-controls">
        <button
          type="button"
          className="hop-btn"
          onClick={() => hop(-1)}
          disabled={locked || pos - step < min}
          aria-label="Прыгнуть назад"
        >
          ◀
        </button>
        <button
          type="button"
          className="btn btn--green nline-done"
          onClick={(e) => onAnswer(pos, e.currentTarget)}
          disabled={locked || !moved}
        >
          Готово
        </button>
        <button
          type="button"
          className="hop-btn"
          onClick={() => hop(1)}
          disabled={locked || pos + step > max}
          aria-label="Прыгнуть вперёд"
        >
          ▶
        </button>
      </div>
    </div>
  )
}
