import {isWorkSet, localDay, type Workout} from './model'

export const ACHIEVEMENT_THRESHOLDS = [1, 5, 15, 30, 60] as const

/** Расчёт только по снимку истории; время передаётся вызывающей стороной для тестируемости. */
export function calculateAchievements(workouts: Workout[], now: Date = new Date()) {
  const today = localDay(now)
  if (!today) return {days: 0, level: 0, badges: ACHIEVEMENT_THRESHOLDS.map(target => ({target, earned: false}))}
  const candidates: {id: string, day: string}[] = []
  for (const workout of workouts) {
    if (typeof workout?.id !== 'string' || !workout.id.trim() || typeof workout.date !== 'string') continue
    // Требуем ISO-дату и проверяем календарную часть до разбора Date (Date нормализует 30 февраля).
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(workout.date)
    if (!match) continue
    const [, y, m, d] = match
    const calendar = new Date(`${y}-${m}-${d}T00:00:00Z`)
    if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== `${y}-${m}-${d}`) continue
    const day = localDay(workout.date)
    if (!day || day > today || !Array.isArray(workout.exercises)) continue
    const valid = workout.exercises.some(e => typeof e?.name === 'string' && e.name.trim() && Array.isArray(e.sets) && e.sets.some(s => s && isWorkSet(s)))
    if (valid) candidates.push({id: workout.id, day})
  }
  // Конфликтующие ID не позволяют надёжно определить день — исключаем обе версии.
  const datesById = new Map<string, Set<string>>()
  for (const {id, day} of candidates) {
    if (!datesById.has(id)) datesById.set(id, new Set())
    datesById.get(id)!.add(day)
  }
  const days = new Set(candidates.filter(x => datesById.get(x.id)!.size === 1).map(x => x.day)).size
  const badges = ACHIEVEMENT_THRESHOLDS.map(target => ({target, earned: days >= target}))
  return {days, level: badges.filter(b => b.earned).length, badges}
}
