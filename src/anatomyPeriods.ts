import type {Workout} from './model'
import {muscleLoad} from './MuscleMap'
import {parseWorkoutDate} from './parseWorkoutDate'

// Two adjacent, equal rolling windows; future and malformed dates are excluded.
export function musclePeriodWorkouts(workouts:Workout[], days:number|'all', now:number=Date.now()) {
 const cutoff=days==='all'?-Infinity:now-days*86400000
 return workouts.filter(w=>{const t=parseWorkoutDate(w.date);return Number.isFinite(t)&&t<=now&&t>cutoff})
}

export function anatomyPeriods(workouts:Workout[], days:number, now:number=Date.now()) {
 const span=days*86400000
 const current=musclePeriodWorkouts(workouts,days,now), previous:Workout[]=[]
 for(const w of workouts){
  const t=parseWorkoutDate(w.date)
  if(Number.isFinite(t)&&t<=now-span&&t>now-2*span) previous.push(w)
 }
 return {current,previous,currentLoad:muscleLoad(current),previousLoad:muscleLoad(previous)}
}
