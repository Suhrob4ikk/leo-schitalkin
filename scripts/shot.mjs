/*  Dev-only screenshot tool.
 *
 *    node scripts/shot.mjs <route> <name> [width] [height] [waitMs] [clicks]
 *    node scripts/shot.mjs "#/" home 430 932 1500 ".node,.btn--green"
 *
 *  Drives headless Chrome over CDP rather than `--screenshot`, because the CLI
 *  flag always captures the *full page*: that stretches the viewport, which
 *  stacks every position:sticky element at the top and makes the layout look
 *  broken when it isn't. captureBeyondViewport:false gives a true viewport shot.
 *  It also emulates a touch device, so :active/tap behaviour matches a phone.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find(existsSync)

const [, , route = '#/', name = 'shot', w = '430', h = '932', wait = '1400', clicks = '', seedFile = ''] = process.argv
const width = Number(w)
const height = Number(h)
const OUT = join(
  process.env.LOCALAPPDATA,
  'Temp/claude/C--Users-Suhrob-Documents-New-folder/d5f1df7a-e1b8-401c-81b5-4bbf8c9465f9/scratchpad/shots',
)
mkdirSync(OUT, { recursive: true })

const PORT = 9224 + (process.pid % 200)
const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--disable-gpu',
  '--no-first-run',
  '--hide-scrollbars',
  `--user-data-dir=${process.env.TEMP}\\leo-shot-${PORT}`,
  `--window-size=${width},${height}`,
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
      /* still booting */
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
    }, 15000)
  })

const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval failed')
  return r.result?.value
}

await send('Page.enable')
await send('Runtime.enable')
// A phone, not a narrow desktop: this is what the app actually ships to.
await send('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: 2,
  mobile: true,
  screenWidth: width,
  screenHeight: height,
})
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })

const ORIGIN = process.env.ORIGIN ?? 'http://localhost:5173'
await send('Page.navigate', { url: `${ORIGIN}/${route}` })
await sleep(600)

// Optional saved-progress fixture: the origin has to exist before localStorage
// can be written, so seed after the first load and then reload into it.
// Page.reload, not a second Page.navigate — the URL is unchanged, so navigating
// again is only a hash change and the store never re-reads storage.
if (seedFile) {
  const json = readFileSync(seedFile, 'utf8')
  await evaluate(`localStorage.setItem('leo-schitalkin/v1', ${JSON.stringify(json)})`)
  await send('Page.reload', { ignoreCache: true })
}
await sleep(Number(wait))

// Optional: click a comma-separated list of selectors in order, so a flow
// (open a lesson → answer a question) can be captured without a live browser.
for (const sel of clicks.split(',').map((s) => s.trim()).filter(Boolean)) {
  const ok = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return 'MISSING: ' + ${JSON.stringify(sel)};
    el.click();
    return 'ok';
  })()`)
  if (ok !== 'ok') console.error(ok)
  await sleep(750)
}

const { data } = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: false,
})
const file = join(OUT, `${name}.png`)
writeFileSync(file, Buffer.from(data, 'base64'))

const errs = await evaluate('window.__errs ? window.__errs.length : 0').catch(() => 0)
console.log(`OK ${file} (${width}×${height}${errs ? `, ${errs} console errors` : ''})`)

ws.close()
chrome.kill()
process.exit(0)
