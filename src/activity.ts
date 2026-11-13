import {isWorkSet, localDay, type Workout} from './model'

// Вымышленные пороги очков за 28 местных календарных дней, включая сегодня.
export const ACTIVITY_THRESHOLDS = [1, 8, 20, 35, 50] as const
export function calculateActivity(workouts: Workout[], now: Date = new Date()) {
  const today = localDay(now)
  const ordinal = (day: string) => Date.UTC(Number(day.slice(0,4)), Number(day.slice(5,7))-1, Number(day.slice(8,10))) / 86400000
  const byId = new Map<string, {days: Set<string>, counts: Map<string, number>}>()
  if (today && Array.isArray(workouts)) for (const w of workouts) {
    if (typeof w?.id !== 'string' || !w.id.trim() || typeof w.date !== 'string') continue
    const m = /^(\d{4}-\d{2}-\d{2})(?:T.*)?$/.exec(w.date)
    if (!m) continue
    const date = new Date(m[1]+'T00:00:00Z')
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==m[1]) continue
    const day = localDay(w.date)
    if (!day || day > today || !Array.isArray(w.exercises)) continue
    let count = 0
    for (const e of w.exercises) if (typeof e?.name === 'string' && e.name.trim() && Array.isArray(e.sets))
      count += e.sets.filter(s => s && isWorkSet(s)).length
    if (!count) continue
    const item = byId.get(w.id) ?? {days: new Set<string>(), counts: new Map<string,number>()}
    item.days.add(day)
    item.counts.set(day, Math.max(item.counts.get(day) ?? 0, count))
    byId.set(w.id,item)
  }
  const daily = new Map<string,number>()
  for (const item of byId.values()) if (item.days.size === 1) for (const [day,count] of item.counts) {
    const age = ordinal(today)-ordinal(day)
    if (age >= 0 && age < 28) daily.set(day, (daily.get(day) ?? 0) + count)
  }
  let points = 0
  for (const count of daily.values()) points += 1 + Math.min(count, 4)
  return {days: daily.size, points, level: ACTIVITY_THRESHOLDS.filter(t => points >= t).length}
}
