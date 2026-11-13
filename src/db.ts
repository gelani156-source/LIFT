import type {Program,Workout,Backup,Measurement,Schedule,Profile,ExerciseLine,SetLine} from './model'
import {uid} from './model'
import {store as ls} from './storage'
import {browserStrengthStorage, readStrengthSettings, validStrengthSettings, type StrengthSettings} from './strengthSettings'
// Имена хранилищ сохранены совместимыми с OSFIT (перенос резервных копий и данных).
const NAME='osfit-db',VERSION=4
const stores=['programs','workouts','measurements','schedule'] as const
type Collection=typeof stores[number]
let opening:Promise<IDBDatabase>|null=null
function database():Promise<IDBDatabase>{
 if(opening)return opening
 opening=new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined'){opening=null;reject(new Error('IndexedDB недоступна в этом браузере'));return}
  const req=indexedDB.open(NAME,VERSION)
  let blocked=false
  req.onupgradeneeded=()=>{if(blocked){req.transaction?.abort();return}const db=req.result;for(const s of stores)if(!db.objectStoreNames.contains(s))db.createObjectStore(s,{keyPath:'id'});if(!db.objectStoreNames.contains('strengthSettings'))db.createObjectStore('strengthSettings',{keyPath:'id'})}
  req.onsuccess=()=>{const db=req.result;if(blocked){db.close();return}db.onversionchange=()=>{db.close();opening=null};db.onclose=()=>{opening=null};resolve(db)}
  req.onerror=()=>{if(!blocked)opening=null;reject(req.error)}
  req.onblocked=()=>{blocked=true;opening=null;reject(new Error('База данных заблокирована другой вкладкой. Закройте остальные вкладки LIFT/OSFIT и обновите страницу.'))}
 })
 return opening
}
type StrengthRecord={id:'current', revision:string, data:StrengthSettings}
export type StoredStrengthSnapshot={data:StrengthSettings, revision:string}
// Старый ключ никогда не удаляется. При первой инициализации сохраняем его копию в IDB.
export async function loadStrengthSettings():Promise<StoredStrengthSnapshot>{
 const db=await database()
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('strengthSettings','readwrite'), store=tx.objectStore('strengthSettings'), req=store.get('current')
  let result:StrengthRecord|undefined, failure:unknown
  req.onsuccess=()=>{try{
   result=req.result
   if(result){if(!validStrengthSettings(result.data)||typeof result.revision!=='string'||!result.revision)throw new Error('Повреждены данные силы; запись заблокирована.')}
   else {
    const storage=browserStrengthStorage()
    if(!storage)throw new Error('Старое хранилище недоступно; перенос данных силы заблокирован.')
    const legacy=readStrengthSettings(storage)
    if(legacy.error)throw new Error(legacy.error)
    result={id:'current',revision:uid(),data:legacy.data};store.add(result)
   }
  }catch(e){failure=e;tx.abort()}}
  tx.oncomplete=()=>resolve({data:result!.data,revision:result!.revision})
  tx.onabort=()=>reject(failure??tx.error??new Error('Чтение данных силы отменено'))
  tx.onerror=()=>{}
 })
}
export async function writeStrengthSettings(snapshot:StoredStrengthSnapshot,data:StrengthSettings):Promise<StoredStrengthSnapshot>{
 if(!validStrengthSettings(data))throw new Error('Некорректные данные силы')
 const db=await database()
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('strengthSettings','readwrite'), store=tx.objectStore('strengthSettings'), req=store.get('current')
  let next:StrengthRecord, failure:unknown
  req.onsuccess=()=>{try{
   const current=req.result as StrengthRecord|undefined
   if(!current||!validStrengthSettings(current.data)||current.revision!==snapshot.revision)throw new Error('Данные силы изменились в другом окне или при восстановлении. Откройте экран заново.')
   next={id:'current',revision:uid(),data};store.put(next)
  }catch(e){failure=e;tx.abort()}}
  tx.oncomplete=()=>resolve({data:next.data,revision:next.revision})
  tx.onabort=()=>reject(failure??tx.error??new Error('Не удалось сохранить данные силы'))
  tx.onerror=()=>{}
 })
}
/** Просим браузер не удалять данные при нехватке места (особенно важно для Safari). Безопасно игнорируется. */
export async function requestPersistence():Promise<boolean>{try{return !!(await navigator.storage?.persist?.())}catch{return false}}

// ---------- Санитайзеры: приводят любые записи (старые версии, ручные правки, битые импорты) к безопасному виду ----------
const num=(v:unknown,fallback=0)=>{const n=typeof v==='number'?v:typeof v==='string'?Number(v.replace(',','.')):NaN;return Number.isFinite(n)?n:fallback}
const str=(v:unknown,fallback='')=>typeof v==='string'?v:fallback
const isoOr=(v:unknown,fallback:string)=>{const s=str(v);return s&&Number.isFinite(Date.parse(s))?s:fallback}
export function cleanSet(raw:unknown):SetLine{
 const s=(raw&&typeof raw==='object'?raw:{}) as Record<string,unknown>
 const out:SetLine={id:str(s.id)||uid(),weight:Math.max(0,num(s.weight)),reps:Math.max(0,num(s.reps)),done:s.done===true}
 if(s.kind==='work'||s.kind==='warmup'||s.kind==='drop')out.kind=s.kind
 if(s.rpe!==undefined&&Number.isFinite(num(s.rpe,NaN)))out.rpe=num(s.rpe)
 if(s.rir!==undefined&&Number.isFinite(num(s.rir,NaN)))out.rir=num(s.rir)
 if(typeof s.tempo==='string')out.tempo=s.tempo
 if(typeof s.note==='string')out.note=s.note
 return out
}
export function cleanExercise(raw:unknown):ExerciseLine{
 const e=(raw&&typeof raw==='object'?raw:{}) as Record<string,unknown>
 const out:ExerciseLine={id:str(e.id)||uid(),name:str(e.name,'Упражнение'),sets:(Array.isArray(e.sets)?e.sets:[]).map(cleanSet)}
 if(e.weightUnit==='kg'||e.weightUnit==='blocks')out.weightUnit=e.weightUnit
 if(typeof e.superset==='string')out.superset=e.superset
 if(typeof e.note==='string')out.note=e.note
 return out
}
export const cleanExercises=(raw:unknown):ExerciseLine[]=>(Array.isArray(raw)?raw:[]).map(cleanExercise)
export function cleanProgram(raw:unknown):Program{const p=raw as Record<string,unknown>;return {id:str(p.id)||uid(),name:str(p.name,'Программа'),createdAt:isoOr(p.createdAt,new Date(0).toISOString()),exercises:cleanExercises(p.exercises)}}
export function cleanWorkout(raw:unknown):Workout{const w=raw as Record<string,unknown>;return {id:str(w.id)||uid(),name:str(w.name,'Тренировка'),programId:typeof w.programId==='string'?w.programId:null,date:isoOr(w.date,new Date(0).toISOString()),exercises:cleanExercises(w.exercises),volume:num(w.volume)}}
export function cleanMeasurement(raw:unknown):Measurement{
 const m=raw as Record<string,unknown>;const out:Measurement={id:str(m.id)||uid(),date:str(m.date).slice(0,10)||'1970-01-01'}
 for(const k of ['weight','waist','chest','arm','thigh','hips','neck'] as const){const n=num(m[k],NaN);if(Number.isFinite(n)&&n>0)out[k]=n}
 if(typeof m.note==='string')out.note=m.note
 return out
}
export function cleanSchedule(raw:unknown):Schedule{const a=raw as Record<string,unknown>;const out:Schedule={id:str(a.id)||uid(),date:str(a.date).slice(0,10),programId:str(a.programId)};const r=num(a.repeatDays);if(r>0)out.repeatDays=r;if(a.status==='planned'||a.status==='skipped')out.status=a.status;return out}
const objs=(v:unknown)=>(Array.isArray(v)?v:[]).filter(x=>x&&typeof x==='object')

async function store<T>(collection:Collection,mode:IDBTransactionMode,act:(s:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
 const db=await database()
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(collection,mode),req=act(tx.objectStore(collection))
  let result:T
  req.onsuccess=()=>{result=req.result}
  tx.oncomplete=()=>resolve(result)
  tx.onerror=()=>reject(tx.error)
  tx.onabort=()=>reject(tx.error)
 })
}
/** Чтение всех данных. Записи очищаются «на лету» (в базе ничего не меняется), чтобы битая запись не роняла интерфейс. */
export async function loadSnapshot():Promise<{programs:Program[],workouts:Workout[],measurements:Measurement[],schedule:Schedule[]}>{
 const db=await database()
 return new Promise((resolve,reject)=>{
  const tx=db.transaction([...stores],'readonly')
  const p=tx.objectStore('programs').getAll(),w=tx.objectStore('workouts').getAll(),m=tx.objectStore('measurements').getAll(),s=tx.objectStore('schedule').getAll()
  tx.oncomplete=()=>{try{resolve({programs:objs(p.result).map(cleanProgram),workouts:objs(w.result).map(cleanWorkout),measurements:objs(m.result).map(cleanMeasurement),schedule:objs(s.result).map(cleanSchedule)})}catch(e){reject(e)}}
  tx.onerror=()=>reject(tx.error)
  tx.onabort=()=>reject(tx.error)
 })
}
export const allSchedule=async()=>objs(await store<Schedule[]>('schedule','readonly',s=>s.getAll())).map(cleanSchedule)
export const saveSchedule=(x:Schedule)=>store<IDBValidKey>('schedule','readwrite',s=>s.put(x))
export const deleteSchedule=(id:string)=>store<undefined>('schedule','readwrite',s=>s.delete(id))
const defaultProfile:Profile={sex:'male',height:180,birthDate:'',goal:'Сила и масса',weightStep:2.5,autoProgress:true}
export const getProfile=():Profile=>{const raw=ls.json<Partial<Profile>>('osfit-profile',{});const p={...defaultProfile,...(raw&&typeof raw==='object'?raw:{})};if(p.sex!=='male'&&p.sex!=='female')p.sex='male';if(!(Number.isFinite(p.weightStep)&&p.weightStep>0))p.weightStep=2.5;return p}
export const saveProfile=(p:Profile)=>{ls.set('osfit-profile',JSON.stringify(p))}
export const allPrograms=()=>store<Program[]>('programs','readonly',s=>s.getAll())
export const allWorkouts=()=>store<Workout[]>('workouts','readonly',s=>s.getAll())
export const allMeasurements=()=>store<Measurement[]>('measurements','readonly',s=>s.getAll())
export const saveProgram=(x:Program)=>store<IDBValidKey>('programs','readwrite',s=>s.put(x))
export const saveWorkout=(x:Workout)=>store<IDBValidKey>('workouts','readwrite',s=>s.put(x))
export const saveMeasurement=(x:Measurement)=>store<IDBValidKey>('measurements','readwrite',s=>s.put(x))
export const deleteProgram=(id:string)=>store<undefined>('programs','readwrite',s=>s.delete(id))
export const deleteWorkout=(id:string)=>store<undefined>('workouts','readwrite',s=>s.delete(id))
export const deleteMeasurement=(id:string)=>store<undefined>('measurements','readwrite',s=>s.delete(id))
function valid(x:unknown):x is Backup{if(!x||typeof x!=='object')return false;const b=x as Partial<Backup>;return b.format==='osfit-backup'&&(b.version===1||b.version===2||b.version===3||b.version===4)&&Array.isArray(b.programs)&&Array.isArray(b.workouts)&&(b.measurements===undefined||Array.isArray(b.measurements))&&(b.schedule===undefined||Array.isArray(b.schedule))}
// Проверка до нормализации: санитайзеры не должны превращать повреждённый архив в пустые записи.
function validateBackupRecords(b:Backup):void {
 const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)
 const fail=():never=>{throw new Error('Архив содержит повреждённые записи или вложенные структуры; импорт отменён, данные не изменены')}
 const text=(o:Record<string,unknown>,k:string)=>{if(o[k]!==undefined&&typeof o[k]!=='string')fail()}
 const number=(o:Record<string,unknown>,k:string)=>{const v=o[k];if(v!==undefined&&!(typeof v==='number'&&Number.isFinite(v))&&!(typeof v==='string'&&v.trim()!==''&&Number.isFinite(Number(v.replace(',','.')))))fail()}
 const exercises=(v:unknown)=>{if(v===undefined)return;if(!Array.isArray(v))return fail();for(const e of v){if(!record(e))return fail();for(const k of ['id','name','weightUnit','superset','note'])text(e,k);if(e.weightUnit!==undefined&&e.weightUnit!=='kg'&&e.weightUnit!=='blocks')fail();if(e.sets!==undefined){if(!Array.isArray(e.sets))return fail();for(const s of e.sets){if(!record(s))return fail();for(const k of ['id','kind','tempo','note'])text(s,k);for(const k of ['weight','reps','rpe','rir'])number(s,k);if(s.done!==undefined&&typeof s.done!=='boolean')fail();if(s.kind!==undefined&&!['work','warmup','drop'].includes(s.kind as string))fail()}}}}
 for(const c of stores){const items:unknown[]=b[c]??[];const ids=new Set<string>();for(const item of items){if(!record(item))return fail();text(item,'id');if(typeof item.id==='string'&&item.id){if(ids.has(item.id))fail();ids.add(item.id)}
  if(c==='programs'||c==='workouts'){text(item,'name');exercises(item.exercises);if(c==='programs')text(item,'createdAt');else {text(item,'date');if(item.programId!==undefined&&item.programId!==null&&typeof item.programId!=='string')fail();number(item,'volume')}}
  else if(c==='measurements'){for(const k of ['date','note'])text(item,k);for(const k of ['weight','waist','chest','arm','thigh','hips','neck'])number(item,k)}
  else {for(const k of ['date','programId','status'])text(item,k);number(item,'repeatDays');if(item.status!==undefined&&item.status!=='planned'&&item.status!=='skipped')fail()}
 }}
}
/**
 * Восстановление из резервной копии. Все записи сначала нормализуются, и только потом в ОДНОЙ транзакции
 * заменяют данные. При любой ошибке транзакция откатывается — существующие данные не теряются.
 */
export async function importBackup(x:unknown){
 if(!valid(x))throw new Error('Неподдерживаемый архив OSFIT/LIFT')
 validateBackupRecords(x)
 if(x.version===4&&!validStrengthSettings(x.strengthSettings))throw new Error('Архив содержит повреждённые или отсутствующие данные силы; импорт отменён')
 // Для старых архивов сохраняем существующие ручные данные; сначала переносим старый ключ.
 if(x.version!==4)await loadStrengthSettings()
 const programs=objs(x.programs).map(cleanProgram),workouts=objs(x.workouts).map(cleanWorkout),measurements=objs(x.measurements).map(cleanMeasurement),schedule=objs(x.schedule).map(cleanSchedule)
 const db=await database()
 await new Promise<void>((resolve,reject)=>{
  const tx=db.transaction([...stores,'strengthSettings'],'readwrite')
  tx.oncomplete=()=>resolve()
  tx.onerror=()=>reject(tx.error)
  tx.onabort=()=>reject(tx.error??new Error('Импорт отменён, данные не изменены'))
  try{
   if(x.version===4)tx.objectStore('strengthSettings').put({id:'current',revision:uid(),data:x.strengthSettings})
   else {
    // Старая копия не содержит силы, но восстановление должно инвалидировать открытые редакторы.
    const strength=tx.objectStore('strengthSettings'), current=strength.get('current')
    current.onsuccess=()=>{const r=current.result as StrengthRecord|undefined;if(!r||!validStrengthSettings(r.data)||typeof r.revision!=='string'||!r.revision){tx.abort();return}strength.put({...r,revision:uid()})}
   }
   for(const c of stores)tx.objectStore(c).clear()
   for(const p of programs)tx.objectStore('programs').put(p)
   for(const w of workouts)tx.objectStore('workouts').put(w)
   for(const m of measurements)tx.objectStore('measurements').put(m)
   for(const a of schedule)tx.objectStore('schedule').put(a)
  }catch(e){try{tx.abort()}catch{/* already finished */}reject(e)}
 })
 if(x.profile&&typeof x.profile==='object')saveProfile({...defaultProfile,...x.profile})
}
export async function exportBackup():Promise<Backup>{
 await loadStrengthSettings()
 const db=await database()
 return new Promise((resolve,reject)=>{
  const tx=db.transaction([...stores,'strengthSettings'],'readonly')
  const p=tx.objectStore('programs').getAll(),w=tx.objectStore('workouts').getAll(),m=tx.objectStore('measurements').getAll(),s=tx.objectStore('schedule').getAll(),r=tx.objectStore('strengthSettings').get('current')
  tx.oncomplete=()=>{try{if(!r.result||!validStrengthSettings(r.result.data))throw new Error('Повреждены данные силы; экспорт отменён');resolve({format:'osfit-backup',version:4,exportedAt:new Date().toISOString(),programs:objs(p.result).map(cleanProgram),workouts:objs(w.result).map(cleanWorkout),measurements:objs(m.result).map(cleanMeasurement),schedule:objs(s.result).map(cleanSchedule),strengthSettings:r.result.data,profile:getProfile()})}catch(e){reject(e)}}
  tx.onabort=()=>reject(tx.error??new Error('Экспорт отменён'));tx.onerror=()=>{}
 })
}
