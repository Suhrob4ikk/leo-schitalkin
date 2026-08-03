/*  Циферблат со стрелками.
 *
 *  Отрисован в SVG (ноль байт загрузки, чёткий на любом экране). Часовая
 *  стрелка короче и толще, минутная — длиннее и синяя: их обязательно надо
 *  различать, иначе «7:15» не отличить от «3:35».
 */
const R = 46
const NUMS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

// angle 0 = 12 o'clock, clockwise; returns an [x, y] on a circle of radius `len`.
function hand(angleDeg, len) {
  const rad = (angleDeg * Math.PI) / 180
  return [50 + len * Math.sin(rad), 50 - len * Math.cos(rad)]
}

/** The dial itself, shared by "read the clock" and "set the hands". */
export function ClockFace({ h, m }) {
  const [hx, hy] = hand(((h % 12) + m / 60) * 30, 26)
  const [mx, my] = hand(m * 6, 37)
  return (
    <svg className="clock-face" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r={R} className="clock-rim" />
      <circle cx="50" cy="50" r={R - 3} className="clock-dial" />

      {NUMS.map((n, i) => (
        <line
          key={`t${i}`}
          x1={hand(i * 30, R - 1)[0]}
          y1={hand(i * 30, R - 1)[1]}
          x2={hand(i * 30, R - 5)[0]}
          y2={hand(i * 30, R - 5)[1]}
          className="clock-tick"
        />
      ))}
      {NUMS.map((n, i) => {
        const [nx, ny] = hand(i * 30, R - 12)
        return (
          <text key={`n${n}`} x={nx} y={ny + 3.2} className="clock-num" textAnchor="middle">
            {n}
          </text>
        )
      })}

      <line x1="50" y1="50" x2={hx} y2={hy} className="clock-hand clock-hand--hour" />
      <line x1="50" y1="50" x2={mx} y2={my} className="clock-hand clock-hand--min" />
      <circle cx="50" cy="50" r="2.6" className="clock-pin" />
    </svg>
  )
}

export default function Clock({ q, onAnswer, locked, chosen, phase }) {
  return (
    <div className="clock">
      <ClockFace h={q.data.h} m={q.data.m} />

      <div className="choices choices--clock">
        {q.options.map((opt) => {
          const isChosen = chosen === opt
          let mod = ''
          if (isChosen && phase === 'correct') mod = 'is-correct'
          else if (isChosen && (phase === 'retry' || phase === 'reveal')) mod = 'is-wrong'
          else if (phase === 'reveal' && opt === q.answer) mod = 'is-answer'
          return (
            <button
              key={opt}
              type="button"
              className={`choice tnum ${mod}`}
              disabled={locked}
              onClick={(e) => onAnswer(opt, e.currentTarget)}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}
