import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Leo from '../components/Leo.jsx'
import { useStore } from '../game/store.jsx'
import { canSpeak, sfx, speak } from '../game/audio.js'
import './Settings.css'

const SIZES = [
  { v: 1, label: 'Обычный' },
  { v: 1.15, label: 'Крупный' },
  { v: 1.32, label: 'Огромный' },
]

function Toggle({ on, onChange, label, hint }) {
  return (
    <button type="button" className="row" onClick={() => onChange(!on)}>
      <div className="row-text">
        <b>{label}</b>
        {hint && <span className="sub">{hint}</span>}
      </div>
      <span className={`switch ${on ? 'is-on' : ''}`} role="switch" aria-checked={on} aria-label={label}>
        <span className="switch-knob" />
      </span>
    </button>
  )
}

export default function Settings() {
  const nav = useNavigate()
  const { state, dispatch } = useStore()
  const { sound, voice, textScale } = state.settings
  const [confirmReset, setConfirmReset] = useState(false)

  const set = (key, value) => dispatch({ type: 'setSetting', key, value })

  return (
    <div className="screen setts">
      <header className="coll-top safe-top shell">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Назад">
          ←
        </button>
        <b className="h2">Настройки</b>
      </header>

      <div className="shell setts-body">
        <Toggle
          label="Звуки"
          hint="Похвала, нажатия, фанфары"
          on={sound}
          onChange={(v) => {
            set('sound', v)
            // Play the new state so the change is audible, not just visual.
            if (v) setTimeout(() => sfx.correct(), 60)
          }}
        />

        <Toggle
          label="Голос Лео"
          hint={canSpeak() ? 'Кнопка 🔊 читает задание вслух' : 'Не поддерживается этим браузером'}
          on={voice && canSpeak()}
          onChange={(v) => {
            set('voice', v)
            if (v) speak('Привет! Я Лео.')
          }}
        />

        <div className="block">
          <b>Размер текста</b>
          <div className="size-row">
            {SIZES.map((s) => (
              <button
                key={s.v}
                type="button"
                className={`size-btn ${textScale === s.v ? 'is-on' : ''}`}
                onClick={() => {
                  sfx.tap()
                  set('textScale', s.v)
                }}
              >
                <span style={{ fontSize: `${0.8 * s.v}rem` }}>Аа</span>
                {s.label}
              </button>
            ))}
          </div>
          <span className="sub">Меняет размер всего приложения, не только букв.</span>
        </div>

        <div className="setts-leo">
          <Leo size={130} state="wave" />
          <p className="sub">Лео готов заниматься!</p>
        </div>

        <button className="btn btn--ghost btn--block" onClick={() => setConfirmReset(true)}>
          Сбросить весь прогресс
        </button>
      </div>

      {confirmReset && (
        <div className="sheet-backdrop" onClick={() => setConfirmReset(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <Leo size={90} state="think" />
            <b className="h2">Точно сбросить?</b>
            <p className="sub">
              Все звёзды, наклейки, очки и дни подряд исчезнут. Это нельзя отменить.
            </p>
            <button className="btn btn--green btn--block" onClick={() => setConfirmReset(false)}>
              Нет, оставить
            </button>
            <button
              className="btn btn--ghost btn--block"
              onClick={() => {
                dispatch({ type: 'reset' })
                setConfirmReset(false)
                nav('/', { replace: true })
              }}
            >
              Да, сбросить всё
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
