import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Cub, { CAST, SPECIES } from '../components/Cub.jsx'
import { useStore } from '../game/store.jsx'
import { sfx } from '../game/audio.js'
import { burstFrom, cannons } from '../game/confetti.js'
import './PickBuddy.css'

/*  "Выбери своего друга".
 *
 *  Shown once on first run, and reachable from settings afterwards. The whole
 *  point is that the choice is visible: the selected cub is the only one
 *  animating happily, so a child sees the consequence of the tap immediately
 *  rather than having to read which card is highlighted.
 */
export default function PickBuddy({ onDone }) {
  const nav = useNavigate()
  const { state, dispatch } = useStore()
  const [picked, setPicked] = useState(state.settings.buddy ?? null)

  const choose = (id, el) => {
    if (id === picked) return
    sfx.pick()
    setPicked(id)
    if (el) burstFrom(el, { count: 22, power: 7 })
  }

  const confirm = () => {
    if (!picked) return
    dispatch({ type: 'setSetting', key: 'buddy', value: picked })
    sfx.unlock()
    cannons({ count: 45 })
    if (onDone) onDone()
    else nav('/', { replace: true })
  }

  return (
    <div className="screen pick">
      <div className="shell pick-body safe-top">
        <h1 className="pick-title">Выбери своего друга</h1>
        <p className="sub pick-sub">Он будет учиться вместе с тобой</p>

        <div className="pick-grid">
          {CAST.map((id) => {
            const sp = SPECIES[id]
            const on = picked === id
            return (
              <button
                key={id}
                type="button"
                className={`pick-card ${on ? 'is-on' : ''}`}
                onClick={(e) => choose(id, e.currentTarget)}
                aria-pressed={on}
              >
                <div className="pick-art">
                  {/* Only the chosen one celebrates — that contrast IS the
                      feedback, no "selected" label needed. */}
                  <Cub species={id} state={on ? 'happy' : 'idle'} size={132} />
                </div>
                <b className="pick-name">
                  <span aria-hidden="true">{sp.emoji}</span> {sp.full}
                </b>
                <span className="pick-trait">{sp.trait}</span>
                {on && <span className="pick-tick" aria-hidden="true">✓</span>}
              </button>
            )
          })}
        </div>

        <p className="pick-foot sub">⭐ Друга можно поменять в настройках</p>
      </div>

      <div className="pick-actions shell safe-bottom">
        <button className="btn btn--green btn--block btn--big" disabled={!picked} onClick={confirm}>
          {picked ? `Играть с ${SPECIES[picked].withName}!` : 'Выбери друга'}
        </button>
      </div>
    </div>
  )
}
