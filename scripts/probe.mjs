/* Dev-only: run a JS expression against a route in headless Chrome and print the
   JSON result. Lets layout be measured instead of guessed at from a screenshot.
     node scripts/probe.mjs "#/" "document.body.scrollWidth"                     */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find(existsSync)

const route = process.argv[2] ?? '#/'
const expr = process.argv[3] ?? '1'
const width = Number(process.argv[4] ?? 430)
const height = Number(process.argv[5] ?? 932)
const port = 9223

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  '--disable-gpu',
  '--no-first-run',
  `--user-data-dir=${process.env.TEMP}\\leo-probe`,
  `--window-size=${width},${height}`,
  `http://localhost:5173/${route}`,
])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function targets() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`)
      const list = await r.json()
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) return page
    } catch {
      /* not up yet */
    }
    await sleep(250)
  }
  throw new Error('Chrome did not expose a debug target')
}

const page = await targets()
await sleep(1400) // let React mount, fonts settle, animations start

const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))

const result = await new Promise((resolve, reject) => {
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    if (msg.id !== 1) return
    if (msg.result?.exceptionDetails) reject(new Error(JSON.stringify(msg.result.exceptionDetails)))
    else resolve(msg.result?.result?.value)
  }
  ws.send(
    JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: { expression: `JSON.stringify(${expr})`, returnByValue: true, awaitPromise: true },
    }),
  )
  setTimeout(() => reject(new Error('probe timed out')), 8000)
})

console.log(result)
ws.close()
chrome.kill()
process.exit(0)
