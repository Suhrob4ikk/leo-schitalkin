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

  /* Milestones */
  'unit-u1': { emoji: '🏆', label: 'Сложение и вычитание', color: 'gold', big: true },
  'unit-u2': { emoji: '👑', label: 'Таблица умножения', color: 'gold', big: true },
  'perfect-5': { emoji: '🌟', label: '5 идеальных уроков', color: 'gold', big: true },
  'streak-7': { emoji: '🔥', label: '7 дней подряд', color: 'orange', big: true },
  'fox-friend': { emoji: '🦊', label: 'Друг Лео', color: 'orange', big: true },
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
