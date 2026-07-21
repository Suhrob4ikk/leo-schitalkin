import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UiIcon from '../components/UiIcon.jsx'
import Icon from '../components/Icon.jsx'
import Mascot from '../components/Mascot.jsx'
import { sfx } from '../game/audio.js'
import './Trainer.css'

/*  Тренажёр — quick, self-chosen table practice, outside the map.
 *
 *  The child picks an operation, a number, and an answer style, and gets a fast
 *  ten-fact run for exactly that table. It records nothing on the map (it isn't
 *  a lesson) but still feeds XP and the fact stats the tutor reads — so a parent
 *  who spots a weak column in the heatmap can hand the phone over and drill it
 *  straight away, which is the whole point.
 */
const NUMS = [2, 3, 4, 5, 6, 7, 8, 9, 10]

export default function Trainer() {
  const nav = useNavigate()
  const [op, setOp] = useState('mult') // 'mult' | 'div'
  const [num, setNum] = useState(null) // 2..10
  const [mode, setMode] = useState('choice') // 'choice' (blitz) | 'pad' (typed)

  const start = () => {
    if (!num) return
    sfx.tap()
    nav(`/lesson/drill-${op}-${num}-${mode}`)
  }

  return (
    <div className="screen trainer">
      <header className="coll-top safe-top shell">
        <button className="icon-btn" onClick={() => nav('/')} aria-label="Назад">
          <UiIcon name="back" size="1.35rem" />
        </button>
        <b className="h2">Тренажёр</b>
      </header>

      <div className="shell trainer-body">
        <div className="trainer-hero">
          <Mascot size={96} state="wave" />
          <p className="sub">Быстро повтори таблицу. Выбери, что и как тренировать!</p>
        </div>

        <h2 className="trainer-head">Что тренируем</h2>
        <div className="seg seg--2">
          <button
            type="button"
            className={`seg-btn ${op === 'mult' ? 'is-on' : ''}`}
            onClick={() => {
              sfx.pick()
              setOp('mult')
            }}
          >
            <Icon e="✖️" size="1.25rem" /> Умножение
          </button>
          <button
            type="button"
            className={`seg-btn ${op === 'div' ? 'is-on' : ''}`}
            onClick={() => {
              sfx.pick()
              setOp('div')
            }}
          >
            <Icon e="➗" size="1.25rem" /> Деление
          </button>
        </div>

        <h2 className="trainer-head">{op === 'div' ? 'Делить на' : 'Умножать на'}</h2>
        <div className="num-grid">
          {NUMS.map((n) => (
            <button
              key={n}
              type="button"
              className={`num-btn ${num === n ? 'is-on' : ''}`}
              onClick={() => {
                sfx.pick()
                setNum(n)
              }}
              aria-pressed={num === n}
            >
              {n}
            </button>
          ))}
        </div>

        <h2 className="trainer-head">Как отвечать</h2>
        <div className="seg seg--2">
          <button
            type="button"
            className={`seg-btn seg-btn--stack ${mode === 'choice' ? 'is-on' : ''}`}
            onClick={() => {
              sfx.pick()
              setMode('choice')
            }}
          >
            <b>Выбор ответа</b>
            <span className="sub">5 секунд на ответ</span>
          </button>
          <button
            type="button"
            className={`seg-btn seg-btn--stack ${mode === 'pad' ? 'is-on' : ''}`}
            onClick={() => {
              sfx.pick()
              setMode('pad')
            }}
          >
            <b>Ввод ответа</b>
            <span className="sub">9 секунд, печатаешь сам</span>
          </button>
        </div>
      </div>

      <div className="trainer-actions shell safe-bottom">
        <button
          className="btn btn--green btn--block btn--big"
          disabled={!num}
          onClick={start}
        >
          {num
            ? op === 'div'
              ? `Начать: деление на ${num}`
              : `Начать: умножение ×${num}`
            : 'Выбери число'}
        </button>
      </div>
    </div>
  )
}
