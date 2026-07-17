import { useEffect, useState } from 'react'
import { sfx } from '../game/audio.js'

/*  Цепочка вычислений: 8 → +5 → ⬜ → −3 → ⬜
 *
 *  Standard fare in Russian year-1/2 workbooks, and the one thing he was already
 *  doing at school that the app didn't cover: several blanks at once, where each
 *  answer feeds the next. Boxes fill left to right — you cannot know the second
 *  without the first, which is the whole exercise.
 */
export default function Chain({ q, onAnswer, locked, phase }) {
  const { start, steps } = q.data

  // `active` is tracked explicitly rather than derived as "first empty box".
  // Derived, a box stopped being empty on its first digit and the next keypress
  // jumped to the following box — two-digit answers were impossible to enter.
  // Every value in a chain is 10..99, so a box hands over on its second digit.
  const [{ vals, active }, set] = useState(() => ({ vals: steps.map(() => ''), active: 0 }))

  useEffect(() => {
    if (phase === 'retry') set({ vals: steps.map(() => ''), active: 0 })
  }, [phase, steps])

  // "Finished" means the cursor has run off the end — i.e. every box holds its
  // full two digits. Testing `vals.every(v => v !== '')` instead would call it
  // finished as soon as the last box had ONE digit, which disabled the pad and
  // made the second digit impossible to type.
  const full = active >= vals.length

  const press = (d) => {
    if (locked) return
    sfx.pick()
    set((s) => {
      if (s.active >= s.vals.length) return s
      const next = [...s.vals]
      const box = next[s.active]
      if (box.length >= 2) return s
      next[s.active] = box + d
      const done = next[s.active].length >= 2
      return { vals: next, active: done ? Math.min(s.active + 1, s.vals.length) : s.active }
    })
  }

  const back = () => {
    if (locked) return
    sfx.tap()
    set((s) => {
      const next = [...s.vals]
      // Delete from the active box, or step back into the previous filled one.
      let i = s.active
      if (i >= next.length || next[i] === '') i = Math.max(0, i - 1)
      next[i] = next[i].slice(0, -1)
      return { vals: next, active: i }
    })
  }

  const submit = () => {
    if (!full || locked) return
    onAnswer(vals.map(Number))
  }

  return (
    <div className="chain">
      <div className="chain-track">
        <span className="chain-start tnum">{start}</span>
        {steps.map((s, i) => (
          <span key={i} className="chain-link">
            <span className="chain-op tnum">
              {s.op}
              {s.n}
            </span>
            {/* Tappable so a box can be corrected without clearing the rest. */}
            <button
              type="button"
              disabled={locked}
              onClick={() => set((s) => ({ ...s, active: i }))}
              className={`chain-box tnum ${i === active ? 'is-live' : ''} ${vals[i] !== '' ? 'is-filled' : ''} ${
                phase === 'reveal' || phase === 'retry' ? 'is-wrong' : ''
              } ${phase === 'correct' ? 'is-correct' : ''}`}
            >
              {vals[i]}
            </button>
          </span>
        ))}
      </div>

      <div className="pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" className="pad-key" disabled={locked || full} onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <button type="button" className="pad-key pad-key--del" disabled={locked} onClick={back} aria-label="Стереть">
          ⌫
        </button>
        <button type="button" className="pad-key" disabled={locked || full} onClick={() => press('0')}>
          0
        </button>
        <button
          type="button"
          className="pad-key pad-key--ok"
          disabled={locked || !full}
          onClick={submit}
          aria-label="Готово"
        >
          ✓
        </button>
      </div>
    </div>
  )
}
