import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UiIcon from '../components/UiIcon.jsx'
import Mascot from '../components/Mascot.jsx'
import Cub, { CAST, SPECIES } from '../components/Cub.jsx'
import Sheet from '../components/Sheet.jsx'
import { useStore } from '../game/store.jsx'
import { canSpeak, sfx, speak } from '../game/audio.js'
import {
  notifyPermission,
  requestNotifications,
  registerDailySync,
  unregisterDailySync,
  sendTestNotification,
} from '../game/notify.js'
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
  const { sound, voice, textScale, buddy, notify } = state.settings
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmReplay, setConfirmReplay] = useState(false)
  const [notifyState, setNotifyState] = useState(() => notifyPermission())

  const set = (key, value) => dispatch({ type: 'setSetting', key, value })

  return (
    <div className="screen setts">
      <header className="coll-top safe-top shell">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Назад">
          <UiIcon name="back" size="1.35rem" />
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
          label="Голос друга"
          hint={canSpeak() ? 'Кнопка со звуком читает задание вслух' : 'Не поддерживается этим браузером'}
          on={voice && canSpeak()}
          onChange={(v) => {
            set('voice', v)
            if (v) speak(`Привет! Я ${SPECIES[buddy]?.name ?? 'Лео'}.`)
          }}
        />

        <Toggle
          label="Напоминания"
          hint={
            notifyState === 'unsupported'
              ? 'Не поддерживается этим браузером'
              : notifyState === 'denied'
                ? 'Запрещены в настройках браузера'
                : `${SPECIES[buddy]?.name ?? 'Лео'} будет звать заниматься`
          }
          on={notify && notifyState === 'granted'}
          onChange={async (v) => {
            if (!v) {
              set('notify', false)
              unregisterDailySync()
              return
            }
            // Must be inside the click for iOS/Safari to accept the prompt.
            const res = await requestNotifications()
            setNotifyState(res)
            if (res !== 'granted') return
            set('notify', true)
            await registerDailySync()
            sendTestNotification(SPECIES[buddy]?.name ?? 'Лео')
          }}
        />

        {notify && notifyState === 'granted' && (
          <div className="block">
            <b>Когда напоминать</b>
            <div className="size-row">
              {[16, 18, 20].map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`size-btn ${(state.settings.notifyHour ?? 18) === h ? 'is-on' : ''}`}
                  onClick={() => {
                    sfx.tap()
                    set('notifyHour', h)
                  }}
                >
                  <span>{h}:00</span>
                  {h === 16 ? 'после школы' : h === 18 ? 'вечером' : 'перед сном'}
                </button>
              ))}
            </div>
            <span className="sub">Одно напоминание в день, не чаще.</span>
          </div>
        )}

        <div className="block">
          <b>Цель на день</b>
          <div className="size-row">
            {[
              { v: 20, label: 'полурока' },
              { v: 40, label: 'один урок' },
              { v: 80, label: 'два урока' },
            ].map((g) => (
              <button
                key={g.v}
                type="button"
                className={`size-btn ${(state.settings.dailyGoal ?? 40) === g.v ? 'is-on' : ''}`}
                onClick={() => {
                  sfx.tap()
                  set('dailyGoal', g.v)
                }}
              >
                <span>{g.v}</span>
                {g.label}
              </button>
            ))}
          </div>
          <span className="sub">Очки за правильные ответы. Цель видна на карте.</span>
        </div>

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

        <div className="block">
          <b>Твой друг</b>
          <div className="buddy-row">
            {CAST.map((id) => (
              <button
                key={id}
                type="button"
                className={`buddy-btn ${buddy === id ? 'is-on' : ''}`}
                onClick={() => {
                  sfx.pick()
                  set('buddy', id)
                }}
              >
                <Cub species={id} state={buddy === id ? 'happy' : 'idle'} size={72} />
                <span>{SPECIES[id].name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="setts-leo">
          <Mascot size={130} state="wave" />
          <p className="sub">{SPECIES[buddy]?.name ?? 'Лео'} готов заниматься!</p>
        </div>

        {/* Two different things, deliberately separated. Replaying the path is
            something a child might want weekly; erasing everything is a last
            resort and shouldn't be one tap away from it. */}
        <button className="btn btn--blue btn--block" onClick={() => setConfirmReplay(true)}>
          Пройти заново
        </button>

        <button className="btn btn--ghost btn--block" onClick={() => setConfirmReset(true)}>
          Стереть всё
        </button>

        {/* CC-BY requires attribution wherever the graphics are used. */}
        <p className="setts-credit sub">
          Иконки — Twemoji (CC-BY 4.0) и Material Symbols (Apache 2.0), шрифт — Nunito (SIL OFL)
        </p>
      </div>

      {confirmReplay && (
        <Sheet onClose={() => setConfirmReplay(false)}>
          <Mascot size={90} state="wave" />
          <b className="h2">Пройти заново?</b>
          <p className="sub">
            Карта откроется с самого начала. Очки, наклейки, дни подряд и лучшая серия останутся!
          </p>
          <button
            className="btn btn--blue btn--block"
            onClick={() => {
              dispatch({ type: 'replay' })
              setConfirmReplay(false)
              nav('/', { replace: true })
            }}
          >
            Да, начать сначала
          </button>
          <button className="btn btn--ghost btn--block" onClick={() => setConfirmReplay(false)}>
            Отмена
          </button>
        </Sheet>
      )}

      {confirmReset && (
        <Sheet onClose={() => setConfirmReset(false)}>
          <Mascot size={90} state="think" />
          <b className="h2">Точно сбросить?</b>
          <p className="sub">Все звёзды, наклейки, очки и дни подряд исчезнут. Это нельзя отменить.</p>
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
        </Sheet>
      )}
    </div>
  )
}
