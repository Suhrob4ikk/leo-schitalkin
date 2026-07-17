import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/*  Bottom sheet / modal.
 *
 *  Rendered through a portal into <body> on purpose. `position: fixed` is
 *  measured against the nearest ancestor that has a transform, not the viewport
 *  — and every screen here animates in with a transform. Left in place, the
 *  backdrop sized itself to the whole scrollable path and the sheet landed at
 *  the very bottom of the page instead of over the screen. A portal has no such
 *  ancestor, so fixed means fixed.
 */
export default function Sheet({ children, onClose, className = '' }) {
  // A sheet is a modal: the page behind it must not scroll under the child's
  // finger, and Escape should close it.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div className={`sheet ${className}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>,
    document.body,
  )
}
