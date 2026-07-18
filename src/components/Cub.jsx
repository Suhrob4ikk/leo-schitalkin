import { useId, useMemo } from 'react'
import './Leo.css'

/*  One cub rig, three species.
 *
 *  These are original designs, not copies of anyone's characters — a leopard cub
 *  and a tiger cub drawn in this app's own flat, shape-based style so they sit
 *  next to the UI instead of fighting it.
 *
 *  Everything shares the fox's skeleton and therefore all of its animation CSS:
 *    head   circle (100, 82) r45
 *    body   ellipse (100, 147) rx38
 *    arms   shoulders (68,130) / (132,130), hands (52,160) / (148,160)
 *    ground y = 188
 *  Only the ears, tail, markings and palette differ. Adding a species means
 *  adding a config below, not another component.
 */

const STATES = ['idle', 'wave', 'happy', 'think', 'sleepy']

/** Display order on the picker — the fox is first because he's the one the app
    is named after and the safe default. */
export const CAST = ['fox', 'leopard', 'tiger']

export const SPECIES = {
  fox: {
    name: 'Лео',
    full: 'Лисёнок Лео',
    withName: 'Лео',
    trait: 'Умный и любознательный. Всё объяснит и подскажет.',
    emoji: '🦊',
    fur: ['#ffab6b', '#f87f35'],
    head: ['#ffb87f', '#f8823a'],
    tailG: ['#ee6f26', '#f9924f'],
    cream: ['#fffcf7', '#ffe7ce'],
    earIn: ['#6b4235', '#482b21'],
    eye: ['#4d382f', '#2b1e18'],
    nose: '#42302a',
    paw: '#4a3328',
    blush: '#ff9e9e',
    ears: 'pointed',
    tail: 'bushy',
    marks: 'blaze',
  },
  leopard: {
    name: 'Пятныш',
    full: 'Леопард Пятныш',
    // Instrumental case, for "Играть с …". Russian won't let the nominative
    // stand there and it reads as broken to a child who is learning to read.
    withName: 'Пятнышем',
    trait: 'Любит числа и загадки. Находит решение везде.',
    emoji: '🐯',
    fur: ['#ffd95e', '#f2a521'],
    head: ['#ffe07a', '#f5ab29'],
    tailG: ['#f0a01e', '#ffd257'],
    cream: ['#fffdf4', '#ffeecc'],
    earIn: ['#7d4a70', '#4a2a44'],
    // Green eyes and a lilac nose are what make a leopard cub read as one
    // rather than as a yellow fox.
    eye: ['#3fd184', '#1d9a5a'],
    nose: '#9463c9',
    paw: '#4a3520',
    blush: '#ffab6b',
    ears: 'round',
    tail: 'long',
    marks: 'spots',
  },
  tiger: {
    name: 'Тиг',
    full: 'Тигрёнок Тиг',
    withName: 'Тигом',
    trait: 'Смелый и быстрый. Любит скорость и рекорды.',
    emoji: '🐅',
    fur: ['#ff7a45', '#e8391b'],
    head: ['#ff8a55', '#e84020'],
    tailG: ['#e8391b', '#ff7a45'],
    cream: ['#fff8f0', '#ffdfc6'],
    earIn: ['#5c2f22', '#361611'],
    eye: ['#ffc046', '#e07d14'],
    nose: '#f0648f',
    paw: '#4a231a',
    blush: '#ff9e9e',
    ears: 'round',
    tail: 'long',
    marks: 'stripes',
  },
}

/* ── Face parts (shared) ─────────────────────────────────────────────────── */

function Eyes({ state, ids }) {
  // Arcs are drawn in the eye's own dark colour, not the nose colour — a lilac
  // or pink smile-eye reads as makeup rather than as a squeezed-shut eye.
  if (state === 'happy') {
    return (
      <g className="leo-eyes" fill="none" stroke="#3a2a20" strokeWidth="6" strokeLinecap="round">
        <path d="M 70 75 Q 80 62 90 75" />
        <path d="M 110 75 Q 120 62 130 75" />
      </g>
    )
  }
  if (state === 'sleepy') {
    return (
      <g className="leo-eyes" fill="none" stroke="#3a2a20" strokeWidth="5.5" strokeLinecap="round">
        <path d="M 70 71 Q 80 81 90 71" />
        <path d="M 110 71 Q 120 81 130 71" />
      </g>
    )
  }
  const up = state === 'think' ? -2.4 : 0
  return (
    <g className="leo-eyes">
      {/* Big and round — cuteness in a cub face is mostly eye-to-head ratio,
          and a white rim makes them pop off the fur the way painted art does.
          Iris → pupil → two catchlights → a bounce-light arc underneath. */}
      <circle cx="80" cy="72" r="13" fill="#fff" opacity=".9" />
      <circle cx="120" cy="72" r="13" fill="#fff" opacity=".9" />
      <circle cx="80" cy="72" r="11.5" fill={`url(#${ids.eye})`} />
      <circle cx="120" cy="72" r="11.5" fill={`url(#${ids.eye})`} />
      <ellipse cx="80" cy="73" rx="5.6" ry="8.6" fill="#22160f" />
      <ellipse cx="120" cy="73" rx="5.6" ry="8.6" fill="#22160f" />
      <circle cx="84.4" cy={67.4 + up} r="4.1" fill="#fff" />
      <circle cx="124.4" cy={67.4 + up} r="4.1" fill="#fff" />
      <circle cx="75.6" cy={77 + up} r="2.1" fill="#fff" opacity=".7" />
      <circle cx="115.6" cy={77 + up} r="2.1" fill="#fff" opacity=".7" />
      <path d="M 73 78 A 8 8 0 0 0 87 78" fill="#fff" opacity=".18" />
      <path d="M 113 78 A 8 8 0 0 0 127 78" fill="#fff" opacity=".18" />
    </g>
  )
}

function Brows({ state, sp }) {
  if (state !== 'think') return null
  return (
    <g stroke={sp.nose} strokeWidth="3.6" strokeLinecap="round" fill="none" opacity=".85">
      <path d="M 72 55 Q 82 49 92 54" />
      <path d="M 108 53 Q 118 45.5 128 51" />
    </g>
  )
}

function Mouth({ state, ids, sp }) {
  if (state === 'happy') {
    return (
      <g>
        <clipPath id={ids.mouth}>
          <path d="M 84 104 Q 100 100 116 104 Q 116 122 100 122 Q 84 122 84 104 Z" />
        </clipPath>
        <path d="M 84 104 Q 100 100 116 104 Q 116 122 100 122 Q 84 122 84 104 Z" fill="#4a2b28" />
        <ellipse cx="100" cy="121" rx="9" ry="6.5" fill="#ff7a8a" clipPath={`url(#${ids.mouth})`} />
      </g>
    )
  }
  if (state === 'think') {
    return <path d="M 91 107 Q 100 113.5 109 107" fill="none" stroke={sp.nose} strokeWidth="4" strokeLinecap="round" />
  }
  if (state === 'sleepy') {
    return <ellipse className="leo-snore" cx="100" cy="110" rx="5" ry="4.5" fill={sp.nose} />
  }
  return (
    <path
      d="M 100 99 L 100 105 M 100 105 Q 92 113 85 107 M 100 105 Q 108 113 115 107"
      fill="none"
      stroke={sp.nose}
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

/* ── Species-specific bits ───────────────────────────────────────────────── */

function Ears({ sp, ids }) {
  if (sp.ears === 'pointed') {
    return (
      <>
        <g className="leo-ear leo-ear--l">
          <path d="M 72 52 L 58 16 L 98 40 Z" fill={`url(#${ids.fur})`} stroke={`url(#${ids.fur})`} strokeWidth="12" strokeLinejoin="round" />
          <path d="M 75 46 L 68 27 L 89 40 Z" fill={`url(#${ids.earIn})`} stroke={`url(#${ids.earIn})`} strokeWidth="5" strokeLinejoin="round" />
        </g>
        <g className="leo-ear leo-ear--r">
          <path d="M 128 52 L 142 16 L 102 40 Z" fill={`url(#${ids.fur})`} stroke={`url(#${ids.fur})`} strokeWidth="12" strokeLinejoin="round" />
          <path d="M 125 46 L 132 27 L 111 40 Z" fill={`url(#${ids.earIn})`} stroke={`url(#${ids.earIn})`} strokeWidth="5" strokeLinejoin="round" />
        </g>
      </>
    )
  }
  // Big cats: round ears set wide on the head. This single change does more to
  // say "cat, not fox" than the markings do.
  return (
    <>
      <g className="leo-ear leo-ear--l">
        <circle cx="63" cy="46" r="19" fill={`url(#${ids.earIn})`} />
        <circle cx="65" cy="49" r="12.5" fill={`url(#${ids.fur})`} />
        <circle cx="66" cy="51" r="7.5" fill={sp.blush} opacity=".55" />
      </g>
      <g className="leo-ear leo-ear--r">
        <circle cx="137" cy="46" r="19" fill={`url(#${ids.earIn})`} />
        <circle cx="135" cy="49" r="12.5" fill={`url(#${ids.fur})`} />
        <circle cx="134" cy="51" r="7.5" fill={sp.blush} opacity=".55" />
      </g>
    </>
  )
}

function Tail({ sp, ids }) {
  if (sp.tail === 'bushy') {
    return (
      <g className="leo-tail">
        <path d="M 76 152 C 44 160 14 140 22 102" fill="none" stroke={`url(#${ids.tailG})`} strokeWidth="26" strokeLinecap="round" />
        <circle cx="50" cy="156" r="15" fill={`url(#${ids.tailG})`} />
        <circle cx="31" cy="147" r="16.5" fill={`url(#${ids.tailG})`} />
        <circle cx="18" cy="127" r="17" fill={`url(#${ids.tailG})`} />
        <circle cx="21" cy="103" r="18" fill={`url(#${ids.cream})`} />
        <circle cx="35" cy="114" r="11.5" fill={`url(#${ids.cream})`} />
      </g>
    )
  }
  // Long, slim, curled — the other big giveaway. Markings ride along it.
  return (
    <g className="leo-tail">
      <path
        d="M 74 152 C 44 162 16 146 20 112 C 22 96 34 88 44 94"
        fill="none"
        stroke={`url(#${ids.tailG})`}
        strokeWidth="13"
        strokeLinecap="round"
      />
      {sp.marks === 'spots' && (
        <g fill={sp.paw} opacity=".9">
          <ellipse cx="56" cy="154" rx="3.4" ry="2.6" />
          <ellipse cx="34" cy="147" rx="3.2" ry="2.8" transform="rotate(-40 34 147)" />
          <ellipse cx="22" cy="128" rx="2.8" ry="3.2" />
          <ellipse cx="25" cy="108" rx="2.6" ry="3" transform="rotate(20 25 108)" />
        </g>
      )}
      {sp.marks === 'stripes' && (
        <g stroke={sp.paw} strokeWidth="4.5" strokeLinecap="round" opacity=".92">
          <path d="M 54 150 L 58 158" />
          <path d="M 36 142 L 32 152" />
          <path d="M 21 124 L 30 127" />
          <path d="M 24 106 L 32 110" />
        </g>
      )}
      <circle cx="44" cy="94" r="7.5" fill={`url(#${ids.cream})`} />
    </g>
  )
}

/** Head markings, clipped to the head so nothing spills past the silhouette. */
function HeadMarks({ sp, ids }) {
  if (sp.marks === 'blaze') {
    return (
      <path
        d="M 92 90 C 92 70 96 58 100 51 C 104 58 108 70 108 90 Z"
        fill={`url(#${ids.cream})`}
        stroke={`url(#${ids.cream})`}
        strokeWidth="4"
        strokeLinejoin="round"
      />
    )
  }
  if (sp.marks === 'spots') {
    return (
      <g clipPath={`url(#${ids.headClip})`} fill={sp.paw} opacity=".88">
        {/* Rosettes: an open ring reads as leopard; solid dots read as cow. */}
        {[
          [74, 54, 0], [90, 45, -15], [110, 45, 15], [126, 54, 0],
          [62, 74, 0], [138, 74, 0], [58, 92, -20], [142, 92, 20],
          [70, 108, 0], [130, 108, 0],
        ].map(([x, y, r], i) => (
          <g key={i} transform={`rotate(${r} ${x} ${y})`}>
            <ellipse cx={x} cy={y} rx="5.2" ry="4.2" fill="none" stroke={sp.paw} strokeWidth="2.6" />
            <circle cx={x} cy={y} r="1.5" />
          </g>
        ))}
      </g>
    )
  }
  return (
    <g clipPath={`url(#${ids.headClip})`} stroke={sp.paw} strokeWidth="5" strokeLinecap="round" fill="none" opacity=".92">
      <path d="M 88 40 Q 86 50 88 60" />
      <path d="M 100 36 Q 100 48 100 58" />
      <path d="M 112 40 Q 114 50 112 60" />
      <path d="M 56 68 Q 66 71 74 70" />
      <path d="M 144 68 Q 134 71 126 70" />
      <path d="M 56 88 Q 64 90 70 88" />
      <path d="M 144 88 Q 136 90 130 88" />
    </g>
  )
}

function BodyMarks({ sp, ids }) {
  if (sp.marks === 'spots') {
    return (
      <g clipPath={`url(#${ids.bodyClip})`} fill="none" stroke={sp.paw} strokeWidth="2.4" opacity=".85">
        {[[72, 138], [128, 138], [66, 158], [134, 158], [74, 172], [126, 172]].map(([x, y], i) => (
          <ellipse key={i} cx={x} cy={y} rx="4.6" ry="3.8" />
        ))}
      </g>
    )
  }
  if (sp.marks === 'stripes') {
    return (
      <g clipPath={`url(#${ids.bodyClip})`} stroke={sp.paw} strokeWidth="5" strokeLinecap="round" fill="none" opacity=".9">
        <path d="M 68 128 Q 72 138 68 148" />
        <path d="M 132 128 Q 128 138 132 148" />
        <path d="M 64 158 Q 70 165 66 172" />
        <path d="M 136 158 Q 130 165 134 172" />
      </g>
    )
  }
  return null
}

/** The tuft both cubs wear between their ears. */
function Tuft({ sp, ids }) {
  if (sp.ears === 'pointed') return null
  return (
    <g>
      <path
        d="M 84 50 L 89 24 L 97 46 L 103 18 L 110 46 L 117 26 L 120 52 Z"
        fill={`url(#${ids.fur})`}
        stroke={`url(#${ids.fur})`}
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {sp.marks === 'stripes' && (
        <g stroke={sp.paw} strokeWidth="3.4" strokeLinecap="round" opacity=".9">
          <path d="M 92 40 L 91 30" />
          <path d="M 103 38 L 103 26" />
          <path d="M 113 40 L 114 31" />
        </g>
      )}
    </g>
  )
}

/* ── The cub ─────────────────────────────────────────────────────────────── */

export default function Cub({ species = 'fox', state = 'idle', size = 140, className = '', style }) {
  const sp = SPECIES[species] ?? SPECIES.fox
  const s = STATES.includes(state) ? state : 'idle'

  const raw = useId()
  const ids = useMemo(() => {
    const u = raw.replace(/[^a-zA-Z0-9]/g, '') + species
    return {
      fur: `fur${u}`, head: `head${u}`, tailG: `tail${u}`, cream: `cream${u}`,
      earIn: `ear${u}`, eye: `eye${u}`, mouth: `mouth${u}`,
      headClip: `hc${u}`, bodyClip: `bc${u}`,
    }
  }, [raw, species])

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
      aria-label={sp.name}
      focusable="false"
    >
      <defs>
        <linearGradient id={ids.fur} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sp.fur[0]} />
          <stop offset="1" stopColor={sp.fur[1]} />
        </linearGradient>
        <radialGradient id={ids.head} cx="0.38" cy="0.3" r="0.85">
          <stop offset="0" stopColor={sp.head[0]} />
          <stop offset="1" stopColor={sp.head[1]} />
        </radialGradient>
        <linearGradient id={ids.tailG} x1="0.2" y1="1" x2="0.8" y2="0">
          <stop offset="0" stopColor={sp.tailG[0]} />
          <stop offset="1" stopColor={sp.tailG[1]} />
        </linearGradient>
        <linearGradient id={ids.cream} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sp.cream[0]} />
          <stop offset="1" stopColor={sp.cream[1]} />
        </linearGradient>
        <linearGradient id={ids.earIn} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sp.earIn[0]} />
          <stop offset="1" stopColor={sp.earIn[1]} />
        </linearGradient>
        <radialGradient id={ids.eye} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor={sp.eye[0]} />
          <stop offset="1" stopColor={sp.eye[1]} />
        </radialGradient>
        <clipPath id={ids.headClip}>
          <circle cx="100" cy="82" r="45" />
        </clipPath>
        <clipPath id={ids.bodyClip}>
          <ellipse cx="100" cy="147" rx="38" ry="33" />
        </clipPath>
      </defs>

      <ellipse className="leo-shadow" cx="100" cy="186" rx="44" ry="6.5" fill="#5a3a22" opacity=".14" />

      <g className="leo-all">
        <Tail sp={sp} ids={ids} />

        <ellipse cx="100" cy="147" rx="38" ry="33" fill={`url(#${ids.fur})`} />
        <BodyMarks sp={sp} ids={ids} />
        <ellipse cx="100" cy="154" rx="25" ry="23" fill={`url(#${ids.cream})`} />
        <circle cx="84" cy="134" r="9.5" fill={`url(#${ids.cream})`} />
        <circle cx="100" cy="131" r="10.5" fill={`url(#${ids.cream})`} />
        <circle cx="116" cy="134" r="9.5" fill={`url(#${ids.cream})`} />

        <ellipse className="leo-foot leo-foot--l" cx="82" cy="178" rx="14" ry="8.5" fill={sp.paw} />
        <ellipse className="leo-foot leo-foot--r" cx="118" cy="178" rx="14" ry="8.5" fill={sp.paw} />

        <g className="leo-head">
          <Ears sp={sp} ids={ids} />
          <circle cx="100" cy="82" r="45" fill={`url(#${ids.head})`} />
          <HeadMarks sp={sp} ids={ids} />
          <Tuft sp={sp} ids={ids} />

          <ellipse cx="100" cy="102" rx="27" ry="21" fill={`url(#${ids.cream})`} />
          <ellipse className="leo-blush leo-blush--l" cx="64" cy="99" rx="9.5" ry="6" fill={sp.blush} opacity=".5" />
          <ellipse className="leo-blush leo-blush--r" cx="136" cy="99" rx="9.5" ry="6" fill={sp.blush} opacity=".5" />

          <Eyes state={s} ids={ids} />
          <Brows state={s} sp={sp} />

          <path d="M 90.5 88 Q 100 83 109.5 88 Q 109.5 97.5 100 99.5 Q 90.5 97.5 90.5 88 Z" fill={sp.nose} />
          <ellipse cx="96.5" cy="88.5" rx="2.6" ry="1.6" fill="#fff" opacity=".35" transform="rotate(-18 96.5 88.5)" />

          {/* Whiskers — cats have them, foxes get them too; they're cheap and
              they animate for free with the head. */}
          {sp.ears === 'round' && (
            <g stroke={sp.paw} strokeWidth="1.8" strokeLinecap="round" opacity=".5">
              <path d="M 74 100 L 54 96" />
              <path d="M 74 105 L 55 107" />
              <path d="M 126 100 L 146 96" />
              <path d="M 126 105 L 145 107" />
            </g>
          )}

          <Mouth state={s} ids={ids} sp={sp} />

          {s === 'think' && (
            <text className="leo-think-mark" x="152" y="44" fontSize="34" fontWeight="900" fill="var(--blue)">?</text>
          )}
          {s === 'sleepy' && (
            <g className="leo-zzz" fill="var(--blue)" fontWeight="900">
              <text className="leo-z leo-z--1" x="140" y="46" fontSize="19">z</text>
              <text className="leo-z leo-z--2" x="154" y="30" fontSize="25">z</text>
              <text className="leo-z leo-z--3" x="172" y="14" fontSize="31">Z</text>
            </g>
          )}
        </g>

        <g className="leo-arm leo-arm--l">
          <path d="M 68 130 L 52 160" fill="none" stroke={`url(#${ids.fur})`} strokeWidth="15" strokeLinecap="round" />
          <circle cx="52" cy="160" r="9" fill={sp.paw} />
        </g>
        <g className="leo-arm leo-arm--r">
          <path d="M 132 130 L 148 160" fill="none" stroke={`url(#${ids.fur})`} strokeWidth="15" strokeLinecap="round" />
          <circle cx="148" cy="160" r="9" fill={sp.paw} />
        </g>
      </g>
    </svg>
  )
}
