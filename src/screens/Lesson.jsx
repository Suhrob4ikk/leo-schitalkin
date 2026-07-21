import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import UiIcon from '../components/UiIcon.jsx'
import Icon from '../components/Icon.jsx'
import Teacher from '../components/Teacher.jsx'
import { Hearts, ProgressBar, SpeakButton } from '../components/ui.jsx'
import Sheet from '../components/Sheet.jsx'
import { useStore, examStars, EXAM_XP } from '../game/store.jsx'
import { LESSON_BY_ID, UNIT_BY_ID, unitsUpTo, practiceTitle } from '../game/curriculum.js'
import { buildLesson, checkAnswer, EXAM_MAX_MISTAKES, JUMP_MAX_MISTAKES } from '../game/generators.js'
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
  'Вот это класс!',
  'Как учитель!',
  'Щёлкаешь как орешки!',
]

/* Every 5 in a row without a slip. The wording escalates so the tenth feels
   bigger than the fifth — a flat "КОМБО" every time stops being a reward. */
const COMBO_STEP = 5
/* `face` escalates with the run: a five and a twenty must not look identical,
   or the milestone stops meaning anything after the first one. */
const COMBO_TIERS = [
  { at: 5, text: '5 подряд!', icon: '🔥', face: 'happy' },
  { at: 10, text: '10 подряд! Огонь!', icon: '🚀', face: 'cheer' },
  { at: 15, text: '15 подряд! Невероятно!', icon: '💎', face: 'cheer' },
  { at: 20, text: '20 подряд! Ты чемпион!', icon: '👑', face: 'starry' },
  { at: 30, text: '30 подряд! Невероятно!', icon: '🌟', face: 'starry' },
  { at: 50, text: '50 подряд! Это рекорд!', icon: '🏆', face: 'starry' },
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

  // Exams travel as `exam-<unitId>` through this same screen: same questions,
  // same grading, different stakes.
  // A jump runs through the same screen as a single-unit exam; it just covers
  // every unit being skipped and has its own length and mistake budget.
  const isJump = id.startsWith('jump-')
  const examUnit = isJump
    ? UNIT_BY_ID[id.slice(5)]
    : id.startsWith('exam-')
      ? UNIT_BY_ID[id.slice(5)]
      : null
  const jumpUnits = isJump && examUnit ? unitsUpTo(examUnit, state.lessons) : null
  const maxMistakes = isJump ? JUMP_MAX_MISTAKES : EXAM_MAX_MISTAKES
  // Neither the mistake review nor the table trainer is a node on the map, so
  // they have no curriculum entry — their title comes from practiceTitle.
  const isPractice = id === 'mistakes' || id.startsWith('drill-')
  const lesson = examUnit
    ? { id, title: isJump ? `Переход к: ${examUnit.title}` : `Проверка: ${examUnit.title}`, sticker: null }
    : isPractice
      ? { id, title: practiceTitle(id), sticker: null }
      : LESSON_BY_ID[id]

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
  const [comboPop, setComboPop] = useState(null)
  // Lives in the store so it survives finishing a lesson, closing the app and
  // coming back tomorrow — the run is the child's, not the lesson's.
  const combo = state.combo ?? 0

  // Kept in refs, not state: these are read inside timeout callbacks, which
  // would otherwise close over a stale render.
  const tally = useRef({ first: 0, graded: 0, xp: 0 })
  const missCount = useRef(0)
  const startedAt = useRef(Date.now())
  const advanceTimer = useRef(null)
  const finished = useRef(false)
  const examMisses = useRef(0)
  const examFailed = useRef(false)

  const q = questions[idx]
  const locked = phase !== 'asking'

  useEffect(() => () => clearTimeout(advanceTimer.current), [])
  useEffect(() => () => stopSpeaking(), [])

  // Guarded: `next` can fire from both the auto-advance timer and a Дальше tap,
  // and finishing twice would double-count the lesson.
  const finish = useCallback(
    (failed = false) => {
      if (finished.current) return
      finished.current = true
      const { first, graded } = tally.current
      const seconds = Math.round((Date.now() - startedAt.current) / 1000)
      const accuracy = graded ? first / graded : 1
      const perfect = graded > 0 && first === graded

      if (examUnit) {
        const passed = !failed
        const mistakes = examMisses.current
        const stars = examStars(mistakes)
        const gained = passed ? (EXAM_XP[stars] ?? 40) : 0
        if (passed) {
          // A jump clears every unit it covered, not just the destination.
          const covered = jumpUnits?.length ? jumpUnits : [examUnit]
          dispatch({
            type: 'passExam',
            unitId: examUnit.id,
            lessonIds: covered.flatMap((u) => u.lessons.map((l) => l.id)),
            seconds,
            accuracy,
            mistakes,
          })
        } else {
          // A failed exam still costs time and still counts as practice — it
          // just doesn't unlock anything. Nothing is taken away for trying.
          if (seconds > 3) dispatch({ type: 'addTime', seconds })
        }
        nav(`/done/${id}`, {
          replace: true,
          state: {
            accuracy,
            perfect: passed && mistakes === 0,
            seconds,
            bonusXp: gained,
            hearts,
            xp: gained,
            exam: true,
            passed,
            mistakes,
            stars,
            unitId: examUnit.id,
            jump: isJump,
            covered: jumpUnits?.length ?? 1,
          },
        })
        return
      }

      const bonusXp = perfect ? 25 : 10
      // Practice (mistake review, table trainer) isn't a node on the map, so it
      // must not be recorded as one — it would show up as a phantom completed
      // lesson. Its time and XP still count.
      if (isPractice) {
        // XP for each answer was already awarded as it was graded; there's no
        // completion bonus for practice.
        dispatch({ type: 'addTime', seconds })
      } else {
        dispatch({ type: 'finishLesson', lessonId: id, correct: first, total: graded, seconds, bonusXp })
        if (lesson?.sticker) dispatch({ type: 'unlockSticker', id: lesson.sticker })
      }

      const gained = isPractice ? tally.current.xp : tally.current.xp + bonusXp
      nav(`/done/${id}`, {
        replace: true,
        state: { accuracy, perfect, seconds, bonusXp, hearts, xp: gained, review: isPractice },
      })
    },
    [dispatch, examUnit, hearts, id, lesson, nav],
  )

  const next = useCallback(() => {
    clearTimeout(advanceTimer.current)
    stopSpeaking()
    // Out of mistakes: stop here, whatever question we were on.
    if (examFailed.current) {
      finish(true)
      return
    }
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
  const grade = (correct, firstTry, bonus = 0) => {
    dispatch({ type: 'answer', topic: q.topic, fact: q.fact, correct, firstTry, bonus })
    // Getting one right first time — including inside the review itself —
    // retires it. Collection happens at the point of the slip, above.
    if (correct && firstTry) dispatch({ type: 'clearMistake', q })
    else if (!correct) dispatch({ type: 'noteMistake', q })
    tally.current.graded += 1
    if (correct) tally.current.xp += (firstTry ? 4 : 2) + bonus
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
      // The store updates the run when `answer` is graded below; this is what
      // it will become, needed now to decide whether a milestone just landed.
      const streak = firstTry ? combo + 1 : 0
      setPhase('correct')
      setLeo('happy')

      // A combo overrides the usual cheer and gets its own party: bigger sound,
      // confetti raining rather than a pop, and a badge across the screen.
      const hit = streak > 0 && streak % COMBO_STEP === 0
      // The reward the badge shows; passed to grade() so it actually lands in
      // the store, not just this lesson's on-screen tally.
      const comboBonus = hit ? 10 : 0
      if (hit) {
        const tier = comboTier(streak)
        setComboPop({ ...tier, n: streak })
        setMsg(`${tier.icon} ${tier.text}`)
        setLeo(tier.face)
        sfx.combo(streak / COMBO_STEP)
        rain(1400, { perTick: tier.face === 'starry' ? 11 : 7 })
        setTimeout(() => setComboPop(null), 1500)
      } else {
        setMsg(pickOne(CHEERS))
        sfx.correct()
      }

      if (el) burstFrom(el, { count: hit ? 60 : 30, power: hit ? 13 : 9 })
      else burst(window.innerWidth / 2, window.innerHeight * 0.42, { count: hit ? 60 : 30, power: hit ? 13 : 9 })
      grade(true, firstTry, comboBonus)
      advanceTimer.current = setTimeout(next, hit ? ADVANCE_MS + 700 : ADVANCE_MS)
      return
    }

    sfx.soft()
    setHearts((h) => Math.max(0, h - 1))

    // An exam gets one attempt per question — a retry would make the mistake
    // budget meaningless. Three mistakes ends it, but gently, and nothing the
    // child already had is taken away.
    if (examUnit) {
      examMisses.current += 1
      const out = examMisses.current >= maxMistakes
      grade(false, false)
      setPhase('reveal')
      setLeo('think')
      setMsg(out ? `Ошибок: ${examMisses.current}` : pickOne(SOFT))
      // A ref, not a timer: tapping "Понятно" runs next(), which clears every
      // pending timer — a timeout here was silently cancelled and the exam
      // passed with five mistakes. next() reads this flag instead.
      if (out) examFailed.current = true
      return
    }

    // First slip gets a nudge and another go; the second shows the answer with
    // the reasoning. Neither ever ends the lesson.
    if (attempt === 0) {
      // Collected here, on the FIRST slip — not only when they fail twice.
      // "Wrong once, then right" is the most common case by far and the one
      // most worth revisiting; grading only fires on the second failure, so
      // hanging the review off it recorded almost nothing.
      dispatch({ type: 'noteMistake', q })
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
    dispatch({ type: 'breakCombo' })
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
          <UiIcon name="close" size="1.35rem" />
        </button>
        <ProgressBar value={idx} max={questions.length} />
        {/* The running streak only appears once it's worth chasing — same
            threshold as the map's combo chip, so the two never disagree. */}
        {combo >= 3 && (
          <span className="combo-chip" key={combo}>
            <Icon e="🔥" size="0.95rem" />
            <b className="tnum">{combo}</b>
          </span>
        )}
        <Hearts left={hearts} />
      </header>

      {comboPop && (
        <div className="combo-pop" role="status">
          <Icon e={comboPop.icon} className="combo-pop-icon" size="3.4rem" />
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
            <Teacher lessonId={id} size={96} state={leo} className="fb-leo" />
            <div className="fb-text">
              <b className="fb-title">{msg}</b>
              {/* Only the correct answer is shown on a slip — no worked hint,
                  by design. */}
              {phase === 'reveal' && (
                <span className="fb-sub">
                  Ответ: <b>{q.answer}</b>
                </span>
              )}
            </div>
            <div className="fb-actions">
              <SpeakButton text={phase === 'reveal' ? `${msg}. Ответ: ${q.answer}.` : msg} />
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
          <Teacher lessonId={id} size={90} state="think" />
          <b className="h2">Закончить урок?</b>
          <p className="sub">Друг ещё не всё показал!</p>
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
