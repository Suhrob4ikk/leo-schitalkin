import { sfx } from '../game/audio.js'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok']

/** Typing pad. Deliberately its own big grid rather than a text input: a system
    keyboard on a phone would cover half the question. */
export default function NumberPad({ value, onChange, onSubmit, locked, maxLen = 3 }) {
  // Every branch updates functionally off the previous value. Reading `value`
  // from the render closure means two taps landing before React re-renders both
  // compute from "" — typing 12 quickly would leave you with 2. Children tap
  // fast, and a cheap tablet renders slowly.
  const press = (k) => {
    if (locked) return
    if (k === 'del') {
      sfx.tap()
      onChange((v) => v.slice(0, -1))
      return
    }
    if (k === 'ok') {
      if (value === '') return
      onSubmit()
      return
    }
    sfx.pick()
    onChange((v) => {
      if (v.length >= maxLen) return v
      // No leading zeros — "07" is not an answer a child means to give.
      if (v === '0') return k
      return v + k
    })
  }

  return (
    <div className="pad">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          className={`pad-key ${k === 'ok' ? 'pad-key--ok' : ''} ${k === 'del' ? 'pad-key--del' : ''}`}
          disabled={locked || (k === 'ok' && value === '')}
          onClick={() => press(k)}
          aria-label={k === 'del' ? 'Стереть' : k === 'ok' ? 'Готово' : k}
        >
          {k === 'del' ? '⌫' : k === 'ok' ? '✓' : k}
        </button>
      ))}
    </div>
  )
}

/** The answer readout above the pad. */
export function PadDisplay({ value, phase }) {
  const mod = phase === 'correct' ? 'is-correct' : phase === 'retry' || phase === 'reveal' ? 'is-wrong' : ''
  return (
    <div className={`pad-display ${mod} ${value ? '' : 'is-empty'}`}>
      {value || <span className="pad-caret" />}
    </div>
  )
}
