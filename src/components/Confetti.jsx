import { useEffect, useRef } from 'react'
import { mountCanvas } from '../game/confetti.js'

/** Mounted once at the app root; every burst in the app draws into this canvas. */
export default function ConfettiLayer() {
  const ref = useRef(null)
  useEffect(() => mountCanvas(ref.current), [])
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 90 }}
    />
  )
}
