import type {ExerciseLine} from './model'
import {isWorkSet} from './model'
import {catalogKey} from './catalog'
import {muscleShares, type Muscle} from './MuscleMap'

export type MuscleContribution = {
 key:string
 name:string
 workSets:number
 share:number
 load:number
}

/** Same input rows and work-set/share rules as the map. No dates or storage are changed. */
export function muscleContributions(exercises:ExerciseLine[], muscle:Muscle):MuscleContribution[] {
 const result=new Map<string,MuscleContribution>()
 for(const exercise of exercises){
  const workSets=(exercise.sets||[]).filter(isWorkSet).length
  if(!workSets)continue
  const share=muscleShares(exercise.name).find(group=>group.muscle===muscle)?.share
  if(!share)continue
  // Match the catalog/history identity, not display aliases or exercise IDs.
  const key=catalogKey(exercise.name)
  const entry=result.get(key)
  if(entry){entry.workSets+=workSets;entry.load+=workSets*share}
  else result.set(key,{key,name:exercise.name.trim().replace(/\s+/g,' '),workSets,share,load:workSets*share})
 }
 return [...result.values()].sort((a,b)=>b.load-a.load||a.name.localeCompare(b.name,'ru'))
}
