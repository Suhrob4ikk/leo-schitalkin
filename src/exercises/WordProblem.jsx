import NumberPad, { PadDisplay } from './NumberPad.jsx'

/** The picture is the support, not decoration — every object in the story is on
    screen and countable, and the ones taken away stay visible but crossed out so
    "what's left" is something the child can see as well as calculate. */
export default function WordProblem({ q, onAnswer, locked, phase, value, setValue }) {
  const { emoji, groups, op, total, taken } = q.data

  return (
    <div className="wp">
      <div className="wp-scene">
        {op === '+' ? (
          <>
            <div className="wp-group">
              {Array.from({ length: groups[0] }, (_, i) => (
                <span key={i} className="wp-item" style={{ animationDelay: `${i * 0.03}s` }}>
                  {emoji}
                </span>
              ))}
            </div>
            <span className="wp-plus">+</span>
            <div className="wp-group wp-group--b">
              {Array.from({ length: groups[1] }, (_, i) => (
                <span key={i} className="wp-item" style={{ animationDelay: `${(groups[0] + i) * 0.03}s` }}>
                  {emoji}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="wp-group">
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`wp-item ${i >= total - taken ? 'wp-item--gone' : ''}`}
                style={{ animationDelay: `${i * 0.03}s` }}
              >
                {emoji}
              </span>
            ))}
          </div>
        )}
      </div>

      <PadDisplay value={value} phase={phase} />
      <NumberPad value={value} onChange={setValue} onSubmit={() => onAnswer(value)} locked={locked} />
    </div>
  )
}
