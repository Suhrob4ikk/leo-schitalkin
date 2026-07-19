import Cub from './Cub.jsx'
import { UNITS, UNIT_BY_ID } from '../game/curriculum.js'

/** The unit that owns a lesson id, including `exam-uN` and `review-uN`. */
export function unitOfLesson(lessonId) {
  if (!lessonId) return null
  if (lessonId.startsWith('exam-')) return UNIT_BY_ID[lessonId.slice(5)] ?? null
  if (lessonId.startsWith('review-')) return UNIT_BY_ID[lessonId.slice(7)] ?? null
  return UNITS.find((u) => u.lessons.some((l) => l.id === lessonId)) ?? null
}

/*  Whoever teaches this particular lesson.
 *
 *  Two characters with two clear jobs, rather than one doing both:
 *    Teacher — the unit's host. Inside a lesson you only see them, because
 *              you're in their part of the map learning their topic.
 *    Buddy   — the friend the child picked. Walks the path on the home screen
 *              and celebrates with them. Picking a friend promised company,
 *              and that promise is kept outside the lesson.
 */
export default function Teacher({ lessonId, ...rest }) {
  const unit = unitOfLesson(lessonId)
  return <Cub species={unit?.host ?? 'fox'} {...rest} />
}
