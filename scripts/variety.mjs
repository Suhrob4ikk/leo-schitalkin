/* Measures repetition the way a child would feel it: build the same lesson many
   times and count how often the exact same question text comes back, plus how
   many distinct question shapes exist at all. */
import { buildLesson } from '../src/game/generators.js'

const state = { lessons: {}, facts: {}, topics: {} }
const LESSONS = process.argv.slice(2)

for (const id of LESSONS) {
  const seen = new Map()
  let total = 0
  for (let run = 0; run < 40; run++) {
    for (const q of buildLesson(id, state)) {
      if (q.kind === 'teach') continue
      // Must include `data`: compare/column/numberline carry their numbers
      // there, not in the prompt, and keying on text alone reported every one
      // of them as identical.
      const key = `${q.prompt}||${q.expr ?? ''}||${JSON.stringify(q.data ?? '')}||${q.answer}`
      seen.set(key, (seen.get(key) ?? 0) + 1)
      total++
    }
  }
  const dupes = [...seen.values()].filter((n) => n > 1).length
  const worst = Math.max(...seen.values())
  console.log(
    `${id.padEnd(16)} ${String(total).padStart(4)} questions over 40 runs → ` +
      `${String(seen.size).padStart(4)} distinct (${Math.round((seen.size / total) * 100)}% unique), ` +
      `repeated: ${dupes}, most-seen: ${worst}×`,
  )
}
