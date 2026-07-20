/*  Today's progress toward the daily goal, as a ring.
 *
 *  A ring rather than a bar because it reads at a glance from across a table
 *  and closes — a closing shape is a stronger "nearly there" signal than a bar
 *  creeping rightwards, which is why every fitness app uses one.
 */
export default function GoalRing({ ratio, done, size = 44, children }) {
  const r = 18
  const c = 2 * Math.PI * r

  return (
    <div className={`goal-ring ${done ? 'is-done' : ''}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <circle className="goal-track" cx="22" cy="22" r={r} />
        <circle
          className="goal-fill"
          cx="22"
          cy="22"
          r={r}
          strokeDasharray={c}
          // Drawn anticlockwise from 12 o'clock, so it fills the way a clock
          // hand moves once the -90° rotation in CSS is applied.
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, ratio)))}
        />
      </svg>
      <span className="goal-inner">{children}</span>
    </div>
  )
}
