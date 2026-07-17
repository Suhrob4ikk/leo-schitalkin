import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Leo from '../components/Leo.jsx'
import { Hearts, ProgressBar, SpeakButton } from '../components/ui.jsx'
import { useStore } from '../game/store.jsx'
import { LESSON_BY_ID } from '../game/curriculum.js'
import { buildLesson, checkAnswer } from '../game/generators.js'
import { sfx, stopSpeaking } from '../game/audio.js'
import { burst, burstFrom } from '../game/confetti.js'

import ChoiceGrid from '../exercises/ChoiceGrid.jsx'
import PadExercise from '../exercises/PadExercise.jsx'
import NumberLine from '../exercises/NumberLine.jsx'
import BaseTen, { BaseTenBuild } from '../exercises/BaseTen.jsx'
import WordProblem from '../exercises/WordProblem.jsx'
import ColumnMath from '../exercises/ColumnMath.jsx'
import ArrayView, { ArrayBuild } from '../exercises/ArrayView.jsx'
import MatchPairs from '../exercises/MatchPairs.jsx'
import Teach from '../exercises/Teach.jsx'
import './Lesson.css'

const CHEERS = ['Отлично!', 'Молодец!', 'Супер!', 'Верно!', 'Здорово!', 'Вот это да!', 'Ты справился!']
const NUDGES = ['Почти! Попробуй ещё раз', 'Чуть-чуть не хватило!', 'Уже близко! Ещё разок']
const SOFT = ['Ничего страшного!', 'Бывает! Теперь знаешь', 'Запомним это вместе']

const pickOne = (a) => a[(Math.random() * a.length) | 0]

/** How long a correct answer's celebration holds before moving on. Long enough
    to land, short enough that the loop stays quick — this repeats hundreds of
    times, so an extra half-second here is felt as sluggishness. */
const ADVANCE_MS = 1150

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
      setPhase('correct')
      setLeo('happy')
      setMsg(pickOne(CHEERS))
      sfx.correct()
      if (el) burstFrom(el, { count: 30, power: 9 })
      else burst(window.innerWidth / 2, window.innerHeight * 0.42, { count: 30, power: 9 })
      grade(true, firstTry)
      advanceTimer.current = setTimeout(next, ADVANCE_MS)
      return
    }

    sfx.soft()
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
    array: <ArrayView {...common} />,
    'array-build': <ArrayBuild {...common} />,
    match: <MatchPairs {...common} onMiss={handleMiss} />,
    teach: <Teach {...common} />,
  }[q.kind]

  return (
    <div className="lesson">
      <header className="lesson-top safe-top">
        <button className="icon-btn" onClick={() => setQuitting(true)} aria-label="Выйти">
          ✕
        </button>
        <ProgressBar value={idx} max={questions.length} />
        <Hearts left={hearts} />
      </header>

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
        <div className="sheet-backdrop" onClick={() => setQuitting(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <Leo size={90} state="think" />
            <b className="h2">Закончить урок?</b>
            <p className="sub">Лео ещё не всё показал!</p>
            <button className="btn btn--green btn--block" onClick={() => setQuitting(false)}>
              Остаться
            </button>
            <button className="btn btn--ghost btn--block" onClick={quit}>
              Выйти
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
