import { useState } from 'react'
import Sheet from './Sheet.jsx'
import Mascot from './Mascot.jsx'
import Icon from './Icon.jsx'
import { requestNotifications, registerDailySync, sendTestNotification } from '../game/notify.js'

/*  Explains reminders before asking for permission.
 *
 *  The browser prompt is one-shot and permanent: a "block" can only be undone
 *  by digging through browser settings, which a parent will never do. So the
 *  case is made first, in plain language, and the prompt only appears after
 *  they've said yes to the idea.
 *
 *  It also has to explain installing to the home screen, because without that
 *  Periodic Background Sync never runs and the whole feature quietly does
 *  nothing — a limitation no browser tells the user about.
 */
export default function NotifyGuide({ buddyName = 'Лео', onDone }) {
  const [step, setStep] = useState(0)
  const [result, setResult] = useState(null)

  const ask = async () => {
    const res = await requestNotifications()
    setResult(res)
    if (res === 'granted') {
      await registerDailySync()
      sendTestNotification(buddyName)
      onDone?.(true)
    }
    setStep(2)
  }

  return (
    <Sheet onClose={() => onDone?.(false)} className="guide-sheet">
      {step === 0 && (
        <>
          <Mascot size={100} state="wave" />
          <b className="h2">Напоминания</b>
          <p className="sub">
            {buddyName} может раз в день звать заниматься, чтобы серия не прервалась.
          </p>
          <div className="guide-list">
            <span>
              <Icon e="🔔" size="1.1rem" /> Одно напоминание в день, не больше
            </span>
            <span>
              <Icon e="🌙" size="1.1rem" /> Никогда ночью — только с 9 до 21
            </span>
            <span>
              <Icon e="✅" size="1.1rem" /> Не придёт, если уже позанимались
            </span>
          </div>
          <button className="btn btn--green btn--block" onClick={() => setStep(1)}>
            Дальше
          </button>
          <button className="btn btn--ghost btn--block" onClick={() => onDone?.(false)}>
            Не сейчас
          </button>
        </>
      )}

      {step === 1 && (
        <>
          <span className="guide-big">
            <Icon e="📱" size="3rem" />
          </span>
          <b className="h2">Важно!</b>
          <p className="sub">
            Чтобы напоминания приходили, добавьте приложение на главный экран телефона:
          </p>
          <div className="guide-list guide-list--steps">
            <span>
              <b>1.</b> Меню браузера (⋮ или «Поделиться»)
            </span>
            <span>
              <b>2.</b> «Установить приложение» или «На экран Домой»
            </span>
            <span>
              <b>3.</b> Откройте приложение с главного экрана
            </span>
          </div>
          <p className="sub guide-note">
            Без этого браузер не разбудит приложение, и напоминания приходить не будут.
          </p>
          <button className="btn btn--green btn--block" onClick={ask}>
            Разрешить напоминания
          </button>
          <button className="btn btn--ghost btn--block" onClick={() => onDone?.(false)}>
            Позже
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <Mascot size={100} state={result === 'granted' ? 'cheer' : 'think'} />
          <b className="h2">{result === 'granted' ? 'Готово!' : 'Не получилось'}</b>
          <p className="sub">
            {result === 'granted'
              ? 'Сейчас придёт тестовое уведомление — так вы убедитесь, что всё работает.'
              : result === 'denied'
                ? 'Браузер запретил уведомления. Включить их можно в настройках браузера для этого сайта.'
                : 'Этот браузер не поддерживает уведомления. Попробуйте Chrome на Android.'}
          </p>
          <button className="btn btn--green btn--block" onClick={() => onDone?.(result === 'granted')}>
            Понятно
          </button>
        </>
      )}
    </Sheet>
  )
}
