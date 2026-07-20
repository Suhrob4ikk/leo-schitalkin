import { useState } from 'react'
import { Link } from 'react-router-dom'
import Cub, { SPECIES } from '../components/Cub.jsx'

/* Preview page for the cast. Temporary — here so the characters can be looked
   at and judged before anything is wired into the lessons. */
const STATES = ['idle', 'wave', 'happy', 'cheer', 'starry', 'think', 'sleepy']
const KEYS = ['leopard', 'tiger', 'fox']

export default function Cubs() {
  const [state, setState] = useState('idle')

  return (
    <div className="screen" style={{ padding: '1rem', textAlign: 'center' }}>
      <div className="shell">
        <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {STATES.map((s) => (
            <button key={s} className={`btn ${state === s ? '' : 'btn--white'}`} onClick={() => setState(s)}>
              {s}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {KEYS.map((k) => (
            <div key={k} className="card" style={{ padding: '.6rem', flex: '1 1 10rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', minHeight: 180 }}>
                <Cub species={k} state={state} size={170} />
              </div>
              <b style={{ fontSize: '1.1rem' }}>{SPECIES[k].name}</b>
            </div>
          ))}
        </div>

        <Link to="/" className="btn btn--white" style={{ marginTop: '1rem' }}>
          На карту
        </Link>
      </div>
    </div>
  )
}
