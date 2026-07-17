/* A tiny canvas particle system. One shared full-screen canvas that any
   component can fire into, so a burst costs nothing to trigger from deep in a
   tree and never re-renders React. Runs only while particles are alive. */

const COLORS = ['#58cc02', '#1cb0f6', '#ff9600', '#ffc800', '#ce82ff', '#ff8a47', '#ff5c5c', '#2ec4b6']

let canvas = null
let ctx = null
let parts = []
let raf = null
let W = 0
let H = 0
let dpr = 1

const MAX = 420
const rand = (a, b) => a + Math.random() * (b - a)
const pick = (a) => a[(Math.random() * a.length) | 0]

export function mountCanvas(el) {
  canvas = el
  ctx = el.getContext('2d')
  resize()
  window.addEventListener('resize', resize)
  return () => {
    window.removeEventListener('resize', resize)
    stop()
    canvas = null
    ctx = null
  }
}

function resize() {
  if (!canvas) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  W = window.innerWidth
  H = window.innerHeight
  canvas.width = W * dpr
  canvas.height = H * dpr
  canvas.style.width = W + 'px'
  canvas.style.height = H + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function spawn(p) {
  if (parts.length >= MAX) parts.shift()
  parts.push(p)
}

function make(x, y, angle, power, opts = {}) {
  const speed = power * rand(0.55, 1.15)
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    rot: rand(0, Math.PI * 2),
    vr: rand(-0.28, 0.28),
    size: rand(6, 12) * (opts.scale || 1),
    color: opts.color || pick(COLORS),
    shape: Math.random() < 0.55 ? 'strip' : Math.random() < 0.5 ? 'rect' : 'circle',
    // Each strip flips on its own axis at its own rate — this is what makes it
    // read as tumbling paper rather than floating dots.
    flip: rand(0, Math.PI * 2),
    vflip: rand(0.12, 0.3),
    drift: rand(-0.02, 0.02),
    life: 0,
    max: rand(90, 160) * (opts.lifeScale || 1),
    grav: rand(0.22, 0.34),
  }
}

/** Small celebratory pop at a point — the per-answer reward. */
export function burst(x, y, opts = {}) {
  const n = opts.count ?? 34
  const power = opts.power ?? 9
  const spread = opts.spread ?? Math.PI * 2
  const dir = opts.direction ?? -Math.PI / 2
  for (let i = 0; i < n; i++) {
    spawn(make(x, y, dir + rand(-spread / 2, spread / 2), power, opts))
  }
  start()
}

/** Two side cannons — the lesson-complete moment. */
export function cannons(opts = {}) {
  const n = opts.count ?? 70
  for (let i = 0; i < n; i++) {
    spawn(make(-10, H * 0.72, rand(-1.15, -0.5), rand(14, 20), opts))
    spawn(make(W + 10, H * 0.72, Math.PI + rand(0.5, 1.15), rand(14, 20), opts))
  }
  start()
}

/** Sustained fall from above — the "perfect lesson" and new-unit moments. */
export function rain(ms = 2200, opts = {}) {
  const t0 = performance.now()
  const every = opts.every ?? 60
  let last = 0
  const tick = (now) => {
    if (now - last > every) {
      last = now
      for (let i = 0; i < (opts.perTick ?? 7); i++) {
        const p = make(rand(0, W), -20, Math.PI / 2, rand(1, 3), { ...opts, lifeScale: 2.4 })
        p.vx = rand(-1.4, 1.4)
        p.grav = rand(0.06, 0.13)
        spawn(p)
      }
      start()
    }
    if (now - t0 < ms) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

function frame() {
  if (!ctx) return
  ctx.clearRect(0, 0, W, H)

  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]
    p.life++
    p.vy += p.grav
    p.vx += p.drift
    p.vx *= 0.985
    p.vy *= 0.985
    p.x += p.vx
    p.y += p.vy
    p.rot += p.vr
    p.flip += p.vflip

    if (p.life > p.max || p.y > H + 40) {
      parts.splice(i, 1)
      continue
    }

    const fade = p.life > p.max - 26 ? (p.max - p.life) / 26 : 1
    ctx.save()
    ctx.globalAlpha = Math.max(0, fade)
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)
    ctx.fillStyle = p.color

    if (p.shape === 'circle') {
      ctx.beginPath()
      ctx.arc(0, 0, p.size * 0.42, 0, Math.PI * 2)
      ctx.fill()
    } else if (p.shape === 'strip') {
      const sy = Math.cos(p.flip) // the 3D tumble
      ctx.scale(1, Math.max(0.08, Math.abs(sy)))
      ctx.fillRect(-p.size * 0.28, -p.size * 0.62, p.size * 0.56, p.size * 1.24)
    } else {
      ctx.scale(1, Math.max(0.15, Math.abs(Math.cos(p.flip))))
      const r = p.size * 0.2
      const s = p.size * 0.5
      ctx.beginPath()
      ctx.roundRect(-s, -s, s * 2, s * 2, r)
      ctx.fill()
    }
    ctx.restore()
  }

  if (parts.length) raf = requestAnimationFrame(frame)
  else stop()
}

function start() {
  if (raf == null) raf = requestAnimationFrame(frame)
}

function stop() {
  if (raf != null) cancelAnimationFrame(raf)
  raf = null
  if (ctx) ctx.clearRect(0, 0, W, H)
}

/** Fire a burst centred on a DOM element — used by the answer buttons. */
export function burstFrom(el, opts) {
  if (!el) return
  const r = el.getBoundingClientRect()
  burst(r.left + r.width / 2, r.top + r.height / 2, opts)
}
