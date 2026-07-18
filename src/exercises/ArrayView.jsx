import { useState } from 'react'
import ChoiceGrid from './ChoiceGrid.jsx'
import Icon from '../components/Icon.jsx'
import { sfx } from '../game/audio.js'

/** rows × cols of an icon. The grid IS the fact: "3 ряда по 4" is visible as
    three rows of four, not asserted in words. */
export function Grid({ rows, cols, emoji = '⭐', highlightRow = -1, stagger = true }) {
  return (
    <div className="arr-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols)
        return (
          <span
            key={i}
            className={`arr-cell ${highlightRow === r ? 'is-hot' : ''}`}
            style={stagger ? { animationDelay: `${i * 0.028}s` } : undefined}
          >
            <Icon e={emoji} size="1.55rem" />
          </span>
        )
      })}
    </div>
  )
}

export default function ArrayView({ q, onAnswer, locked, chosen, phase }) {
  const { rows, cols, emoji } = q.data
  return (
    <div className="arr">
      <div className="arr-stage">
        <Grid rows={rows} cols={cols} emoji={emoji} />
      </div>
      <div className="arr-caption">
        <b className="tnum">{rows}</b> {rows === 1 ? 'ряд' : rows < 5 ? 'ряда' : 'рядов'} по{' '}
        <b className="tnum">{cols}</b> — это <b className="tnum">{q.expr}</b>
      </div>
      {/* showExpr off: the array itself plus the caption above already state the
          question, and a third copy of "2 × 5" would just be noise. */}
      <ChoiceGrid q={q} onAnswer={onAnswer} locked={locked} chosen={chosen} phase={phase} showExpr={false} />
    </div>
  )
}

/* ── Build the array yourself ────────────────────────────────────────────── */
export function ArrayBuild({ q, onAnswer, locked }) {
  const [rows, setRows] = useState(1)
  const [cols, setCols] = useState(1)

  // Functional update — see the note in NumberLine: bursts of taps otherwise
  // collapse into a single step.
  const bump = (setter, d, max) => () => {
    if (locked) return
    sfx.pick()
    setter((cur) => {
      const next = cur + d
      return next < 1 || next > max ? cur : next
    })
  }

  const total = rows * cols
  const ok = rows === q.data.rows && cols === q.data.cols

  return (
    <div className="arr arr--build">
      <div className="arr-stage arr-stage--build">
        <Grid rows={rows} cols={cols} emoji="🍎" stagger={false} />
      </div>

      <div className="arr-eq">
        <b className="tnum">{rows}</b> × <b className="tnum">{cols}</b> ={' '}
        <b className="tnum arr-total">{total}</b>
      </div>

      <div className="arr-counters">
        <div className="arr-counter">
          <span className="bt-counter-label">Ряды</span>
          <div className="bt-counter-row">
            <button type="button" className="hop-btn hop-btn--sm" onClick={bump(setRows, -1, 6)} disabled={locked || rows === 1} aria-label="Меньше рядов">−</button>
            <b className="bt-counter-val tnum">{rows}</b>
            <button type="button" className="hop-btn hop-btn--sm" onClick={bump(setRows, 1, 6)} disabled={locked || rows === 6} aria-label="Больше рядов">+</button>
          </div>
        </div>
        <div className="arr-counter">
          <span className="bt-counter-label">В ряду</span>
          <div className="bt-counter-row">
            <button type="button" className="hop-btn hop-btn--sm" onClick={bump(setCols, -1, 8)} disabled={locked || cols === 1} aria-label="Меньше в ряду">−</button>
            <b className="bt-counter-val tnum">{cols}</b>
            <button type="button" className="hop-btn hop-btn--sm" onClick={bump(setCols, 1, 8)} disabled={locked || cols === 8} aria-label="Больше в ряду">+</button>
          </div>
        </div>
      </div>

      {/* Reports the shape, not the product: 2×6 also makes 12, but it isn't
          "3 ряда по 4", and this lesson is about what the shape means. */}
      <button
        type="button"
        className="btn btn--green btn--block"
        disabled={locked}
        onClick={(e) => onAnswer({ rows, cols, ok }, e.currentTarget)}
      >
        Готово
      </button>
    </div>
  )
}
