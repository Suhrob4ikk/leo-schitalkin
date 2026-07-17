/* Collectibles. Each sub-lesson hands one over on completion; the milestone
   ones at the bottom are rarer and are what make the album worth filling. */

export const STICKERS = {
  ruler: { emoji: '📏', label: 'Мастер прямой', color: 'blue' },
  blocks: { emoji: '🧱', label: 'Строитель десятков', color: 'orange' },
  magnify: { emoji: '🔍', label: 'Сыщик чисел', color: 'purple' },
  apple: { emoji: '🍎', label: 'Решала задачек', color: 'green' },
  pencil: { emoji: '📝', label: 'Столбик-профи', color: 'blue' },
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
    stay correct even if a lesson is replayed or the app is reopened later. */
export function earnedMilestones(state) {
  const out = []
  const done = (ids) => ids.every((id) => state.lessons[id]?.done)

  if (done(['numberline', 'basten', 'missing', 'word', 'column', 'mix1'])) out.push('unit-u1')
  if (done(['mult-intro', 'table-2', 'table-10', 'table-5', 'table-3', 'table-4', 'table-6', 'table-9', 'table-7', 'table-8', 'mult-mix', 'blitz']))
    out.push('unit-u2')

  const perfects = Object.values(state.lessons).filter((l) => l.perfect).length
  if (perfects >= 5) out.push('perfect-5')
  if ((state.streak?.longest ?? 0) >= 7) out.push('streak-7')
  if (Object.values(state.lessons).filter((l) => l.done).length >= 3) out.push('fox-friend')

  return out
}
