import { useStore } from '../game/store.jsx'
import { canSpeak, speak, sfx } from '../game/audio.js'
import { STICKERS } from '../game/stickers.js'
import './ui.css'

/* ── Read-aloud ───────────────────────────────────────────────────────────
   He can read, but some prompts are two sentences long. Tapping Лео's speaker
   re-reads the instruction as many times as he likes, with no penalty. */
export function SpeakButton({ text, className = '' }) {
  const { state } = useStore()
  if (!state.settings.voice || !canSpeak() || !text) return null
  return (
    <button
      className={`icon-btn speak-btn ${className}`}
      onClick={() => speak(text)}
      aria-label="Прочитать вслух"
      type="button"
    >
      🔊
    </button>
  )
}

/* ── Hearts ───────────────────────────────────────────────────────────────
   Deliberately toothless: they show effort, they never end a lesson. Losing one
   costs nothing but a sympathetic look from Лео. */
export function Hearts({ left, total = 3 }) {
  return (
    <div className="hearts" aria-label={`Сердечки: ${left} из ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`heart ${i < left ? 'heart--on' : 'heart--off'}`} aria-hidden="true">
          {i < left ? '❤️' : '🤍'}
        </span>
      ))}
    </div>
  )
}

export function Stars({ count = 0, size = 'md', animate = false }) {
  return (
    <div className={`stars stars--${size}`} aria-label={`${count} из 3 звёзд`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`star ${i < count ? 'star--on' : 'star--off'}`}
          style={animate ? { animationDelay: `${i * 0.16}s` } : undefined}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </div>
  )
}

export function ProgressBar({ value, max, className = '' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className={`pbar ${className}`} role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className="pbar-fill" style={{ width: `${pct}%` }}>
        <span className="pbar-shine" />
      </div>
    </div>
  )
}

/* ── Collectible sticker ─────────────────────────────────────────────────
   A scalloped rosette drawn in SVG with the emoji sitting in the middle, so a
   sticker costs no image bytes and still looks like a prize. */
export function Sticker({ id, locked = false, size = 92, onClick }) {
  const s = STICKERS[id]
  if (!s) return null

  const petals = 12
  const pts = Array.from({ length: petals * 2 }, (_, i) => {
    const a = (i / (petals * 2)) * Math.PI * 2 - Math.PI / 2
    const r = i % 2 === 0 ? 48 : 41
    return `${(50 + Math.cos(a) * r).toFixed(2)},${(50 + Math.sin(a) * r).toFixed(2)}`
  }).join(' ')

  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      className={`sticker ${locked ? 'sticker--locked' : `sticker--${s.color}`} ${s.big ? 'sticker--big' : ''}`}
      style={{ width: size }}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      title={locked ? 'Ещё не открыта' : s.label}
    >
      <svg viewBox="0 0 100 100" className="sticker-art">
        <polygon className="sticker-rosette" points={pts} />
        <circle className="sticker-disc" cx="50" cy="50" r="35" />
        <text x="50" y="50" className="sticker-emoji" textAnchor="middle" dominantBaseline="central">
          {locked ? '🔒' : s.emoji}
        </text>
      </svg>
      <span className="sticker-label">{locked ? '???' : s.label}</span>
    </Tag>
  )
}

/* ── The chunky button, as a component ───────────────────────────────────── */
export function Button({ children, variant = 'green', block, big, onClick, disabled, type = 'button', className = '', ...rest }) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`btn btn--${variant} ${block ? 'btn--block' : ''} ${big ? 'btn--big' : ''} ${className}`}
      onClick={(e) => {
        if (!disabled) sfx.tap()
        onClick?.(e)
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
