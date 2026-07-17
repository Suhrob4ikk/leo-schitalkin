/** Big tappable answers. Two options go side by side; three or four stack into
    a 2×2 grid so no target is ever small or in a corner. */
export default function ChoiceGrid({ q, onAnswer, locked, chosen, phase }) {
  const opts = q.options || []

  return (
    <div className={`choices ${opts.length === 2 ? 'choices--pair' : ''}`}>
      {opts.map((o) => {
        const isChosen = chosen === o
        const isAnswer = o === q.answer
        let mod = ''
        // Only ever paint the chosen tile. Lighting up the right answer the
        // instant someone taps the wrong one turns a retry into a copy.
        if (isChosen && phase === 'correct') mod = 'is-correct'
        else if (isChosen && (phase === 'retry' || phase === 'reveal')) mod = 'is-wrong'
        else if (phase === 'reveal' && isAnswer) mod = 'is-answer'

        return (
          <button
            key={o}
            type="button"
            className={`choice ${mod}`}
            disabled={locked}
            onClick={(e) => onAnswer(o, e.currentTarget)}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}
