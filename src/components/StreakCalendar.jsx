import { useStore, dayKey, shiftDay, useStreak } from '../game/store.jsx'
import Sheet from './Sheet.jsx'
import Icon from './Icon.jsx'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

/** Four weeks back, aligned to Monday. Practised days get a flame; today is
    ringed whether or not it's been done yet. */
export default function StreakCalendar({ onClose }) {
  const { state } = useStore()
  const streak = useStreak()
  const today = dayKey()

  // Walk back to the Monday of the current week, then back three more weeks.
  const now = new Date()
  const dow = (now.getDay() + 6) % 7 // Monday = 0
  let cursor = shiftDay(today, -dow - 21)

  const cells = []
  for (let i = 0; i < 28; i++) {
    const d = state.days[cursor]
    cells.push({
      key: cursor,
      day: Number(cursor.split('-')[2]),
      active: (d?.total ?? 0) > 0,
      isToday: cursor === today,
      future: cursor > today,
    })
    cursor = shiftDay(cursor, 1)
  }

  return (
    <Sheet onClose={onClose} className="cal-sheet">
      <>
        <div className="cal-head">
          <Icon e="🔥" className="cal-flame" size="2.6rem" />
          <div>
            <b className="h1 tnum">{streak.current}</b>
            <span className="sub"> {streak.current === 1 ? 'день' : streak.current < 5 ? 'дня' : 'дней'} подряд</span>
          </div>
        </div>
        <p className="sub">Лучший результат: {streak.longest}</p>

        <div className="cal-grid">
          {WEEKDAYS.map((w) => (
            <span key={w} className="cal-dow">
              {w}
            </span>
          ))}
          {cells.map((c) => (
            <span
              key={c.key}
              className={`cal-cell ${c.active ? 'is-active' : ''} ${c.isToday ? 'is-today' : ''} ${
                c.future ? 'is-future' : ''
              }`}
            >
              {c.active ? <Icon e="🔥" size="1rem" /> : c.day}
            </span>
          ))}
        </div>

        <button className="btn btn--green btn--block" onClick={onClose}>
          Закрыть
        </button>
      </>
    </Sheet>
  )
}
