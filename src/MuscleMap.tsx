import {useState} from 'react'
import type {Workout,ExerciseLine} from './model'
export type Muscle='chest'|'shoulders'|'biceps'|'forearms'|'triceps'|'abs'|'back'|'traps'|'glutes'|'quads'|'hamstrings'|'calves'
export const labels:Record<Muscle,string>={chest:'Грудные',shoulders:'Дельты',biceps:'Бицепс',forearms:'Предплечья',triceps:'Трицепс',abs:'Пресс',back:'Широчайшие и спина',traps:'Трапеции',glutes:'Ягодицы',quads:'Квадрицепс',hamstrings:'Задняя поверхность бедра',calves:'Икроножные'}
const keys=Object.keys(labels) as Muscle[]
export function classify(name:string):Muscle[]{const n=name.toLowerCase();if(/жим.*(леж|груд|гантел)|отжиман|брусья|разведени.*леж/.test(n))return ['chest','triceps','shoulders'];if(/жим.*(стоя|сидя|вверх)|дельт|махи|разведени.*сторон/.test(n))return ['shoulders','triceps'];if(/присед|жим ног|выпад|разгибание ног/.test(n))return ['quads','glutes'];if(/станов|румын|сгибани.*ног/.test(n))return ['hamstrings','glutes','back'];if(/подтяг|тяга.*(блок|штанг|гантел)|гребл|лодочк|гиперэкстенз/.test(n))return ['back','biceps'];if(/предплеч|кист|сгибани.*запяст|разгибани.*запяст/.test(n))return ['forearms'];if(/шраг/.test(n))return ['traps'];if(/бицеп|сгибани.*рук/.test(n))return ['biceps'];if(/трицеп|разгибани.*рук|француз/.test(n))return ['triceps'];if(/пресс|скручив|планк|подъем ног|подъём ног/.test(n))return ['abs'];if(/икр|носочк|носк/.test(n))return ['calves'];return []}
const blank=()=>Object.fromEntries(keys.map(k=>[k,0])) as Record<Muscle,number>
export function muscleLoad(workouts:Workout[]):Record<Muscle,number>{const out=blank();for(const w of workouts)for(const e of w.exercises){const muscles=classify(e.name);const count=e.sets.filter(s=>s.done&&s.kind!=='warmup').length;muscles.forEach((m,i)=>out[m]+=count*(i?0.5:1))}return out}
export function exerciseMuscleLoad(exercises:ExerciseLine[]):Record<Muscle,number>{const out=blank();for(const e of exercises){const groups=classify(e.name),count=e.sets.filter(s=>s.done&&s.kind!=='warmup').length;groups.forEach((m,i)=>out[m]+=count*(i?0.5:1))}return out}
type Shape={muscle:Muscle,side:'front'|'back'|'both',d:string}
// Each muscle zone is an independent tappable vector path, not an image overlay.
const zones:Shape[]=[
{muscle:'shoulders',side:'both',d:'M76 84 Q63 80 53 91 Q47 101 51 117 L67 130 Q71 107 80 98Z'},
{muscle:'shoulders',side:'both',d:'M124 84 Q137 80 147 91 Q153 101 149 117 L133 130 Q129 107 120 98Z'},
{muscle:'chest',side:'front',d:'M82 99 Q91 93 99 101 L98 134 Q87 142 72 126 L74 109Z'},
{muscle:'chest',side:'front',d:'M118 99 Q109 93 101 101 L102 134 Q113 142 128 126 L126 109Z'},
{muscle:'forearms',side:'both',d:'M43 172 L57 179 45 209 34 206Z'},
{muscle:'forearms',side:'both',d:'M157 172 L143 179 155 209 166 206Z'},
{muscle:'biceps',side:'front',d:'M53 124 Q60 117 66 128 L61 165 Q54 171 48 161Z'},
{muscle:'biceps',side:'front',d:'M147 124 Q140 117 134 128 L139 165 Q146 171 152 161Z'},
{muscle:'triceps',side:'back',d:'M52 120 Q60 116 66 127 L59 173 Q53 177 47 165Z'},
{muscle:'triceps',side:'back',d:'M148 120 Q140 116 134 127 L141 173 Q147 177 153 165Z'},
{muscle:'abs',side:'front',d:'M83 145 Q100 150 117 145 L115 205 Q100 211 85 205Z'},
{muscle:'traps',side:'back',d:'M82 78 L100 85 118 78 130 102 111 120 100 111 89 120 70 102Z'},
{muscle:'back',side:'back',d:'M72 110 L97 126 97 187 81 205 73 169 68 131Z'},
{muscle:'back',side:'back',d:'M128 110 L103 126 103 187 119 205 127 169 132 131Z'},
{muscle:'glutes',side:'back',d:'M77 209 Q88 203 99 217 L97 243 Q84 254 75 234Z'},
{muscle:'glutes',side:'back',d:'M123 209 Q112 203 101 217 L103 243 Q116 254 125 234Z'},
{muscle:'quads',side:'front',d:'M76 240 Q86 237 98 246 L97 302 Q92 325 84 322 L76 285Z'},
{muscle:'quads',side:'front',d:'M124 240 Q114 237 102 246 L103 302 Q108 325 116 322 L124 285Z'},
{muscle:'hamstrings',side:'back',d:'M76 245 Q87 241 97 252 L94 318 Q84 327 79 302Z'},
{muscle:'hamstrings',side:'back',d:'M124 245 Q113 241 103 252 L106 318 Q116 327 121 302Z'},
{muscle:'calves',side:'both',d:'M83 336 Q94 327 97 340 L93 385 Q88 397 81 382Z'},
{muscle:'calves',side:'both',d:'M117 336 Q106 327 103 340 L107 385 Q112 397 119 382Z'}]
export default function MuscleMap({loads,sex='male'}:{loads:Record<Muscle,number>,sex?:'male'|'female'}){
 const [side,setSide]=useState<'front'|'back'>('front'),[selected,setSelected]=useState<Muscle|null>(null)
 const max=Math.max(1,...Object.values(loads));const female=sex==='female';const paths=zones.filter(z=>z.side===side||z.side==='both')
 return <div className="muscle-layout">
  <div className="muscle-toolbar"><button className={side==='front'?'active':''} onClick={()=>setSide('front')}>Спереди</button><button className={side==='back'?'active':''} onClick={()=>setSide('back')}>Сзади</button><span className="muted small">{female?'Женская модель':'Мужская модель'}</span></div>
  <svg viewBox="0 0 200 440" className="muscle-svg" role="img" aria-label="Интерактивная анатомическая схема">
   <defs><linearGradient id="bodyFill" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#33424a"/><stop offset="1" stopColor="#17242a"/></linearGradient></defs>
   <g fill="url(#bodyFill)" stroke="#536871" strokeWidth="1.5" strokeLinejoin="round">
    <path d="M82 51 Q73 37 77 23 Q81 7 100 7 Q119 7 123 23 Q127 37 118 51 Q116 62 107 66 L107 75 93 75 93 66 Q84 62 82 51Z"/>
    <path d={female?'M89 73 Q74 80 63 87 Q58 100 67 127 L78 161 80 199 Q70 213 76 246 Q100 253 124 246 Q130 213 120 199 L122 161 133 127 Q142 100 137 87 Q126 80 111 73Z':'M86 73 Q70 76 60 87 L70 123 76 154 79 202 Q69 218 75 242 L125 242 Q131 218 121 202 L124 154 130 123 140 87 Q130 76 114 73Z'}/>
    <path d="M61 91 Q49 91 45 112 L39 162 30 202 31 222 Q40 227 45 214 L54 182 66 129Z"/><path d="M139 91 Q151 91 155 112 L161 162 170 202 169 222 Q160 227 155 214 L146 182 134 129Z"/>
    <path d={female?'M75 235 Q73 256 78 297 L82 337 78 388 81 430 94 430 100 348 99 264Z':'M75 235 Q72 257 78 298 L82 337 78 388 81 430 94 430 100 348 99 264Z'}/><path d="M125 235 Q128 257 122 298 L118 337 122 388 119 430 106 430 100 348 101 264Z"/>
   </g>
   <g transform={female?'translate(5 0) scale(.95 1)':undefined}>{paths.map((z,i)=>{const amount=loads[z.muscle]||0;const active=selected===z.muscle;return <path key={i} d={z.d} tabIndex={0} role="button" aria-label={`${labels[z.muscle]}, ${amount.toFixed(1)} условных подходов`} onClick={()=>setSelected(z.muscle)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setSelected(z.muscle)}} fill={active?'rgba(10,132,255,.92)':amount>0?`rgba(10,132,255,${.26+.65*amount/max})`:'#354b50'} stroke={active?'#f4fffa':'#6a8b8c'} strokeWidth={active?2.5:1} strokeLinejoin="round" style={{cursor:'pointer',outline:'none'}}><title>{labels[z.muscle]}</title></path>})}</g>
   <path d="M100 90 L100 202" stroke="#728b8b" strokeOpacity=".3" fill="none" strokeWidth="1"/>
  </svg>
  <div className="muscle-caption">{selected?`${labels[selected]} · ${(loads[selected]||0).toFixed(1)} условных подходов`:'Нажми на мышцу или выбери её ниже'}</div>
  <div className="muscle-legend">{keys.map(key=><button key={key} className={selected===key?'active':''} onClick={()=>{setSelected(key);setSide(['back','traps','glutes','hamstrings'].includes(key)?'back':'front')}}><span>{labels[key]}</span><b>{(loads[key]||0).toFixed(1)}</b></button>)}</div>
  <p className="muted small">Подсветка условная: первичная группа — 1, вспомогательная — 0,5 за выполненный рабочий подход. Это не измерение физиологической активации или восстановления.</p>
 </div>
}
