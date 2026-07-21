import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UiIcon from '../components/UiIcon.jsx'
import Mascot from '../components/Mascot.jsx'
import { Sticker, ProgressBar } from '../components/ui.jsx'
import Sheet from '../components/Sheet.jsx'
import { useStore } from '../game/store.jsx'
import { STICKERS } from '../game/stickers.js'
import { sfx } from '../game/audio.js'
import { burstFrom } from '../game/confetti.js'
import './Collection.css'

const REGULAR = Object.keys(STICKERS).filter((k) => !STICKERS[k].big)
const SPECIAL = Object.keys(STICKERS).filter((k) => STICKERS[k].big)

export default function Collection() {
  const nav = useNavigate()
  const { state } = useStore()
  const [zoom, setZoom] = useState(null)

  // Only count stickers that actually exist in the album. An older save can
  // carry ids that were awarded before their definition shipped (or after one
  // was removed); without this filter "have" could exceed "total" and read like
  // "37 / 31".
  const have = new Set(state.stickers.filter((id) => STICKERS[id]))
  const total = REGULAR.length + SPECIAL.length

  const open = (id, el) => {
    if (!have.has(id)) {
      sfx.soft()
      return
    }
    sfx.pick()
    burstFrom(el, { count: 18, power: 6 })
    setZoom(id)
  }

  return (
    <div className="screen coll">
      <header className="coll-top safe-top shell">
        <button className="icon-btn" onClick={() => nav('/')} aria-label="Назад">
          <UiIcon name="back" size="1.35rem" />
        </button>
        <b className="h2">Коллекция</b>
      </header>

      <div className="shell coll-body">
        <div className="coll-hero">
          <Mascot size={110} state={have.size > 0 ? 'wave' : 'idle'} />
          <div className="coll-hero-text">
            <b className="h1 tnum">
              {have.size} / {total}
            </b>
            <span className="sub">наклеек собрано</span>
            <ProgressBar value={have.size} max={total} className="pbar--gold" />
          </div>
        </div>

        <h2 className="coll-head">Уроки</h2>
        <div className="coll-grid">
          {REGULAR.map((id) => (
            <Sticker key={id} id={id} locked={!have.has(id)} size={92} onClick={(e) => open(id, e.currentTarget)} />
          ))}
        </div>

        <h2 className="coll-head">Особые</h2>
        <div className="coll-grid">
          {SPECIAL.map((id) => (
            <Sticker key={id} id={id} locked={!have.has(id)} size={92} onClick={(e) => open(id, e.currentTarget)} />
          ))}
        </div>
      </div>

      {zoom && (
        <Sheet onClose={() => setZoom(null)}>
          <div className="coll-zoom">
            <Sticker id={zoom} size={170} />
          </div>
          <button className="btn btn--green btn--block" onClick={() => setZoom(null)}>
            Здорово!
          </button>
        </Sheet>
      )}
    </div>
  )
}
