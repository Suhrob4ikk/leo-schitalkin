import { useId, useMemo } from 'react'
import './Leo.css'

/*  Лео — a fox cub built from primitive shapes so he stays a few KB and every
 *  part can be animated independently by CSS.
 *
 *  Layout inside the 200×200 viewBox:
 *    head   circle (100, 82) r45      ears pivot at y≈50
 *    body   ellipse (100, 147) rx38   feet stand on the ground line at y=188
 *    arms   shoulders at (68,130) / (132,130), hands at (52,160) / (148,160)
 *
 *  The shoulders sit exactly on the body's edge at that height, so the arms
 *  emerge from the silhouette instead of being swallowed by it — otherwise a
 *  wave or a cheer is invisible on a chubby cub.
 *
 *  Draw order is shadow → tail → body → feet → head → arms. Arms come last on
 *  purpose: they hang clear of the head at rest, so when they rotate up
 *  (celebrating, waving, thinking) they land in front of it with no z-order
 *  trickery. The shadow sits outside .leo-all so it stays on the ground while
 *  he jumps, and shrinks instead of leaping with him.
 */

const STATES = ['idle', 'wave', 'happy', 'think', 'sleepy']

function Eyes({ state, ids }) {
  if (state === 'happy') {
    // Squeezed-shut joy arcs — the "^ ^" face.
    return (
      <g className="leo-eyes" fill="none" stroke="var(--fox-ink)" strokeWidth="5.5" strokeLinecap="round">
        <path d="M 73 74 Q 82 63 91 74" />
        <path d="M 109 74 Q 118 63 127 74" />
      </g>
    )
  }
  if (state === 'sleepy') {
    return (
      <g className="leo-eyes" fill="none" stroke="var(--fox-ink)" strokeWidth="5" strokeLinecap="round">
        <path d="M 73 71 Q 82 80 91 71" />
        <path d="M 109 71 Q 118 80 127 71" />
      </g>
    )
  }
  // Open eyes. In `think` the catchlights slide up toward the floating "?", so
  // his gaze goes with it.
  const up = state === 'think' ? -2.4 : 0
  return (
    <g className="leo-eyes">
      <circle cx="82" cy="72" r="9" fill={`url(#${ids.eye})`} />
      <circle cx="118" cy="72" r="9" fill={`url(#${ids.eye})`} />
      {/* Big catchlight, small rim light, faint bounce light: three highlights
          is what turns a dark disc into a glossy eye. */}
      <circle cx="85.6" cy={68.4 + up} r="3.3" fill="#fff" />
      <circle cx="121.6" cy={68.4 + up} r="3.3" fill="#fff" />
      <circle cx="78.6" cy={75.6 + up} r="1.7" fill="#fff" opacity=".6" />
      <circle cx="114.6" cy={75.6 + up} r="1.7" fill="#fff" opacity=".6" />
      <ellipse cx="82" cy="78.4" rx="4.6" ry="1.7" fill="#fff" opacity=".16" />
      <ellipse cx="118" cy="78.4" rx="4.6" ry="1.7" fill="#fff" opacity=".16" />
    </g>
  )
}

/* Brows do most of the work in reading an expression, and they are the whole
   difference between "curious" and "cross" — which matters, because this is the
   face he makes at a child who just got it wrong. Both arch UP (curious,
   surprised); the right arches higher for a quizzical tilt. Sloping either brow
   down toward the nose would instantly turn him stern. */
function Brows({ state }) {
  if (state !== 'think') return null
  return (
    <g stroke="var(--fox-ink)" strokeWidth="3.6" strokeLinecap="round" fill="none" opacity=".85">
      <path d="M 72 57 Q 82 51 92 56" />
      <path d="M 108 55 Q 118 47.5 128 53" />
    </g>
  )
}

function Mouth({ state, ids }) {
  if (state === 'happy') {
    // Open grin with a tongue — clipped to the mouth so it can't spill out.
    return (
      <g>
        <clipPath id={ids.mouth}>
          <path d="M 84 104 Q 100 100 116 104 Q 116 122 100 122 Q 84 122 84 104 Z" />
        </clipPath>
        <path d="M 84 104 Q 100 100 116 104 Q 116 122 100 122 Q 84 122 84 104 Z" fill="var(--fox-ink)" />
        <ellipse cx="100" cy="121" rx="9" ry="6.5" fill="#ff7a8a" clipPath={`url(#${ids.mouth})`} />
      </g>
    )
  }
  if (state === 'think') {
    // Still a smile, just a smaller one. A wavy or downturned mouth here would
    // read as disappointment — the one thing this face must never do.
    return (
      <path
        d="M 91 107 Q 100 113.5 109 107"
        fill="none"
        stroke="var(--fox-ink)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    )
  }
  if (state === 'sleepy') {
    return <ellipse className="leo-snore" cx="100" cy="110" rx="5" ry="4.5" fill="var(--fox-ink)" />
  }
  return (
    <path
      d="M 100 99 L 100 105 M 100 105 Q 92 113 85 107 M 100 105 Q 108 113 115 107"
      fill="none"
      stroke="var(--fox-ink)"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

export default function Leo({ state = 'idle', size = 140, className = '', style }) {
  const s = STATES.includes(state) ? state : 'idle'

  // Gradient and clip ids must be unique per instance: two Лео on screen (the
  // feedback panel and the number line, say) would otherwise share one id, and
  // whichever unmounted first would take the other's fills with it.
  const raw = useId()
  const ids = useMemo(() => {
    const u = raw.replace(/[^a-zA-Z0-9]/g, '')
    return {
      fur: `fur${u}`,
      head: `head${u}`,
      tail: `tail${u}`,
      cream: `cream${u}`,
      ear: `ear${u}`,
      eye: `eye${u}`,
      mouth: `mouth${u}`,
    }
  }, [raw])

  // Negative start offsets, fixed per instance. Without these every Лео on a
  // screen blinks and swishes on the exact same frame, which looks mechanical.
  const offsets = useMemo(
    () => ({ '--leo-blink-delay': `${-Math.random() * 4.6}s`, '--leo-tail-delay': `${-Math.random() * 2.4}s` }),
    [],
  )

  return (
    <svg
      className={`leo leo--${s} ${className}`}
      style={{ width: size, height: size, ...offsets, ...style }}
      viewBox="0 0 200 200"
      role="img"
      aria-label="Лисёнок Лео"
      focusable="false"
    >
      <defs>
        {/* Light from above: every fill is a touch lighter at the top. That one
            rule is most of the difference between "flat vector" and "plush". */}
        <linearGradient id={ids.fur} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffab6b" />
          <stop offset="1" stopColor="#f87f35" />
        </linearGradient>
        <radialGradient id={ids.head} cx="0.38" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#ffb87f" />
          <stop offset="1" stopColor="#f8823a" />
        </radialGradient>
        <linearGradient id={ids.tail} x1="0.2" y1="1" x2="0.8" y2="0">
          <stop offset="0" stopColor="#ee6f26" />
          <stop offset="1" stopColor="#f9924f" />
        </linearGradient>
        <linearGradient id={ids.cream} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffcf7" />
          <stop offset="1" stopColor="#ffe7ce" />
        </linearGradient>
        <linearGradient id={ids.ear} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6b4235" />
          <stop offset="1" stopColor="#482b21" />
        </linearGradient>
        <linearGradient id={ids.eye} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4d382f" />
          <stop offset="1" stopColor="#2b1e18" />
        </linearGradient>
      </defs>

      {/* Stays on the ground while he jumps — see the note above. */}
      <ellipse className="leo-shadow" cx="100" cy="186" rx="44" ry="6.5" fill="#5a3a22" opacity=".14" />

      <g className="leo-all">
        {/* ── Tail: a curve, bulked out with overlapping discs so the
               silhouette reads bushy, and a fat two-lobe cream tip ────────── */}
        <g className="leo-tail">
          <path
            d="M 76 152 C 44 160 14 140 22 102"
            fill="none"
            stroke={`url(#${ids.tail})`}
            strokeWidth="26"
            strokeLinecap="round"
          />
          <circle cx="50" cy="156" r="15" fill={`url(#${ids.tail})`} />
          <circle cx="31" cy="147" r="16.5" fill={`url(#${ids.tail})`} />
          <circle cx="18" cy="127" r="17" fill={`url(#${ids.tail})`} />
          <circle cx="21" cy="103" r="18" fill={`url(#${ids.cream})`} />
          <circle cx="35" cy="114" r="11.5" fill={`url(#${ids.cream})`} />
        </g>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <ellipse cx="100" cy="147" rx="38" ry="33" fill={`url(#${ids.fur})`} />
        <ellipse cx="100" cy="154" rx="25" ry="23" fill={`url(#${ids.cream})`} />
        {/* Scalloped chest fluff, mostly tucked under his chin */}
        <circle cx="84" cy="134" r="9.5" fill={`url(#${ids.cream})`} />
        <circle cx="100" cy="131" r="10.5" fill={`url(#${ids.cream})`} />
        <circle cx="116" cy="134" r="9.5" fill={`url(#${ids.cream})`} />

        {/* ── Feet ────────────────────────────────────────────────────────── */}
        <ellipse className="leo-foot leo-foot--l" cx="82" cy="178" rx="14" ry="8.5" fill="var(--fox-paw)" />
        <ellipse className="leo-foot leo-foot--r" cx="118" cy="178" rx="14" ry="8.5" fill="var(--fox-paw)" />

        {/* ── Head ────────────────────────────────────────────────────────── */}
        <g className="leo-head">
          {/* No cheek tufts here on purpose: pointed fur breaking the head
              circle reads as a second pair of ears, not as fluff. The cream
              blaze below carries the fox character instead. */}

          {/* Ears. The fat round-joined stroke gives soft corners for free. */}
          <g className="leo-ear leo-ear--l">
            <path
              d="M 72 52 L 58 16 L 98 40 Z"
              fill={`url(#${ids.fur})`}
              stroke={`url(#${ids.fur})`}
              strokeWidth="12"
              strokeLinejoin="round"
            />
            <path
              d="M 75 46 L 68 27 L 89 40 Z"
              fill={`url(#${ids.ear})`}
              stroke={`url(#${ids.ear})`}
              strokeWidth="5"
              strokeLinejoin="round"
            />
          </g>
          <g className="leo-ear leo-ear--r">
            <path
              d="M 128 52 L 142 16 L 102 40 Z"
              fill={`url(#${ids.fur})`}
              stroke={`url(#${ids.fur})`}
              strokeWidth="12"
              strokeLinejoin="round"
            />
            <path
              d="M 125 46 L 132 27 L 111 40 Z"
              fill={`url(#${ids.ear})`}
              stroke={`url(#${ids.ear})`}
              strokeWidth="5"
              strokeLinejoin="round"
            />
          </g>

          <circle cx="100" cy="82" r="45" fill={`url(#${ids.head})`} />

          {/* Cream blaze up the forehead — it threads between the eyes and is
              the marking that says "fox" more than anything else here. */}
          <path
            d="M 92 90 C 92 70 96 58 100 51 C 104 58 108 70 108 90 Z"
            fill={`url(#${ids.cream})`}
            stroke={`url(#${ids.cream})`}
            strokeWidth="4"
            strokeLinejoin="round"
          />
          {/* Muzzle + cheeks */}
          <ellipse cx="100" cy="102" rx="27" ry="21" fill={`url(#${ids.cream})`} />

          <ellipse className="leo-blush leo-blush--l" cx="64" cy="99" rx="9.5" ry="6" fill="var(--fox-blush)" opacity=".5" />
          <ellipse className="leo-blush leo-blush--r" cx="136" cy="99" rx="9.5" ry="6" fill="var(--fox-blush)" opacity=".5" />

          <Eyes state={s} ids={ids} />
          <Brows state={s} />

          {/* Nose, with a little shine on top */}
          <path d="M 90.5 88 Q 100 83 109.5 88 Q 109.5 97.5 100 99.5 Q 90.5 97.5 90.5 88 Z" fill="var(--fox-ink)" />
          <ellipse cx="96.5" cy="88.5" rx="2.6" ry="1.6" fill="#fff" opacity=".35" transform="rotate(-18 96.5 88.5)" />

          <Mouth state={s} ids={ids} />

          {/* Puzzling-it-out mark, only while thinking */}
          {s === 'think' && (
            <text className="leo-think-mark" x="152" y="44" fontSize="34" fontWeight="900" fill="var(--blue)">
              ?
            </text>
          )}

          {/* Zzz, only while asleep */}
          {s === 'sleepy' && (
            <g className="leo-zzz" fill="var(--blue)" fontWeight="900">
              <text className="leo-z leo-z--1" x="140" y="46" fontSize="19">z</text>
              <text className="leo-z leo-z--2" x="154" y="30" fontSize="25">z</text>
              <text className="leo-z leo-z--3" x="172" y="14" fontSize="31">Z</text>
            </g>
          )}
        </g>

        {/* ── Arms (last, so a raised arm reads in front of the head) ──────── */}
        <g className="leo-arm leo-arm--l">
          <path d="M 68 130 L 52 160" fill="none" stroke={`url(#${ids.fur})`} strokeWidth="15" strokeLinecap="round" />
          <circle cx="52" cy="160" r="9" fill="var(--fox-paw)" />
        </g>
        <g className="leo-arm leo-arm--r">
          <path d="M 132 130 L 148 160" fill="none" stroke={`url(#${ids.fur})`} strokeWidth="15" strokeLinecap="round" />
          <circle cx="148" cy="160" r="9" fill="var(--fox-paw)" />
        </g>
      </g>
    </svg>
  )
}
