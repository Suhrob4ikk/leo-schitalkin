import { ICONS } from '../assets/icons.js'

/*  A bundled Twemoji glyph, rendered as an image.
 *
 *  Written as <Icon e="🍎" /> so calling code still reads like the emoji it
 *  represents — the curriculum and sticker tables keep their characters.
 *
 *  Why not just type the character: the system font renders it differently on
 *  every device (glossy on Windows, flat on Android, different again on
 *  iPhone), so the app has no consistent look of its own, and some glyphs are
 *  missing entirely on older phones. These ship with the app and are identical
 *  everywhere, including offline.
 *
 *  Anything without a bundled file falls back to the character itself, so a
 *  newly-added emoji degrades to the old behaviour instead of vanishing.
 */
export default function Icon({ e, size = '1em', className = '', style, alt = '' }) {
  const src = ICONS[e]
  if (!src) return <span className={className} style={style}>{e}</span>

  return (
    <img
      src={src}
      alt={alt}
      aria-hidden={alt ? undefined : 'true'}
      draggable="false"
      className={`icon ${className}`}
      style={{ width: size, height: size, ...style }}
    />
  )
}
