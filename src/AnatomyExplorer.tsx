import {useMemo, useState} from 'react'
import type {Workout} from './model'
import AnatomyMuscleMap from './AnatomyMuscleMap'
import {anatomyPeriods} from './anatomyPeriods'
import {labels} from './MuscleMap'
import type {Muscle} from './MuscleMap'

type Mode='view'|'load'|'compare'
const fmt=(n:number)=>n.toLocaleString('ru-RU',{maximumFractionDigits:2})
export default function AnatomyExplorer({workouts,days,sex}:{workouts:Workout[],days:number,sex:'male'|'female'}) {
 const [mode,setMode]=useState<Mode>('load')
 const data=useMemo(()=>anatomyPeriods(workouts,days),[workouts,days])
 const keys=Object.keys(labels) as Muscle[]
 return <div>
  <div className="osfit-view-buttons muscle-toolbar" role="group" aria-label="Режим анатомии">
   {([['view','Анатомия'],['load','Нагрузка'],['compare','Сравнение']] as [Mode,string][]).map(([id,text])=><button type="button" key={id} className={mode===id?'active':''} aria-pressed={mode===id} onClick={()=>setMode(id)}>{text}</button>)}
  </div>
  <p className="muted small">Последние {days} суток: {data.current.length} тренировок{mode==='compare'?`; предыдущие ${days} суток: ${data.previous.length} тренировок`:''}. Интервалы скользящие, без будущих дат.</p>
  {mode==='compare'&&<p className="muted small">Предыдущий → текущий период · условные подходы. Ноль означает отсутствие учтённой нагрузки, не обязательно отсутствие тренировки.</p>}
  <AnatomyMuscleMap loads={data.currentLoad} sex={sex} viewOnly={mode==='view'}/>
  {mode==='compare'&&<div className="lift-anatomy-comparison"><h2>Сравнение по группам</h2>{keys.map(id=>{const a=data.previousLoad[id], b=data.currentLoad[id], delta=b-a;return <p key={id}>{labels[id]}: {fmt(a)} → {fmt(b)} ({delta>0?'+':''}{fmt(delta)})</p>})}</div>}
  <p className="muted small">Учтены выполненные рабочие подходы с корректным весом и повторами, включая вес 0; разминка исключена. Доли мышц по названию упражнения приблизительны; неизвестные упражнения могут не учитываться. Это не измерение активности мышц.</p>
 </div>
}
