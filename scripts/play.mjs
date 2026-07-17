/*  Dev-only: plays a whole lesson correctly, end to end, and screenshots the
 *  completion screen. Exercises the real loop — grading, XP, hearts, stickers,
 *  streak, celebration — rather than trusting each piece in isolation.
 *
 *    node scripts/play.mjs numberline done-numberline [wrongEvery]
 *
 *  `wrongEvery` (optional) deliberately fluffs every Nth question, so the
 *  non-perfect path and the star maths can be checked too.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find(existsSync)

const [, , lesson = 'numberline', name = 'played', wrongEvery = '0'] = process.argv
const OUT = join(
  process.env.LOCALAPPDATA,
  'Temp/claude/C--Users-Suhrob-Documents-New-folder/d5f1df7a-e1b8-401c-81b5-4bbf8c9465f9/scratchpad/shots',
)
mkdirSync(OUT, { recursive: true })

const PORT = 9500 + (process.pid % 300)
// Unique profile per run. Deriving it from the pid means runs collide and
// inherit each other's localStorage — which showed up as a table-9 lesson
// reporting progress on the number line.
const PROFILE = `${process.env.TEMP}\\leo-play-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--disable-gpu',
  '--no-first-run',
  '--hide-scrollbars',
  '--autoplay-policy=no-user-gesture-required',
  `--user-data-dir=${PROFILE}`,
  '--window-size=430,932',
  'about:blank',
])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function findTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      const p = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (p) return p
    } catch {
      /* booting */
    }
    await sleep(200)
  }
  throw new Error('no debug target')
}

const target = await findTarget()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))

let id = 0
const pending = new Map()
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
  }
}
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const n = ++id
    pending.set(n, { resolve, reject })
    ws.send(JSON.stringify({ id: n, method, params }))
    setTimeout(() => {
      if (pending.has(n)) reject(new Error(`${method} timed out`))
    }, 20000)
  })

const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', {
    expression: `(() => { try { return JSON.stringify(${expression}) } catch (e) { return JSON.stringify({__err: String(e)}) } })()`,
    returnByValue: true,
    awaitPromise: true,
  })
  const v = r.result?.value
  return v === undefined ? undefined : JSON.parse(v)
}

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', {
  width: 430,
  height: 932,
  deviceScaleFactor: 2,
  mobile: true,
  screenWidth: 430,
  screenHeight: 932,
})
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })

const errors = []
await send('Log.enable').catch(() => {})
ws.addEventListener('message', (m) => {
  const msg = JSON.parse(m.data)
  if (msg.method === 'Runtime.exceptionThrown') {
    errors.push(msg.params.exceptionDetails?.exception?.description ?? 'exception')
  }
})

await send('Page.navigate', { url: `http://localhost:5173/#/lesson/${lesson}` })
await sleep(1800)

/* One question: read window.__leoQ, work out the right taps, perform them. */
const answerOnce = (deliberatelyWrong) => `(() => {
  const q = window.__leoQ
  if (!q) return { done: 'no-question' }
  const wrong = ${deliberatelyWrong}
  const click = (sel) => { const e = document.querySelector(sel); if (e) { e.click(); return true } return false }
  const clickAll = (sel, n) => { const els = [...document.querySelectorAll(sel)]; return els[n] ? (els[n].click(), true) : false }

  if (q.kind === 'teach') {
    const b = [...document.querySelectorAll('.teach-actions .btn')].find(b => !b.disabled && b.textContent.includes('Понятно'))
    if (b) { b.click(); return { kind: q.kind, acted: 'ponyatno' } }
    return { kind: q.kind, acted: 'waiting' }
  }

  if (q.kind === 'choice' || q.kind === 'array') {
    const want = wrong ? q.options.find(o => o !== q.answer) : q.answer
    const btn = [...document.querySelectorAll('.choice')].find(b => Number(b.textContent) === want)
    if (btn) { btn.click(); return { kind: q.kind, acted: 'choice', want } }
    return { kind: q.kind, acted: 'no-btn' }
  }

  if (q.kind === 'pad' || q.kind === 'basten' || q.kind === 'word') {
    const val = String(wrong ? (q.answer === 1 ? 2 : 1) : q.answer)
    for (const ch of val) {
      const k = [...document.querySelectorAll('.pad-key')].find(b => b.textContent.trim() === ch)
      if (k) k.click()
    }
    // ✓ goes through the commit step: it reads the accumulated value, which
    // only exists after React has re-rendered.
    return { kind: q.kind, acted: 'pad', val, commit: true }
  }

  // The builders below only fill in the value — the submit button is clicked by
  // the separate commit step, because it stays disabled until React re-renders
  // and a synchronous click here would hit a dead button.
  if (q.kind === 'numberline') {
    const steps = Math.abs(q.data.delta) / q.data.step
    const fwd = q.data.delta > 0
    const btns = [...document.querySelectorAll('.hop-btn')]
    const b = fwd ? btns[1] : btns[0]
    const n = wrong ? Math.max(1, steps - 1) : steps
    for (let i = 0; i < n; i++) b.click()
    return { kind: q.kind, acted: 'hop', steps: n, commit: true }
  }

  if (q.kind === 'basten-build') {
    const t = Math.floor(q.answer / 10), o = q.answer % 10
    const plus = [...document.querySelectorAll('.bt-counters .hop-btn--sm')]
    // order: [tens-, tens+, ones-, ones+]
    for (let i = 0; i < t; i++) plus[1].click()
    for (let i = 0; i < (wrong ? Math.max(0, o - 1) : o); i++) plus[3].click()
    return { kind: q.kind, acted: 'build', t, o, commit: true }
  }

  if (q.kind === 'array-build') {
    const bs = [...document.querySelectorAll('.arr-counters .hop-btn--sm')]
    // order: [rows-, rows+, cols-, cols+]; both start at 1
    for (let i = 1; i < q.data.rows; i++) bs[1].click()
    for (let i = 1; i < (wrong ? Math.max(1, q.data.cols - 1) : q.data.cols); i++) bs[3].click()
    return { kind: q.kind, acted: 'array-build', commit: true }
  }

  if (q.kind === 'column') {
    const a = q.data.a, b = q.data.b
    const res = q.data.op === '+' ? a + b : a - b
    const ones = res % 10, tens = Math.floor(res / 10)
    const key = (d) => [...document.querySelectorAll('.cm-key')].find(k => k.textContent.trim() === String(d))
    key(wrong ? (ones === 0 ? 1 : 0) : ones)?.click()
    setTimeout(() => key(tens)?.click(), 40)
    return { kind: q.kind, acted: 'column', res }
  }

  if (q.kind === 'chain') {
    // Digits go in one at a time and each keypress needs its own React commit,
    // so this types asynchronously and the commit step clicks ✓ afterwards.
    const seq = q.answer.map((a, i) => (wrong && i === 0 ? (a === 1 ? '2' : '1') : String(a))).join('')
    let i = 0
    const type = () => {
      if (i >= seq.length) return
      const k = [...document.querySelectorAll('.pad-key')].find(b => b.textContent.trim() === seq[i])
      if (k) k.click()
      i++
      setTimeout(type, 55)
    }
    type()
    return { kind: q.kind, acted: 'chain', seq, commit: true }
  }

  if (q.kind === 'match') {
    const pairs = q.data.pairs
    const lefts = [...document.querySelectorAll('.mp-col:first-child .mp-card')]
    const rights = [...document.querySelectorAll('.mp-col:last-child .mp-card')]
    let i = 0
    const step = () => {
      if (i >= pairs.length) return
      const l = lefts.find(e => e.textContent.trim() === pairs[i].left && !e.classList.contains('is-matched'))
      const r = rights.find(e => Number(e.textContent) === pairs[i].right && !e.classList.contains('is-matched'))
      if (l && r) { l.click(); setTimeout(() => r.click(), 60) }
      i++
      setTimeout(step, 220)
    }
    step()
    return { kind: q.kind, acted: 'match', n: pairs.length }
  }

  return { kind: q.kind, acted: 'UNHANDLED' }
})()`

/* Clicks whichever "Готово" the current exercise shows, once React has had a
   frame to enable it. */
const commit = `(() => {
  const b = document.querySelector('.pad-key--ok:not(:disabled), .nline-done:not(:disabled), .bt .btn--green:not(:disabled), .arr .btn--green:not(:disabled)')
  if (b) { b.click(); return 'committed' }
  return 'nothing-to-commit'
})()`

/*  Asserts the question is actually ON SCREEN, not just in state.
 *
 *  This exists because a real bug shipped past this script: ChoiceGrid never
 *  rendered q.expr, so every multiplication question showed "Сколько будет?"
 *  and four bare numbers with nothing to solve. The script sailed through it —
 *  it read the answer from window.__leoQ, so it was "solving" sums that were
 *  never drawn. Checking state is not checking what the child sees.
 *
 *  Only kinds whose expression IS the question are audited: numberline shows a
 *  start marker and "+6", column renders its own digits, and word problems draw
 *  the objects — those state the question in their own way. */
const NEEDS_EXPR = ['choice', 'pad', 'basten', 'array']
const audit = `(() => {
  const q = window.__leoQ
  if (!q || q.kind === 'teach') return null
  const needs = ${JSON.stringify(NEEDS_EXPR)}
  if (!needs.includes(q.kind) || !q.expr) return null
  const text = (document.querySelector('.q-area') || {}).innerText || ''
  const norm = (s) => s.replace(/\\s+/g, ' ').trim()
  return norm(text).includes(norm(q.expr))
    ? null
    : 'QUESTION NOT ON SCREEN: kind=' + q.kind + ' expr="' + q.expr + '"'
})()`

const advance = `(() => {
  const b = document.querySelector('.fb-actions .btn')
  if (b) { b.click(); return 'advanced' }
  return 'no-fb'
})()`

let step = 0
const log = []
const audits = []
for (let i = 0; i < 90; i++) {
  const onDone = await evaluate(`location.hash.startsWith('#/done/')`)
  if (onDone) break

  const isTeach = await evaluate(`!!(window.__leoQ && window.__leoQ.kind === 'teach')`)
  const wrong = Number(wrongEvery) > 0 && step > 0 && step % Number(wrongEvery) === 0

  const problem = await evaluate(audit)
  if (problem) audits.push(problem)

  const r = await evaluate(answerOnce(wrong))
  if (r?.acted && r.acted !== 'waiting') {
    log.push(`${step}: ${r.kind}${wrong ? ' (wrong on purpose)' : ''}`)
    step++
  }

  if (r?.commit) {
    // Chains type digit-by-digit on a timer; give them time to finish first.
    await sleep(r.kind === 'chain' ? 700 : 260)
    await evaluate(commit)
  }

  await sleep(isTeach ? 900 : 1200)

  // Clear whatever feedback panel is up (Дальше / Ещё раз / Понятно).
  await evaluate(advance)
  await sleep(450)
}

await sleep(1600) // let the celebration land
const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, 'base64'))

const state = await evaluate(`JSON.parse(localStorage.getItem('leo-schitalkin/v1') || '{}')`)
console.log('steps:', log.length, log.slice(0, 4).join(' | '))
console.log('hash:', await evaluate('location.hash'))
console.log('xp:', state.xp, '| lessons:', JSON.stringify(state.lessons), '| stickers:', state.stickers)
console.log('topics:', JSON.stringify(state.topics))
if (errors.length) console.log('PAGE ERRORS:', errors.slice(0, 3))
if (audits.length) console.log('!! RENDER AUDIT FAILED:', [...new Set(audits)].join(' | '))
else console.log('render audit: every question was visible on screen')
console.log('shot:', join(OUT, `${name}.png`))

ws.close()
chrome.kill()
await sleep(300)
rmSync(PROFILE, { recursive: true, force: true })
process.exit(0)
