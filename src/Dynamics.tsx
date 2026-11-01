import {useMemo,useState} from 'react'
import type {Workout,Measurement,SetLine} from './model'
import {classify,labels,muscleLoad} from './MuscleMap'
import type {Muscle} from './MuscleMap'
import MuscleMap from './MuscleMap'

type Group='general'|'strength'|'body'|'muscles'
type Period='30'|'90'|'365'|'all'
type Metric='max'|'e1rm'|'volume'|'bestSet'|'reps'
type BodyKey='weight'|'waist'|'chest'|'arm'|'thigh'|'hips'|'neck'
const bodyLabels:Record<BodyKey,string>={weight:'Вес',waist:'Талия',chest:'Грудь',arm:'Рука',thigh:'Бедро',hips:'Таз',neck:'Шея'}
const fmt=(v:number)=>v.toLocaleString('ru-RU',{maximumFractionDigits:1})
const dateLabel=(v:string)=>{const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleDateString('ru-RU',{day:'2-digit',month:'short'}):v}
const weekKey=(date:string)=>{const d=new Date(date);d.setHours(0,0,0,0);const day=d.getDay()||7;d.setDate(d.getDate()-day+1);return d.toISOString().slice(0,10)}
const visible=(date:string,p:Period)=>{const t=new Date(date).getTime();return Number.isFinite(t)&&t<=Date.now()+86400000&&(p==='all'||t>=Date.now()-Number(p)*86400000)}
const done=(s:SetLine)=>s.done&&s.kind!=='warmup'&&s.weight>=0&&s.reps>0
const tonnage=(w:Workout)=>w.exercises.reduce((total,e)=>total+e.sets.reduce((n,s)=>n+(done(s)&&s.weight>0?s.weight*s.reps:0),0),0)
const oneRM=(s:SetLine)=>s.reps===1?s.weight:s.reps<=12?s.weight*(1+s.reps/30):0
const ordered=<T extends {date:string}>(arr:T[])=>[...arr].sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime())
type Point={date:string,value:number,label?:string}
function TrendChart({points,unit='кг',bars=false}: {points:Point[],unit?:string,bars?:boolean}){
 const [selected,setSelected]=useState<number|null>(null)
 const last=selected!==null&&selected<points.length?points[selected]:points[points.length-1]
 const w=340,h=180, left=37,right=11,top=14,bottom=27
 if(!points.length)return <div className="lift-no-data">Данных за выбранный период пока нет. Сохрани тренировку или замер — здесь появится динамика.</div>
 const values=points.map(p=>p.value),lo=bars?0:Math.max(0,Math.min(...values)-(Math.max(...values)-Math.min(...values)||1)*.18),hi=Math.max(lo+1,Math.max(...values)*1.08),ww=w-left-right,hh=h-top-bottom
 const x=(i:number)=>left+(points.length===1?ww/2:(i/(points.length-1))*ww)
 const y=(v:number)=>top+hh-(v-lo)/(hi-lo)*hh
 return <div className="lift-chart"><div className="lift-chart-value"><b>{fmt(last.value)} {unit}</b><span>{dateLabel(last.date)}</span></div><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`График. Точек: ${points.length}`}>
  {[0,1,2,3].map(i=>{const v=lo+(hi-lo)*i/3;return <g key={i}><line x1={left} x2={w-right} y1={y(v)} y2={y(v)} stroke="currentColor" opacity=".12"/><text x={left-5} y={y(v)+4} textAnchor="end" fill="currentColor" opacity=".65" fontSize="9">{fmt(v)}</text></g>})}
  {bars?points.map((p,i)=><rect key={i} x={x(i)-Math.max(2,Math.min(12,ww/(points.length*2)))} y={y(p.value)} width={Math.max(4,Math.min(24,ww/points.length*.7))} height={Math.max(1,top+hh-y(p.value))} rx="3" fill={selected===i?'#60a5fa':'#0a84ff'} onClick={()=>setSelected(i)} />):<><polyline points={points.map((p,i)=>`${x(i)},${y(p.value)}`).join(' ')} fill="none" stroke="#0a84ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>{points.map((p,i)=><circle key={i} cx={x(i)} cy={y(p.value)} r={selected===i?5:3.4} fill={selected===i?'#60a5fa':'#0a84ff'} stroke="var(--surface, #15171c)" strokeWidth="1.5" onClick={()=>setSelected(i)}/>)}</>}
  {selected!==null&&points[selected]&&<line x1={x(selected)} x2={x(selected)} y1={top} y2={top+hh} stroke="#0a84ff" strokeDasharray="3 4"/>}
  <text x={left} y={h-5} fontSize="10" fill="currentColor" opacity=".65">{dateLabel(points[0].date)}</text><text x={w-right} y={h-5} fontSize="10" textAnchor="end" fill="currentColor" opacity=".65">{dateLabel(points[points.length-1].date)}</text>
 </svg><div className="lift-point-chooser" aria-label="Выбор результата">{points.map((p,i)=><button key={i} aria-label={`${dateLabel(p.date)}: ${fmt(p.value)} ${unit}`} className={selected===i?'active':''} onClick={()=>setSelected(i)} />)}</div></div>
}
export default function Dynamics({workouts,measurements,sex='male'}:{workouts:Workout[],measurements:Measurement[],sex?:'male'|'female'}){
 const [group,setGroup]=useState<Group>('general'),[period,setPeriod]=useState<Period>('90'),[metric,setMetric]=useState<Metric>('e1rm'),[exercise,setExercise]=useState(''),[bodyKey,setBodyKey]=useState<BodyKey>('weight')
 const filtered=useMemo(()=>ordered(workouts.filter(w=>visible(w.date,period))),[workouts,period]);const measures=useMemo(()=>ordered(measurements.filter(m=>visible(m.date,period))),[measurements,period])
 const names=useMemo(()=>[...new Set(workouts.flatMap(w=>w.exercises.map(e=>e.name.trim()).filter(Boolean)))].sort((a,b)=>a.localeCompare(b,'ru')),[workouts]);const selectedExercise=names.includes(exercise)?exercise:names[0]||''
 const volumePoints=filtered.map(w=>({date:w.date,value:tonnage(w)}));const counts=filtered.map(w=>w.exercises.reduce((n,e)=>n+e.sets.filter(done).length,0));const totalVolume=volumePoints.reduce((n,p)=>n+p.value,0)
 const weekPoints=useMemo(()=>{const map=new Map<string,number>();filtered.forEach(w=>{const key=weekKey(w.date);map.set(key,(map.get(key)||0)+tonnage(w))});return [...map].map(([date,value])=>({date,value}))},[filtered]);
 const strength=useMemo(()=>filtered.flatMap(w=>w.exercises.filter(e=>e.name.trim()===selectedExercise).map(e=>{const sets=e.sets.filter(done);const val=metric==='max'?Math.max(0,...sets.map(s=>s.weight)):metric==='e1rm'?Math.max(0,...sets.map(s=>oneRM(s))):metric==='volume'?sets.reduce((n,s)=>n+s.weight*s.reps,0):metric==='bestSet'?Math.max(0,...sets.map(s=>s.weight*s.reps)):Math.max(0,...sets.map(s=>s.reps));return {date:w.date,value:val}})).filter(p=>p.value>0),[filtered,selectedExercise,metric]);
 const bodyPoints=measures.flatMap(m=>{const v=m[bodyKey];return typeof v==='number'&&Number.isFinite(v)&&v>0?[{date:m.date,value:v}]:[]})
 const loads=useMemo(()=>muscleLoad(filtered),[filtered]);const muscles=(Object.entries(loads) as [Muscle,number][]).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
 return <section className="lift-dynamics"><div className="page-heading"><div><p className="eyebrow">LIFT / ANALYTICS</p><h1>Динамика</h1></div></div>
 <div className="lift-tabs">{([['general','Общее'],['strength','Силовые'],['body','Тело'],['muscles','Мышцы']] as [Group,string][]).map(([key,text])=><button key={key} className={group===key?'active':''} onClick={()=>setGroup(key)}>{text}</button>)}</div>
 <div className="lift-filter-label">Период</div><div className="lift-periods">{([['30','30 дн.'],['90','90 дн.'],['365','Год'],['all','Всё']] as [Period,string][]).map(([key,text])=><button className={period===key?'active':''} key={key} onClick={()=>setPeriod(key)}>{text}</button>)}</div>
 {group==='general'&&<><div className="lift-stats">{[['Тренировок',filtered.length],['Рабочих подходов',counts.reduce((a,b)=>a+b,0)],['Тоннаж',`${fmt(totalVolume)} кг`],['Средний тоннаж',`${fmt(filtered.length?totalVolume/filtered.length:0)} кг`]].map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div><div className="card lift-analytics-card"><h2>Тоннаж по тренировкам</h2><TrendChart points={volumePoints}/></div><div className="card lift-analytics-card"><h2>Тоннаж по неделям</h2><TrendChart points={weekPoints} bars/></div><p className="muted small">Учитываются только выполненные подходы с внешним весом. Разминочные подходы исключены.</p></>}
 {group==='strength'&&<><label className="lift-field">Упражнение<select className="input" value={selectedExercise} onChange={e=>setExercise(e.target.value)}>{!names.length&&<option value="">Нет упражнений</option>}{names.map(n=><option key={n} value={n}>{n}</option>)}</select></label><div className="lift-metrics">{([['e1rm','1ПМ'],['max','Вес'],['volume','Тоннаж'],['bestSet','Лучший сет'],['reps','Повторы']] as [Metric,string][]).map(([key,text])=><button key={key} className={metric===key?'active':''} onClick={()=>setMetric(key)}>{text}</button>)}</div><div className="card lift-analytics-card"><h2>{metric==='e1rm'?'Расчётный максимум (1ПМ)':metric==='max'?'Максимальный вес':metric==='volume'?'Тоннаж упражнения':metric==='bestSet'?'Лучший подход по объёму':'Максимум повторений'}</h2><TrendChart points={strength} unit={metric==='reps'?'повт.':'кг'}/>{metric==='e1rm'&&<p className="muted small">Оценка по формуле Эпли для подходов от 1 до 12 повторений. Не является фактически поднятым максимумом.</p>}</div></>}
 {group==='body'&&<><label className="lift-field">Параметр<select className="input" value={bodyKey} onChange={e=>setBodyKey(e.target.value as BodyKey)}>{(Object.keys(bodyLabels) as BodyKey[]).map(k=><option key={k} value={k}>{bodyLabels[k]}</option>)}</select></label><div className="card lift-analytics-card"><h2>{bodyLabels[bodyKey]}</h2><TrendChart points={bodyPoints} unit={bodyKey==='weight'?'кг':'см'}/>{bodyPoints.length>=2&&<p className="muted small">Изменение за период: {fmt(bodyPoints[bodyPoints.length-1].value-bodyPoints[0].value)} {bodyKey==='weight'?'кг':'см'}</p>}</div></>}
 {group==='muscles'&&<><div className="card lift-analytics-card"><h2>Нагрузка по мышечным группам</h2>{muscles.length?muscles.map(([key,value])=><div className="lift-muscle-row" key={key}><span>{labels[key]}</span><b>{fmt(value)}</b><div><i style={{width:`${Math.max(2,value/(muscles[0][1]||1)*100)}%`}}/></div></div>):<div className="lift-no-data">Нет выполненных рабочих подходов за выбранный период.</div>}</div><div className="card lift-analytics-card"><h2>Карта нагрузки</h2><MuscleMap loads={loads} sex={sex}/></div><p className="muted small">Основная группа = 1, вспомогательная = 0,5 условного подхода. Это приблизительная модель, не измерение работы мышц.</p></>}
 </section>
}
