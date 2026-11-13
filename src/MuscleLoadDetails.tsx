import {useEffect, useId, useRef} from 'react'
import {catalogLabel} from './catalog'
import {labels, type Muscle} from './MuscleMap'
import type {MuscleContribution} from './muscleContributions'

const fmt=(n:number)=>n.toLocaleString('ru-RU',{maximumFractionDigits:2})
export default function MuscleLoadDetails({muscle,items,scope,onClose}:{
 muscle:Muscle
 items:MuscleContribution[]
 scope:string
 onClose:()=>void
}) {
 const dialogRef=useRef<HTMLDialogElement>(null)
 const titleId=useId(), scopeId=useId()
 useEffect(()=>{
  const dialog=dialogRef.current
  if(!dialog)return
  dialog.showModal()
  return ()=>dialog.close()
 },[])
 const total=items.reduce((sum,item)=>sum+item.load,0)
 return <dialog ref={dialogRef} className="lift-muscle-details" aria-labelledby={titleId} aria-describedby={scopeId}
  onCancel={event=>{event.preventDefault();onClose()}}>
  <div className="lift-muscle-details-header">
   <div><p className="lift-muscle-details-eyebrow">Какие упражнения дали нагрузку</p><h2 id={titleId}>{labels[muscle]}</h2></div>
   <button type="button" className="lift-muscle-details-close" aria-label="Закрыть упражнения для мышцы" onClick={onClose} autoFocus>×</button>
  </div>
  <div className="lift-muscle-details-body">
   <p id={scopeId}>{scope}</p>
   {items.length?<>
    <p><strong>Всего: {fmt(total)} усл. подходов</strong></p>
    <ul className="lift-muscle-contributions">
     {items.map(item=><li key={item.key}>
      <strong>{catalogLabel(item.name)}</strong>
      <p>{item.share===1?'Основная мышца':'Вспомогательная мышца'}</p>
      <p>Рабочих подходов: {fmt(item.workSets)} · вклад: {fmt(item.load)} усл.</p>
     </li>)}
    </ul>
   </>:<p className="lift-muscle-details-empty">Нет распознанных упражнений с выполненными рабочими подходами для этой группы.</p>}
   <p className="lift-muscle-details-note">Только выполненные рабочие и дроп-подходы, без разминки. Вклад = число подходов × доля мышцы: основная — 1, вспомогательная — 0,25–0,75. Доли определяются приблизительно по названию упражнения; неизвестные названия могут не учитываться. Это условная нагрузка, не измерение активности или роста мышц.</p>
  </div>
 </dialog>
}
