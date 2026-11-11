// Проверяем календарную часть до Date.parse: он нормализует, например, 30 февраля.
export function parseWorkoutDate(value:unknown):number {
 if(typeof value!=='string')return NaN
 const match=/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value)
 if(!match)return NaN
 const calendar=new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`)
 if(!Number.isFinite(calendar.getTime())||calendar.toISOString().slice(0,10)!==value.slice(0,10))return NaN
 return Date.parse(value)
}
