/*  Сравнение: 35 + 17 ⬜ 29 + 21
 *
 *  Three big signs instead of a keypad. When both sides are expressions the
 *  child has to work each one out before choosing — which is the entire point
 *  of the exercise, and why the sides are shown as written rather than solved.
 */
const SIGNS = ['<', '=', '>']

export default function Compare({ q, onAnswer, locked, chosen, phase }) {
  const { left, right } = q.data

  return (
    <div className="cmp">
      <div className="cmp-row">
        <span className="cmp-side tnum">{left.text}</span>
        <span className={`cmp-slot ${chosen ? 'is-filled' : ''} ${phase === 'correct' ? 'is-correct' : ''} ${
          phase === 'retry' || phase === 'reveal' ? 'is-wrong' : ''
        }`}>
          {phase === 'reveal' ? q.answer : chosen || ''}
        </span>
        <span className="cmp-side tnum">{right.text}</span>
      </div>

      <div className="cmp-signs">
        {SIGNS.map((s) => {
          const isChosen = chosen === s
          let mod = ''
          if (isChosen && phase === 'correct') mod = 'is-correct'
          else if (isChosen && (phase === 'retry' || phase === 'reveal')) mod = 'is-wrong'
          return (
            <button
              key={s}
              type="button"
              className={`cmp-btn ${mod}`}
              disabled={locked}
              onClick={(e) => onAnswer(s, e.currentTarget)}
              aria-label={s === '<' ? 'меньше' : s === '>' ? 'больше' : 'равно'}
            >
              {s}
            </button>
          )
        })}
      </div>
    </div>
  )
}
