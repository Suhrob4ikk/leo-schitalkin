import { useState } from 'react'
import NumberPad, { PadDisplay } from './NumberPad.jsx'
import { sfx } from '../game/audio.js'

/** A ten-rod: one stick with ten visible segments, so "a ten" is something you
    can count rather than something you're told. */
function Rod({ i = 0 }) {
  return (
    <svg className="bt-rod" viewBox="0 0 14 104" style={{ animationDelay: `${i * 0.035}s` }} aria-hidden="true">
      <rect x="0.5" y="0.5" width="13" height="103" rx="3" fill="var(--blue)" stroke="var(--blue-dark)" strokeWidth="1" />
      {Array.from({ length: 9 }, (_, k) => (
        <line key={k} x1="1" y1={(k + 1) * 10.3} x2="13" y2={(k + 1) * 10.3} stroke="var(--blue-dark)" strokeWidth="1" opacity=".65" />
      ))}
    </svg>
  )
}

function Cube({ i = 0 }) {
  return (
    <svg className="bt-cube" viewBox="0 0 14 14" style={{ animationDelay: `${i * 0.035}s` }} aria-hidden="true">
      <rect x="0.5" y="0.5" width="13" height="13" rx="3" fill="var(--orange)" stroke="var(--orange-dark)" strokeWidth="1" />
    </svg>
  )
}

export function BlockGroup({ n, offset = 0 }) {
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return (
    <div className="bt-group">
      {tens > 0 && (
        <div className="bt-rods">
          {Array.from({ length: tens }, (_, i) => (
            <Rod key={i} i={offset + i} />
          ))}
        </div>
      )}
      {ones > 0 && (
        <div className="bt-cubes">
          {Array.from({ length: ones }, (_, i) => (
            <Cube key={i} i={offset + tens + i} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Count / add / subtract with the blocks on screen ────────────────────── */
export default function BaseTen({ q, onAnswer, locked, phase, value, setValue }) {
  const { groups, op, take } = q.data

  return (
    <div className="bt">
      {q.expr && <div className="q-expr q-expr--sm">{q.expr}</div>}

      <div className="bt-scene">
        <BlockGroup n={groups[0]} />
        {op === '+' && groups[1] != null && (
          <>
            <span className="bt-op">+</span>
            <BlockGroup n={groups[1]} offset={10} />
          </>
        )}
        {/* Subtraction shows only the starting pile: fading out 15 of 43 blocks
            would mean fading 5 ones that aren't there yet, which is exactly the
            regrouping the child hasn't done. The hint explains the swap. */}
        {op === '−' && <span className="bt-op bt-op--take">− {take}</span>}
      </div>

      <PadDisplay value={value} phase={phase} />
      <NumberPad
        value={value}
        onChange={setValue}
        onSubmit={() => onAnswer(value)}
        locked={locked}
      />
    </div>
  )
}

/* ── Build a target number out of blocks ─────────────────────────────────── */
/* The Lesson keys every exercise by question index, so this component remounts
   between questions and its counters reset on their own. A retry deliberately
   keeps the build — adjusting what you made beats starting over. */
export function BaseTenBuild({ onAnswer, locked }) {
  const [tens, setTens] = useState(0)
  const [ones, setOnes] = useState(0)

  const total = tens * 10 + ones

  // Functional update: taps come in bursts from a seven-year-old, and reading
  // the current value from the render closure loses every tap but the first.
  const step = (setter, d, maxV) => () => {
    if (locked) return
    sfx.pick()
    setter((cur) => {
      const next = cur + d
      return next < 0 || next > maxV ? cur : next
    })
  }

  return (
    <div className="bt bt--build">
      <div className="bt-scene bt-scene--build">
        {total === 0 ? (
          <span className="bt-empty">Нажимай ➕, чтобы взять блоки</span>
        ) : (
          <BlockGroup n={total} />
        )}
      </div>

      <div className="bt-readout">
        Собрано: <b className="tnum">{total}</b>
      </div>

      <div className="bt-counters">
        <div className="bt-counter">
          <span className="bt-counter-label">Десятки</span>
          <div className="bt-counter-row">
            <button type="button" className="hop-btn hop-btn--sm" onClick={step(setTens, -1, 9)} disabled={locked || tens === 0} aria-label="Убрать десяток">−</button>
            <b className="bt-counter-val tnum">{tens}</b>
            <button type="button" className="hop-btn hop-btn--sm" onClick={step(setTens, 1, 9)} disabled={locked || tens === 9} aria-label="Добавить десяток">+</button>
          </div>
        </div>
        <div className="bt-counter">
          <span className="bt-counter-label">Единицы</span>
          <div className="bt-counter-row">
            <button type="button" className="hop-btn hop-btn--sm" onClick={step(setOnes, -1, 9)} disabled={locked || ones === 0} aria-label="Убрать кубик">−</button>
            <b className="bt-counter-val tnum">{ones}</b>
            <button type="button" className="hop-btn hop-btn--sm" onClick={step(setOnes, 1, 9)} disabled={locked || ones === 9} aria-label="Добавить кубик">+</button>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn btn--green btn--block"
        disabled={locked || total === 0}
        onClick={(e) => onAnswer(total, e.currentTarget)}
      >
        Готово
      </button>
    </div>
  )
}
