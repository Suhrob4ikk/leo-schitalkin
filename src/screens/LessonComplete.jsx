import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import Mascot from '../components/Mascot.jsx'
import { Stars, Sticker } from '../components/ui.jsx'
import { useStore, starsFor } from '../game/store.jsx'
import { ALL_LESSONS, LESSON_BY_ID, UNITS, UNIT_BY_ID, lessonIndex } from '../game/curriculum.js'
import { earnedMilestones, STICKERS } from '../game/stickers.js'
import { sfx } from '../game/audio.js'
import { cannons, rain } from '../game/confetti.js'
import './LessonComplete.css'

const fmtTime = (s) => (s < 60 ? `${s} сек` : `${Math.floor(s / 60)} мин ${s % 60} сек`)

/** True when this lesson was the last node of its unit — which means the next
    unit just opened up, and that deserves the biggest celebration in the app. */
function unlockedUnit(lessonId) {
  const unit = UNITS.find((u) => u.lessons[u.lessons.length - 1].id === lessonId)
  if (!unit) return null
  const i = UNITS.indexOf(unit)
  return UNITS[i + 1] ?? null
}

export default function LessonComplete() {
  const { id } = useParams()
  const nav = useNavigate()
  const { state, dispatch } = useStore()
  const loc = useLocation()
  const fired = useRef(false)

  const lesson = LESSON_BY_ID[id]
  const res = loc.state
  const [fresh, setFresh] = useState([])

  // Milestones are derived, so they're settled once here rather than guessed at
  // by each lesson — replaying a lesson can't re-award them.
  useEffect(() => {
    const earned = earnedMilestones(state, UNITS)
    const brandNew = earned.filter((m) => !state.stickers.includes(m))
    brandNew.forEach((m) => dispatch({ type: 'unlockSticker', id: m }))
    setFresh(brandNew)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const nextUnit = unlockedUnit(id)
  const perfect = res?.perfect

  useEffect(() => {
    if (fired.current || !res) return
    fired.current = true

    // A failed exam gets no party at all — confetti over "почти получилось"
    // would read as mockery. Just the soft cue, and warm words on screen.
    if (res.exam && !res.passed) {
      sfx.soft()
      return
    }

    // Four tiers, so each of these actually feels different.
    if (res.exam) {
      sfx.bigWin()
      cannons({ count: 80 })
      rain(2600, { perTick: 8 })
    } else if (nextUnit) {
      sfx.bigWin()
      cannons({ count: 90 })
      rain(3200, { perTick: 9 })
    } else if (perfect) {
      sfx.bigWin()
      cannons({ count: 70 })
      rain(2000, { perTick: 6 })
    } else {
      sfx.fanfare()
      cannons({ count: 55 })
    }
  }, [nextUnit, perfect, res])

  // Landing here directly (a refresh, a bookmark) has no result to show.
  if (!res) return <Navigate to="/" replace />

  // Exam result: pass unlocks a whole unit, fail costs nothing but the time.
  if (res.exam) {
    const unit = UNIT_BY_ID[res.unitId]
    return (
      <div className={`screen done ${res.passed ? '' : 'done--soft'}`}>
        <div className="shell done-body safe-top">
          <div className="done-leo">
            <Mascot size={190} state={res.passed ? 'happy' : 'think'} />
          </div>
          <h1 className={`done-title ${res.passed ? '' : 'is-soft'}`}>
            {res.passed ? 'Сдал!' : 'Почти получилось!'}
          </h1>
          <p className="sub done-lesson">{unit?.title}</p>

          {res.passed ? (
            <>
              <div className="perfect-badge">🎓 Раздел пройден!</div>
              <div className="unlock-card">
                <span className="unlock-icon">{unit?.icon}</span>
                <div>
                  <b>Все уроки раздела открыты</b>
                  <span className="sub">Можно идти дальше</span>
                </div>
              </div>
            </>
          ) : (
            <div className="unlock-card unlock-card--soft">
              <span className="unlock-icon">💪</span>
              <div>
                <b>Пройди уроки — и всё получится</b>
                <span className="sub">Проверку можно повторить в любой момент</span>
              </div>
            </div>
          )}

          <div className="done-stats">
            <div className="dstat dstat--xp">
              <span className="dstat-label">Очки</span>
              <b className="tnum">+{res.xp}</b>
            </div>
            <div className="dstat dstat--acc">
              <span className="dstat-label">Точность</span>
              <b className="tnum">{Math.round(res.accuracy * 100)}%</b>
            </div>
            <div className="dstat dstat--time">
              <span className="dstat-label">Время</span>
              <b className="tnum">{fmtTime(res.seconds)}</b>
            </div>
          </div>
        </div>

        <div className="done-actions shell safe-bottom">
          <button className="btn btn--green btn--block btn--big" onClick={() => nav('/', { replace: true })}>
            На карту
          </button>
        </div>
      </div>
    )
  }

  if (!lesson) return <Navigate to="/" replace />

  const stars = starsFor(res.accuracy)
  const pct = Math.round(res.accuracy * 100)
  const i = lessonIndex(id)
  const nextLesson = ALL_LESSONS[i + 1]

  const stickerIds = [lesson.sticker, ...fresh].filter((s) => s && STICKERS[s])

  return (
    <div className="screen done">
      <div className="shell done-body safe-top">
        <div className="done-leo">
          <Mascot size={190} state="happy" />
        </div>

        <h1 className={`done-title ${perfect ? 'is-perfect' : ''}`}>
          {nextUnit ? 'Новый раздел открыт!' : perfect ? 'Идеально!' : 'Урок пройден!'}
        </h1>
        <p className="sub done-lesson">{lesson.title}</p>

        {perfect && <div className="perfect-badge">⭐ Ни одной ошибки!</div>}

        <Stars count={stars} size="lg" animate />

        <div className="done-stats">
          <div className="dstat dstat--xp">
            <span className="dstat-label">Очки</span>
            <b className="tnum">+{res.xp}</b>
          </div>
          <div className="dstat dstat--acc">
            <span className="dstat-label">Точность</span>
            <b className="tnum">{pct}%</b>
          </div>
          <div className="dstat dstat--time">
            <span className="dstat-label">Время</span>
            <b className="tnum">{fmtTime(res.seconds)}</b>
          </div>
        </div>

        {stickerIds.length > 0 && (
          <div className="done-stickers">
            <span className="sub">{stickerIds.length > 1 ? 'Новые наклейки!' : 'Новая наклейка!'}</span>
            <div className="done-sticker-row">
              {stickerIds.map((sid) => (
                <div key={sid} className="done-sticker-pop">
                  <Sticker id={sid} size={96} />
                </div>
              ))}
            </div>
          </div>
        )}

        {nextUnit && (
          <div className="unlock-card">
            <span className="unlock-icon">{nextUnit.icon}</span>
            <div>
              <b>{nextUnit.title}</b>
              <span className="sub">Теперь доступен!</span>
            </div>
          </div>
        )}
      </div>

      <div className="done-actions shell safe-bottom">
        {nextLesson && (
          <button
            className="btn btn--green btn--block btn--big"
            onClick={() => nav(`/lesson/${nextLesson.id}`, { replace: true })}
          >
            Дальше →
          </button>
        )}
        <button className="btn btn--white btn--block" onClick={() => nav('/', { replace: true })}>
          На карту
        </button>
      </div>
    </div>
  )
}
