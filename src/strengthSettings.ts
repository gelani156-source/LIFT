import {norm} from './model'
import {parseWorkoutDate} from './parseWorkoutDate'
import {STRENGTH_LIFTS} from './strengthLevels'

export const STRENGTH_STORAGE_KEY = 'lift-character-strength-v1'
export type StrengthSettings = {version:1, aliases:string[][], manual:({date:string, weight:number, reps:number}|null)[]}
export type StrengthSnapshot = {data:StrengthSettings, raw:string|null, error:string|null}
export const emptyStrengthSettings = ():StrengthSettings => ({version:1, aliases:STRENGTH_LIFTS.map(()=>[]), manual:STRENGTH_LIFTS.map(()=>null)})
type StorageLike = Pick<Storage, 'getItem'|'setItem'>
const validKeys = (x:object, keys:string[]) => Object.keys(x).sort().join('|') === keys.sort().join('|')
export function validStrengthSettings(v:unknown):v is StrengthSettings {
  if (!v || typeof v !== 'object' || !validKeys(v, ['version','aliases','manual'])) return false
  const x = v as StrengthSettings
  if (x.version !== 1 || !Array.isArray(x.aliases) || x.aliases.length !== 3 || !Array.isArray(x.manual) || x.manual.length !== 3) return false
  const seen = new Set(STRENGTH_LIFTS.map(l=>norm(l.name)))
  for (const list of x.aliases) {
    if (!Array.isArray(list) || list.length > 100) return false
    for (const name of list) {
      if (typeof name !== 'string' || !name.trim() || name.length > 200 || seen.has(norm(name))) return false
      seen.add(norm(name))
    }
  }
  return x.manual.every(m => m === null || (typeof m === 'object' && validKeys(m,['date','weight','reps']) && typeof m.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(m.date) && Number.isFinite(parseWorkoutDate(m.date)) && Number.isFinite(m.weight) && m.weight > 0 && m.weight <= 1000 && Number.isInteger(m.reps) && m.reps >= 1 && m.reps <= 12))
}
export function readStrengthSettings(storage:StorageLike):StrengthSnapshot {
  try {
    const raw=storage.getItem(STRENGTH_STORAGE_KEY)
    if (raw === null) return {data:emptyStrengthSettings(),raw,error:null}
    const parsed:unknown=JSON.parse(raw)
    if (!validStrengthSettings(parsed)) return {data:emptyStrengthSettings(),raw,error:'Неизвестная версия или повреждённые данные силы. Запись заблокирована; исходные данные не изменены.'}
    return {data:parsed,raw,error:null}
  } catch {return {data:emptyStrengthSettings(),raw:null,error:'Не удалось прочитать данные силы. Запись заблокирована; исходные данные не изменены.'}}
}
export function saveStrengthSettings(storage:StorageLike, snapshot:StrengthSnapshot, data:StrengthSettings):StrengthSnapshot {
  if (snapshot.error) return snapshot
  if (!validStrengthSettings(data)) return {...snapshot,error:'Некорректные данные: названия не должны повторяться или совпадать со стандартными; вес — 0–1000 кг, повторы — 1–12, дата должна быть корректной.'}
  try {
    if (storage.getItem(STRENGTH_STORAGE_KEY) !== snapshot.raw) return {...snapshot,error:'Данные силы изменились в другом окне. Запись остановлена; откройте экран заново.'}
    const raw=JSON.stringify(data)
    storage.setItem(STRENGTH_STORAGE_KEY,raw)
    return {data,raw,error:null}
  } catch {return {...snapshot,error:'Не удалось сохранить данные силы. Исходные данные не изменены; проверьте доступность и место в хранилище.'}}
}
export function browserStrengthStorage():StorageLike | null {try {return typeof window === 'undefined' ? null : window.localStorage} catch {return null}}
