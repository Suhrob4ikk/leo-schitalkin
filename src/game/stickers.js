/* Collectibles. Each sub-lesson hands one over on completion; the milestone
   ones at the bottom are rarer and are what make the album worth filling. */

export const STICKERS = {
  ruler: { emoji: '📏', label: 'Мастер прямой', color: 'blue' },
  blocks: { emoji: '🧱', label: 'Строитель десятков', color: 'orange' },
  scales: { emoji: '⚖️', label: 'Знаток сравнений', color: 'blue' },
  magnify: { emoji: '🔍', label: 'Сыщик чисел', color: 'purple' },
  apple: { emoji: '🍎', label: 'Решала задачек', color: 'green' },
  words: { emoji: '🗣️', label: 'Математический язык', color: 'purple' },
  pencil: { emoji: '📝', label: 'Столбик-профи', color: 'blue' },
  brackets: { emoji: '🔀', label: 'Хозяин скобок', color: 'green' },
  puzzle: { emoji: '🧩', label: 'Два действия', color: 'orange' },
  target: { emoji: '🎯', label: 'Меткий счёт', color: 'orange' },
  repeat: { emoji: '🔁', label: 'Ничего не забыл', color: 'blue' },

  bulb: { emoji: '💡', label: 'Понял умножение!', color: 'gold' },
  x2: { emoji: '2️⃣', label: 'Двойка покорена', color: 'green' },
  x10: { emoji: '🔟', label: 'Десятка покорена', color: 'blue' },
  x5: { emoji: '5️⃣', label: 'Пятёрка покорена', color: 'orange' },
  x3: { emoji: '3️⃣', label: 'Тройка покорена', color: 'purple' },
  x4: { emoji: '4️⃣', label: 'Четвёрка покорена', color: 'green' },
  x6: { emoji: '6️⃣', label: 'Шестёрка покорена', color: 'blue' },
  x9: { emoji: '9️⃣', label: 'Девятка покорена', color: 'orange' },
  x7: { emoji: '7️⃣', label: 'Семёрка покорена', color: 'purple' },
  x8: { emoji: '8️⃣', label: 'Восьмёрка покорена', color: 'green' },
  divide: { emoji: '➗', label: 'Деление освоено', color: 'blue' },
  grad: { emoji: '🎓', label: 'Знаток терминов', color: 'purple' },
  order: { emoji: '🔢', label: 'Порядок действий', color: 'green' },
  brain: { emoji: '🧠', label: 'Сложные задачи', color: 'gold' },
  circus: { emoji: '🎪', label: 'Всё вместе!', color: 'purple' },
  bolt: { emoji: '⚡', label: 'Молния', color: 'gold' },

  /* Milestones — one per unit, labelled with the real unit title. These are
     derived in earnedMilestones from `unit-${u.id}`, so every unit needs an
     entry here or finishing it awards an id with nothing to show. */
  'unit-u1': { emoji: '🏆', label: 'Числа до 100', color: 'gold', big: true },
  'unit-u2': { emoji: '🎖️', label: 'Плюс и минус', color: 'gold', big: true },
  'unit-u3': { emoji: '👑', label: 'Столбик и скобки', color: 'gold', big: true },
  'unit-u4': { emoji: '💎', label: 'Что такое умножение', color: 'gold', big: true },
  'unit-u5': { emoji: '🚀', label: 'Таблица дальше', color: 'gold', big: true },
  'unit-u6': { emoji: '⭐', label: 'Самые трудные', color: 'gold', big: true },
  'unit-u7': { emoji: '💪', label: 'Деление', color: 'gold', big: true },
  'unit-u8': { emoji: '🏁', label: 'Всё вместе', color: 'gold', big: true },
  'perfect-5': { emoji: '🌟', label: '5 идеальных уроков', color: 'gold', big: true },
  'streak-7': { emoji: '🔥', label: '7 дней подряд', color: 'orange', big: true },
  // Buddy-neutral: the friend on the journey may be Лео, Пятныш or Тиг, so this
  // can't be a fox. (Id kept as-is so already-earned saves don't lose it.)
  'fox-friend': { emoji: '❤️', label: 'Верный друг', color: 'orange', big: true },
}

export const STICKER_IDS = Object.keys(STICKERS)

/** Milestones are derived from progress rather than awarded inline, so they
    stay correct even if a lesson is replayed or the app is reopened later.
    Unit completion is read from the curriculum instead of a hand-written list,
    which drifted the moment new lessons were added to a unit. */
export function earnedMilestones(state, units) {
  const out = []
  const done = (ids) => ids.length > 0 && ids.every((id) => state.lessons[id]?.done)

  for (const u of units ?? []) {
    if (done(u.lessons.map((l) => l.id))) out.push(`unit-${u.id}`)
  }

  const perfects = Object.values(state.lessons).filter((l) => l.perfect).length
  if (perfects >= 5) out.push('perfect-5')
  if ((state.streak?.longest ?? 0) >= 7) out.push('streak-7')
  if (Object.values(state.lessons).filter((l) => l.done).length >= 3) out.push('fox-friend')

  return out
}
