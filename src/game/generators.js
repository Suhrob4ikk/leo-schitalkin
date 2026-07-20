import { learnedTables, LESSON_BY_ID, UNIT_BY_ID, unitsUpTo } from './curriculum.js'

/* ── Dice ──────────────────────────────────────────────────────────────── */
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const pick = (a) => a[(Math.random() * a.length) | 0]

function shuffle(a) {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

/** Distractors are near-misses on purpose: an option list of wild numbers is
    solvable by elimination without doing any maths. */
function makeOptions(answer, candidates, n = 4) {
  const set = new Set([answer])
  for (const c of shuffle(candidates)) {
    if (set.size >= n) break
    if (Number.isInteger(c) && c >= 0 && c !== answer) set.add(c)
  }
  let d = 1
  while (set.size < n && d < 40) {
    if (answer + d >= 0) set.add(answer + d)
    if (set.size < n && answer - d >= 0) set.add(answer - d)
    d++
  }
  return shuffle([...set].slice(0, n))
}

/** Russian needs three plural forms; "5 яблоко" would look broken to a reader
    who is exactly at the age of noticing. */
export function plural(n, one, few, many) {
  const n10 = n % 10
  const n100 = n % 100
  if (n10 === 1 && n100 !== 11) return one
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few
  return many
}

/* ── UNIT 1 ────────────────────────────────────────────────────────────── */

function qNumberLine() {
  // Every third jump or so moves in tens, so the child practises both the
  // "count on by ones" and the "leap a whole ten" strategies.
  if (Math.random() < 0.35) {
    // Starting anywhere on the decade line, not just 0–70, and jumping 10–50:
    // the old ranges gave barely 50 possible questions and the same jump came
    // back a dozen times in an afternoon.
    const start = rnd(0, 10) * 10
    const mag = pick([10, 20, 30, 40, 50])
    const plus = start - mag < 0 ? true : start + mag > 100 ? false : Math.random() < 0.5
    const answer = plus ? start + mag : start - mag
    return {
      kind: 'numberline',
      prompt: 'Куда прыгнет друг?',
      expr: `${start} ${plus ? '+' : '−'} ${mag}`,
      answer,
      topic: 'numberline',
      hint: `Прыгай десятками: ${start} → ${answer}.`,
      data: { min: 0, max: 100, step: 10, start, delta: plus ? mag : -mag },
    }
  }

  // Single steps anywhere up to 60 rather than only 2–14. The window below
  // keeps the drawn line short whatever the numbers, so a bigger range costs
  // nothing on screen.
  const start = rnd(2, 60)
  const mag = rnd(2, 12)
  const plus = start - mag < 0 ? true : Math.random() < 0.55
  const answer = plus ? start + mag : start - mag
  const lo = Math.min(start, answer)
  const hi = Math.max(start, answer)
  const min = Math.max(0, lo - 3)
  const max = Math.max(hi + 3, min + 12)
  return {
    kind: 'numberline',
    prompt: 'Куда прыгнет друг?',
    expr: `${start} ${plus ? '+' : '−'} ${mag}`,
    answer,
    topic: 'numberline',
    hint: `${plus ? 'Прыгай вперёд' : 'Прыгай назад'} на ${mag} от ${start}.`,
    data: { min, max, step: 1, start, delta: plus ? mag : -mag },
  }
}

function qBaseTen(i) {
  const mode = i % 3

  if (mode === 0) {
    const n = rnd(11, 99)
    return {
      kind: 'basten',
      prompt: 'Сколько тут?',
      answer: n,
      topic: 'basten',
      hint: `${Math.floor(n / 10)} ${plural(Math.floor(n / 10), 'десяток', 'десятка', 'десятков')} и ${n % 10} — это ${n}.`,
      data: { groups: [n] },
    }
  }

  if (mode === 1) {
    const n = rnd(11, 99)
    return {
      kind: 'basten-build',
      prompt: `Собери число ${n}`,
      answer: n,
      topic: 'basten',
      hint: `Возьми ${Math.floor(n / 10)} ${plural(Math.floor(n / 10), 'палочку', 'палочки', 'палочек')} и ${n % 10} ${plural(n % 10, 'кубик', 'кубика', 'кубиков')}.`,
      data: { target: n },
    }
  }

  // Regrouping across a ten — the whole point of the lesson.
  if (Math.random() < 0.5) {
    const aOnes = rnd(2, 9)
    const bOnes = rnd(10 - aOnes, 9)
    const aTens = rnd(1, 6)
    const bTens = rnd(1, Math.max(1, 8 - aTens))
    const a = aTens * 10 + aOnes
    const b = bTens * 10 + bOnes
    return {
      kind: 'basten',
      prompt: 'Сложи и посчитай',
      expr: `${a} + ${b}`,
      answer: a + b,
      topic: 'regroup',
      hint: `${aOnes} + ${bOnes} = ${aOnes + bOnes}. Это целый десяток и ещё ${(aOnes + bOnes) % 10}!`,
      data: { groups: [a, b], op: '+' },
    }
  }

  const aOnes = rnd(0, 5)
  const bOnes = rnd(aOnes + 1, 9)
  const bTens = rnd(1, 4)
  const aTens = rnd(bTens + 1, 8)
  const a = aTens * 10 + aOnes
  const b = bTens * 10 + bOnes
  return {
    kind: 'basten',
    prompt: 'Отними и посчитай',
    expr: `${a} − ${b}`,
    answer: a - b,
    topic: 'regroup',
    hint: `Единиц не хватает — разменяй один десяток на 10 кубиков.`,
    data: { groups: [a], op: '−', take: b },
  }
}

function qMissing() {
  const form = pick(['a+?', '?+b', 'a-?', '?-b'])
  const big = Math.random() < 0.35
  const mk = (expr, answer, hint) => ({
    kind: 'pad',
    prompt: 'Какое число спряталось?',
    expr,
    answer,
    topic: 'missing',
    hint,
  })

  if (form === 'a+?') {
    const a = big ? rnd(10, 50) : rnd(2, 9)
    const x = big ? rnd(10, 40) : rnd(2, 9)
    return mk(`${a} + ⬜ = ${a + x}`, x, `Из ${a + x} вычти ${a}.`)
  }
  if (form === '?+b') {
    const b = big ? rnd(10, 50) : rnd(2, 9)
    const x = big ? rnd(10, 40) : rnd(2, 9)
    return mk(`⬜ + ${b} = ${b + x}`, x, `Из ${b + x} вычти ${b}.`)
  }
  if (form === 'a-?') {
    const c = big ? rnd(10, 40) : rnd(1, 9)
    const x = big ? rnd(10, 40) : rnd(2, 9)
    return mk(`${c + x} − ⬜ = ${c}`, x, `Из ${c + x} вычти ${c}.`)
  }
  const b = big ? rnd(10, 40) : rnd(2, 9)
  const c = big ? rnd(10, 40) : rnd(2, 9)
  return mk(`⬜ − ${b} = ${c}`, b + c, `Сложи ${c} и ${b}.`)
}

/** Цепочка: 8 → +5 → ⬜ → −3 → ⬜. Two or three links; every intermediate value
    is kept inside 0..100 so no box can ever want a negative number. */
function qChain() {
  const links = Math.random() < 0.55 ? 2 : 3
  let cur = rnd(14, 40)
  const start = cur
  const steps = []
  const answers = []

  for (let i = 0; i < links; i++) {
    const big = Math.random() < 0.3
    const mag = big ? rnd(2, 4) * 10 : rnd(2, 9)
    // Every box lands in 10..99 — two digits, always. The boxes advance on the
    // second digit, so a chain that could produce a single-digit value would
    // strand the child in a box the pad refuses to leave.
    const canAdd = cur + mag <= 99
    const canSub = cur - mag >= 10
    const plus = canAdd && canSub ? Math.random() < 0.5 : canAdd
    if (!canAdd && !canSub) break
    cur = plus ? cur + mag : cur - mag
    steps.push({ op: plus ? '+' : '−', n: mag })
    answers.push(cur)
  }

  return {
    kind: 'chain',
    prompt: 'Заполни цепочку',
    answer: answers,
    topic: 'chain',
    hint: `${start} ${steps.map((s, i) => `${s.op} ${s.n} = ${answers[i]}`).join(', потом ')}`,
    data: { start, steps },
  }
}

/* ── Сравнение двузначных чисел ────────────────────────────────────────────
   Straight from his workbook, including the hard half where BOTH sides are
   expressions — that's the version that teaches "work out each side first"
   rather than just eyeballing two numbers. */
function qCompare() {
  const roll = Math.random()
  const side = () => {
    const a = rnd(11, 90)
    const b = rnd(2, Math.min(40, 99 - a))
    return Math.random() < 0.5
      ? { text: `${a} + ${b}`, val: a + b }
      : { text: `${a + b} − ${b}`, val: a }
  }

  let left, right
  if (roll < 0.35) {
    // Plain: number vs number
    const a = rnd(11, 99)
    // Land on an equal pair sometimes, or "=" never gets used.
    const b = Math.random() < 0.15 ? a : rnd(11, 99)
    left = { text: String(a), val: a }
    right = { text: String(b), val: b }
  } else if (roll < 0.7) {
    // Expression vs number
    left = side()
    right = { text: String(Math.random() < 0.15 ? left.val : rnd(11, 99)), val: 0 }
    right.val = Number(right.text)
  } else {
    // Expression vs expression — the real thing
    left = side()
    right = side()
  }

  const answer = left.val < right.val ? '<' : left.val > right.val ? '>' : '='
  return {
    kind: 'compare',
    prompt: 'Сравни',
    answer,
    topic: 'compare',
    hint: `${left.text} — это ${left.val}, а ${right.text} — это ${right.val}.`,
    data: { left, right },
  }
}

/* ── Математический язык ───────────────────────────────────────────────────
   Сумма, разность, слагаемое, уменьшаемое, увеличь на… This vocabulary is what
   actually trips children up in Russian year 2 — they can do 62 − 17 but stall
   on "вычитаемое 17, уменьшаемое 62". Story problems don't cover it. */
function qTerms() {
  const a = rnd(24, 99)
  // b < a, always. Drawn independently, "уменьши 21 на 40" asks a
  // seven-year-old for −19 on a pad with no minus key — the same trap the
  // picture problems fell into.
  const b = rnd(2, Math.min(40, a - 1))
  const small = rnd(11, 60)
  const c = rnd(2, 30)
  const mk = (prompt, answer, hint) => ({ kind: 'pad', prompt, answer, topic: 'terms', hint })

  const forms = [
    () => mk(`Найди сумму чисел ${small} и ${c}.`, small + c, `Сумма — это сложение: ${small} + ${c}.`),
    () => mk(`Найди разность чисел ${a} и ${b}.`, a - b, `Разность — это вычитание: ${a} − ${b}.`),
    () => mk(`На сколько ${a} больше ${b}?`, a - b, `«На сколько больше» — вычитаем: ${a} − ${b}.`),
    () => mk(`На сколько ${b} меньше ${a}?`, a - b, `«На сколько меньше» — тоже вычитаем: ${a} − ${b}.`),
    () => mk(`Увеличь ${small} на ${c}.`, small + c, `Увеличить — прибавить: ${small} + ${c}.`),
    () => mk(`Уменьши ${a} на ${b}.`, a - b, `Уменьшить — вычесть: ${a} − ${b}.`),
    () => mk(
      `Вычитаемое ${b}, уменьшаемое ${a}. Найди разность.`,
      a - b,
      `Уменьшаемое стоит первым: ${a} − ${b}.`,
    ),
    () => mk(
      `Сколько надо прибавить к ${small}, чтобы получилось ${small + c}?`,
      c,
      `${small + c} − ${small} = ${c}.`,
    ),
    () => mk(`Сколько надо вычесть из ${a}, чтобы получилось ${a - b}?`, b, `${a} − ${a - b} = ${b}.`),
    () => mk(`Какое число меньше ${a} на ${b}?`, a - b, `Меньше — значит вычитаем: ${a} − ${b}.`),
    () => mk(`Какое число больше ${small} на ${c}?`, small + c, `Больше — значит прибавляем: ${small} + ${c}.`),
    () => mk(`Первое слагаемое ${small}, второе ${c}. Найди сумму.`, small + c, `Слагаемые складывают.`),
  ]

  // Two-step forms need their own numbers, so they're built rather than templated.
  if (Math.random() < 0.18) {
    const x = rnd(2, 20)
    const y = rnd(2, 20)
    const base = rnd(21, 55)
    if (Math.random() < 0.5) {
      return mk(
        `К числу ${base} добавь сумму чисел ${x} и ${y}.`,
        base + x + y,
        `Сначала ${x} + ${y} = ${x + y}, потом ${base} + ${x + y}.`,
      )
    }
    const big = rnd(60, 99)
    return mk(
      `Из ${big} вычти сумму чисел ${x} и ${y}.`,
      big - x - y,
      `Сначала ${x} + ${y} = ${x + y}, потом ${big} − ${x + y}.`,
    )
  }

  return pick(forms)()
}

/* ── Порядок действий ──────────────────────────────────────────────────────
   Two rules, taught in the order the workbook does: brackets first, then
   "× and : before + and −". The teaching move is the contrasting pair —
   83−(33+14)=36 against (83−33)+14=64 — same digits, different answer, so the
   brackets are visibly doing something rather than being decoration. */
function qOrder(withMult) {
  const mk = (expr, answer, hint) => ({
    kind: 'pad',
    prompt: 'Реши по порядку',
    expr,
    answer,
    topic: withMult ? 'order-mult' : 'order',
    hint,
  })

  if (!withMult) {
    const shape = pick(['a-(b+c)', '(a-b)+c', 'a-(b-c)', 'a+(b-c)', '(a+b)-c', 'a+(b+c)'])
    const b = rnd(11, 45)
    const c = rnd(2, 30)
    if (shape === 'a-(b+c)') {
      const a = rnd(b + c + 1, 99)
      return mk(`${a} − (${b} + ${c})`, a - b - c, `Сначала скобки: ${b} + ${c} = ${b + c}. Потом ${a} − ${b + c}.`)
    }
    if (shape === '(a-b)+c') {
      const a = rnd(b + 1, 90)
      return mk(`(${a} − ${b}) + ${c}`, a - b + c, `Сначала скобки: ${a} − ${b} = ${a - b}. Потом + ${c}.`)
    }
    if (shape === 'a-(b-c)') {
      const bb = rnd(c + 1, 60)
      const a = rnd(bb, 99)
      return mk(`${a} − (${bb} − ${c})`, a - bb + c, `Сначала скобки: ${bb} − ${c} = ${bb - c}. Потом ${a} − ${bb - c}.`)
    }
    if (shape === 'a+(b-c)') {
      const bb = rnd(c + 1, 60)
      const a = rnd(2, 99 - (bb - c))
      return mk(`${a} + (${bb} − ${c})`, a + bb - c, `Сначала скобки: ${bb} − ${c} = ${bb - c}. Потом ${a} + ${bb - c}.`)
    }
    if (shape === '(a+b)-c') {
      const a = rnd(11, 60)
      const bb = rnd(2, 99 - a)
      const cc = rnd(2, a + bb)
      return mk(`(${a} + ${bb}) − ${cc}`, a + bb - cc, `Сначала скобки: ${a} + ${bb} = ${a + bb}. Потом − ${cc}.`)
    }
    const a = rnd(11, 50)
    const bb = rnd(2, 30)
    const cc = rnd(2, 99 - a - bb)
    return mk(`${a} + (${bb} + ${cc})`, a + bb + cc, `Сначала скобки: ${bb} + ${cc} = ${bb + cc}. Потом ${a} + ${bb + cc}.`)
  }

  // With × and : — precedence, not just brackets.
  const t = pick([2, 3, 4, 5, 6, 7, 8, 9, 10])
  const k = rnd(2, 9)
  const p = t * k
  const shape = pick(['m+n', 'n-m', 'm-n', 'd+n', 'n-d', 'm(b+c)', '(b+c)d', 'm+d', 'dd'])

  if (shape === 'm+n') {
    const n = rnd(2, 99 - p)
    return mk(`${t} · ${k} + ${n}`, p + n, `Сначала умножение: ${t} · ${k} = ${p}. Потом + ${n}.`)
  }
  if (shape === 'n-m') {
    const n = rnd(p + 1, 99)
    return mk(`${n} − ${t} · ${k}`, n - p, `Сначала умножение: ${t} · ${k} = ${p}. Потом ${n} − ${p}.`)
  }
  if (shape === 'm-n') {
    const n = rnd(1, p - 1)
    return mk(`${t} · ${k} − ${n}`, p - n, `Сначала умножение: ${t} · ${k} = ${p}. Потом − ${n}.`)
  }
  if (shape === 'd+n') {
    const n = rnd(2, 90)
    return mk(`${p} : ${t} + ${n}`, k + n, `Сначала деление: ${p} : ${t} = ${k}. Потом + ${n}.`)
  }
  if (shape === 'n-d') {
    const n = rnd(k + 1, 99)
    return mk(`${n} − ${p} : ${t}`, n - k, `Сначала деление: ${p} : ${t} = ${k}. Потом ${n} − ${k}.`)
  }
  if (shape === 'm(b+c)') {
    const s = rnd(2, 10)
    const b = rnd(1, s - 1)
    const small = pick([2, 3, 4, 5])
    return mk(`${small} · (${b} + ${s - b})`, small * s, `Сначала скобки: ${b} + ${s - b} = ${s}. Потом ${small} · ${s}.`)
  }
  if (shape === '(b+c)d') {
    const d = pick([2, 3, 4, 5])
    const q = rnd(2, 9)
    const total = d * q
    const b = rnd(1, total - 1)
    return mk(`(${b} + ${total - b}) : ${d}`, q, `Сначала скобки: ${b} + ${total - b} = ${total}. Потом ${total} : ${d}.`)
  }
  if (shape === 'm+d') {
    const d = pick([2, 3, 4, 5])
    const q2 = rnd(2, 9)
    const small = pick([2, 3, 4])
    const k2 = rnd(2, 6)
    return mk(
      `${small} · ${k2} + ${d * q2} : ${d}`,
      small * k2 + q2,
      `Оба действия первой ступени: ${small} · ${k2} = ${small * k2}, ${d * q2} : ${d} = ${q2}. Потом сложи.`,
    )
  }
  const d1 = pick([2, 3, 5])
  const q1 = rnd(2, 9)
  const d2 = pick([2, 3, 4])
  const q3 = rnd(2, 9)
  return mk(
    `${d1 * q1} : ${d1} + ${d2 * q3} : ${d2}`,
    q1 + q3,
    `${d1 * q1} : ${d1} = ${q1}, ${d2 * q3} : ${d2} = ${q3}. Потом сложи.`,
  )
}

/* ── Составные задачи ──────────────────────────────────────────────────────
   Two actions, and the first result feeds the second — the workbook's
   "составные задачи". Deliberately many scenarios and interchangeable
   names/objects: this is the one lesson type where repetition is obvious,
   because the child reads every word rather than scanning a sum. */
const NAMES = ['Миша', 'Катя', 'Лена', 'Петя', 'Оля', 'Саша', 'Ира', 'Дима', 'Вера', 'Коля']
const STUFF = [
  { n: 'флажок', few: 'флажка', many: 'флажков', v: 'вырезали' },
  { n: 'шарик', few: 'шарика', many: 'шариков', v: 'надули' },
  { n: 'открытка', few: 'открытки', many: 'открыток', v: 'подписали' },
  { n: 'снежок', few: 'снежка', many: 'снежков', v: 'слепили' },
  { n: 'ёлочка', few: 'ёлочки', many: 'ёлочек', v: 'нарисовали' },
]
const BOXED = [
  { item: 'хурмы', box: 'ящик', boxes: 'ящиков', unit: 'кг' },
  { item: 'яблок', box: 'ящик', boxes: 'ящиков', unit: 'кг' },
  { item: 'сметаны', box: 'банка', boxes: 'банок', unit: 'кг' },
  { item: 'мёда', box: 'банка', boxes: 'банок', unit: 'кг' },
  { item: 'конфет', box: 'пакет', boxes: 'пакетов', unit: 'кг' },
]
const TREES = [
  ['слив', 'груш', 'яблонь'],
  ['берёз', 'клёнов', 'дубов'],
  ['роз', 'тюльпанов', 'ромашек'],
]

function qComposite(allowMult) {
  const mk = (prompt, answer, hint, topic = 'composite') => ({ kind: 'pad', prompt, answer, topic, hint })
  const forms = []

  // 1. Two groups vs one — "кто меньше и на сколько"
  forms.push(() => {
    const s = pick(STUFF)
    const a = rnd(11, 30)
    const b = rnd(8, 25)
    const c = rnd(a + b + 2, a + b + 30)
    return mk(
      `Девочки ${s.v} ${a} ${s.many} и ещё ${b}, а мальчики — ${c}. На сколько мальчики ${s.v} больше?`,
      c - a - b,
      `Сначала у девочек: ${a} + ${b} = ${a + b}. Потом ${c} − ${a + b}.`,
    )
  })

  // 2. "столько же" + "на N больше"
  forms.push(() => {
    const [x, y, z] = pick(TREES)
    const n = rnd(8, 25)
    const more = rnd(5, 25)
    return mk(
      `В саду ${n} ${x} и столько же ${y}, а ${z} — на ${more} больше, чем ${y}. Сколько всего?`,
      n + n + (n + more),
      `${y}: ${n}. ${z}: ${n} + ${more} = ${n + more}. Всего ${n} + ${n} + ${n + more}.`,
    )
  })

  // 3. Было — потратили — сколько осталось (два вычитания)
  forms.push(() => {
    const who = pick(NAMES)
    const total = rnd(50, 99)
    const a = rnd(10, 30)
    const b = rnd(5, 25)
    return mk(
      `У ${who === 'Миша' || who === 'Петя' || who === 'Саша' || who === 'Дима' || who === 'Коля' ? who + 'и' : who} было ${total} рублей. Купил${who.endsWith('а') ? 'а' : ''} игрушку за ${a} и книгу за ${b}. Сколько осталось?`,
      total - a - b,
      `Потратили: ${a} + ${b} = ${a + b}. Осталось: ${total} − ${a + b}.`,
    )
  })

  // 4. Прибавили — убавили
  forms.push(() => {
    const s = pick(STUFF)
    const a = rnd(20, 50)
    const b = rnd(10, 30)
    const c = rnd(5, Math.min(25, a + b - 1))
    return mk(
      `Было ${a} ${s.many}. Принесли ещё ${b}, а потом ${c} унесли. Сколько стало?`,
      a + b - c,
      `${a} + ${b} = ${a + b}. Потом ${a + b} − ${c}.`,
    )
  })

  if (allowMult) {
    // 5. Ящики по N кг — продали — осталось
    forms.push(() => {
      const o = pick(BOXED)
      const boxes = rnd(4, 9)
      const per = pick([2, 3, 4, 5])
      const total = boxes * per
      const sold = rnd(5, total - 3)
      return mk(
        `Привезли ${boxes} ${o.boxes} ${o.item} по ${per} ${o.unit} в каждом. Продали ${sold} ${o.unit}. Сколько осталось?`,
        total - sold,
        `Всего: ${boxes} · ${per} = ${total} ${o.unit}. Осталось: ${total} − ${sold}.`,
        'composite-mult',
      )
    })

    // 6. Разлили по банкам + остаток → сколько было
    forms.push(() => {
      const o = pick(BOXED)
      const jars = rnd(4, 9)
      const per = pick([2, 3, 4, 5])
      const left = rnd(8, 30)
      return mk(
        `${o.item[0].toUpperCase() + o.item.slice(1)} разлили в ${jars} ${o.boxes} по ${per} ${o.unit}. Осталось ещё ${left} ${o.unit}. Сколько было всего?`,
        jars * per + left,
        `В банках: ${jars} · ${per} = ${jars * per}. Всего: ${jars * per} + ${left}.`,
        'composite-mult',
      )
    })

    // 7. Поровну разделить остаток
    forms.push(() => {
      const who = rnd(2, 5)
      const each = rnd(2, 9)
      const extra = rnd(3, 20)
      return mk(
        `Купили ${who * each + extra} конфет. ${extra} оставили маме, остальные разделили поровну на ${who} детей. Сколько каждому?`,
        each,
        `Осталось детям: ${who * each + extra} − ${extra} = ${who * each}. Каждому: ${who * each} : ${who}.`,
        'composite-mult',
      )
    })
  }

  return pick(forms)()
}

const OBJECTS = [
  { emoji: '🍎', one: 'яблоко', few: 'яблока', many: 'яблок' },
  { emoji: '🚗', one: 'машинка', few: 'машинки', many: 'машинок' },
  { emoji: '🎈', one: 'шарик', few: 'шарика', many: 'шариков' },
  { emoji: '🍪', one: 'печенье', few: 'печенья', many: 'печений' },
  { emoji: '⭐', one: 'звезда', few: 'звезды', many: 'звёзд' },
  { emoji: '🐟', one: 'рыбка', few: 'рыбки', many: 'рыбок' },
  { emoji: '🍓', one: 'ягода', few: 'ягоды', many: 'ягод' },
  { emoji: '🌰', one: 'орешек', few: 'орешка', many: 'орешков' },
  { emoji: '🍄', one: 'гриб', few: 'гриба', many: 'грибов' },
  { emoji: '🐞', one: 'божья коровка', few: 'божьи коровки', many: 'божьих коровок' },
  { emoji: '🦋', one: 'бабочка', few: 'бабочки', many: 'бабочек' },
  { emoji: '🌸', one: 'цветок', few: 'цветка', many: 'цветов' },
  { emoji: '🍋', one: 'лимон', few: 'лимона', many: 'лимонов' },
  { emoji: '🐤', one: 'цыплёнок', few: 'цыплёнка', many: 'цыплят' },
  { emoji: '🧁', one: 'кекс', few: 'кекса', many: 'кексов' },
  { emoji: '🪁', one: 'змей', few: 'змея', many: 'змеев' },
]

function qWord() {
  const o = pick(OBJECTS)
  const n = (k) => plural(k, o.one, o.few, o.many)
  // Kept small enough that every object is actually drawn on screen — the
  // picture has to be countable, or it is decoration rather than a support.
  const a = rnd(4, 12)
  const add = Math.random() < 0.5
  // Take away less than there is. An independent `b` can exceed `a`, and "4
  // печенья, 8 съел" asks a second-grader for −4 — on a pad with no minus key.
  const b = add ? rnd(2, 8) : rnd(2, a - 1)

  // The friend's name is picked per question so the stories don't all star the
  // same character, and so they read the same whichever buddy was chosen.
  const who = pick(['Лео', 'Тиг', 'Пятныш', 'Миша', 'Катя', 'Оля', 'Петя'])

  if (add) {
    const t = pick([
      `У ${who} ${a} ${n(a)}. Ему дали ещё ${b}.`,
      `В корзине ${a} ${n(a)}, а в коробке ${b}.`,
      `${who} нашёл ${a} ${n(a)}, а потом ещё ${b}.`,
      `На поляне ${a} ${n(a)}, прилетело ещё ${b}.`,
      `В первый день собрали ${a} ${n(a)}, во второй — ${b}.`,
      `На верхней полке ${a} ${n(a)}, на нижней — ${b}.`,
      `Утром было ${a} ${n(a)}, днём добавили ${b}.`,
      `${who} собрал ${a} ${n(a)}, а друг подарил ещё ${b}.`,
    ])
    return {
      kind: 'word',
      prompt: `${t} Сколько всего?`,
      answer: a + b,
      topic: 'word',
      hint: `${a} + ${b} = ${a + b}`,
      data: { emoji: o.emoji, groups: [a, b], op: '+' },
    }
  }

  const t = pick([
    `У ${who} было ${a} ${n(a)}. ${b} он отдал друзьям.`,
    `Было ${a} ${n(a)}. ${b} потерялось.`,
    `${who} испёк ${a} ${n(a)} и ${b} съел.`,
    `На ветке сидели ${a} ${n(a)}, ${b} улетели.`,
    `Было ${a} ${n(a)}, ${b} подарили соседям.`,
    `В корзине лежало ${a} ${n(a)}, ${b} забрали.`,
    `${who} собрал ${a} ${n(a)}, но ${b} укатились.`,
  ])
  return {
    kind: 'word',
    prompt: `${t} Сколько осталось?`,
    answer: a - b,
    topic: 'word',
    hint: `${a} − ${b} = ${a - b}`,
    data: { emoji: o.emoji, total: a, taken: b, op: '−' },
  }
}

/* ── Столбик с пропуском в слагаемом ───────────────────────────────────────
   The workbook blanks digits anywhere, not just in the answer: `+6⬜ / ⬜2 / 77`.
   Working backwards from the result is a genuinely different skill from adding
   forwards, and it was missing entirely. */
function qColumnBlank() {
  const add = Math.random() < 0.55
  let a, b, res

  if (add) {
    const aOnes = rnd(1, 8)
    const bOnes = rnd(1, 9 - aOnes) // no carry: a blank digit stays uniquely solvable
    const aTens = rnd(1, 4)
    const bTens = rnd(1, 8 - aTens)
    a = aTens * 10 + aOnes
    b = bTens * 10 + bOnes
    res = a + b
  } else {
    const aOnes = rnd(5, 9)
    const bOnes = rnd(1, aOnes) // no borrow, same reason
    const bTens = rnd(1, 4)
    const aTens = rnd(bTens + 1, 9)
    a = aTens * 10 + aOnes
    b = bTens * 10 + bOnes
    res = a - b
  }

  // Blank exactly one digit of one operand; the result is always shown.
  const row = Math.random() < 0.5 ? 'a' : 'b'
  const pos = Math.random() < 0.5 ? 'tens' : 'ones'
  const digitOf = (n, p) => (p === 'tens' ? Math.floor(n / 10) : n % 10)
  const answer = digitOf(row === 'a' ? a : b, pos)

  return {
    kind: 'column-blank',
    prompt: 'Какая цифра спряталась?',
    answer,
    topic: 'column',
    hint:
      pos === 'ones'
        ? `Посмотри на единицы: ${a % 10} ${add ? '+' : '−'} ${b % 10} = ${res % 10}.`
        : `Посмотри на десятки: ${Math.floor(a / 10)} ${add ? '+' : '−'} ${Math.floor(b / 10)} = ${Math.floor(res / 10)}.`,
    data: { a, b, res, op: add ? '+' : '−', row, pos },
  }
}

function qColumn() {
  if (Math.random() < 0.5) {
    // Forced carry: the ones always cross ten, which is the step being taught.
    const aOnes = rnd(4, 9)
    const bOnes = rnd(10 - aOnes, 9)
    const aTens = rnd(1, 4)
    const bTens = rnd(1, 8 - aTens)
    const a = aTens * 10 + aOnes
    const b = bTens * 10 + bOnes
    return {
      kind: 'column',
      prompt: 'Считай в столбик',
      answer: a + b,
      topic: 'column',
      hint: `${aOnes} + ${bOnes} = ${aOnes + bOnes}. Пишем ${(aOnes + bOnes) % 10}, а 1 десяток запоминаем.`,
      data: { a, b, op: '+' },
    }
  }

  // Forced borrow. The +2 on the tens keeps the difference at two digits, so the
  // answer always fills both boxes of the column layout.
  const aOnes = rnd(0, 5)
  const bOnes = rnd(aOnes + 1, 9)
  const bTens = rnd(1, 4)
  const aTens = rnd(bTens + 2, 8)
  const a = aTens * 10 + aOnes
  const b = bTens * 10 + bOnes
  return {
    kind: 'column',
    prompt: 'Считай в столбик',
    answer: a - b,
    topic: 'column',
    hint: `${aOnes} меньше ${bOnes} — занимаем десяток. ${aOnes + 10} − ${bOnes} = ${aOnes + 10 - bOnes}.`,
    data: { a, b, op: '−' },
  }
}

/* ── UNIT 2 ────────────────────────────────────────────────────────────── */

const multHint = (a, b) => {
  if (b === 1) return `${a} × 1 — это просто ${a}.`
  if (a === 10 || b === 10) return `На 10 умножать легко: припиши ноль.`
  if (a === 5 || b === 5) return `${a} × ${b} — это половина от ${a} × ${b * 2 === 10 ? 10 : b} …`
  if (a === 9) return `${a} × ${b} = ${10 * b} − ${b} = ${a * b}.`
  return `Это ${b} ${plural(b, 'группа', 'группы', 'групп')} по ${a}. Сложи: ${Array(Math.min(b, 4)).fill(a).join(' + ')}${b > 4 ? ' …' : ''} = ${a * b}.`
}

function multDistractors(a, b) {
  return [a * b + a, a * b - a, a * b + b, a * b - b, a * (b + 1), (a + 1) * b, a + b, a * b + 1, a * b - 1]
}

/** One multiplication fact, dressed as a different exercise type each time so
    ten questions in a row don't feel like ten identical questions. */
function qMultFact(a, b, kindHint) {
  const answer = a * b
  const topic = `table-${a}`
  const fact = `${a}x${b}`
  const base = { answer, topic, fact, hint: multHint(a, b), expr: `${a} × ${b}` }

  // Both sides ≥ 2: "5 рядов по 1" draws a single column of cookies, which
  // illustrates nothing about grouping. Those fall through to plain choice.
  if (kindHint === 'array' && a >= 2 && a <= 6 && b >= 2 && b <= 6) {
    return {
      ...base,
      kind: 'array',
      prompt: 'Сколько всего?',
      options: makeOptions(answer, multDistractors(a, b)),
      data: { rows: a, cols: b, emoji: pick(['⭐', '🍎', '🐟', '🍪']) },
    }
  }
  if (kindHint === 'pad') {
    return { ...base, kind: 'pad', prompt: 'Сколько будет?' }
  }
  return {
    ...base,
    kind: 'choice',
    prompt: 'Сколько будет?',
    options: makeOptions(answer, multDistractors(a, b)),
  }
}

/* ── Деление ───────────────────────────────────────────────────────────────
   Always the inverse of a table he already knows: 12 : 2 is just 2 × 6 read
   backwards, which is exactly how it's taught. Note the notation — Russian
   schools write division with a colon, never ÷. */
function qDiv(t, b, kindHint) {
  const total = t * b
  const base = {
    answer: b,
    topic: `div-${t}`,
    fact: `${t}x${b}`, // shares the fact record with its multiplication twin
    hint: `${t} × ${b} = ${total}, значит ${total} : ${t} = ${b}.`,
    expr: `${total} : ${t}`,
  }
  if (kindHint === 'pad') return { ...base, kind: 'pad', prompt: 'Сколько будет?' }
  return {
    ...base,
    kind: 'choice',
    prompt: 'Сколько будет?',
    options: makeOptions(b, [b + 1, b - 1, b + 2, t, total, b * 2]),
  }
}

/** Multiplication/division vocabulary — произведение, множитель, делимое,
    делитель, частное, увеличь в N раз. Same idea as qTerms, other half of the
    curriculum. */
function qMultTerms(tables) {
  const t = pick(tables)
  const b = rnd(2, 9)
  const p = t * b
  const mk = (prompt, answer, hint) => ({ kind: 'pad', prompt, answer, topic: 'mult-terms', hint })

  const forms = [
    () => mk(`Найди произведение чисел ${t} и ${b}.`, p, `Произведение — это умножение: ${t} × ${b}.`),
    () => mk(`Первый множитель ${t}, второй — ${b}. Найди произведение.`, p, `Множители перемножают: ${t} × ${b}.`),
    () => mk(`${t} умножить на ${b}.`, p, `${t} × ${b} = ${p}.`),
    () => mk(`Увеличь число ${b} в ${t} раза.`, p, `«В ${t} раза» — это умножение: ${b} × ${t}.`),
    () => mk(`По ${t} ${b} раз.`, p, `Это ${b} групп по ${t}: ${t} × ${b}.`),
    () => mk(`Делимое ${p}, делитель ${t}. Найди частное.`, b, `Частное — результат деления: ${p} : ${t}.`),
    () => mk(`Найди частное чисел ${p} и ${t}.`, b, `${p} : ${t} = ${b}.`),
    () => mk(`Уменьши число ${p} в ${t} раза.`, b, `«В ${t} раза меньше» — это деление: ${p} : ${t}.`),
    () => mk(`Во сколько раз ${p} больше, чем ${t}?`, b, `Делим: ${p} : ${t} = ${b}.`),
    () => mk(`Какое число нужно умножить на ${t}, чтобы получилось ${p}?`, b, `${p} : ${t} = ${b}.`),
    () => mk(`Частное ${b}, делитель ${t}. Найди делимое.`, p, `Делимое = частное × делитель: ${b} × ${t}.`),
  ]
  return pick(forms)()
}

function qMatch(table, count = 4) {
  const bs = shuffle([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, count)
  // Distinct products only, or a pair would have two valid targets.
  const seen = new Set()
  const pairs = []
  for (const b of bs) {
    const p = table * b
    if (seen.has(p)) continue
    seen.add(p)
    pairs.push({ left: `${table} × ${b}`, right: p, fact: `${table}x${b}` })
    if (pairs.length === count) break
  }
  return {
    kind: 'match',
    prompt: 'Соедини пример и ответ',
    topic: `table-${table}`,
    answer: null,
    hint: `Считай по ${table}.`,
    data: { pairs },
  }
}

function tableLesson(table) {
  const qs = [
    {
      kind: 'teach',
      prompt: `Считаем по ${table}. Смотри, как растёт число!`,
      topic: `table-${table}`,
      data: { type: 'skip', table, upTo: 10 },
    },
  ]

  // 1 and 10 are freebies; the middle of the table is where the work is, so all
  // eight of those come up, plus the two easy ones.
  const easy = [1, 10]
  const core = shuffle([2, 3, 4, 5, 6, 7, 8, 9])
  const order = shuffle([...core, ...easy])
  const kinds = ['array', 'choice', 'pad', 'choice', 'array', 'pad', 'choice', 'pad', 'choice', 'choice']

  order.forEach((b, i) => qs.push(qMultFact(table, b, kinds[i % kinds.length])))
  // Two matching rounds, spaced apart, to break up the drill.
  qs.splice(4, 0, qMatch(table, 4))
  qs.splice(9, 0, qMatch(table, 4))
  return qs
}

function weightedFactPool(facts, tables) {
  const pool = []
  for (const t of tables) {
    for (let b = 1; b <= 10; b++) {
      const rec = facts[`${t}x${b}`]
      // Never-seen facts sit deliberately between "solid" and "shaky" so they
      // still surface, without crowding out the ones he actually gets wrong.
      const errRate = rec && rec.total ? 1 - rec.correct / rec.total : 0.5
      pool.push({ t, b, weight: 1 + errRate * 4 })
    }
  }
  return pool
}

function sampleWeighted(pool, n) {
  const out = []
  const left = [...pool]
  while (out.length < n && left.length) {
    const total = left.reduce((s, x) => s + x.weight, 0)
    let r = Math.random() * total
    let i = 0
    while (i < left.length - 1 && (r -= left[i].weight) > 0) i++
    out.push(left.splice(i, 1)[0])
  }
  return out
}

/* ── Dispatcher ────────────────────────────────────────────────────────── */

const repeat = (n, fn) => Array.from({ length: n }, (_, i) => fn(i))

/*  Проверка — the test-out exam.
 *
 *  Samples across every lesson in the unit rather than drilling one, because
 *  the claim being tested is "I already know this whole section". Teaching
 *  screens are dropped: an exam asks, it doesn't explain. 12 questions with a
 *  3-mistake budget, so passing needs ~75% — high enough to mean something,
 *  low enough that one slip of the thumb doesn't fail a child who does know it.
 */
export const EXAM_LENGTH = 12
export const EXAM_MAX_MISTAKES = 3

/** Pulls a spread of questions from every real lesson in a unit. Shared by the
    exam and the end-of-unit review — same sampling, different stakes. */
function unitPool(unit, state, perLesson) {
  const pool = []
  for (const l of unit.lessons) {
    // Skip the review/exam themselves, or they would recurse into this.
    if (l.review) continue
    const qs = buildLesson(l.id, state)
      .filter((q) => q.kind !== 'teach' && q.kind !== 'match')
      .slice(0, perLesson)
    pool.push(...qs)
  }
  return pool
}

export function buildExam(unit, state) {
  const perLesson = Math.max(2, Math.ceil(EXAM_LENGTH / Math.max(1, unit.lessons.length - 1)))
  return shuffle(unitPool(unit, state, perLesson))
    .slice(0, EXAM_LENGTH)
    .map((q) => ({ ...q, exam: true }))
}

/*  Jumping several units ahead has to prove every unit being skipped, not just
 *  the destination — otherwise a child could land on multiplication without
 *  ever showing they can add. Longer and slightly stricter than a single-unit
 *  exam, because it's unlocking correspondingly more.
 */
export const JUMP_LENGTH = 16
// Same three-mistake budget as a single-unit exam, on the user's call: one
// rule the child can hold in their head beats a per-mode budget that's
// technically fairer but has to be re-read every time.
export const JUMP_MAX_MISTAKES = 3

export function buildJumpExam(units, state) {
  const perUnit = Math.max(2, Math.ceil(JUMP_LENGTH / Math.max(1, units.length)))
  const pool = []
  for (const u of units) {
    // At least one question from every unit in the range, so none is skipped
    // by luck of the shuffle.
    pool.push(...shuffle(unitPool(u, state, 3)).slice(0, perUnit))
  }
  return shuffle(pool)
    .slice(0, JUMP_LENGTH)
    .map((q) => ({ ...q, exam: true }))
}

/** Повторение — the same mix, but a normal lesson: retries, hints, no stakes. */
export function buildReview(unit, state) {
  return shuffle(unitPool(unit, state, 4)).slice(0, 12)
}

/** Работа над ошибками — the questions actually missed, oldest first so the
    ones fading from memory come back soonest. */
export function buildMistakes(state) {
  return [...(state.mistakes ?? [])]
    .sort((a, b) => (a.at ?? 0) - (b.at ?? 0))
    .slice(0, 10)
    // Strip the timer off blitz questions: a review is for understanding, not
    // for being caught out twice by the same clock.
    .map(({ at: _at, timed: _timed, timeLimit: _timeLimit, ...q }) => q)
}

export function buildLesson(lessonId, state) {
  if (lessonId === 'mistakes') return buildMistakes(state)

  // Exams are addressed as `exam-<unitId>` so they travel through the same
  // route, the same Lesson screen and the same grading as any other lesson.
  if (lessonId.startsWith('jump-')) {
    const unit = UNIT_BY_ID[lessonId.slice(5)]
    if (!unit) return []
    return buildJumpExam(unitsUpTo(unit, state.lessons), state)
  }
  if (lessonId.startsWith('exam-')) {
    const unit = UNIT_BY_ID[lessonId.slice(5)]
    return unit ? buildExam(unit, state) : []
  }
  if (lessonId.startsWith('review-')) {
    const unit = UNIT_BY_ID[lessonId.slice(7)]
    return unit ? buildReview(unit, state) : []
  }

  const lesson = LESSON_BY_ID[lessonId]
  if (!lesson) return []

  switch (lessonId) {
    case 'numberline':
      return repeat(12, qNumberLine)

    case 'basten':
      return repeat(12, qBaseTen)

    case 'compare':
      return repeat(12, qCompare)

    case 'terms':
      return repeat(12, qTerms)

    case 'order':
      return repeat(12, () => qOrder(false))

    case 'composite':
      return repeat(10, () => qComposite(false))

    case 'order-mult':
      return repeat(12, () => qOrder(true))

    case 'composite-mult':
      return repeat(10, () => qComposite(true))

    // Chains are mixed straight into "find the missing number": same skill,
    // and they're what he's already meeting at school.
    case 'missing':
      return shuffle([...repeat(8, qMissing), ...repeat(4, qChain)])

    case 'word':
      return repeat(10, qWord)

    // Column now mixes solving forwards with working a blank digit backwards —
    // the workbook drills both on the same page.
    case 'column':
      return shuffle([...repeat(7, qColumn), ...repeat(5, qColumnBlank)])

    case 'mix1':
      return shuffle([
        ...repeat(2, qNumberLine),
        ...repeat(2, (i) => qBaseTen(i)),
        ...repeat(2, qCompare),
        ...repeat(2, qMissing),
        ...repeat(2, qChain),
        ...repeat(2, qTerms),
        ...repeat(2, qWord),
        ...repeat(2, qColumn),
        ...repeat(1, qColumnBlank),
      ]).map((q) => ({ ...q, timed: true }))

    case 'mult-intro':
      return [
        {
          kind: 'teach',
          prompt: 'Умножение — это когда берём одинаковые группы.',
          topic: 'mult-concept',
          data: { type: 'array', rows: 3, cols: 4 },
        },
        {
          kind: 'teach',
          prompt: 'Считать группами быстрее, чем по одному!',
          topic: 'mult-concept',
          data: { type: 'skip', table: 2, upTo: 6 },
        },
        {
          kind: 'array-build',
          prompt: 'Построй 3 ряда по 4',
          answer: 12,
          topic: 'mult-concept',
          hint: '3 ряда, в каждом 4. Это 3 × 4 = 12.',
          data: { rows: 3, cols: 4 },
        },
        {
          ...qMultFact(2, 5, 'array'),
          prompt: 'Сколько всего?',
          topic: 'mult-concept',
        },
        {
          kind: 'array-build',
          prompt: 'Построй 2 ряда по 6',
          answer: 12,
          topic: 'mult-concept',
          hint: '2 ряда по 6 — это 2 × 6 = 12.',
          data: { rows: 2, cols: 6 },
        },
        { ...qMultFact(3, 3, 'array'), topic: 'mult-concept' },
        { ...qMultFact(4, 2, 'array'), topic: 'mult-concept' },
        {
          kind: 'teach',
          prompt: 'От перестановки ответ не меняется! 3 × 4 = 4 × 3.',
          topic: 'mult-concept',
          data: { type: 'array', rows: 4, cols: 3 },
        },
        { ...qMultFact(5, 2, 'choice'), topic: 'mult-concept' },
      ]

    case 'division': {
      const tables = learnedTables(state.lessons)
      const picks = sampleWeighted(weightedFactPool(state.facts, tables), 12)
      return [
        {
          kind: 'teach',
          prompt: 'Деление — это умножение наоборот. 2 × 6 = 12, значит 12 : 2 = 6.',
          topic: 'div-intro',
          data: { type: 'array', rows: 2, cols: 6 },
        },
        ...picks.map((p, i) => qDiv(p.t, p.b, i % 3 === 1 ? 'pad' : 'choice')),
      ]
    }

    case 'mult-terms':
      return repeat(12, () => qMultTerms(learnedTables(state.lessons)))

    // Mixed practice now also pulls division and the vocabulary, so the section
    // ends up rehearsing the whole topic rather than only the tables.
    case 'mult-mix': {
      const tables = learnedTables(state.lessons)
      const picks = sampleWeighted(weightedFactPool(state.facts, tables), 14)
      const kinds = ['choice', 'pad', 'choice', 'array', 'choice', 'pad']
      const mult = picks.map((p, i) => qMultFact(p.t, p.b, kinds[i % kinds.length]))
      const div = sampleWeighted(weightedFactPool(state.facts, tables), 4).map((p, i) =>
        qDiv(p.t, p.b, i % 2 ? 'pad' : 'choice'),
      )
      return shuffle([...mult, ...div, ...repeat(3, () => qMultTerms(tables))])
    }

    case 'blitz': {
      const tables = learnedTables(state.lessons)
      const picks = sampleWeighted(weightedFactPool(state.facts, tables), 16)
      // Always multiple choice: typing is a reading-and-motor task, and this
      // round is meant to measure recall, not thumbs. 9s is generous for 7.
      return picks.map((p) => ({
        ...qMultFact(p.t, p.b, 'choice'),
        timed: true,
        timeLimit: 9,
      }))
    }

    default:
      if (lesson.table) return tableLesson(lesson.table)
      return []
  }
}

/** Answer checking lives here so every exercise type agrees on what "right"
    means. `teach` and `match` have no single value to compare, and `array-build`
    is judged on the shape rather than the product — 2×6 also makes 12, but it
    is not "3 ряда по 4", and the shape is the whole point of that lesson. */
export function checkAnswer(q, value) {
  if (q.kind === 'teach') return true
  if (q.kind === 'match') return true
  if (q.kind === 'array-build') return Boolean(value?.ok)
  // Compare answers with a sign, not a number.
  if (q.kind === 'compare') return value === q.answer
  // A chain has one box per link and all of them have to be right.
  if (q.kind === 'chain') {
    return Array.isArray(value) && value.length === q.answer.length && value.every((v, i) => Number(v) === q.answer[i])
  }
  return Number(value) === Number(q.answer)
}
