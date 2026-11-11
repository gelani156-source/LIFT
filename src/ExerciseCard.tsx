import {useMemo} from 'react'
import {catalogLabel} from './catalog'
import {exerciseHistory,exerciseRecords,exerciseTrend} from './exerciseHistory'
import {estimate1RM,formatWeight,localDay,weightInKg,type Workout} from './model'

const fmt=(n:number)=>n.toLocaleString('ru-RU',{maximumFractionDigits:1})
const date=(v:string)=>{const d=localDay(v);return d?d.split('-').reverse().join('.'):v}
export default function ExerciseCard({name,workouts,onClose}:{name:string,workouts:Workout[],onClose:()=>void}){
 const sessions=useMemo(()=>exerciseHistory(workouts,name),[workouts,name])
 const records=useMemo(()=>exerciseRecords(sessions),[sessions])
 const points=useMemo(()=>exerciseTrend(sessions),[sessions])
 const low=Math.min(...points.map(p=>p.value)),high=Math.max(...points.map(p=>p.value))
 const coords=points.map((p,i)=>`${points.length===1?160:20+i*280/(points.length-1)},${90-(p.value-low)/(high-low||1)*70}`).join(' ')
 return <section className="card" aria-label={`Карточка упражнения: ${catalogLabel(name)}`}>
  <div className="picker-title"><h2>{catalogLabel(name)}</h2><button type="button" onClick={onClose} aria-label="Закрыть карточку упражнения">×</button></div>
  {!sessions.length?<p className="muted">Пока нет выполненных рабочих подходов с корректной датой.</p>:<>
   <h3>Рекорды</h3><p>Максимальный вес: {records.maxWeight?`${formatWeight(records.maxWeight.line,records.maxWeight.set.weight)} × ${records.maxWeight.set.reps}`:'нет положительного веса'}</p>
   <p>Расчётный 1ПМ: {records.maxEstimate?`≈ ${fmt(records.maxEstimate)} кг`:'нет подходящих подходов'}</p>
   <p className="muted small">1 повтор — фактический вес; 2–12 повторов — формула Эпли. Более 12 повторов и нулевой вес не дают оценки. Это не проверенный максимум.</p>
   <h3>Динамика расчётного 1ПМ</h3>{points.length?<><svg viewBox="0 0 320 110" style={{display:'block',width:'100%',maxWidth:480}} role="img" aria-label={`Расчётный 1ПМ: ${points.length} точек. Значения приведены ниже.`}><polyline points={coords} fill="none" stroke="#0a84ff" strokeWidth="3"/><g fill="#0a84ff">{coords.split(' ').map((p,i)=>{const [x,y]=p.split(',');return <circle key={i} cx={x} cy={y} r="4"/>})}</g></svg><details><summary>Значения графика по дням</summary><ul>{points.map(p=><li key={p.date}>{p.date.split('-').reverse().join('.')} — ≈ {fmt(p.value)} кг</li>)}</ul></details></>:<p className="muted">Недостаточно данных для оценки.</p>}
   <p className="muted small">На графике лучший расчётный 1ПМ за локальный день; точки расположены по порядку дней, а не по интервалам времени. Сравнивайте только сопоставимую технику и оборудование. По одной точке вывод о прогрессе невозможен; оценка не назначает вес следующей тренировки.</p>
   <h3>История рабочих подходов</h3><p className="muted small">Выполненные рабочие и дроп-подходы; разминка и незавершённые подходы исключены. Вес тела не добавляется. Блоки переведены по правилу приложения: 1 блок = 5 кг.</p>
   {sessions.map((s,i)=><div className="osfit-section" key={`${s.id}-${i}`}><strong>{date(s.date)}</strong>{s.sets.map(({line,set},j)=>{const estimate=estimate1RM(weightInKg(line,set.weight),set.reps);return <p className="small" key={`${line.id}-${set.id}-${j}`}>{j+1}. {formatWeight(line,set.weight)} × {set.reps}{set.kind==='drop'?' · дроп':''} · 1ПМ {estimate?`≈ ${fmt(estimate)} кг`:'не оценивается'}</p>})}</div>)}
  </>}
 </section>
}
