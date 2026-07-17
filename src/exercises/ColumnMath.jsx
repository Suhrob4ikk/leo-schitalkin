import { useEffect, useRef, useState } from 'react'
import { sfx } from '../game/audio.js'

/*  Column arithmetic, entered one digit at a time — ones first, exactly as it is
 *  worked on paper.
 *
 *  The regrouping step is the lesson, so it is shown rather than described: once
 *  the correct ones digit is in, the carried ten flies up to the tens column
 *  (addition), or the borrowed ten is struck through and handed down to the ones
 *  (subtraction). Showing it only after a correct ones digit keeps it a reward
 *  for the step the child just did, not a hint handed over up front.
 */
export default function ColumnMath({ q, onAnswer, locked, phase }) {
  const { a, b, op } = q.data
  const aT = Math.floor(a / 10)
  const aO = a % 10
  const bT = Math.floor(b / 10)
  const bO = b % 10

  const add = op === '+'
  const regroup = add ? aO + bO >= 10 : aO < bO
  const rightOnes = add ? (aO + bO) % 10 : aO + 10 * (regroup ? 1 : 0) - bO

  // One object rather than two states: "which box does this digit go in" depends
  // on both, so two fast taps read the same stale `ones === null` and both land
  // in the ones box. A single functional update can't race with itself.
  const [{ ones, tens }, setDigits] = useState({ ones: null, tens: null })
  const submitTimer = useRef(null)

  // Reset the entry when the child is invited to try again.
  useEffect(() => {
    if (phase === 'retry') setDigits({ ones: null, tens: null })
  }, [phase])

  useEffect(() => () => clearTimeout(submitTimer.current), [])

  const onesDone = ones !== null
  const showRegroup = regroup && onesDone && ones === rightOnes

  // Both boxes filled → submit on its own. Hunting for a ✓ after the last digit
  // is friction a seven-year-old doesn't need; a typo is caught by the warm
  // retry anyway.
  useEffect(() => {
    if (ones === null || tens === null || locked) return
    const value = tens * 10 + ones
    submitTimer.current = setTimeout(() => onAnswer(value), 420)
    return () => clearTimeout(submitTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ones, tens, locked])

  const press = (d) => {
    if (locked) return
    sfx.pick()
    setDigits((s) => (s.ones === null ? { ...s, ones: d } : s.tens === null ? { ...s, tens: d } : s))
  }

  const back = () => {
    if (locked) return
    sfx.tap()
    setDigits((s) => (s.tens !== null ? { ...s, tens: null } : { ...s, ones: null }))
  }

  const cell = (v, extra = '') => <span className={`cm-cell ${extra}`}>{v}</span>

  return (
    <div className="cm">
      <div className={`cm-grid ${showRegroup ? 'is-regrouped' : ''}`}>
        {/* Carry row (addition) */}
        <span className="cm-sign" />
        <span className="cm-cell cm-cell--mark">
          {add && showRegroup && <span className="cm-carry">1</span>}
        </span>
        <span className="cm-cell cm-cell--mark" />

        {/* Top number, with the borrow written over it */}
        <span className="cm-sign" />
        <span className="cm-cell cm-num">
          {!add && showRegroup && <span className="cm-borrow-new">{aT - 1}</span>}
          <span className={!add && showRegroup ? 'cm-struck' : ''}>{aT}</span>
        </span>
        <span className="cm-cell cm-num">
          {!add && showRegroup && <span className="cm-borrow-ten">1</span>}
          {aO}
        </span>

        {/* Bottom number */}
        <span className="cm-sign">{op}</span>
        {cell(bT, 'cm-num')}
        {cell(bO, 'cm-num')}

        <span className="cm-rule" />

        {/* Answer boxes — the ones box is live first */}
        <span className="cm-sign" />
        <span className={`cm-box ${onesDone && tens === null ? 'is-live' : ''} ${tens !== null ? 'is-filled' : ''}`}>
          {tens ?? ''}
        </span>
        <span className={`cm-box ${!onesDone ? 'is-live' : ''} ${onesDone ? 'is-filled' : ''}`}>
          {ones ?? ''}
        </span>
      </div>

      <p className="cm-step sub">
        {!onesDone ? 'Сначала единицы →' : tens === null ? 'Теперь десятки →' : ' '}
      </p>

      <div className="cm-pad">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button
            key={d}
            type="button"
            className="cm-key"
            disabled={locked || (ones !== null && tens !== null)}
            onClick={() => press(d)}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          className="cm-key cm-key--del"
          disabled={locked || !onesDone}
          onClick={back}
          aria-label="Стереть"
        >
          ⌫
        </button>
      </div>
    </div>
  )
}
