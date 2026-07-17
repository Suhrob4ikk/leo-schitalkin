import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Leo from '../components/Leo.jsx'
import { Hearts, ProgressBar, SpeakButton } from '../components/ui.jsx'
import Sheet from '../components/Sheet.jsx'
import { useStore } from '../game/store.jsx'
import { LESSON_BY_ID } from '../game/curriculum.js'
import { buildLesson, checkAnswer } from '../game/generators.js'
import { sfx, stopSpeaking } from '../game/audio.js'
import { burst, burstFrom, rain } from '../game/confetti.js'

import ChoiceGrid from '../exercises/ChoiceGrid.jsx'
import PadExercise from '../exercises/PadExercise.jsx'
import NumberLine from '../exercises/NumberLine.jsx'
import BaseTen, { BaseTenBuild } from '../exercises/BaseTen.jsx'
import WordProblem from '../exercises/WordProblem.jsx'
import ColumnMath from '../exercises/ColumnMath.jsx'
import ColumnBlank from '../exercises/ColumnBlank.jsx'
import Compare from '../exercises/Compare.jsx'
import ArrayView, { ArrayBuild } from '../exercises/ArrayView.jsx'
import MatchPairs from '../exercises/MatchPairs.jsx'
import Chain from '../exercises/Chain.jsx'
import Teach from '../exercises/Teach.jsx'
import './Lesson.css'

const CHEERS = [
  'Отлично!',
  'Молодец!',
  'Супер!',
  'Верно!',
  'Здорово!',
  'Вот это да!',
  'Ты справился!',
  'Точно в цель!',
  'Красота!',
  'Лео в восторге!',
  'Как учитель!',
  'Щёлкаешь как орешки!',
]

/* Every 5 in a row without a slip. The wording escalates so the tenth feels
   bigger than the fifth — a flat "КОМБО" every time stops being a reward. */
const COMBO_STEP = 5
const COMBO_TIERS = [
  { at: 5, text: '5 подряд!', icon: '🔥' },
  { at: 10, text: '10 подряд! Огонь!', icon: '🚀' },
  { at: 15, text: '15 подряд! Невероятно!', icon: '💎' },
  { at: 20, text: '20 подряд! Ты чемпион!', icon: '👑' },
]
const comboTier = (n) => COMBO_TIERS.filter((t) => n >= t.at).pop() ?? COMBO_TIERS[0]
const NUDGES = ['Почти! Попробуй ещё раз', 'Чуть-чуть не хватило!', 'Уже близко! Ещё разок']
const SOFT = ['Ничего страшного!', 'Бывает! Теперь знаешь', 'Запомним это вместе']

const pickOne = (a) => a[(Math.random() * a.length) | 0]

/** How long a correct answer's celebration holds before moving on. This repeats
    hundreds of times, so anything extra here reads as sluggishness. The floor is
    Лео's jump: one cycle is 720ms, so dropping below ~750 would cut him off
    mid-air and the landing squash — the best part — would never be seen. */
const ADVANCE_MS = 800

export default function Lesson() {
  const { id } = useParams()
  const nav = useNavigate()
  const { state, dispatch } = useStore()
  const lesson = LESSON_BY_ID[id]

  const [questions] = useState(() => buildLesson(id, state))
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState('asking')
  const [attempt, setAttempt] = useState(0)
  const [hearts, setHearts] = useState(3)
  const [chosen, setChosen] = useState(null)
  const [value, setValue] = useState('')
  const [leo, setLeo] = useState('idle')
  const [msg, setMsg] = useState('')
  const [quitting, setQuitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)
  const [combo, setCombo] = useState(0)
  const [comboPop, setComboPop] = useState(null)

  // Kept in refs, not state: these are read inside timeout callbacks, which
  // would otherwise close over a stale render.
  const tally = useRef({ first: 0, graded: 0, xp: 0 })
  const missCount = useRef(0)
  const startedAt = useRef(Date.now())
  const advanceTimer = useRef(null)
  const finished = useRef(false)

  const q = questions[idx]
  const locked = phase !== 'asking'

  useEffect(() => () => clearTimeout(advanceTimer.current), [])
  useEffect(() => () => stopSpeaking(), [])

  // Guarded: `next` can fire from both the auto-advance timer and a Дальше tap,
  // and finishing twice would double-count the lesson.
  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    const { first, graded } = tally.current
    const seconds = Math.round((Date.now() - startedAt.current) / 1000)
    const accuracy = graded ? first / graded : 1
    const perfect = graded > 0 && first === graded
    const bonusXp = perfect ? 25 : 10

    dispatch({ type: 'finishLesson', lessonId: id, correct: first, total: graded, seconds, bonusXp })
    if (lesson?.sticker) dispatch({ type: 'unlockSticker', id: lesson.sticker })

    nav(`/done/${id}`, {
      replace: true,
      state: { accuracy, perfect, seconds, bonusXp, hearts, xp: tally.current.xp + bonusXp },
    })
  }, [dispatch, hearts, id, lesson, nav])

  const next = useCallback(() => {
    clearTimeout(advanceTimer.current)
    stopSpeaking()
    if (idx + 1 >= questions.length) {
      finish()
      return
    }
    setIdx((i) => i + 1)
    setPhase('asking')
    setAttempt(0)
    setChosen(null)
    setValue('')
    setLeo('idle')
    setMsg('')
    missCount.current = 0
  }, [finish, idx, questions.length])

  // Mirrors the XP the store awards, so the summary screen can show what was
  // earned in this lesson rather than only the running total.
  const grade = (correct, firstTry) => {
    dispatch({ type: 'answer', topic: q.topic, fact: q.fact, correct, firstTry })
    tally.current.graded += 1
    if (correct) tally.current.xp += firstTry ? 4 : 2
    if (correct && firstTry) tally.current.first += 1
  }

  const handleAnswer = (val, el) => {
    if (phase !== 'asking') return

    // Teaching screens are watched, not answered.
    if (q.kind === 'teach') {
      next()
      return
    }

    setChosen(val)
    const ok = checkAnswer(q, val)

    if (ok) {
      const firstTry = attempt === 0 && missCount.current === 0
      const streak = firstTry ? combo + 1 : 0
      setCombo(streak)
      setPhase('correct')
      setLeo('happy')

      // A combo overrides the usual cheer and gets its own party: bigger sound,
      // confetti raining rather than a pop, and a badge across the screen.
      const hit = streak > 0 && streak % COMBO_STEP === 0
      if (hit) {
        const tier = comboTier(streak)
        setComboPop({ ...tier, n: streak })
        setMsg(`${tier.icon} ${tier.text}`)
        sfx.combo(streak / COMBO_STEP)
        rain(1400, { perTick: 7 })
        tally.current.xp += 10
        setTimeout(() => setComboPop(null), 1500)
      } else {
        setMsg(pickOne(CHEERS))
        sfx.correct()
      }

      if (el) burstFrom(el, { count: hit ? 60 : 30, power: hit ? 13 : 9 })
      else burst(window.innerWidth / 2, window.innerHeight * 0.42, { count: hit ? 60 : 30, power: hit ? 13 : 9 })
      grade(true, firstTry)
      advanceTimer.current = setTimeout(next, hit ? ADVANCE_MS + 700 : ADVANCE_MS)
      return
    }

    sfx.soft()
    setCombo(0)
    setHearts((h) => Math.max(0, h - 1))

    // First slip gets a nudge and another go; the second shows the answer with
    // the reasoning. Neither ever ends the lesson.
    if (attempt === 0) {
      setPhase('retry')
      setLeo('think')
      setMsg(pickOne(NUDGES))
      setAttempt(1)
    } else {
      setPhase('reveal')
      setLeo('think')
      setMsg(pickOne(SOFT))
      grade(false, false)
    }
  }

  const handleMiss = () => {
    missCount.current += 1
    setHearts((h) => Math.max(0, h - 1))
  }

  const retryAgain = () => {
    setPhase('asking')
    setChosen(null)
    setValue('')
    setLeo('idle')
    setMsg('')
  }

  /* Blitz only: a calm draining bar — no red, no ticking, no penalty. Running
     out is framed as "here's the answer", never as a failure. Timed off a
     deadline rather than counting interval ticks, so a busy frame or a
     backgrounded tab can't stretch the clock. */
  useEffect(() => {
    if (!q?.timeLimit || phase !== 'asking') {
      setTimeLeft(null)
      return
    }
    const deadline = Date.now() + q.timeLimit * 1000
    setTimeLeft(q.timeLimit)

    const iv = setInterval(() => {
      const left = (deadline - Date.now()) / 1000
      if (left > 0) {
        setTimeLeft(left)
        return
      }
      clearInterval(iv)
      setTimeLeft(0)
      setPhase('reveal')
      setLeo('think')
      setMsg('Время вышло — вот ответ!')
      sfx.soft()
      grade(false, false)
    }, 100)

    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, phase, q])

  const quit = () => {
    const seconds = Math.round((Date.now() - startedAt.current) / 1000)
    if (seconds > 3) dispatch({ type: 'addTime', seconds })
    stopSpeaking()
    nav('/', { replace: true })
  }

  if (!lesson || !q) {
    return (
      <div className="screen shell safe-top" style={{ paddingTop: '2rem' }}>
        <p className="sub">Урок не найден.</p>
        <button className="btn btn--blue" onClick={() => nav('/')}>
          На карту
        </button>
      </div>
    )
  }

  // Dev only, and dead-code-eliminated from production builds: lets
  // scripts/play.mjs drive a real lesson end to end to check the whole loop.
  if (import.meta.env.DEV) window.__leoQ = q

  const common = { q, onAnswer: handleAnswer, locked, phase, chosen, value, setValue }
  const exercise = {
    choice: <ChoiceGrid {...common} />,
    pad: <PadExercise {...common} />,
    numberline: <NumberLine {...common} />,
    basten: <BaseTen {...common} />,
    'basten-build': <BaseTenBuild {...common} />,
    word: <WordProblem {...common} />,
    column: <ColumnMath {...common} />,
    'column-blank': <ColumnBlank {...common} />,
    compare: <Compare {...common} />,
    array: <ArrayView {...common} />,
    'array-build': <ArrayBuild {...common} />,
    match: <MatchPairs {...common} onMiss={handleMiss} />,
    chain: <Chain {...common} />,
    teach: <Teach {...common} />,
  }[q.kind]

  return (
    <div className="lesson">
      <header className="lesson-top safe-top">
        <button className="icon-btn" onClick={() => setQuitting(true)} aria-label="Выйти">
          ✕
        </button>
        <ProgressBar value={idx} max={questions.length} />
        {/* The running streak only appears once it's worth chasing. */}
        {combo >= 2 && (
          <span className="combo-chip" key={combo}>
            🔥<b className="tnum">{combo}</b>
          </span>
        )}
        <Hearts left={hearts} />
      </header>

      {comboPop && (
        <div className="combo-pop" role="status">
          <span className="combo-pop-icon">{comboPop.icon}</span>
          <b className="combo-pop-n tnum">{comboPop.n}</b>
          <span className="combo-pop-text">{comboPop.text}</span>
          <span className="combo-pop-xp">+10 XP</span>
        </div>
      )}

      {timeLeft != null && (
        <div className="blitz-bar" aria-hidden="true">
          <div className="blitz-fill" style={{ width: `${(timeLeft / q.timeLimit) * 100}%` }} />
        </div>
      )}

      <div className="lesson-body shell">
        <div className="q-head">
          <h1 className="q-prompt">{q.prompt}</h1>
          <SpeakButton text={q.prompt} />
        </div>

        {/* Keyed by index so every exercise starts fresh between questions
            without each one needing its own reset effect. */}
        <div className="q-area" key={idx}>
          {exercise}
        </div>
      </div>

      {phase !== 'asking' && (
        <div className={`fb fb--${phase}`} role="status">
          <div className="fb-inner shell">
            <Leo size={96} state={leo} className="fb-leo" />
            <div className="fb-text">
              <b className="fb-title">{msg}</b>
              {phase === 'reveal' && (
                <span className="fb-sub">
                  Ответ: <b>{q.answer}</b>
                  {q.hint ? ` · ${q.hint}` : ''}
                </span>
              )}
              {phase === 'retry' && q.hint && <span className="fb-sub">Подсказка: {q.hint}</span>}
            </div>
            <div className="fb-actions">
              <SpeakButton text={phase === 'reveal' ? `${msg}. Ответ: ${q.answer}. ${q.hint || ''}` : msg} />
              {phase === 'correct' && (
                <button className="btn btn--green" onClick={next}>
                  Дальше
                </button>
              )}
              {phase === 'retry' && (
                <button className="btn btn--orange" onClick={retryAgain}>
                  Ещё раз
                </button>
              )}
              {phase === 'reveal' && (
                <button className="btn btn--blue" onClick={next}>
                  Понятно
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {quitting && (
        <Sheet onClose={() => setQuitting(false)}>
          <Leo size={90} state="think" />
          <b className="h2">Закончить урок?</b>
          <p className="sub">Лео ещё не всё показал!</p>
          <button className="btn btn--green btn--block" onClick={() => setQuitting(false)}>
            Остаться
          </button>
          <button className="btn btn--ghost btn--block" onClick={quit}>
            Выйти
          </button>
        </Sheet>
      )}
    </div>
  )
}
