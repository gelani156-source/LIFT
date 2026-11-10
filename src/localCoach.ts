import type {Workout} from './model'
import {isWorkSet, volumeOf} from './model'

const DAY = 86400000
export type CoachWindow = {sessions:number, sets:number, volume:number}
export type LocalCoach = {current:CoachWindow, previous:CoachWindow, excluded:number, message:string, comparison:string}

/** Два завершённых интервала по 168 часов: [now-14d, now-7d) и [now-7d, now]. */
export function localCoach(workouts:Workout[], now=Date.now()):LocalCoach {
 const current:CoachWindow={sessions:0,sets:0,volume:0}
 const previous:CoachWindow={sessions:0,sets:0,volume:0}
 const ids=new Map<string,number>()
 for(const w of workouts) ids.set(w.id,(ids.get(w.id)||0)+1)
 let excluded=0
 for(const w of workouts){
  const time=Date.parse(w.date)
  if(!Number.isFinite(time)||time>now||!w.id||ids.get(w.id)!==1){excluded++;continue}
  if(time<now-14*DAY) continue
  const sets=w.exercises.reduce((n,e)=>n+e.sets.filter(isWorkSet).length,0)
  const volume=volumeOf(w.exercises)
  if(!Number.isFinite(volume)){excluded++;continue}
  if(!sets) continue
  const target=time>=now-7*DAY?current:previous
  target.sessions++;target.sets+=sets;target.volume+=volume
 }
 let message='Недостаточно данных: для сравнения нужны минимум по две тренировки с рабочими подходами в каждом из двух интервалов.'
 let comparison='Сравнение пока недоступно.'
 if(current.sessions>=2&&previous.sessions>=2){
  const delta=current.sets-previous.sets
  comparison=`Рабочих подходов: ${previous.sets} → ${current.sets} (${delta>0?'+':''}${delta}).`
  if(delta>0) message='Число рабочих подходов выросло. Не спеши дополнительно повышать нагрузку: оцени самочувствие и восстановление.'
  else if(delta<0) message='Число рабочих подходов снизилось. Это наблюдение, а не оценка прогресса; проверь контекст тренировок и восстановления.'
  else message='Число рабочих подходов не изменилось. Сохраняй комфортную технику и оцени самочувствие.'
 }
 return {current,previous,excluded,message,comparison}
}
