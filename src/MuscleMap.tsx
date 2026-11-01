import {useState} from 'react'
import type {Workout,ExerciseLine} from './model'
export type Muscle='chest'|'shoulders'|'biceps'|'forearms'|'triceps'|'abs'|'back'|'traps'|'glutes'|'quads'|'hamstrings'|'calves'
export const labels:Record<Muscle,string>={chest:'Грудные',shoulders:'Дельты',biceps:'Бицепс',forearms:'Предплечья',triceps:'Трицепс',abs:'Пресс',back:'Широчайшие и спина',traps:'Трапеции',glutes:'Ягодицы',quads:'Квадрицепс',hamstrings:'Задняя поверхность бедра',calves:'Икроножные'}
const keys=Object.keys(labels) as Muscle[]
export function classify(name:string):Muscle[]{const n=String(name??'').toLowerCase().replace(/ё/g,'е');if(/жим.*(леж|груд|гантел|наклон|скамь)|отжиман|брусья|разведени.*леж|сведени|кроссовер|бабочк/.test(n)&&!/обратн/.test(n))return ['chest','triceps','shoulders'];if(/обратн.*бабочк|задн.*дельт/.test(n))return ['shoulders','back'];if(/жим.*(стоя|сидя|вверх)|дельт|махи|разведени.*сторон/.test(n))return ['shoulders','triceps'];if(/присед|жим ног|выпад|разгибание ног/.test(n))return ['quads','glutes'];if(/станов|румын|сгибани.*ног/.test(n))return ['hamstrings','glutes','back'];if(/гиперэкстенз/.test(n))return ['back','glutes'];if(/подтяг|тяга.*(блок|штанг|гантел)|гребл|лодочк/.test(n))return ['back','biceps'];if(/предплеч|кист|сгибани.*запяст|разгибани.*запяст/.test(n))return ['forearms'];if(/шраг/.test(n))return ['traps'];if(/бицеп|сгибани.*рук/.test(n))return ['biceps'];if(/трицеп|разгибани.*рук|француз/.test(n))return ['triceps'];if(/пресс|скручив|планк|подъем ног/.test(n))return ['abs'];if(/икр|носочк|носк/.test(n))return ['calves'];return []}
const blank=()=>Object.fromEntries(keys.map(k=>[k,0])) as Record<Muscle,number>
export function muscleLoad(workouts:Workout[]):Record<Muscle,number>{const out=blank();for(const w of workouts)for(const e of w.exercises){const muscles=classify(e.name);const count=e.sets.filter(s=>s.done&&s.kind!=='warmup').length;muscles.forEach((m,i)=>out[m]+=count*(i?0.5:1))}return out}
export function exerciseMuscleLoad(exercises:ExerciseLine[]):Record<Muscle,number>{const out=blank();for(const e of exercises){const groups=classify(e.name),count=e.sets.filter(s=>s.done&&s.kind!=='warmup').length;groups.forEach((m,i)=>out[m]+=count*(i?0.5:1))}return out}
type Shape={muscle:Muscle,side:'front'|'back'|'both',d:string}
// Each muscle zone is an independent tappable vector path, not an image overlay.
const zones:Shape[]=[
// shoulders: curved deltoid heads, instead of rectangular caps
{muscle:'shoulders',side:'front',d:'M74 87 C64 85 56 90 52 100 C50 109 53 120 60 127 C64 124 66 111 70 102 Z'},
{muscle:'shoulders',side:'front',d:'M126 87 C136 85 144 90 148 100 C150 109 147 120 140 127 C136 124 134 111 130 102 Z'},
{muscle:'shoulders',side:'back',d:'M73 87 C60 85 54 94 52 102 Q53 117 62 128 L73 106 Z'},
{muscle:'shoulders',side:'back',d:'M127 87 C140 85 146 94 148 102 Q147 117 138 128 L127 106 Z'},
// pectoralis major with anatomically sloping, tapered lower edges
{muscle:'chest',side:'front',d:'M79 101 C86 97 94 99 98 105 L98 132 Q87 141 75 132 Q69 126 70 118 Q73 108 79 101 Z'},
{muscle:'chest',side:'front',d:'M121 101 C114 97 106 99 102 105 L102 132 Q113 141 125 132 Q131 126 130 118 Q127 108 121 101 Z'},
{muscle:'biceps',side:'front',d:'M57 132 Q61 122 66 127 C66 141 63 156 60 165 Q54 170 52 160 Q52 149 57 132 Z'},
{muscle:'biceps',side:'front',d:'M143 132 Q139 122 134 127 C134 141 137 156 140 165 Q146 170 148 160 Q148 149 143 132 Z'},
{muscle:'triceps',side:'back',d:'M55 127 Q63 120 67 132 L61 166 Q56 171 51 165 Z'},
{muscle:'triceps',side:'back',d:'M145 127 Q137 120 133 132 L139 166 Q144 171 149 165 Z'},
{muscle:'forearms',side:'both',d:'M48 176 Q56 172 60 178 C56 190 51 205 45 213 Q39 217 36 210 L41 192 Z'},
{muscle:'forearms',side:'both',d:'M152 176 Q144 172 140 178 C144 190 149 205 155 213 Q161 217 164 210 L159 192 Z'},
// rectus abdominis and external oblique are independently shaped, with detail rendered separately
{muscle:'abs',side:'front',d:'M88 147 Q100 150 112 147 C115 162 113 185 110 202 Q100 207 90 202 C87 185 85 162 88 147 Z'},
{muscle:'abs',side:'front',d:'M78 147 Q82 151 85 152 L89 203 Q82 201 78 192 Q75 168 78 147 Z'},
{muscle:'abs',side:'front',d:'M122 147 Q118 151 115 152 L111 203 Q118 201 122 192 Q125 168 122 147 Z'},
{muscle:'traps',side:'back',d:'M90 78 Q98 83 100 83 Q102 83 110 78 L127 99 Q112 111 100 108 Q88 111 73 99 Z'},
{muscle:'back',side:'back',d:'M74 109 Q87 113 97 122 L97 193 Q89 207 81 201 L75 167 Q69 140 74 109 Z'},
{muscle:'back',side:'back',d:'M126 109 Q113 113 103 122 L103 193 Q111 207 119 201 L125 167 Q131 140 126 109 Z'},
{muscle:'glutes',side:'back',d:'M77 219 Q88 213 98 222 Q100 237 94 247 Q80 250 75 237 Z'},
{muscle:'glutes',side:'back',d:'M123 219 Q112 213 102 222 Q100 237 106 247 Q120 250 125 237 Z'},
{muscle:'quads',side:'front',d:'M77 251 Q87 244 97 257 Q100 273 95 299 Q89 327 82 318 Q75 297 77 251 Z'},
{muscle:'quads',side:'front',d:'M123 251 Q113 244 103 257 Q100 273 105 299 Q111 327 118 318 Q125 297 123 251 Z'},
{muscle:'hamstrings',side:'back',d:'M77 253 Q89 246 97 258 Q99 281 93 313 Q86 326 81 315 Q77 290 77 253 Z'},
{muscle:'hamstrings',side:'back',d:'M123 253 Q111 246 103 258 Q101 281 107 313 Q114 326 119 315 Q123 290 123 253 Z'},
{muscle:'calves',side:'both',d:'M82 341 Q91 333 96 341 Q97 358 91 385 Q84 392 81 379 Q78 361 82 341 Z'},
{muscle:'calves',side:'both',d:'M118 341 Q109 333 104 341 Q103 358 109 385 Q116 392 119 379 Q122 361 118 341 Z'}]
export default function MuscleMap({loads,sex='male'}:{loads:Record<Muscle,number>,sex?:'male'|'female'}){
 const [side,setSide]=useState<'front'|'back'>('front'),[selected,setSelected]=useState<Muscle|null>(null)
 const max=Math.max(1,...Object.values(loads));const female=sex==='female';const paths=zones.filter(z=>z.side===side||z.side==='both')
 return <div className="muscle-layout">
  <div className="muscle-toolbar"><button className={side==='front'?'active':''} onClick={()=>setSide('front')}>Спереди</button><button className={side==='back'?'active':''} onClick={()=>setSide('back')}>Сзади</button><span className="muted small">{female?'Женская модель':'Мужская модель'}</span></div>
  <svg viewBox="0 0 200 440" className="muscle-svg" role="img" aria-label="Интерактивная анатомическая схема">
   <defs><linearGradient id="bodyFill" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#485963"/><stop offset="0.45" stopColor="#293640"/><stop offset="1" stopColor="#111a22"/></linearGradient><linearGradient id="muscleBase" x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#62737d"/><stop offset="1" stopColor="#263944"/></linearGradient></defs>
   <g fill="url(#bodyFill)" stroke="#72808f" strokeWidth="1.05" strokeLinejoin="round">
    <path d="M86 52 Q79 47 77 35 C73 22 80 10 90 6 Q100 2 110 6 C120 10 127 22 123 35 Q121 47 114 52 Q111 62 106 64 L106 76 94 76 94 64 Q89 62 86 52Z"/>
    <path d={female?'M91 76 Q81 78 68 83 C57 86 55 96 62 110 Q70 128 73 150 Q80 178 77 199 Q70 216 75 241 Q88 249 100 245 Q112 249 125 241 Q130 216 123 199 Q120 178 127 150 Q130 128 138 110 C145 96 143 86 132 83 Q119 78 109 76Z':'M87 76 Q73 78 61 85 C52 91 57 104 65 115 Q72 143 77 162 L80 196 Q78 209 74 220 Q71 230 75 242 Q88 249 100 245 Q112 249 125 242 Q129 230 126 220 Q122 209 120 196 L123 162 Q128 143 135 115 C143 104 148 91 139 85 Q127 78 113 76Z'}/>
    <path d="M61 91 Q49 91 47 106 Q43 127 44 149 L37 182 Q32 197 31 209 L29 218 Q31 227 38 226 Q43 221 46 213 L53 188 Q61 165 65 139 Q71 115 66 99 Z"/>
    <path d="M139 91 Q151 91 153 106 Q157 127 156 149 L163 182 Q168 197 169 209 L171 218 Q169 227 162 226 Q157 221 154 213 L147 188 Q139 165 135 139 Q129 115 134 99 Z"/>
    <path d={female?'M76 236 Q72 255 77 282 Q79 305 82 327 Q80 341 79 359 L77 389 79 427 Q86 431 94 428 L98 393 100 344 Q101 327 100 302 L99 256 Z':'M76 236 Q73 252 77 283 Q79 307 83 327 Q81 341 80 360 L78 391 80 428 Q87 431 94 428 L98 392 100 344 Q102 326 100 304 L99 256 Z'}/>
    <path d={female?'M124 236 Q128 255 123 282 Q121 305 118 327 Q120 341 121 359 L123 389 121 427 Q114 431 106 428 L102 393 100 344 Q99 327 100 302 L101 256 Z':'M124 236 Q127 252 123 283 Q121 307 117 327 Q119 341 120 360 L122 391 120 428 Q113 431 106 428 L102 392 100 344 Q98 326 100 304 L101 256 Z'}/>
   </g>
   <g transform={female?'translate(5 0) scale(.95 1)':undefined}>{paths.map((z,i)=>{const amount=loads[z.muscle]||0;const active=selected===z.muscle;return <path key={i} d={z.d} tabIndex={0} role="button" aria-label={`${labels[z.muscle]}, ${amount.toFixed(1)} условных подходов`} onClick={()=>setSelected(z.muscle)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setSelected(z.muscle)}} fill={active?'rgba(10,132,255,.9)':amount>0?`rgba(10,132,255,${.16+.66*amount/max})`:'url(#muscleBase)'} stroke={active?'#e9f2ff':'#667885'} strokeWidth={active?2.5:1.15} strokeLinejoin="round" style={{cursor:'pointer',outline:'none'}}><title>{labels[z.muscle]}</title></path>})}</g>
   <g pointerEvents="none" fill="none" stroke="#aab9c8" strokeOpacity=".34" strokeWidth=".8" strokeLinecap="round">
    {side==='front'?<><path d="M73 120 Q85 128 96 126 M104 126 Q115 128 127 120 M86 151 Q100 155 114 151 M84 168 Q100 172 116 168 M84 183 Q100 187 116 183 M91 145 L91 201 M109 145 L109 201"/><path d="M80 260 Q85 278 89 301 M120 260 Q115 278 111 301 M53 139 L55 159 M147 139 L145 159"/></>:<><path d="M100 96 L100 194 M77 121 Q88 133 96 145 M123 121 Q112 133 104 145 M81 159 Q89 170 96 175 M119 159 Q111 170 104 175 M80 226 Q89 241 97 236 M120 226 Q111 241 103 236"/><path d="M84 262 Q87 283 89 305 M116 262 Q113 283 111 305"/></>}
    <path d="M84 351 Q89 364 87 379 M116 351 Q111 364 113 379"/>
   </g>
   <path d="M100 90 L100 202" stroke="#728b8b" strokeOpacity=".3" fill="none" strokeWidth="1"/>
  </svg>
  <div className="muscle-caption">{selected?`${labels[selected]} · ${(loads[selected]||0).toFixed(1)} условных подходов`:'Нажми на мышцу или выбери её ниже'}</div>
  <div className="muscle-legend">{keys.map(key=><button key={key} className={selected===key?'active':''} onClick={()=>{setSelected(key);setSide(['back','traps','glutes','hamstrings'].includes(key)?'back':'front')}}><span>{labels[key]}</span><b>{(loads[key]||0).toFixed(1)}</b></button>)}</div>
  <p className="muted small">Подсветка условная: первичная группа — 1, вспомогательная — 0,5 за выполненный рабочий подход. Это не измерение физиологической активации или восстановления.</p>
 </div>
}
