import { sfx } from '../game/audio.js'

/*    4 ⬜
 *  + 2  3
 *  ──────
 *    6  8
 *
 *  A digit is missing from an OPERAND and the result is given, so the child has
 *  to run the column backwards. His workbook is full of these and they are a
 *  different skill from adding forwards — the app only ever blanked the answer.
 */
export default function ColumnBlank({ q, onAnswer, locked, phase, value, setValue }) {
  const { a, b, res, op, row, pos } = q.data
  const d = (n, p) => (p === 'tens' ? Math.floor(n / 10) : n % 10)
  const isBlank = (r, p) => r === row && p === pos

  const cell = (r, p, n) =>
    isBlank(r, p) ? (
      <span
        key={`${r}${p}`}
        className={`cm-box ${value ? 'is-filled' : 'is-live'} ${phase === 'correct' ? 'is-correct' : ''} ${
          phase === 'retry' || phase === 'reveal' ? 'is-wrong' : ''
        }`}
      >
        {phase === 'reveal' ? q.answer : value}
      </span>
    ) : (
      <span key={`${r}${p}`} className="cm-cell cm-num">
        {d(n, p)}
      </span>
    )

  return (
    <div className="cm">
      <div className="cm-grid">
        <span className="cm-sign" />
        {cell('a', 'tens', a)}
        {cell('a', 'ones', a)}

        <span className="cm-sign">{op}</span>
        {cell('b', 'tens', b)}
        {cell('b', 'ones', b)}

        <span className="cm-rule" />

        <span className="cm-sign" />
        <span className="cm-cell cm-num">{Math.floor(res / 10)}</span>
        <span className="cm-cell cm-num">{res % 10}</span>
      </div>

      <div className="cm-pad">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            type="button"
            className="cm-key"
            disabled={locked}
            onClick={(e) => {
              sfx.pick()
              setValue(String(n))
              // One digit is the whole answer here, so it commits immediately —
              // no ✓ to hunt for.
              setTimeout(() => onAnswer(String(n), e.currentTarget), 180)
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
