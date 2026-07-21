import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import Mascot from '../components/Mascot.jsx'
import Cub, { SPECIES } from '../components/Cub.jsx'
import NotifyGuide from '../components/NotifyGuide.jsx'
import { Stars, Sticker } from '../components/ui.jsx'
import { useStore, starsFor } from '../game/store.jsx'
import { ALL_LESSONS, LESSON_BY_ID, UNITS, UNIT_BY_ID, lessonIndex, practiceTitle } from '../game/curriculum.js'
import { earnedMilestones, STICKERS } from '../game/stickers.js'
import { sfx } from '../game/audio.js'
import { canNotify, notifyPermission } from '../game/notify.js'
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

/** The unit just finished — needed to tell whether the next one has a new host
    worth introducing, or the same friend carrying on. */
function finishedUnit(lessonId) {
  return UNITS.find((u) => u.lessons.some((l) => l.id === lessonId)) ?? null
}

export default function LessonComplete() {
  const { id } = useParams()
  const nav = useNavigate()
  const { state, dispatch } = useStore()
  const loc = useLocation()
  const fired = useRef(false)

  // Practice screens (mistake review, table trainer) aren't nodes on the map,
  // so they have no curriculum entry.
  const isPractice = id === 'mistakes' || id.startsWith('drill-')
  const lesson = isPractice ? { id, title: practiceTitle(id), sticker: null } : LESSON_BY_ID[id]
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
  const unlockedFrom = finishedUnit(id)
  const perfect = res?.perfect

  /* Offer reminders once, after a lesson is actually finished. Asked only if
     the browser hasn't already been answered, and never twice. */
  const [askNotify, setAskNotify] = useState(false)
  useEffect(() => {
    if (!res || res.exam) return
    if (localStorage.getItem('leo-asked-notify')) return
    if (!canNotify() || notifyPermission() !== 'default') return
    const t = setTimeout(() => setAskNotify(true), 2600) // let the party land first
    return () => clearTimeout(t)
  }, [res])

  const dismissNotify = () => {
    localStorage.setItem('leo-asked-notify', '1')
    setAskNotify(false)
  }

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
            {res.passed ? (res.mistakes === 0 ? 'Идеально!' : 'Сдал!') : 'Почти получилось!'}
          </h1>
          <p className="sub done-lesson">{unit?.title}</p>

          {res.passed ? (
            <>
              <div className="perfect-badge">
                <Icon e="🎓" size="1.05rem" />{' '}
                {res.mistakes === 0 ? 'Без единой ошибки!' : 'Раздел пройден!'}
              </div>
              {/* The stars every lesson in the unit just received. */}
              <Stars count={res.stars} size="lg" animate />
              <div className="unlock-card">
                <Icon e={unit?.icon} className="unlock-icon" size="2rem" />
                <div>
                  <b>Все уроки раздела открыты</b>
                  <span className="sub">
                    {res.mistakes === 0
                      ? 'И везде по три звезды!'
                      : `Ошибок: ${res.mistakes} · звёзд: ${res.stars}`}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="unlock-card unlock-card--soft">
              <Icon e="💪" className="unlock-icon" size="2rem" />
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

  // A practice run has no stars (it's not graded for mastery) and no "next
  // lesson" — lessonIndex is -1 for it, so ALL_LESSONS[i+1] would wrongly point
  // at the very first lesson.
  const review = Boolean(res.review)
  const stars = starsFor(res.accuracy)
  const pct = Math.round(res.accuracy * 100)
  const i = lessonIndex(id)
  const nextLesson = review ? null : ALL_LESSONS[i + 1]

  const stickerIds = [lesson.sticker, ...fresh].filter((s) => s && STICKERS[s])

  return (
    <div className="screen done">
      <div className="shell done-body safe-top">
        <div className="done-leo">
          <Mascot size={190} state="happy" />
        </div>

        <h1 className={`done-title ${perfect ? 'is-perfect' : ''}`}>
          {review
            ? perfect
              ? 'Идеально!'
              : 'Отличная тренировка!'
            : nextUnit
              ? 'Новый раздел открыт!'
              : perfect
                ? 'Идеально!'
                : 'Урок пройден!'}
        </h1>
        <p className="sub done-lesson">{lesson.title}</p>

        {perfect && (
          <div className="perfect-badge">
            <Icon e="⭐" size="1.05rem" /> Ни одной ошибки!
          </div>
        )}

        {!review && <Stars count={stars} size="lg" animate />}

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

        {/* Finishing a unit hands the child over to whoever hosts the next one.
            Written as a short exchange — the child reports what they just
            learned, the next friend answers with what's coming — so the map
            reads as a journey between friends rather than a list of topics. */}
        {nextUnit && (
          <div className="handoff">
            <p className="handoff-said">
              Я прошёл: <b>{unlockedFrom?.title}</b>!
            </p>
            <div className="handoff-reply">
              <Cub species={nextUnit.host} state="wave" size={110} />
              <div className="handoff-bubble">
                <b className="handoff-who">{SPECIES[nextUnit.host]?.name}</b>
                <span>{nextUnit.greeting}</span>
              </div>
            </div>
          </div>
        )}

        {nextUnit && (
          <div className="unlock-card">
            <Icon e={nextUnit.icon} className="unlock-icon" size="2rem" />
            <div>
              <b>{nextUnit.title}</b>
              <span className="sub">Теперь доступен!</span>
            </div>
          </div>
        )}
      </div>

      {/* Asked here, not on first launch: a permission prompt before the child
          has any reason to want reminders gets denied, and a denial is
          permanent until someone digs through browser settings. By now they
          have finished a lesson and there's a streak worth protecting. */}
      {/* The guide explains reminders before the browser's one-shot, permanent
          permission prompt — and covers installing to the home screen, without
          which background reminders silently never fire. */}
      {askNotify && (
        <NotifyGuide
          buddyName={SPECIES[state.settings.buddy]?.name ?? 'Лео'}
          onDone={(ok) => {
            if (ok) dispatch({ type: 'setSetting', key: 'notify', value: true })
            dismissNotify()
          }}
        />
      )}

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