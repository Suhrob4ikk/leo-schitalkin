/* Renders the PWA icons from Лео's face. Run with `npm run icons` after
   changing the mascot; the output is committed, so a normal build doesn't need
   sharp installed. */
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = join(process.cwd(), 'public', 'icons')
mkdirSync(OUT, { recursive: true })

/** @param {{pad:number, bg:string|null, round:boolean}} o */
const face = ({ pad = 0, bg = null, round = false }) => {
  // `pad` shrinks Лео inside the canvas so a maskable icon survives being
  // cropped to a circle by the launcher.
  const s = 200
  const inner = s - pad * 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="fur" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffab6b"/><stop offset="1" stop-color="#f87f35"/>
    </linearGradient>
    <radialGradient id="head" cx="0.38" cy="0.3" r="0.85">
      <stop offset="0" stop-color="#ffb87f"/><stop offset="1" stop-color="#f8823a"/>
    </radialGradient>
    <linearGradient id="cream" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fffcf7"/><stop offset="1" stop-color="#ffe7ce"/>
    </linearGradient>
    <linearGradient id="ear" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6b4235"/><stop offset="1" stop-color="#482b21"/>
    </linearGradient>
    <linearGradient id="eye" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4d382f"/><stop offset="1" stop-color="#2b1e18"/>
    </linearGradient>
  </defs>
  ${bg ? `<rect width="${s}" height="${s}" ${round ? `rx="${s * 0.22}"` : ''} fill="${bg}"/>` : ''}
  <g transform="translate(${pad},${pad}) scale(${inner / s})">
    <g transform="translate(0, 18) scale(1.06)">
      <path d="M 72 52 L 58 16 L 98 40 Z" fill="url(#fur)" stroke="url(#fur)" stroke-width="12" stroke-linejoin="round"/>
      <path d="M 75 46 L 68 27 L 89 40 Z" fill="url(#ear)" stroke="url(#ear)" stroke-width="5" stroke-linejoin="round"/>
      <path d="M 128 52 L 142 16 L 102 40 Z" fill="url(#fur)" stroke="url(#fur)" stroke-width="12" stroke-linejoin="round"/>
      <path d="M 125 46 L 132 27 L 111 40 Z" fill="url(#ear)" stroke="url(#ear)" stroke-width="5" stroke-linejoin="round"/>
      <circle cx="100" cy="82" r="45" fill="url(#head)"/>
      <path d="M 92 90 C 92 70 96 58 100 51 C 104 58 108 70 108 90 Z" fill="url(#cream)" stroke="url(#cream)" stroke-width="4" stroke-linejoin="round"/>
      <ellipse cx="100" cy="102" rx="27" ry="21" fill="url(#cream)"/>
      <ellipse cx="64" cy="99" rx="9.5" ry="6" fill="#ff9e9e" opacity=".5"/>
      <ellipse cx="136" cy="99" rx="9.5" ry="6" fill="#ff9e9e" opacity=".5"/>
      <circle cx="82" cy="72" r="9" fill="url(#eye)"/>
      <circle cx="118" cy="72" r="9" fill="url(#eye)"/>
      <circle cx="85.6" cy="68.4" r="3.3" fill="#fff"/>
      <circle cx="121.6" cy="68.4" r="3.3" fill="#fff"/>
      <circle cx="78.6" cy="75.6" r="1.7" fill="#fff" opacity=".6"/>
      <circle cx="114.6" cy="75.6" r="1.7" fill="#fff" opacity=".6"/>
      <path d="M 90.5 88 Q 100 83 109.5 88 Q 109.5 97.5 100 99.5 Q 90.5 97.5 90.5 88 Z" fill="#42302a"/>
      <ellipse cx="96.5" cy="88.5" rx="2.6" ry="1.6" fill="#fff" opacity=".35" transform="rotate(-18 96.5 88.5)"/>
      <path d="M 100 99 L 100 105 M 100 105 Q 92 113 85 107 M 100 105 Q 108 113 115 107" fill="none" stroke="#42302a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </g>
</svg>`
}

const jobs = [
  { name: 'icon-192.png', size: 192, svg: face({ pad: 6, bg: '#FFFDF8', round: true }) },
  { name: 'icon-512.png', size: 512, svg: face({ pad: 6, bg: '#FFFDF8', round: true }) },
  { name: 'apple-touch-icon.png', size: 180, svg: face({ pad: 8, bg: '#FFFDF8', round: false }) },
  // Maskable: art must survive an aggressive circular crop, so it sits inside
  // the safe zone on a full-bleed background.
  { name: 'maskable-512.png', size: 512, svg: face({ pad: 30, bg: '#FFFDF8', round: false }) },
]

for (const j of jobs) {
  await sharp(Buffer.from(j.svg)).resize(j.size, j.size).png().toFile(join(OUT, j.name))
  console.log('✓', j.name, `${j.size}×${j.size}`)
}
