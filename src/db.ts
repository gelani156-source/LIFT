import type {Program,Workout,Backup,Measurement,Schedule,Profile} from './model'
const NAME='osfit-db',VERSION=3
const stores=['programs','workouts','measurements','schedule'] as const
type Collection=typeof stores[number]
let opening:Promise<IDBDatabase>|null=null
function database():Promise<IDBDatabase>{
 if(opening)return opening
 opening=new Promise((resolve,reject)=>{
  const req=indexedDB.open(NAME,VERSION)
  req.onupgradeneeded=()=>{const db=req.result;for(const s of stores)if(!db.objectStoreNames.contains(s))db.createObjectStore(s,{keyPath:'id'})}
  req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{db.close();opening=null};db.onclose=()=>{opening=null};resolve(db)}
  req.onerror=()=>{opening=null;reject(req.error)}
  req.onblocked=()=>{opening=null;reject(new Error('База данных заблокирована другой вкладкой'))}
 })
 return opening
}
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
export async function loadSnapshot():Promise<{programs:Program[],workouts:Workout[],measurements:Measurement[],schedule:Schedule[]}>{
 const db=await database()
 return new Promise((resolve,reject)=>{
  const tx=db.transaction([...stores],'readonly')
  const p=tx.objectStore('programs').getAll(),w=tx.objectStore('workouts').getAll(),m=tx.objectStore('measurements').getAll(),s=tx.objectStore('schedule').getAll()
  tx.oncomplete=()=>resolve({programs:p.result as Program[],workouts:w.result as Workout[],measurements:m.result as Measurement[],schedule:s.result as Schedule[]})
  tx.onerror=()=>reject(tx.error)
  tx.onabort=()=>reject(tx.error)
 })
}
export const allSchedule=()=>store<Schedule[]>('schedule','readonly',s=>s.getAll())
export const saveSchedule=(x:Schedule)=>store<IDBValidKey>('schedule','readwrite',s=>s.put(x))
export const deleteSchedule=(id:string)=>store<undefined>('schedule','readwrite',s=>s.delete(id))
const defaultProfile:Profile={sex:'male',height:180,birthDate:'',goal:'Сила и масса',weightStep:2.5,autoProgress:true}
export const getProfile=():Profile=>{try{return {...defaultProfile,...JSON.parse(localStorage.getItem('osfit-profile')||'{}')}}catch{return defaultProfile}}
export const saveProfile=(p:Profile)=>localStorage.setItem('osfit-profile',JSON.stringify(p))
export const allPrograms=()=>store<Program[]>('programs','readonly',s=>s.getAll())
export const allWorkouts=()=>store<Workout[]>('workouts','readonly',s=>s.getAll())
export const allMeasurements=()=>store<Measurement[]>('measurements','readonly',s=>s.getAll())
export const saveProgram=(x:Program)=>store<IDBValidKey>('programs','readwrite',s=>s.put(x))
export const saveWorkout=(x:Workout)=>store<IDBValidKey>('workouts','readwrite',s=>s.put(x))
export const saveMeasurement=(x:Measurement)=>store<IDBValidKey>('measurements','readwrite',s=>s.put(x))
export const deleteProgram=(id:string)=>store<undefined>('programs','readwrite',s=>s.delete(id))
export const deleteWorkout=(id:string)=>store<undefined>('workouts','readwrite',s=>s.delete(id))
export const deleteMeasurement=(id:string)=>store<undefined>('measurements','readwrite',s=>s.delete(id))
function valid(x:unknown):x is Backup{if(!x||typeof x!=='object')return false;const b=x as Partial<Backup>;return b.format==='osfit-backup'&&(b.version===1||b.version===2||b.version===3)&&Array.isArray(b.programs)&&Array.isArray(b.workouts)&&(!b.measurements||Array.isArray(b.measurements))&&b.programs.every(p=>typeof p?.id==='string'&&Array.isArray(p?.exercises))&&b.workouts.every(w=>typeof w?.id==='string'&&Array.isArray(w?.exercises))}
export async function importBackup(x:unknown){
 if(!valid(x))throw new Error('Неподдерживаемый архив OSFIT')
 const db=await database()
 await new Promise<void>((resolve,reject)=>{
  const tx=db.transaction([...stores],'readwrite')
  tx.oncomplete=()=>resolve()
  tx.onerror=()=>reject(tx.error)
  tx.onabort=()=>reject(tx.error)
  for(const c of stores)tx.objectStore(c).clear()
  for(const p of x.programs)tx.objectStore('programs').put(p)
  for(const w of x.workouts)tx.objectStore('workouts').put(w)
  for(const m of x.measurements??[])tx.objectStore('measurements').put(m)
  for(const a of x.schedule??[])tx.objectStore('schedule').put(a)
 })
 if(x.profile)saveProfile(x.profile)
}
export async function exportBackup():Promise<Backup>{const {programs,workouts,measurements,schedule}=await loadSnapshot();return {format:'osfit-backup',version:3,exportedAt:new Date().toISOString(),programs,workouts,measurements,schedule,profile:getProfile()}}
