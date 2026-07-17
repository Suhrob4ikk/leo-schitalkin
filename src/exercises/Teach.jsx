import { useEffect, useState } from 'react'
import { Grid } from './ArrayView.jsx'
import { sfx } from '../game/audio.js'

/* Teaching screens. Nothing here is scored — the child watches, then taps
   "Понятно!". They exist so a new table is introduced before it is drilled. */

/** Groups land one at a time while the running total counts 2, 4, 6, 8… — the
    point being that the total jumps by a whole group, not by one. */
function SkipCount({ q, onAnswer }) {
  const { table, upTo = 10 } = q.data
  // Enough groups to show the pattern, few enough that the icons stay
  // countable: ×10 would otherwise put 100 stars on a phone screen.
  const groups = Math.max(3, Math.min(upTo, Math.floor(38 / table)))

  const [n, setN] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (n >= groups) {
      const t = setTimeout(() => setDone(true), 450)
      return () => clearTimeout(t)
    }
    const t = setTimeout(
      () => {
        setN((v) => v + 1)
        sfx.star(Math.min(n, 2))
      },
      n === 0 ? 350 : 780,
    )
    return () => clearTimeout(t)
  }, [n, groups])

  const replay = () => {
    setN(0)
    setDone(false)
  }

  return (
    <div className="teach">
      <div className="sc-stage">
        {Array.from({ length: n }, (_, i) => (
          <div key={i} className="sc-group">
            {Array.from({ length: table }, (_, k) => (
              <span key={k} className="sc-dot" style={{ animationDelay: `${k * 0.05}s` }}>
                ⭐
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="sc-ladder">
        {Array.from({ length: n }, (_, i) => (
          <span key={i} className={`sc-step ${i === n - 1 ? 'is-new' : ''}`}>
            {table * (i + 1)}
          </span>
        ))}
      </div>

      <div className="sc-eq">
        {n > 0 ? (
          <>
            <b className="tnum">{table}</b> × <b className="tnum">{n}</b> ={' '}
            <b className="tnum sc-total">{table * n}</b>
          </>
        ) : (
          <span className="sub">Смотри…</span>
        )}
      </div>

      {done && (
        <div className="sc-table">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="sc-row" style={{ animationDelay: `${i * 0.05}s` }}>
              <span className="tnum">
                {table} × {i + 1}
              </span>
              <span className="sc-row-eq">=</span>
              <b className="tnum">{table * (i + 1)}</b>
            </div>
          ))}
        </div>
      )}

      <div className="teach-actions">
        <button type="button" className="btn btn--white" onClick={replay}>
          ↻ Ещё раз
        </button>
        <button type="button" className="btn btn--green" onClick={() => onAnswer(true)} disabled={!done}>
          Понятно!
        </button>
      </div>
    </div>
  )
}

/** A rows × cols array, filling in one row at a time. */
function ArrayTeach({ q, onAnswer }) {
  const { rows, cols } = q.data
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (shown >= rows) return
    const t = setTimeout(
      () => {
        setShown((v) => v + 1)
        sfx.pick()
      },
      shown === 0 ? 350 : 700,
    )
    return () => clearTimeout(t)
  }, [shown, rows])

  const done = shown >= rows

  return (
    <div className="teach">
      <div className="arr-stage">
        <Grid rows={shown} cols={cols} emoji="🍎" highlightRow={shown - 1} stagger={false} />
      </div>

      <div className="arr-caption">
        <b className="tnum">{shown}</b> {shown === 1 ? 'ряд' : shown < 5 ? 'ряда' : 'рядов'} по{' '}
        <b className="tnum">{cols}</b>
      </div>

      <div className="sc-eq">
        <b className="tnum">{shown}</b> × <b className="tnum">{cols}</b> ={' '}
        <b className="tnum sc-total">{shown * cols}</b>
      </div>

      <div className="teach-actions">
        <button type="button" className="btn btn--white" onClick={() => setShown(0)}>
          ↻ Ещё раз
        </button>
        <button type="button" className="btn btn--green" onClick={() => onAnswer(true)} disabled={!done}>
          Понятно!
        </button>
      </div>
    </div>
  )
}

export default function Teach(props) {
  return props.q.data.type === 'skip' ? <SkipCount {...props} /> : <ArrayTeach {...props} />
}
