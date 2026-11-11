import {catalogKey} from './catalog'
import {parseWorkoutDate} from './parseWorkoutDate'
import {estimate1RM, isWorkSet, localDay, weightInKg, type Workout, type ExerciseLine, type SetLine} from './model'

export type ExerciseSession={id:string,date:string,sets:{line:ExerciseLine,set:SetLine}[],best:number}
export function exerciseHistory(workouts:Workout[],name:string):ExerciseSession[]{
 const result:ExerciseSession[]=[]
 for(const w of workouts){
  if(!Number.isFinite(parseWorkoutDate(w.date)))continue
  const sets=w.exercises.filter(e=>catalogKey(e.name)===catalogKey(name)).flatMap(line=>line.sets.filter(isWorkSet).map(set=>({line,set})))
  if(!sets.length)continue
  result.push({id:w.id,date:w.date,sets,best:Math.max(0,...sets.map(({line,set})=>estimate1RM(weightInKg(line,set.weight),set.reps)))})
 }
 return result.sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))
}
export function exerciseRecords(sessions:ExerciseSession[]){
 const sets=sessions.flatMap(s=>s.sets)
 const weighted=sets.filter(({line,set})=>weightInKg(line,set.weight)>0)
 const maxWeight=weighted.reduce<typeof weighted[number]|null>((best,item)=>!best||weightInKg(item.line,item.set.weight)>weightInKg(best.line,best.set.weight)?item:best,null)
 const maxEstimate=weighted.reduce((best,{line,set})=>Math.max(best,estimate1RM(weightInKg(line,set.weight),set.reps)),0)
 return {maxWeight,maxEstimate}
}
export function exerciseTrend(sessions:ExerciseSession[]){
 const days=new Map<string,number>()
 for(const s of sessions){const day=localDay(s.date);if(day&&s.best>0)days.set(day,Math.max(days.get(day)||0,s.best))}
 return [...days].sort(([a],[b])=>a.localeCompare(b)).map(([date,value])=>({date,value}))
}
