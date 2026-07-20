/*  Reminder copy, shared by the app and the service worker.
 *
 *  Deliberately NOT Duolingo's guilt-trip register ("this is your last chance",
 *  the crying owl). That works on adults who find it funny; on a seven-year-old
 *  it just makes the app feel like something that tells you off. Every line
 *  here is an invitation from a friend who misses them.
 *
 *  Variety matters more than cleverness: the same sentence twice reads as a
 *  machine, and a child stops seeing it by the third day.
 */

/** Nothing done yet today, and the streak is still alive. */
export const DAILY = [
  '{name} ждёт тебя! Позанимаемся? 🦊',
  'Эй! {name} приготовил новые задачки 🎯',
  'Пара минут — и {name} будет прыгать от радости!',
  '{name} скучает. Заглянешь? 🔥',
  'Считать вместе веселее! {name} ждёт.',
  'Задачки сами себя не решат 😉 {name} готов!',
  '{name} разложил примеры и ждёт тебя!',
  'Время математики! {name} уже на месте 🎈',
  'Заглянешь на пару задачек? {name} будет рад',
  'У {name} есть кое-что интересное для тебя!',
]

/** Streak is alive but the day is running out. */
export const STREAK_RISK = [
  'Твоя серия {streak} дней! Не потеряй её 🔥',
  '{streak} дней подряд — осталось совсем чуть-чуть!',
  'Ещё немного, и серия {streak} продолжится! 🔥',
  'Не бросай сейчас — уже {streak} дней подряд!',
  '{name} держит за тебя кулачки: серия {streak} дней 🔥',
]

/** Away for a couple of days. */
export const MISSED = [
  '{name} давно тебя не видел. Всё хорошо? 🦊',
  'Возвращайся! {name} приготовил новые задачки',
  '{name} заскучал без тебя 🥺',
  'Тут без тебя тихо. Заглянешь? {name} ждёт',
]

/** Away a long time — softer still, no reproach. */
export const LONG_GONE = [
  'Начнём заново? {name} всегда рад тебе 🦊',
  '{name} тебя помнит! Порешаем пару задачек?',
  'Соскучился? Твои наклейки на месте 🎖️',
]

const pick = (a) => a[(Math.random() * a.length) | 0]

/** Fills {name} and {streak}. */
export function render(list, { name = 'Лео', streak = 0 } = {}) {
  return pick(list).replace(/\{name\}/g, name).replace(/\{streak\}/g, streak)
}

/** Which set fits, given how long they've been away and the streak. */
export function chooseMessage({ daysAway = 0, streak = 0, hour = 12, name = 'Лео' } = {}) {
  if (daysAway >= 4) return { title: 'Скучаем! 🦊', body: render(LONG_GONE, { name, streak }) }
  if (daysAway >= 2) return { title: `${name} ждёт`, body: render(MISSED, { name, streak }) }
  // Evening and a streak worth saving: say so plainly.
  if (streak >= 2 && hour >= 17) return { title: 'Серия под угрозой! 🔥', body: render(STREAK_RISK, { name, streak }) }
  return { title: 'Пора считать! 🎯', body: render(DAILY, { name, streak }) }
}
