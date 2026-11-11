import type {Workout} from './model'
import {muscleLoad} from './MuscleMap'

// Two adjacent, equal rolling windows; future and malformed dates are excluded.
export function anatomyPeriods(workouts:Workout[], days:number, now:number=Date.now()) {
 const span=days*86400000
 const current:Workout[]=[], previous:Workout[]=[]
 for(const w of workouts){
  const t=Date.parse(w.date)
  if(!Number.isFinite(t)||t>now) continue
  if(t>now-span) current.push(w)
  else if(t>now-2*span) previous.push(w)
 }
 return {current,previous,currentLoad:muscleLoad(current),previousLoad:muscleLoad(previous)}
}
