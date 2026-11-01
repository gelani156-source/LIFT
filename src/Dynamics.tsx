
import {useMemo,useState} from 'react'
import type {Workout,Measurement,SetLine} from './model'
import {estimate1RM,isWorkSet,volumeOf,localDay} from './model'
import {labels,muscleLoad} from './MuscleMap'
import type {Muscle} from './MuscleMap'
import AnatomyMuscleMap from './AnatomyMuscleMap'

type Group='general'|'strength'|'body'|'muscles'
type Period='7'|'30'|'90'|'180'|'365'|'all'
type Metric='max'|'e1rm'|'volume'|'bestSet'|'reps'
type Goal={
  exercise:string,
  kind:'weight'|'reps'|'estimated',
  target:number,
  completedAt?:string
}
type BodyKey='weight'|'waist'|'chest'|'arm'|'thigh'|'hips'|'neck'

const bodyLabels:Record<BodyKey,string>={
  weight:'Вес',
  waist:'Талия',
  chest:'Грудь',
  arm:'Рука',
  thigh:'Бедро',
  hips:'Таз',
  neck:'Шея'
}

const fmt=(v:number)=>
  v.toLocaleString('ru-RU',{maximumFractionDigits:1})

function exportChart(button:HTMLButtonElement){
  const svg=button.parentElement?.querySelector('svg')
  if(!svg)return

  const copy=svg.cloneNode(true) as SVGSVGElement
  copy.setAttribute('xmlns','http://www.w3.org/2000/svg')
  copy.setAttribute('width','1020')
  copy.setAttribute('height','540')
  copy.setAttribute('style','background:#141922;color:#e5edf7')

  const url=URL.createObjectURL(
    new Blob(
      [new XMLSerializer().serializeToString(copy)],
      {type:'image/svg+xml'}
    )
  )

  const a=document.createElement('a')
  a.href=url
  a.download='LIFT-dynamics.svg'
  a.click()
  setTimeout(()=>URL.revokeObjectURL(url),1000)
}

const dateLabel=(v:string)=>{
  const d=/^\d{4}-\d{2}-\d{2}$/.test(v)
    ?new Date(v+'T12:00:00')
    :new Date(v)

  return Number.isFinite(d.getTime())
    ?d.toLocaleDateString('ru-RU',{
      day:'2-digit',
      month:'short'
    })
    :v
}

const weekKey=(date:string)=>{
  const d=new Date(date)
  d.setHours(0,0,0,0)
  const day=d.getDay()||7
  d.setDate(d.getDate()-day+1)
  return localDay(d)
}

const visible=(date:string,p:Period)=>{
  const t=new Date(date).getTime()
  return Number.isFinite(t)
    &&t<=Date.now()+86400000
    &&(p==='all'||t>=Date.now()-Number(p)*86400000)
}

const done=(s:SetLine)=>isWorkSet(s)
const tonnage=(w:Workout)=>volumeOf(w.exercises)
const oneRM=(s:SetLine)=>estimate1RM(s.weight,s.reps)

const ordered=<T extends {date:string}>(arr:T[])=>
  [...arr].sort(
    (a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()
  )

type Point={
  date:string,
  value:number,
  label?:string
}

function TrendChart({
  points,
  unit='кг',
  bars=false,
  goal
}:{
  points:Point[],
  unit?:string,
  bars?:boolean,
  goal?:number
}){
  const [selected,setSelected]=useState<number|null>(null)

  const last=selected!==null&&selected<points.length
    ?points[selected]
    :points[points.length-1]

  const w=340
  const h=180
  const left=37
  const right=11
  const top=14
  const bottom=27

  if(!points.length){
    return (
      <div className="lift-no-data">
        Данных за выбранный период пока нет.
        Сохрани тренировку или замер — здесь появится динамика.
      </div>
    )
  }

  const values=points.map(p=>p.value)
  const lo=bars
    ?0
    :Math.max(
      0,
      Math.min(...values)
      -(Math.max(...values)-Math.min(...values)||1)*.18
    )

  const hi=Math.max(
    lo+1,
    Math.max(...values,goal??0)*1.08
  )

  const ww=w-left-right
  const hh=h-top-bottom

  const times=points.map(p=>new Date(p.date).getTime())
  const validTimes=times.every(t=>Number.isFinite(t))
  const minTime=Math.min(...times)
  const maxTime=Math.max(...times)

  const x=(i:number)=>
    left+(
      points.length===1
        ?ww/2
        :(validTimes&&maxTime>minTime
          ?(times[i]-minTime)/(maxTime-minTime)
          :i/(points.length-1)
        )*ww
    )

  const y=(v:number)=>
    top+hh-(v-lo)/(hi-lo)*hh

  return (
    <div className="lift-chart">
      <div className="lift-chart-value">
        <b>{fmt(last.value)} {unit}</b>
        <span>{dateLabel(last.date)}</span>
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label={`График. Точек: ${points.length}`}
      >
        {[0,1,2,3].map(i=>{
          const v=lo+(hi-lo)*i/3

          return (
            <g key={i}>
              <line
                x1={left}
                x2={w-right}
                y1={y(v)}
                y2={y(v)}
                stroke="currentColor"
                opacity=".12"
              />
              <text
                x={left-5}
                y={y(v)+4}
                textAnchor="end"
                fill="currentColor"
                opacity=".65"
                fontSize="9"
              >
                {fmt(v)}
              </text>
            </g>
          )
        })}

        {typeof goal==='number'&&goal>=lo&&goal<=hi&&(
          <g>
            <line
              x1={left}
              x2={w-right}
              y1={y(goal)}
              y2={y(goal)}
              stroke="#f59e0b"
              strokeDasharray="5 4"
              strokeWidth="1.5"
            />
            <text
              x={w-right}
              y={Math.max(top+9,y(goal)-5)}
              fill="#f59e0b"
              textAnchor="end"
              fontSize="10"
            >
              Цель {fmt(goal)}
            </text>
          </g>
        )}

        {bars
          ?points.map((p,i)=>{
            const bw=Math.max(
              4,
              Math.min(24,ww/points.length*.7)
            )

            return (
              <rect
                key={i}
                x={x(i)-bw/2}
                y={y(p.value)}
                width={bw}
                height={Math.max(1,top+hh-y(p.value))}
                rx="3"
                fill={selected===i?'#60a5fa':'#0a84ff'}
                onClick={()=>setSelected(i)}
              />
            )
          })
          :(
            <>
              <polyline
                points={points.map(
                  (p,i)=>`${x(i)},${y(p.value)}`
                ).join(' ')}
                fill="none"
                stroke="#0a84ff"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {points.map((p,i)=>(
                <circle
                  key={i}
                  cx={x(i)}
                  cy={y(p.value)}
                  r={selected===i?5:3.4}
                  fill={
                    selected===i?'#60a5fa':'#0a84ff'
                  }
                  stroke="var(--surface, #15171c)"
                  strokeWidth="1.5"
                  onClick={()=>setSelected(i)}
                />
              ))}
            </>
          )
        }

        {selected!==null&&points[selected]&&(
          <line
            x1={x(selected)}
            x2={x(selected)}
            y1={top}
            y2={top+hh}
            stroke="#0a84ff"
            strokeDasharray="3 4"
          />
        )}

        <text
          x={left}
          y={h-5}
          fontSize="10"
          fill="currentColor"
          opacity=".65"
        >
          {dateLabel(points[0].date)}
        </text>

        <text
          x={w-right}
          y={h-5}
          fontSize="10"
          textAnchor="end"
          fill="currentColor"
          opacity=".65"
        >
          {dateLabel(points[points.length-1].date)}
        </text>
      </svg>

      <button
        className="lift-export-chart"
        type="button"
        onClick={e=>exportChart(e.currentTarget)}
      >
        Сохранить график (SVG)
      </button>

      <div
        className="lift-point-chooser"
        aria-label="Выбор результата"
      >
        {points.map((p,i)=>(
          <button
            key={i}
            aria-label={`${dateLabel(p.date)}: ${fmt(p.value)} ${unit}`}
            className={selected===i?'active':''}
            onClick={()=>setSelected(i)}
          />
        ))}
      </div>
    </div>
  )
}

export default function Dynamics({
  workouts,
  measurements,
  sex='male',
  goals=[]
}:{
  workouts:Workout[],
  measurements:Measurement[],
  sex?:'male'|'female',
  goals?:Goal[]
}){
  const [group,setGroup]=useState<Group>('general')
  const [period,setPeriod]=useState<Period>('90')
  const [metric,setMetric]=useState<Metric>('e1rm')
  const [exercise,setExercise]=useState('')
  const [bodyKey,setBodyKey]=useState<BodyKey>('weight')

  const filtered=useMemo(
    ()=>ordered(workouts.filter(w=>visible(w.date,period))),
    [workouts,period]
  )

  const measures=useMemo(
    ()=>ordered(measurements.filter(m=>visible(m.date,period))),
    [measurements,period]
  )

  const names=useMemo(
    ()=>[
      ...new Set(
        workouts.flatMap(
          w=>w.exercises.map(
            e=>e.name.trim()
          ).filter(Boolean)
        )
      )
    ].sort((a,b)=>a.localeCompare(b,'ru')),
    [workouts]
  )

  const selectedExercise=names.includes(exercise)
    ?exercise
    :names[0]||''

  const volumePoints=filtered.map(w=>({
    date:w.date,
    value:tonnage(w)
  }))

  const counts=filtered.map(
    w=>w.exercises.reduce(
      (n,e)=>n+e.sets.filter(done).length,
      0
    )
  )

  const totalVolume=volumePoints.reduce(
    (n,p)=>n+p.value,
    0
  )

  const previous=useMemo(()=>{
    if(period==='all')return [] as Workout[]

    const days=Number(period)*86400000
    const end=Date.now()-days

    return workouts.filter(w=>{
      const t=new Date(w.date).getTime()
      return t>=end-days&&t<end
    })
  },[workouts,period])

  const previousVolume=previous.reduce(
    (sum,w)=>sum+tonnage(w),
    0
  )

  const weekFrequency=useMemo(()=>{
    const map=new Map<string,number>()

    filtered.forEach(w=>{
      const k=weekKey(w.date)
      map.set(k,(map.get(k)||0)+1)
    })

    return [...map].map(([date,value])=>({
      date,
      value
    }))
  },[filtered])

  const weekPoints=useMemo(()=>{
    const map=new Map<string,number>()

    filtered.forEach(w=>{
      const key=weekKey(w.date)
      map.set(
        key,
        (map.get(key)||0)+tonnage(w)
      )
    })

    return [...map].map(([date,value])=>({
      date,
      value
    }))
  },[filtered])

  const strength=useMemo(
    ()=>filtered.flatMap(
      w=>w.exercises
        .filter(e=>e.name.trim()===selectedExercise)
        .map(e=>{
          const sets=e.sets.filter(done)

          const val=metric==='max'
            ?Math.max(0,...sets.map(s=>s.weight))
            :metric==='e1rm'
              ?Math.max(0,...sets.map(s=>oneRM(s)))
              :metric==='volume'
                ?sets.reduce(
                  (n,s)=>n+s.weight*s.reps,
                  0
                )
                :metric==='bestSet'
                  ?Math.max(
                    0,
                    ...sets.map(s=>s.weight*s.reps)
                  )
                  :Math.max(
                    0,
                    ...sets.map(s=>s.reps)
                  )

          return {
            date:w.date,
            value:val
          }
        })
    ).filter(p=>p.value>0),
    [filtered,selectedExercise,metric]
  )

  const matchingGoal=goals.find(
    g=>
      g.exercise.toLowerCase().trim()===
        selectedExercise.toLowerCase().trim()
      &&(
        (metric==='e1rm'&&g.kind==='estimated')
        ||(metric==='max'&&g.kind==='weight')
        ||(metric==='reps'&&g.kind==='reps')
      )
  )

  const bodyPoints=measures.flatMap(m=>{
    const v=m[bodyKey]

    return typeof v==='number'
      &&Number.isFinite(v)
      &&v>0
      ?[{date:m.date,value:v}]
      :[]
  })

  const loads=useMemo(
    ()=>muscleLoad(filtered),
    [filtered]
  )

  const muscles=(
    Object.entries(loads) as [Muscle,number][]
  )
    .filter(([,v])=>v>0)
    .sort((a,b)=>b[1]-a[1])

  return (
    <section className="lift-dynamics">
      <div className="page-heading">
        <div>
          <p className="eyebrow">LIFT / ANALYTICS</p>
          <h1>Динамика</h1>
        </div>
      </div>

      <div className="lift-tabs">
        {([
          ['general','Общее'],
          ['strength','Силовые'],
          ['body','Тело'],
          ['muscles','Мышцы']
        ] as [Group,string][]).map(([key,text])=>(
          <button
            key={key}
            className={group===key?'active':''}
            onClick={()=>setGroup(key)}
          >
            {text}
          </button>
        ))}
      </div>

      <div className="lift-filter-label">
        Период
      </div>

      <div className="lift-periods">
        {([
          ['7','7д'],
          ['30','30д'],
          ['90','3м'],
          ['180','6м'],
          ['365','1г'],
          ['all','Всё']
        ] as [Period,string][]).map(([key,text])=>(
          <button
            className={period===key?'active':''}
            key={key}
            onClick={()=>setPeriod(key)}
          >
            {text}
          </button>
        ))}
      </div>

      {group==='general'&&(
        <>
          <div className="lift-stats">
            {([
              ['Тренировок',filtered.length],
              ['Рабочих подходов',counts.reduce((a,b)=>a+b,0)],
              ['Тоннаж',`${fmt(totalVolume)} кг`],
              [
                'Средний тоннаж',
                `${fmt(filtered.length
                  ?totalVolume/filtered.length
                  :0)} кг`
              ]
            ]).map(([label,value])=>(
              <div key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          {period!=='all'&&(
            <div className="card lift-analytics-card">
              <h2>Сравнение периодов</h2>
              <p className="muted small">
                Текущий: {fmt(totalVolume)} кг · предыдущий: {fmt(previousVolume)} кг
              </p>
              <strong>
                {previousVolume>0
                  ?`${totalVolume>=previousVolume?'+':''}${fmt((totalVolume/previousVolume-1)*100)}%`
                  :'Недостаточно данных для процента'}
              </strong>
            </div>
          )}

          <div className="card lift-analytics-card">
            <h2>Тоннаж по тренировкам</h2>
            <TrendChart
              key={'v'+period}
              points={volumePoints}
            />
          </div>

          <div className="card lift-analytics-card">
            <h2>Тоннаж по неделям</h2>
            <TrendChart
              key={'w'+period}
              points={weekPoints}
              bars
            />
          </div>

          <div className="card lift-analytics-card">
            <h2>Тренировок по неделям</h2>
            <TrendChart
              key={'f'+period}
              points={weekFrequency}
              bars
              unit="трен."
            />
          </div>

          <p className="muted small">
            Учитываются только выполненные подходы с внешним весом.
            Разминочные подходы исключены.
          </p>
        </>
      )}

      {group==='strength'&&(
        <>
          <label className="lift-field">
            Упражнение
            <select
              className="input"
              value={selectedExercise}
              onChange={e=>setExercise(e.target.value)}
            >
              {!names.length&&(
                <option value="">
                  Нет упражнений
                </option>
              )}

              {names.map(n=>(
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <div className="lift-metrics">
            {([
              ['e1rm','1ПМ'],
              ['max','Вес'],
              ['volume','Тоннаж'],
              ['bestSet','Лучший сет'],
              ['reps','Повторы']
            ] as [Metric,string][]).map(([key,text])=>(
              <button
                key={key}
                className={metric===key?'active':''}
                onClick={()=>setMetric(key)}
              >
                {text}
              </button>
            ))}
          </div>

          <div className="card lift-analytics-card">
            <h2>
              {metric==='e1rm'
                ?'Расчётный максимум (1ПМ)'
                :metric==='max'
                  ?'Максимальный вес'
                  :metric==='volume'
                    ?'Тоннаж упражнения'
                    :metric==='bestSet'
                      ?'Лучший подход по объёму'
                      :'Максимум повторений'}
            </h2>

            <TrendChart
              key={
                's'+selectedExercise+metric+period
              }
              points={strength}
              goal={matchingGoal?.target}
              unit={metric==='reps'?'повт.':'кг'}
            />

            {matchingGoal&&(
              <p className="muted small">
                Цель: {fmt(matchingGoal.target)}{' '}
                {metric==='reps'?'повт.':'кг'}
                {matchingGoal.completedAt
                  ?' · достигнута 🏆'
                  :''}
              </p>
            )}

            {metric==='e1rm'&&(
              <p className="muted small">
                Оценка: 1 повтор — фактический вес,
                2–12 повторений — формула Эпли.
                Подходы больше 12 повторений не учитываются.
                Не является фактически поднятым максимумом.
              </p>
            )}
          </div>
        </>
      )}

      {group==='body'&&(
        <>
          <label className="lift-field">
            Параметр
            <select
              className="input"
              value={bodyKey}
              onChange={e=>setBodyKey(e.target.value as BodyKey)}
            >
              {(Object.keys(bodyLabels) as BodyKey[]).map(k=>(
                <option key={k} value={k}>
                  {bodyLabels[k]}
                </option>
              ))}
            </select>
          </label>

          <div className="card lift-analytics-card">
            <h2>{bodyLabels[bodyKey]}</h2>

            <TrendChart
              key={'b'+bodyKey+period}
              points={bodyPoints}
              unit={bodyKey==='weight'?'кг':'см'}
            />

            {bodyPoints.length>=2&&(
              <p className="muted small">
                Изменение за период:{' '}
                {(()=>{
                  const d=
                    bodyPoints[bodyPoints.length-1].value
                    -bodyPoints[0].value

                  return (d>0?'+':'')+fmt(d)
                })()}{' '}
                {bodyKey==='weight'?'кг':'см'}
              </p>
            )}
          </div>
        </>
      )}

      {group==='muscles'&&(
        <>
          <div className="card lift-analytics-card">
            <h2>Нагрузка по мышечным группам</h2>

            {muscles.length
              ?muscles.map(([key,value])=>(
                <div
                  className="lift-muscle-row"
                  key={key}
                >
                  <span>{labels[key]}</span>
                  <b>{fmt(value)}</b>
                  <div>
                    <i
                      style={{
                        width:`${Math.max(
                          2,
                          value/(muscles[0][1]||1)*100
                        )}%`
                      }}
                    />
                  </div>
                </div>
              ))
              :(
                <div className="lift-no-data">
                  Нет выполненных рабочих подходов
                  за выбранный период.
                </div>
              )}
          </div>

          <div className="card lift-analytics-card">
            <h2>Карта нагрузки</h2>

            <AnatomyMuscleMap
              loads={loads}
              sex={sex}
            />
          </div>

          <p className="muted small">
            Основная группа = 1,
            вспомогательная = 0,5 условного подхода.
            Это приблизительная модель,
            не измерение работы мышц.
          </p>
        </>
      )}
    </section>
  )
}
