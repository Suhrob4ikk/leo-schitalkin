import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Leo from '../components/Leo.jsx'
import { Stars } from '../components/ui.jsx'
import StreakCalendar from '../components/StreakCalendar.jsx'
import { useStore, usePracticedToday, useStreak } from '../game/store.jsx'
import { UNITS, isUnlocked, currentLessonId, unitProgress } from '../game/curriculum.js'
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
const HEAD_BASE = 100 // room above the first node for Лео + the sticky banner
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

function UnitPath({ unit, lessons, currentId, leoState, scale }) {
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
            className="node-slot"
            style={{ left: `${nodeX(i)}%`, top: `${nodeY(i)}px` }}
          >
            {isCurrent && (
              <div className="node-leo">
                <Leo size={74} state={leoState} />
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
              <span className="node-icon">{unlocked ? l.icon : '🔒'}</span>
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
  const [showCal, setShowCal] = useState(false)
  const [adult, setAdult] = useState(false)

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
            <span className="chip-icon">🔥</span>
            <b className="tnum">{streak.current}</b>
          </button>

          <div className="chip chip--xp">
            <span className="chip-icon">⚡</span>
            <b className="tnum">{state.xp}</b>
          </div>

          <Link to="/collection" className="icon-btn chip-btn" aria-label="Коллекция">
            🎖️
          </Link>

          {/* Deliberately small, dim, and gated — the child shouldn't wander in. */}
          <button
            type="button"
            className="icon-btn gear"
            onClick={() => setAdult(true)}
            aria-label="Для взрослых"
          >
            ⚙️
          </button>
        </div>
      </header>

      <div className="shell home-body">
        {!practiced && (
          <div className="nudge-card">
            <b>Лео заскучал!</b>
            <span className="sub">Позанимаемся сегодня? 🔥</span>
          </div>
        )}

        {UNITS.map((unit, ui) => {
          const p = unitProgress(unit, state.lessons)
          return (
            <section key={unit.id} className="unit">
              <div className={`unit-banner unit-banner--${unit.color}`}>
                <div className="unit-meta">
                  <span className="unit-kicker">Раздел {ui + 1}</span>
                  <b className="unit-title">{unit.title}</b>
                  <span className="unit-sub">
                    {p.done} из {p.total} · {unit.subtitle}
                  </span>
                </div>
                <span className="unit-icon">{unit.icon}</span>
              </div>

              <UnitPath
                unit={unit}
                lessons={state.lessons}
                currentId={currentId}
                leoState={leoState}
                scale={state.settings.textScale}
              />
            </section>
          )
        })}
      </div>

      {showCal && <StreakCalendar onClose={() => setShowCal(false)} />}

      {adult && (
        <div className="sheet-backdrop" onClick={() => setAdult(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <span style={{ fontSize: '2.6rem' }}>👋</span>
            <b className="h2">Для взрослых</b>
            <p className="sub">Здесь настройки и успехи. Позови маму или папу!</p>
            <button
              className="btn btn--blue btn--block"
              onClick={() => {
                setAdult(false)
                nav('/tutor')
              }}
            >
              Я взрослый
            </button>
            <button className="btn btn--ghost btn--block" onClick={() => setAdult(false)}>
              Назад к Лео
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
