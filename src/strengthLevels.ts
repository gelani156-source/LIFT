import {estimate1RM, isWorkSet, localDay, norm, weightUnitOf, type Measurement, type Workout} from './model'
import {parseWorkoutDate} from './parseWorkoutDate'
import type {StrengthSettings} from './strengthSettings'

// Игровые границы отношения расчётного 1ПМ к массе тела, не нормативы.
export const STRENGTH_LIFTS = [
  {name:'Жим штанги лёжа', thresholds:[0.2,0.4,0.55,0.7,0.85,1,1.15,1.3,1.5]},
  {name:'Присед со штангой', thresholds:[0.3,0.6,0.8,1,1.2,1.4,1.6,1.8,2]},
  {name:'Становая тяга', thresholds:[0.35,0.7,0.95,1.2,1.4,1.6,1.8,2,2.2]},
  {name:'Тяга штанги в наклоне', thresholds:[0.2,0.35,0.45,0.55,0.65,0.75,0.85,1,1.15]},
  {name:'Сгибание рук со штангой', thresholds:[0.08,0.12,0.16,0.2,0.24,0.28,0.32,0.36,0.4]},
  {name:'Жим стоя', thresholds:[0.12,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9]}
] as const
const MAX_AGE = 90 * 86400000
// Защитные границы в кг, а не медицинские нормативы; выбросы исключаются.
const MAX_BODY_KG = 500, MIN_BODY_KG = 1, MAX_LOAD_KG = 1000
export function strengthLevels(workouts: Workout[], measurements: Measurement[], now = new Date(), settings?: StrengthSettings) {
  const today = localDay(now)
  const todayMs = parseWorkoutDate(today)
  const recent = (date: unknown) => {
    const parsed = parseWorkoutDate(date)
    if (!Number.isFinite(parsed) || typeof date !== 'string') return false
    const day = date.includes('T') ? localDay(date) : date
    const dayMs = parseWorkoutDate(day)
    return Number.isFinite(todayMs) && Number.isFinite(dayMs) && dayMs <= todayMs && todayMs - dayMs <= MAX_AGE
  }
  const dayOf = (date: string) => date.includes('T') ? localDay(date) : date
  const body = measurements.filter(m => recent(m?.date) && Number.isFinite(m.weight) && m.weight! >= MIN_BODY_KG && m.weight! <= MAX_BODY_KG)
    .slice().sort((a,b) => dayOf(b.date).localeCompare(dayOf(a.date)))[0] ?? null
  const lifts = STRENGTH_LIFTS.map((lift, index) => {
    const candidates: {day:string, weight:number, reps:number, estimate:number, source:'manual'|'workout'}[] = []
    // Явная прежняя привязка имеет приоритет перед новым стандартным названием.
    const claimed = settings?.aliases.some((list, i) => i !== index && list.some(name => norm(name) === norm(lift.name)))
    const names = [...(claimed ? [] : [lift.name]), ...(settings?.aliases[index] ?? [])].map(norm)
    const manual = settings?.manual[index]
    if (manual && recent(manual.date)) candidates.push({day:manual.date, weight:manual.weight, reps:manual.reps, estimate:estimate1RM(manual.weight, manual.reps), source:'manual'})
    for (const w of workouts) {
      if (!recent(w?.date) || !Array.isArray(w.exercises)) continue
      const day = dayOf(w.date)
      for (const e of w.exercises) {
        // Известные старые блоки и неизвестные явные единицы не являются кг.
        if (typeof e?.name !== 'string' || !names.includes(norm(e.name)) || ('weightUnit' in e && e.weightUnit !== 'kg') || weightUnitOf(e) !== 'kg' || !Array.isArray(e.sets)) continue
        for (const s of e.sets) {
          if (!s || !isWorkSet(s) || s.weight <= 0 || s.weight > MAX_LOAD_KG || !Number.isInteger(s.reps) || s.reps > 12 || s.note?.includes('Вес не указан')) continue
          const estimate = estimate1RM(s.weight,s.reps)
          if (!Number.isFinite(estimate)) continue
          candidates.push({day,weight:s.weight,reps:s.reps,estimate,source:'workout'})
        }
      }
    }
    candidates.sort((a,b) => b.day.localeCompare(a.day) || b.estimate-a.estimate)
    const set = candidates[0] ?? null
    const ratio = set && body ? set.estimate / body.weight! : null
    return {name:lift.name, set, ratio, level:ratio === null ? null : 1 + lift.thresholds.filter(t => ratio >= t).length}
  })
  const available = lifts.filter(l => l.level !== null)
  const overall = available.length >= 3 ? Math.floor(available.reduce((sum,l) => sum + l.level!,0) / available.length) : null
  return {body, lifts, overall, coverage: available.length}
}
