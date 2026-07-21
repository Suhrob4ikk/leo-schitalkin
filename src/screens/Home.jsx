import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Mascot from '../components/Mascot.jsx'
import Icon from '../components/Icon.jsx'
import UiIcon from '../components/UiIcon.jsx'
import Cub, { SPECIES } from '../components/Cub.jsx'
import PickBuddy from './PickBuddy.jsx'
import { Stars } from '../components/ui.jsx'
import StreakCalendar from '../components/StreakCalendar.jsx'
import Sheet from '../components/Sheet.jsx'
import GoalRing from '../components/GoalRing.jsx'
import { useStore, usePracticedToday, useStreak, useDailyGoal } from '../game/store.jsx'
import { UNITS, isUnlocked, currentLessonId, unitProgress, canTakeExam, canJumpTo, unitsUpTo } from '../game/curriculum.js'
import { EXAM_LENGTH, EXAM_MAX_MISTAKES, JUMP_LENGTH, JUMP_MAX_MISTAKES } from '../game/generators.js'
import { sfx } from '../game/audio.js'
import './Home.css'

/* Path geometry. x is a percentage of the column width, y is in pixels, and the
   road SVG is stretched over the same box with a non-scaling stroke — so the
   winding line and the nodes always agree, at any screen width.
 *
 * Every vertical measure is multiplied by the text-size setting. The nodes,
 * titles and pill are all sized in rem and so grow with it; a fixed pixel gap
 * meant that at "Огромный" the next node landed on top of the previous node's
 * title and the road stopped lining up with the nodes entirely. */
const SP_BASE = 128 // vertical gap between node centres, at text scale 1
/* Headroom above the first node. The mascot hangs off the top of its slot and
   reaches ~135px above the node's centre; at 100 it stuck out past the top of
   .path, where the sticky unit banner (higher z-index) sliced its ears off. */
const HEAD_BASE = 155
const TAIL_BASE = 78 // room under the last node for its title
const AMP = 27 // horizontal swing, in % of the column

// The sine puts consecutive nodes anywhere from 20% to nearly 0% apart
// horizontally, so a title can never be relied on to miss the node below it
// sideways — the vertical gap is what guarantees it clears, and it has to fit
// the tallest case: a two-line title sitting under the НАЧАТЬ pill.
const nodeX = (i) => 50 + Math.sin(i * 0.85) * AMP

const makeNodeY = (scale) => (i) => HEAD_BASE * scale + i * (SP_BASE * scale)

function roadPath(count, nodeY, sp) {
  if (count < 2) return ''
  let d = `M ${nodeX(0)} ${nodeY(0)}`
  for (let i = 1; i < count; i++) {
    d += ` C ${nodeX(i - 1)} ${nodeY(i - 1) + sp * 0.55}, ${nodeX(i)} ${nodeY(i) - sp * 0.55}, ${nodeX(i)} ${nodeY(i)}`
  }
  return d
}

function UnitPath({ unit, lessons, currentId, leoState, scale, currentRef }) {
  const nav = useNavigate()
  const [bumped, setBumped] = useState(null)
  const count = unit.lessons.length
  const nodeY = makeNodeY(scale)
  const sp = SP_BASE * scale
  const height = nodeY(count - 1) + TAIL_BASE * scale

  const tap = (l, unlocked, i) => {
    if (!unlocked) {
      // Locked nodes wobble and say why, rather than doing nothing.
      sfx.soft()
      setBumped({ id: l.id, i })
      setTimeout(() => setBumped(null), 1600)
      return
    }
    sfx.tap()
    nav(`/lesson/${l.id}`)
  }

  return (
    <div className="path" style={{ height }}>
      <svg
        className="path-road"
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={roadPath(count, nodeY, sp)} className="road-base" vectorEffect="non-scaling-stroke" />
        <path d={roadPath(count, nodeY, sp)} className="road-dash" vectorEffect="non-scaling-stroke" />
      </svg>

      {unit.lessons.map((l, i) => {
        const rec = lessons[l.id]
        const unlocked = isUnlocked(l.id, lessons)
        const done = Boolean(rec?.done)
        const isCurrent = l.id === currentId

        return (
          <div
            key={l.id}
            ref={isCurrent ? currentRef : undefined}
            className={`node-slot ${isCurrent ? 'is-here' : ''}`}
            style={{ left: `${nodeX(i)}%`, top: `${nodeY(i)}px` }}
          >
            {isCurrent && (
              <div className="node-leo">
                <Mascot size={74} state={leoState} />
              </div>
            )}

            <button
              type="button"
              className={`node node--${unit.color} ${done ? 'is-done' : ''} ${!unlocked ? 'is-locked' : ''} ${
                isCurrent ? 'is-current' : ''
              } ${bumped?.id === l.id ? 'is-bumped' : ''}`}
              onClick={() => tap(l, unlocked, i)}
              aria-label={`${l.title}${unlocked ? '' : ' — закрыто'}`}
            >
              <span className="node-icon">
                {/* The lock is UI, not content: as a grey glyph it recedes
                    into the greyed-out node instead of being a bright yellow
                    padlock advertising the one thing that can't be tapped. */}
                {unlocked ? <Icon e={l.icon} size="1.7rem" /> : <UiIcon name="lock" size="1.5rem" />}
              </span>
            </button>

            {/* The call to action sits below the node, not above it: above, it
                would have to clear Лео's full height and the banner on top of
                that, which pushes the whole path down for one label. */}
            {isCurrent && <span className={`node-bubble node-bubble--${unit.color}`}>{done ? 'ЕЩЁ РАЗ' : 'НАЧАТЬ'}</span>}

            <span className="node-title">{l.title}</span>
            {done && <Stars count={rec.stars} size="sm" />}
          </div>
        )
      })}

      {/* Anchored to the path, not to the node that was tapped. Inside a slot it
          would be centred on a node sitting up to 77% across and run off the
          screen — and the slot's own transform traps its z-index, so the next
          node down painted right over the text. */}
      {bumped && (
        <div className="path-hint" style={{ top: `${nodeY(bumped.i) + 44}px` }}>
          Сначала пройди предыдущий!
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const nav = useNavigate()
  const { state } = useStore()
  const streak = useStreak()
  const practiced = usePracticedToday()
  const goal = useDailyGoal()
  const mistakeCount = state.mistakes?.length ?? 0
  const [showCal, setShowCal] = useState(false)
  const [adult, setAdult] = useState(false)
  const [examUnit, setExamUnit] = useState(null)
  const [jumpUnit, setJumpUnit] = useState(null)
  const currentRef = useRef(null)
  const [offscreen, setOffscreen] = useState(false)
  // Which way the current node lies relative to the viewport, so "Я тут" points
  // at it instead of always pointing down.
  const [hereDir, setHereDir] = useState('up')

  /* Scroll straight to where the child actually is, on every visit. Opening
     eight units up at unit one and hunting downwards is the single most
     repeated annoyance on this screen. */
  useEffect(() => {
    const el = currentRef.current
    if (!el) return
    const t = setTimeout(() => {
      el.scrollIntoView({ block: 'center', behavior: 'auto' })
    }, 60)
    return () => clearTimeout(t)
  }, [])

  /* …and if they scroll away from it, offer a way back rather than making
     them find it again. */
  useEffect(() => {
    const el = currentRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    // threshold 0: fire the moment the node fully enters or leaves the viewport.
    // A larger threshold only fires while crossing that ratio, so once the node
    // scrolled past it the button stayed hidden until the very bottom of the map.
    const io = new IntersectionObserver(
      ([e]) => {
        setOffscreen(!e.isIntersecting)
        // The node is above the viewport when its top is off the top edge.
        if (!e.isIntersecting) setHereDir(e.boundingClientRect.top < 0 ? 'up' : 'down')
      },
      { threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // First run: pick a companion before anything else. Nothing on the map means
  // anything until the child knows who they're travelling with.
  if (!state.settings.buddy) return <PickBuddy />

  const currentId = currentLessonId(state.lessons)
  // He naps until the day's first question — the nudge is the mascot, not a banner.
  const leoState = practiced ? 'wave' : 'sleepy'

  return (
    <div className="screen home">
      <header className="home-top safe-top">
        <div className="shell home-top-row">
          <button
            type="button"
            className={`chip chip--streak ${streak.activeToday ? 'is-hot' : ''}`}
            onClick={() => setShowCal(true)}
          >
            <Icon e="🔥" className="chip-icon" size="1.15rem" />
            <b className="tnum">{streak.current}</b>
          </button>

          <div className="chip chip--xp">
            <Icon e="⚡" className="chip-icon" size="1.15rem" />
            <b className="tnum">{state.xp}</b>
          </div>

          {/* A run in progress is worth protecting, so it has to be visible
              before the next lesson starts — not only during one. */}
          {state.combo >= 3 && (
            <div className="chip chip--combo" title="Правильных подряд">
              <Icon e="🎯" className="chip-icon" size="1.15rem" />
              <b className="tnum">{state.combo}</b>
            </div>
          )}

          <Link to="/collection" className="icon-btn chip-btn" aria-label="Коллекция">
            <Icon e="🎖️" size="1.4rem" />
          </Link>

          {/* Deliberately small, dim, and gated — the child shouldn't wander in. */}
          <button
            type="button"
            className="icon-btn gear"
            onClick={() => setAdult(true)}
            aria-label="Для взрослых"
          >
            <UiIcon name="gear" size="1.3rem" />
          </button>
        </div>

        {/* Today's goal, and mistakes worth revisiting. Part of the sticky
            header rather than the top of the scroller: the map auto-scrolls to
            the current node, which would carry anything above it off screen
            and out of mind. */}
        <div className="shell today-row">
          <div className={`today-pill goal-pill ${goal.done ? 'is-done' : ''}`}>
            <GoalRing ratio={goal.ratio} done={goal.done} size={34}>
              {goal.done ? <Icon e="✅" size="0.9rem" /> : null}
            </GoalRing>
            <span className="today-text">
              <b>{goal.done ? 'Цель дня!' : 'Цель дня'}</b>
              <span className="sub tnum">
                {goal.earned} / {goal.goal}
              </span>
            </span>
          </div>

          {/* Quick table practice, outside the map. Labelled rather than a bare
              icon in the header — a lightning glyph alone read as "another XP". */}
          <button
            type="button"
            className="today-pill trainer-pill"
            onClick={() => {
              sfx.tap()
              nav('/trainer')
            }}
          >
            <span className="trainer-pill-icon">
              <UiIcon name="replay" size="1.2rem" />
            </span>
            <span className="today-text">
              <b>Тренажёр</b>
              <span className="sub">Повтори таблицу</span>
            </span>
          </button>

          {mistakeCount >= 4 && (
            <button
              type="button"
              className="today-pill mistakes-pill"
              onClick={() => {
                sfx.tap()
                nav('/lesson/mistakes')
              }}
            >
              <span className="mistakes-count tnum">{mistakeCount}</span>
              <span className="today-text">
                <b>Над ошибками</b>
                <span className="sub">Повторить</span>
              </span>
            </button>
          )}
        </div>
      </header>

      <div className="shell home-body">
        {!practiced && (
          <div className="nudge-card">
            <b>{SPECIES[state.settings.buddy]?.name ?? 'Лео'} заскучал!</b>
            <span className="sub">
              Позанимаемся сегодня? <Icon e="🔥" />
            </span>
          </div>
        )}

        {UNITS.map((unit, ui) => {
          const p = unitProgress(unit, state.lessons)
          const cleared = p.ratio === 1
          return (
            <Fragment key={unit.id}>
            <section className="unit">
              <div className={`unit-banner unit-banner--${unit.color} ${cleared ? 'is-complete' : ''}`}>
                {/* Each unit is hosted by one of the three friends, so moving
                    through the map feels like visiting them in turn. The
                    child's own chosen buddy still walks the path with them. */}
                <div className="unit-host">
                  <Cub species={unit.host} state={cleared ? 'cheer' : p.done > 0 ? 'happy' : 'wave'} size={62} />
                </div>
                <div className="unit-meta">
                  <span className="unit-kicker">
                    Раздел {ui + 1} · {SPECIES[unit.host]?.name}
                  </span>
                  <b className="unit-title">{unit.title}</b>
                  <span className="unit-sub">
                    {p.done} из {p.total} · {unit.subtitle}
                  </span>
                </div>
                {/* Test-out. Only on a unit that's open but unfinished — there
                    is nothing to skip past otherwise. */}
                {canTakeExam(unit, state.lessons) ? (
                  /* Names the intent, not the mechanism. "Проверка" describes
                     what the button does internally; a child needs to know what
                     it's FOR — and so does a parent glancing at the screen. */
                  <button
                    type="button"
                    className="unit-exam"
                    onClick={() => setExamUnit(unit)}
                    aria-label={`Пропустить раздел «${unit.title}» — сдать проверку`}
                  >
                    <Icon e="⚡" className="unit-exam-icon" size="1.15rem" />
                    <span>
                      Знаю
                      <br />
                      это!
                    </span>
                  </button>
                ) : canJumpTo(unit, state.lessons) ? (
                  /* Locked units aren't dead ends: prove the ones in between
                     and start here instead. */
                  <button
                    type="button"
                    className="unit-exam unit-exam--jump"
                    onClick={() => setJumpUnit(unit)}
                    aria-label={`Перейти сразу к разделу «${unit.title}»`}
                  >
                    <UiIcon name="next" size="1.15rem" className="unit-exam-icon" />
                    <span>
                      Сразу
                      <br />
                      сюда
                    </span>
                  </button>
                ) : cleared ? (
                  /* A finished unit wears a seal instead of its topic icon — a
                     small "conquered" stamp, so scrolling back shows a trail of
                     cleared sections rather than a wall of identical banners. */
                  <div className="unit-seal" aria-label="Раздел пройден">
                    <UiIcon name="check" size="1.4rem" />
                  </div>
                ) : (
                  <Icon e={unit.icon} className="unit-icon" size="1.9rem" />
                )}
              </div>

              <UnitPath
                unit={unit}
                lessons={state.lessons}
                currentId={currentId}
                leoState={leoState}
                scale={state.settings.textScale}
                currentRef={currentRef}
              />
            </section>

            {/* A landmark between sections: a planted flag once the section
                above is cleared, a faint waypoint until then — so the road reads
                as a journey with checkpoints, not one long list. */}
            {ui < UNITS.length - 1 && (
              <div className={`checkpoint ${cleared ? 'is-cleared' : ''}`}>
                <div className="checkpoint-badge">
                  {cleared ? <Icon e="🏁" size="1.3rem" /> : <span className="checkpoint-dot" />}
                </div>
                {cleared && <span className="checkpoint-text">Раздел пройден!</span>}
              </div>
            )}
            </Fragment>
          )
        })}
      </div>

      {/* Only while the current node is off screen, so it's a way back rather
          than permanent clutter. */}
      {offscreen && (
        <button
          type="button"
          className={`here-btn here-btn--${hereDir}`}
          onClick={() => {
            sfx.tap()
            currentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
          }}
        >
          <UiIcon name="next" size="1.1rem" className="here-arrow" />
          Я тут
        </button>
      )}

      {showCal && <StreakCalendar onClose={() => setShowCal(false)} />}

      {jumpUnit && (
        <Sheet onClose={() => setJumpUnit(null)}>
          <Cub species={jumpUnit.host} size={100} state="wave" />
          <b className="h2">Сразу сюда?</b>
          <p className="sub">
            Чтобы начать с раздела «{jumpUnit.title}», надо показать, что ты уже знаешь всё до него.
          </p>
          <div className="jump-list">
            {unitsUpTo(jumpUnit, state.lessons).map((u, i, arr) => (
              <span key={u.id} className={`jump-item ${i === arr.length - 1 ? 'is-target' : ''}`}>
                <Icon e={u.icon} size="1.1rem" /> {u.title}
              </span>
            ))}
          </div>
          <p className="sub">
            {JUMP_LENGTH} вопросов, можно ошибиться {JUMP_MAX_MISTAKES} раза.
          </p>
          <button
            className="btn btn--gold btn--block"
            onClick={() => {
              sfx.tap()
              nav(`/lesson/jump-${jumpUnit.id}`)
            }}
          >
            Начать проверку
          </button>
          <button className="btn btn--ghost btn--block" onClick={() => setJumpUnit(null)}>
            Отмена
          </button>
        </Sheet>
      )}

      {examUnit && (
        <Sheet onClose={() => setExamUnit(null)}>
          <Mascot size={100} state="wave" />
          <b className="h2">Уже умеешь?</b>
          <p className="sub">
            Проверка по разделу «{examUnit.title}». {EXAM_LENGTH} вопросов, можно ошибиться{' '}
            {EXAM_MAX_MISTAKES} раза.
          </p>
          {/* Shown up front: the reward for care is visible before the child
              starts, not discovered afterwards. */}
          <div className="exam-scale">
            <span>
              <b>0 ошибок</b> <Stars count={3} size="sm" />
            </span>
            <span>
              <b>1 ошибка</b> <Stars count={2} size="sm" />
            </span>
            <span>
              <b>2 ошибки</b> <Stars count={1} size="sm" />
            </span>
          </div>
          <p className="sub">Сдашь — весь раздел откроется сразу!</p>
          <button
            className="btn btn--gold btn--block"
            onClick={() => {
              sfx.tap()
              nav(`/lesson/exam-${examUnit.id}`)
            }}
          >
            <Icon e="🎓" size="1.1rem" /> Начать проверку
          </button>
          <button className="btn btn--ghost btn--block" onClick={() => setExamUnit(null)}>
            Лучше пройду уроки
          </button>
        </Sheet>
      )}

      {adult && (
        <Sheet onClose={() => setAdult(false)}>
          <Icon e="👋" size="2.6rem" />
          <b className="h2">Для взрослых</b>
          <p className="sub">Здесь настройки и успехи. Позови маму или папу!</p>
          {/* Both destinations offered here. Settings used to be four taps
              deep — gear, "Я взрослый", Успехи, gear again — which is how the
              reset buttons became impossible to find. */}
          <button
            className="btn btn--blue btn--block"
            onClick={() => {
              setAdult(false)
              nav('/tutor')
            }}
          >
            <UiIcon name="chart" size="1.1rem" /> Успехи
          </button>
          <button
            className="btn btn--white btn--block"
            onClick={() => {
              setAdult(false)
              nav('/settings')
            }}
          >
            <UiIcon name="gear" size="1.1rem" /> Настройки
          </button>
          <button className="btn btn--ghost btn--block" onClick={() => setAdult(false)}>
            Назад к игре
          </button>
        </Sheet>
      )}
    </div>
  )
}
