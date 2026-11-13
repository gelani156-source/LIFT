import {useMemo, useState} from 'react'
import {MuscleMap as RichMuscleMap} from 'js-rich-body-highlighter/react'
import type {Muscle} from './MuscleMap'
import {labels} from './MuscleMap'
import type {ExerciseLine} from './model'
import {muscleContributions} from './muscleContributions'
import MuscleLoadDetails from './MuscleLoadDetails'
import './anatomyBright.css'

// OSFIT 5.9 anatomy, adapted to the current OSFIT / LIFT muscle taxonomy.
// Three anatomical deltoid areas share a single shoulders statistic.
const regions:Record<string,Muscle[]> = {
 chest:['chest'], shoulders:['shoulders'], biceps:['biceps'], triceps:['triceps'],
 forearms:['forearms'], abs:['abs'], obliques:['abs'], upper_back:['traps','shoulders'],
 lats:['back'], lower_back:['back'], glutes:['glutes'], quads:['quads'],
 hamstrings:['hamstrings'], calves:['calves']
}
const regionFor: Record<Muscle,string[]> = {
 chest:['chest'], shoulders:['shoulders','upper_back'], biceps:['biceps'],
 forearms:['forearms'], triceps:['triceps'], abs:['abs','obliques'],
 back:['lats','lower_back'], traps:['upper_back'], glutes:['glutes'],
 quads:['quads'], hamstrings:['hamstrings'], calves:['calves']
}
const keys=Object.keys(labels) as Muscle[]
const fmt=(n:number)=>Number(n||0).toLocaleString('ru-RU',{maximumFractionDigits:2})
export default function AnatomyMuscleMap({loads,sex='male',viewOnly=false,exercises,scope='За выбранный период'}:{loads:Record<Muscle,number>,sex?:'male'|'female',viewOnly?:boolean,exercises?:ExerciseLine[],scope?:string}) {
 const [side,setSide]=useState<'front'|'back'>('front')
 const [selected,setSelected]=useState<Muscle|null>(null)
 const contributions=useMemo(()=>selected&&exercises?muscleContributions(exercises,selected):[],[exercises,selected])
 const max=Math.max(1,...Object.values(loads).filter(Number.isFinite))
 const highlights=useMemo(()=>Object.entries(regions).map(([group,ids])=>{
  const amount=ids.reduce((sum,id)=>sum+(Number(loads[id])||0),0)
  const active=selected!==null && regionFor[selected].includes(group)
  return {group,intensity:active?100:!viewOnly&&amount>0?Math.max(40,Math.min(90,Math.round(amount/max*90))):0,color:active?'#5ad6ff':'#0a84ff'}
 }).filter(entry=>entry.intensity>0),[loads,max,selected,viewOnly])
 const choose=(group:string)=>{
  const ids=regions[group]
  if(!ids?.length)return
  const id=ids.find(k=>Number(loads[k])>0)||ids[0]
  setSelected(prev=>prev===id?null:id)
 }
 return <div className="osfit-anatomy osfit-rich-anatomy lift-anatomy-restored">
  <div className="osfit-view-buttons muscle-toolbar" role="group" aria-label="Ракурс атлета">
   <button type="button" aria-pressed={side==='front'} className={side==='front'?'active':''} onClick={()=>setSide('front')}>Спереди</button>
   <button type="button" aria-pressed={side==='back'} className={side==='back'?'active':''} onClick={()=>setSide('back')}>Сзади</button>
   <span className="muted small">{sex==='female'?'Женская модель':'Мужская модель'}</span>
  </div>
  <p className="osfit-anatomy-hint">Нажми на мышцу для подробностей</p>
  <div className="osfit-anatomy-viewport osfit-rich-viewport">
   <RichMuscleMap gender={sex} view={side} theme="dark" width="100%" highlights={highlights}
    blendMode="normal" hoverHighlight hoverIntensity={92} hoverColor="#5ad6ff"
    onMuscleClick={(muscle:{group:string})=>choose(muscle.group)}/>
  </div>
  <div className="muscle-caption" aria-live="polite">
   {selected?`${labels[selected]}${viewOnly?'':` · ${fmt(Number(loads[selected]))} усл. подходов`}`:'Выбери мышцу на фигуре или в списке'}
  </div>
  <div className="muscle-legend">
   {keys.map(id=><button key={id} type="button" aria-haspopup={exercises?'dialog':undefined} aria-pressed={selected===id} className={selected===id?'active':''}
     onClick={()=>{setSelected(prev=>prev===id?null:id);if(['back','traps','glutes','hamstrings'].includes(id))setSide('back');else setSide('front')}}>
     <span>{labels[id]}</span>{!viewOnly&&<b>{fmt(Number(loads[id]))}</b>}
    </button>)}
  </div>
  {exercises&&selected&&<MuscleLoadDetails muscle={selected} items={contributions} scope={scope} onClose={()=>setSelected(null)}/>}
  <p className="muted small">Модель: js-rich-body-highlighter (MIT). Подсветка — условная нагрузка, не измерение активности мышц.</p>
 </div>
}
