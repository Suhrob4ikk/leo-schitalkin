/*  The path, in order.
 *
 *  Deliberately many short units rather than two long ones. A unit of sixteen
 *  lessons is a month of grinding the same banner with no sense of arriving
 *  anywhere; three or four lessons is finishable in a couple of sittings, and
 *  every finish is a celebration and a new colour.
 *
 *  `exam: false` on the first unit only — there has to be somewhere the child
 *  actually starts, and skipping the very first lesson would leave them with an
 *  empty map.
 */
export const UNITS = [
  {
    id: 'u1',
    title: 'Числа до 100',
    subtitle: 'Разминка',
    color: 'green',
    icon: '🔢',
    exam: false,
    lessons: [
      { id: 'numberline', title: 'Числовая прямая', icon: '📏', sticker: 'ruler' },
      { id: 'basten', title: 'Десятки и единицы', icon: '🧱', sticker: 'blocks' },
      { id: 'compare', title: 'Сравни числа', icon: '⚖️', sticker: 'scales' },
    ],
  },
  {
    id: 'u2',
    title: 'Плюс и минус',
    subtitle: 'Считаем до 100',
    color: 'blue',
    icon: '➕',
    lessons: [
      { id: 'missing', title: 'Найди пропущенное', icon: '🔍', sticker: 'magnify' },
      { id: 'word', title: 'Задачки с картинками', icon: '🍎', sticker: 'apple' },
      { id: 'terms', title: 'Сумма и разность', icon: '🗣️', sticker: 'words' },
    ],
  },
  {
    id: 'u3',
    title: 'Столбик и скобки',
    subtitle: 'Записываем красиво',
    color: 'orange',
    icon: '📝',
    lessons: [
      { id: 'column', title: 'В столбик', icon: '📝', sticker: 'pencil' },
      { id: 'order', title: 'Скобки', icon: '🔀', sticker: 'brackets' },
      { id: 'composite', title: 'Задачи в 2 действия', icon: '🧩', sticker: 'puzzle' },
      { id: 'mix1', title: 'Смешанная практика', icon: '🎯', sticker: 'target' },
    ],
  },
  {
    id: 'u4',
    title: 'Что такое умножение',
    subtitle: 'Новая тема!',
    color: 'purple',
    icon: '✖️',
    lessons: [
      { id: 'mult-intro', title: 'Что такое умножение?', icon: '💡', sticker: 'bulb' },
      /* Deliberately not 2,3,4,5…: each table here leans on one the child already
         owns. ×2 is doubling, ×10 is a zero, ×5 is half of ×10, ×4 is ×2 twice,
         ×3 is ×2 plus one more group, ×6 is ×5 plus one group, ×9 is ×10 minus
         one. ×7 and ×8 come last because by then only a couple of new facts are
         actually left to learn — the rest are commutative repeats. */
      { id: 'table-2', title: 'Таблица ×2', icon: '2️⃣', sticker: 'x2', table: 2 },
      { id: 'table-10', title: 'Таблица ×10', icon: '🔟', sticker: 'x10', table: 10 },
      { id: 'table-5', title: 'Таблица ×5', icon: '5️⃣', sticker: 'x5', table: 5 },
    ],
  },
  {
    id: 'u5',
    title: 'Таблица дальше',
    subtitle: '×3, ×4, ×6',
    color: 'green',
    icon: '✳️',
    lessons: [
      { id: 'table-3', title: 'Таблица ×3', icon: '3️⃣', sticker: 'x3', table: 3 },
      { id: 'table-4', title: 'Таблица ×4', icon: '4️⃣', sticker: 'x4', table: 4 },
      { id: 'table-6', title: 'Таблица ×6', icon: '6️⃣', sticker: 'x6', table: 6 },
    ],
  },
  {
    id: 'u6',
    title: 'Самые трудные',
    subtitle: '×9, ×7, ×8',
    color: 'blue',
    icon: '🔥',
    lessons: [
      { id: 'table-9', title: 'Таблица ×9', icon: '9️⃣', sticker: 'x9', table: 9 },
      { id: 'table-7', title: 'Таблица ×7', icon: '7️⃣', sticker: 'x7', table: 7 },
      { id: 'table-8', title: 'Таблица ×8', icon: '8️⃣', sticker: 'x8', table: 8 },
    ],
  },
  {
    id: 'u7',
    title: 'Деление',
    subtitle: 'Умножение наоборот',
    color: 'orange',
    icon: '➗',
    lessons: [
      /* Division comes after every table: it's each of them read backwards, so
         it can't be taught before there's something to reverse. */
      { id: 'division', title: 'Деление', icon: '➗', sticker: 'divide' },
      { id: 'mult-terms', title: 'Произведение и частное', icon: '🎓', sticker: 'grad' },
    ],
  },
  {
    id: 'u8',
    title: 'Всё вместе',
    subtitle: 'Финал',
    color: 'purple',
    icon: '🏁',
    lessons: [
      { id: 'order-mult', title: 'Порядок действий', icon: '🔢', sticker: 'order' },
      { id: 'composite-mult', title: 'Сложные задачи', icon: '🧠', sticker: 'brain' },
      { id: 'mult-mix', title: 'Смешанная тренировка', icon: '🎪', sticker: 'circus' },
      { id: 'blitz', title: 'Блиц-раунд', icon: '⚡', sticker: 'bolt' },
    ],
  },
]

/** Units the child could test out of: the next one they haven't finished, and
    only if it isn't the very first thing in the app. */
export function canTakeExam(unit, lessons) {
  if (unit.exam === false) return false
  const done = unit.lessons.filter((l) => lessons[l.id]?.done).length
  if (done === unit.lessons.length) return false // already finished it
  // Unlocked means the unit before it is complete.
  const i = UNITS.indexOf(unit)
  if (i <= 0) return true
  return UNITS[i - 1].lessons.every((l) => lessons[l.id]?.done)
}

export const UNIT_BY_ID = Object.fromEntries(UNITS.map((u) => [u.id, u]))

/** Every lesson, flattened into path order, each tagged with its unit. */
export const ALL_LESSONS = UNITS.flatMap((u) =>
  u.lessons.map((l) => ({ ...l, unitId: u.id, unitColor: u.color, unitTitle: u.title })),
)

export const LESSON_BY_ID = Object.fromEntries(ALL_LESSONS.map((l) => [l.id, l]))

export function lessonIndex(id) {
  return ALL_LESSONS.findIndex((l) => l.id === id)
}

/** Sequential gate: a node opens once the one before it is done. */
export function isUnlocked(id, lessons) {
  const i = lessonIndex(id)
  if (i <= 0) return true
  return Boolean(lessons[ALL_LESSONS[i - 1].id]?.done)
}

/** The node Лео stands on: the first one not yet finished. */
export function currentLessonId(lessons) {
  const next = ALL_LESSONS.find((l) => !lessons[l.id]?.done)
  return (next || ALL_LESSONS[ALL_LESSONS.length - 1]).id
}

/** Tables the child has already been taught — the pool mixed practice draws on. */
export function learnedTables(lessons) {
  const done = ALL_LESSONS.filter((l) => l.table && lessons[l.id]?.done).map((l) => l.table)
  // Before any table is finished there is still something to practise.
  return done.length ? done : [2]
}

export function unitProgress(unit, lessons) {
  const done = unit.lessons.filter((l) => lessons[l.id]?.done).length
  return { done, total: unit.lessons.length, ratio: done / unit.lessons.length }
}
