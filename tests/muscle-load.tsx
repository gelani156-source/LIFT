// Synthetic component fixture. No App, IndexedDB, localStorage or production records.
import {StrictMode,useState} from 'react'
import {createRoot} from 'react-dom/client'
import AnatomyExplorer from '../src/AnatomyExplorer'
import AnatomyMuscleMap from '../src/AnatomyMuscleMap'
import Dynamics from '../src/Dynamics'
import {exerciseMuscleLoad} from '../src/MuscleMap'
import type {ExerciseLine,Workout} from '../src/model'
import '../src/style.css'
import '../src/theme.css'

const sets=(count:number)=>Array.from({length:count},(_,i)=>({id:`s${i}`,weight:20,reps:8,done:true}))
const line=(name:string,count:number):ExerciseLine=>({id:name,name,sets:sets(count)})
const now=Date.now(),day=86400000
const workout=(id:string,days:number,exercises:ExerciseLine[]):Workout=>({id,date:new Date(now-days*day).toISOString(),name:id,programId:null,volume:0,exercises})
const workouts=[
 workout('recent',1,[line('Сгибание рук со штангой',8),line('Подтягивания',6),line('Жим штанги лёжа',4)]),
 workout('repeat',2,[line('СГИБАНИЕ РУК СО ШТАНГОЙ',2)]),
 workout('older',20,[line('Сгибание рук с гантелями',3),line('Жим штанги лёжа — очень длинное название варианта упражнения для проверки переноса текста на узком экране',1)]),
 workout('future',-1,[line('Сгибание рук на скамье',20)]),
 { ...workout('invalid',1,[line('Сгибание рук с резинкой',20)]),date:'2026-02-30' }
]
const current=[line('Сгибание рук со штангой',1),{...line('Подтягивания',1),sets:[...sets(1),{...sets(1)[0],id:'warmup',kind:'warmup' as const},{...sets(1)[0],id:'pending',done:false}]}]
function Fixture(){
 const [section,setSection]=useState('period'),[days,setDays]=useState(7),[sex,setSex]=useState<'male'|'female'>('male')
 return <main style={{maxWidth:680,margin:'auto',padding:12}}>
  <h1 style={{fontSize:20}}>Тестовые данные LIFT</h1>
  <label>Раздел <select aria-label="Раздел фикстуры" value={section} onChange={e=>setSection(e.target.value)}><option value="period">Атлет и мышцы</option><option value="current">Текущая тренировка</option><option value="analytics">Динамика</option></select></label>
  <label> Модель <select aria-label="Модель фикстуры" value={sex} onChange={e=>setSex(e.target.value as 'male'|'female')}><option value="male">Мужская</option><option value="female">Женская</option></select></label>
  {section==='period'&&<><div aria-label="Период фикстуры">{[7,30,90,365].map(n=><button type="button" key={n} data-days={n} style={{minHeight:44,minWidth:60}} onClick={()=>setDays(n)}>{n} дн.</button>)}</div><AnatomyExplorer workouts={workouts} days={days} sex={sex}/></>}
  {section==='current'&&<AnatomyMuscleMap sex={sex} loads={exerciseMuscleLoad(current)} exercises={current} scope="Текущая тренировка"/>}
  {section==='analytics'&&<Dynamics workouts={workouts} measurements={[]} sex={sex} goals={[]}/>}
 </main>
}
createRoot(document.getElementById('root')!).render(<StrictMode><Fixture/></StrictMode>)
