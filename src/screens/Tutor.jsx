import { Link, useNavigate } from 'react-router-dom'
import { Stars } from '../components/ui.jsx'
import { useStore, lastNDays, useStreak } from '../game/store.jsx'
import { ALL_LESSONS, UNITS } from '../game/curriculum.js'
import './Tutor.css'

const TOPIC_LABELS = {
  numberline: 'Числовая прямая',
  basten: 'Десятки и единицы',
  regroup: 'Переход через десяток',
  compare: 'Сравнение чисел',
  missing: 'Пропущенное число',
  chain: 'Цепочки вычислений',
  word: 'Задачи с картинками',
  terms: 'Сумма, разность, термины',
  column: 'Сложение в столбик',
  order: 'Скобки',
  'order-mult': 'Порядок действий',
  composite: 'Задачи в 2 действия',
  'composite-mult': 'Сложные задачи',
  'mult-concept': 'Смысл умножения',
  'mult-terms': 'Произведение, частное',
  'div-intro': 'Смысл деления',
}
for (let t = 2; t <= 10; t++) {
  TOPIC_LABELS[`table-${t}`] = `Таблица ×${t}`
  TOPIC_LABELS[`div-${t}`] = `Деление на ${t}`
}

const STRUGGLE_BELOW = 0.6
const MIN_SAMPLE = 4 // below this, an "accuracy" is noise, not a signal

const mins = (sec) => Math.round(sec / 60)
const pct = (r) => `${Math.round(r * 100)}%`

function fmtDate(iso) {
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** Minutes practised per day for the last two weeks. */
function DayChart({ days }) {
  const keys = lastNDays(14)
  const data = keys.map((k) => ({ k, m: mins(days[k]?.seconds ?? 0) }))
  const peak = Math.max(10, ...data.map((d) => d.m))

  return (
    <div className="chart">
      <div className="chart-bars">
        {data.map(({ k, m }) => (
          <div key={k} className="chart-col" title={`${k}: ${m} мин`}>
            <span className="chart-val">{m || ''}</span>
            <div className="chart-track">
              <div
                className={`chart-bar ${m > 0 ? 'is-on' : ''}`}
                style={{ height: `${Math.max(m > 0 ? 6 : 2, (m / peak) * 100)}%` }}
              />
            </div>
            <span className="chart-day">{Number(k.split('-')[2])}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Every multiplication fact, coloured by how reliably he gets it right. This is
    the thing worth glancing at before an offline session — it points straight at
    which facts to drill. */
function FactGrid({ facts }) {
  const rows = [2, 3, 4, 5, 6, 7, 8, 9, 10]
  const cls = (rec) => {
    if (!rec || rec.total === 0) return 'is-none'
    const r = rec.correct / rec.total
    if (r >= 0.8) return 'is-good'
    if (r >= 0.5) return 'is-mid'
    return 'is-bad'
  }
  return (
    <div className="fg">
      <div className="fg-row fg-row--head">
        <span className="fg-cell fg-cell--head" />
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="fg-cell fg-cell--head">
            {i + 1}
          </span>
        ))}
      </div>
      {rows.map((t) => (
        <div key={t} className="fg-row">
          <span className="fg-cell fg-cell--head">×{t}</span>
          {Array.from({ length: 10 }, (_, i) => {
            const rec = facts[`${t}x${i + 1}`]
            return (
              <span
                key={i}
                className={`fg-cell ${cls(rec)}`}
                title={rec ? `${t}×${i + 1}: ${rec.correct}/${rec.total}` : `${t}×${i + 1}: не было`}
              />
            )
          })}
        </div>
      ))}
      <div className="fg-legend">
        <span>
          <i className="is-good" /> уверенно
        </span>
        <span>
          <i className="is-mid" /> нестабильно
        </span>
        <span>
          <i className="is-bad" /> трудно
        </span>
        <span>
          <i className="is-none" /> не было
        </span>
      </div>
    </div>
  )
}

export default function Tutor() {
  const nav = useNavigate()
  const { state } = useStore()
  const streak = useStreak()

  const totalSec = Object.values(state.days).reduce((s, d) => s + d.seconds, 0)
  const doneCount = ALL_LESSONS.filter((l) => state.lessons[l.id]?.done).length

  const struggling = Object.entries(state.topics)
    .filter(([, r]) => r.total >= MIN_SAMPLE && r.correct / r.total < STRUGGLE_BELOW)
    .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)

  const recent = [...state.sessions].reverse().slice(0, 8)

  return (
    <div className="screen tutor">
      <header className="coll-top safe-top shell">
        <button className="icon-btn" onClick={() => nav('/')} aria-label="Назад">
          ←
        </button>
        <b className="h2">Успехи</b>
        <Link to="/settings" className="icon-btn tutor-gear" aria-label="Настройки">
          ⚙️
        </Link>
      </header>

      <div className="shell tutor-body">
        <div className="kpis">
          <div className="kpi">
            <b className="tnum">{doneCount}</b>
            <span>из {ALL_LESSONS.length} уроков</span>
          </div>
          <div className="kpi">
            <b className="tnum">{mins(totalSec)}</b>
            <span>минут всего</span>
          </div>
          <div className="kpi">
            <b className="tnum">{streak.current}</b>
            <span>дней подряд</span>
          </div>
          <div className="kpi">
            <b className="tnum">{state.xp}</b>
            <span>очков</span>
          </div>
        </div>

        {struggling.length > 0 ? (
          <section className="card warn-card">
            <b className="warn-title">⚠️ Тяжело даётся</b>
            <p className="sub">Точность ниже {Math.round(STRUGGLE_BELOW * 100)}% — стоит повторить вместе.</p>
            <ul className="warn-list">
              {struggling.map(([topic, r]) => (
                <li key={topic}>
                  <span>{TOPIC_LABELS[topic] ?? topic}</span>
                  <b>
                    {pct(r.correct / r.total)}{' '}
                    <span className="warn-n">
                      ({r.correct}/{r.total})
                    </span>
                  </b>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="card ok-card">
            <b>✅ Слабых тем нет</b>
            <p className="sub">
              {Object.keys(state.topics).length === 0
                ? 'Данных пока нет — начните первый урок.'
                : 'Всё, что он проходил, идёт с точностью выше 60%.'}
            </p>
          </section>
        )}

        <h2 className="tutor-head">Минуты за 2 недели</h2>
        <section className="card chart-card">
          <DayChart days={state.days} />
        </section>

        <h2 className="tutor-head">Таблица умножения по фактам</h2>
        <section className="card">
          <FactGrid facts={state.facts} />
        </section>

        <h2 className="tutor-head">Уроки</h2>
        {UNITS.map((u) => (
          <section key={u.id} className="card lessons-card">
            <b className="lessons-unit">{u.title}</b>
            {u.lessons.map((l) => {
              const r = state.lessons[l.id]
              return (
                <div key={l.id} className={`lrow ${r?.done ? '' : 'is-todo'}`}>
                  <span className="lrow-icon">{l.icon}</span>
                  <span className="lrow-title">{l.title}</span>
                  {r?.done ? (
                    <>
                      <Stars count={r.stars} size="sm" />
                      <b className="lrow-acc tnum">{pct(r.best)}</b>
                    </>
                  ) : (
                    <span className="lrow-todo">—</span>
                  )}
                </div>
              )
            })}
          </section>
        ))}

        {recent.length > 0 && (
          <>
            <h2 className="tutor-head">Последние занятия</h2>
            <section className="card">
              {recent.map((s, i) => {
                const l = ALL_LESSONS.find((x) => x.id === s.lessonId)
                return (
                  <div key={i} className="srow">
                    <span className="srow-icon">{l?.icon ?? '📘'}</span>
                    <div className="srow-main">
                      <b>{l?.title ?? s.lessonId}</b>
                      <span className="sub">{fmtDate(s.at)}</span>
                    </div>
                    <div className="srow-meta">
                      <b className="tnum">{s.seconds < 60 ? `${s.seconds} с` : `${mins(s.seconds)} мин`}</b>
                      <span className="sub tnum">
                        {s.total ? `${s.correct}/${s.total}` : '—'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </section>
          </>
        )}

        <p className="tutor-foot sub">
          Все данные хранятся только на этом устройстве, в браузере. Ничего не отправляется в интернет.
        </p>
      </div>
    </div>
  )
}
