export type SetLine={id:string,weight:number,reps:number,done:boolean,kind?:'work'|'warmup'|'drop',rpe?:number,rir?:number,tempo?:string,note?:string}
export type ExerciseLine={id:string,name:string,sets:SetLine[],weightUnit?:'kg'|'blocks',superset?:string,note?:string}
export type Program={id:string,name:string,exercises:ExerciseLine[],createdAt:string}
export type Workout={id:string,name:string,programId:string|null,date:string,exercises:ExerciseLine[],volume:number}
export type Measurement={id:string,date:string,weight?:number,waist?:number,chest?:number,arm?:number,thigh?:number,hips?:number,neck?:number,note?:string}
export type Schedule={id:string,date:string,programId:string,repeatDays?:number,status?:'planned'|'skipped'}
export type Profile={sex:'male'|'female',height:number,birthDate:string,goal:string,weightStep:number,autoProgress:boolean}
export type Backup={format:'osfit-backup',version:number,exportedAt:string,programs:Program[],workouts:Workout[],measurements?:Measurement[],schedule?:Schedule[],profile?:Profile}
export const uid=():string=>{
 try{if(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function')return crypto.randomUUID()}catch{/* insecure context */}
 const b=new Uint8Array(16);if(typeof crypto!=='undefined'&&crypto.getRandomValues)crypto.getRandomValues(b);else for(let i=0;i<16;i++)b[i]=Math.floor(Math.random()*256)
 b[6]=(b[6]&0x0f)|0x40;b[8]=(b[8]&0x3f)|0x80;const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('')
 return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`
}
export const blankSet=():SetLine=>({id:uid(),weight:0,reps:8,done:false})
export const cloneLines=(rows:ExerciseLine[]):ExerciseLine[]=>rows.map(x=>({...x,id:uid(),sets:x.sets.map(s=>({...s,id:uid(),done:false}))}))
/** Рабочий подход: выполнен, не разминка. Единое правило для истории, Динамики, рекордов и целей. */
export const isWorkSet=(s:SetLine)=>s.done===true&&s.kind!=='warmup'&&Number.isFinite(s.weight)&&Number.isFinite(s.reps)&&s.weight>=0&&s.reps>0
/** Тоннаж в кг = сумма вес×повторы по выполненным рабочим подходам (разминка исключена). Исходные веса не меняются. */
export const volumeOf=(rows:ExerciseLine[])=>rows.reduce((total,e)=>total+(Array.isArray(e?.sets)?e.sets.reduce((v,s)=>v+(isWorkSet(s)?weightInKg(e,s.weight)*s.reps:0),0):0),0)
/** Максимум повторений, при котором оценка 1ПМ считается осмысленной. */
export const MAX_1RM_REPS=12
/** Расчётный 1ПМ: 1 повтор = фактический вес; 2–12 повторов — формула Эпли w·(1+r/30); больше 12 — оценка не даётся (0). */
export const estimate1RM=(weight:number,reps:number)=>weight>0&&reps>=1&&reps<=MAX_1RM_REPS?(reps===1?weight:weight*(1+reps/30)):0
/** Локальная дата YYYY-MM-DD (а не UTC): иначе в UTC+ тренировки утром попадают на вчера. */
export const localDay=(d:Date|string|number=new Date())=>{const x=d instanceof Date?d:new Date(d);if(!Number.isFinite(x.getTime()))return '';return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`}
/** Нормализация названия: регистр и ё→е (чтобы «лёжа» и «лежа» совпадали). */
export const norm=(v:string)=>v.toLocaleLowerCase('ru').replace(/ё/g,'е').trim()
/** Только эти точные старые названия означают число блоков, а не килограммы. */
const blockAliases:Record<string,string>={'трицепс':'Трицепс в кроссовере','сгибания':'Сгибание ног в тренажёре'}
export const BLOCK_WEIGHT_KG=5
/** Поле weightUnit имеет приоритет; полные и похожие названия по умолчанию остаются в кг. */
export const weightUnitOf=(e:Pick<ExerciseLine,'name'|'weightUnit'>):'kg'|'blocks'=>e.weightUnit==='kg'||e.weightUnit==='blocks'?e.weightUnit:Object.hasOwn(blockAliases,norm(e.name))?'blocks':'kg'
/** Принимает только исходный вес подхода. Результат в кг, повторно конвертировать его нельзя. */
export const weightInKg=(e:Pick<ExerciseLine,'name'|'weightUnit'>,rawWeight:number):number=>rawWeight*(weightUnitOf(e)==='blocks'?BLOCK_WEIGHT_KG:1)
export const formatWeight=(e:Pick<ExerciseLine,'name'|'weightUnit'>,rawWeight:number):string=>weightUnitOf(e)==='blocks'?`${rawWeight} бл. (${weightInKg(e,rawWeight)} кг)`:`${rawWeight} кг`
/** Только отображение/классификация: исходные имена, ключи группировки и ID не переименовываются. */
export const exerciseDisplayName=(name:string):string=>Object.hasOwn(blockAliases,norm(name))?blockAliases[norm(name)]:name
export const exerciseCatalog=['Жим штанги лёжа','Жим гантелей лёжа','Жим на наклонной скамье','Присед со штангой','Становая тяга','Румынская тяга','Тяга штанги в наклоне','Подтягивания','Тяга верхнего блока','Тяга горизонтального блока','Жим стоя','Жим ногами','Выпады','Разгибание ног','Сгибание ног','Подъём на носки','Брусья','Сгибание рук со штангой','Сгибание рук с гантелями','Разгибание рук на блоке','Разведение гантелей в стороны','Шраги','Скручивания','Планка','Гиперэкстензия','Лодочка']
