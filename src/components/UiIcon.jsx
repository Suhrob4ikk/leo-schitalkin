import { UI } from '../assets/ui-icons.js'

/*  A UI-chrome glyph: <UiIcon name="lock" />
 *
 *  Named UiIcon.jsx, not Ui.jsx: Windows filesystems are case-insensitive, so
 *  Ui.jsx and the existing ui.jsx are the same file and one silently replaces
 *  the other.
 *
 *  Inherits currentColor and font size, which is the whole reason these exist
 *  alongside the emoji. The same lock can be grey inside a locked node and the
 *  same speaker blue inside its button — an emoji has its colour baked in, and
 *  a bright yellow padlock drew the eye to the one node the child can't tap.
 *
 *  Colourful content (lesson topics, stickers, story objects) uses <Icon>
 *  instead; a child recognises a red apple far faster than a grey outline.
 */
export default function UiIcon({ name, size = '1em', className = '', style, label }) {
  const ic = UI[name]
  if (!ic) return null

  return (
    <svg
      viewBox={ic.viewBox}
      width={size}
      height={size}
      className={`ui-icon ${className}`}
      style={style}
      fill="currentColor"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      focusable="false"
    >
      {ic.d.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}
