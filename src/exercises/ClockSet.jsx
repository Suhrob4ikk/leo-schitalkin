import { useState } from 'react'
import { ClockFace } from './Clock.jsx'
import { sfx } from '../game/audio.js'

/*  «Покажи время»: названо время, ребёнок сам ставит стрелки.
 *
 *  Стрелки двигаются кнопками (час на 1, минуты на 5) — это надёжнее, чем таскать
 *  тонкую стрелку пальцем на телефоне, и всё равно ребёнок «крутит» часы сам.
 *  Циферблат тот же, что и в чтении времени, так что связь очевидна.
 */
export default function ClockSet({ q, onAnswer, locked, phase }) {
  const [h, setH] = useState(12)
  const [m, setM] = useState(0)

  const bump = (fn) => {
    if (locked) return
    sfx.tap()
    fn()
  }
  const stepH = (d) => bump(() => setH((x) => ((x - 1 + d + 12) % 12) + 1))
  const stepM = (d) => bump(() => setM((x) => (x + d + 60) % 60))

  const done = phase !== 'asking'
  const fmt = `${h}:${String(m).padStart(2, '0')}`

  return (
    <div className="clockset">
      <ClockFace h={h} m={m} />

      <div className="clockset-readout tnum">{fmt}</div>

      <div className="clockset-steppers">
        <div className="stepper">
          <button type="button" className="step-btn" disabled={locked} onClick={() => stepH(-1)} aria-label="Час назад">
            −
          </button>
          <span className="step-label">Час</span>
          <button type="button" className="step-btn" disabled={locked} onClick={() => stepH(1)} aria-label="Час вперёд">
            +
          </button>
        </div>
        <div className="stepper">
          <button type="button" className="step-btn" disabled={locked} onClick={() => stepM(-5)} aria-label="Минус пять минут">
            −
          </button>
          <span className="step-label">Мин</span>
          <button type="button" className="step-btn" disabled={locked} onClick={() => stepM(5)} aria-label="Плюс пять минут">
            +
          </button>
        </div>
      </div>

      <button
        type="button"
        className="btn btn--green btn--block clockset-done"
        disabled={locked || done}
        onClick={(e) => onAnswer({ h, m }, e.currentTarget)}
      >
        Готово
      </button>
    </div>
  )
}
