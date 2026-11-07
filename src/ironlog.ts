import {uid,type Program,type Workout,type Measurement,type ExerciseLine,type SetLine,volumeOf} from './model'
const finite=(v:unknown)=>{if(typeof v==='number')return Number.isFinite(v)?v:0;if(typeof v==='string'){const n=Number(v.replace(',','.'));return Number.isFinite(n)?n:0}return 0}
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{}
const array=(v:unknown):unknown[]=>Array.isArray(v)?v:[]
const string=(v:unknown)=>typeof v==='string'?v.trim():''
const date=(v:unknown)=>{const s=string(v);if(!s)return new Date().toISOString();const d=new Date(s);return Number.isFinite(d.getTime())?d.toISOString():new Date().toISOString()}
// doneByDefault: для записей ИСТОРИИ подход считается выполненным, если источник явно не пометил его невыполненным; иначе импорт давал нулевой тоннаж.
const parseSets=(raw:unknown,doneByDefault=false):SetLine[]=>array(raw).map(v=>{
 const s=obj(v);const flag=s.done??s.completed??s.isDone
 const out:SetLine={id:uid(),weight:finite(s.weight??s.kg),reps:finite(s.reps??s.repetitions??s.repeat),done:typeof flag==='boolean'?flag:doneByDefault}
 if(s.kind==='work'||s.kind==='warmup'||s.kind==='drop')out.kind=s.kind
 for(const key of ['rpe','rir'] as const)if(s[key]!==undefined&&(typeof s[key]==='number'||typeof s[key]==='string')&&Number.isFinite(Number(String(s[key]).replace(',','.'))))out[key]=finite(s[key])
 if(typeof s.tempo==='string')out.tempo=s.tempo
 if(typeof s.note==='string')out.note=s.note
 return out
}).filter(s=>s.weight>=0&&s.reps>=0&&s.reps<=300)
const parseExercises=(raw:unknown,doneByDefault=false):ExerciseLine[]=>array(raw).map(v=>{
 const e=obj(v);const out:ExerciseLine={id:uid(),name:string(e.name??e.exercise??e.title),sets:parseSets(e.sets??e.approaches,doneByDefault)}
 if(e.weightUnit==='kg'||e.weightUnit==='blocks')out.weightUnit=e.weightUnit
 if(typeof e.superset==='string')out.superset=e.superset
 if(typeof e.note==='string')out.note=e.note
 return out
}).filter(e=>e.name&&e.sets.length)
export function convertIronlog(raw:unknown):{programs:Program[],workouts:Workout[],measurements:Measurement[],warnings:string[]}{
 const x=obj(raw);const warnings:string[]=[];const programs:Program[]=[];const workouts:Workout[]=[];const measurements:Measurement[]=[]
 const sources=[...array(x.programs),...array(x.plans)];for(const p of sources){const v=obj(p);const exercises=parseExercises(v.exercises??v.items);if(!exercises.length){warnings.push('Программа без распознанных подходов пропущена');continue}programs.push({id:uid(),name:string(v.name??v.title)||'Импортированная программа',createdAt:date(v.createdAt),exercises})}
 for(const w of [...array(x.entries),...array(x.workouts),...array(x.sessions)]){const v=obj(w);const exercises=parseExercises(v.exercises??v.items??v.lines,true);if(!exercises.length){warnings.push('Запись тренировки без подходов пропущена');continue}const t:Workout={id:uid(),name:string(v.name??v.title??v.day)||'Тренировка IRONLOG',date:date(v.date??v.createdAt),programId:null,exercises,volume:0};t.volume=volumeOf(t.exercises);workouts.push(t)}
 for(const m of array(x.measurements)){const v=obj(m);const entry:Measurement={id:uid(),date:date(v.date).slice(0,10)};for(const key of ['weight','waist','chest','arm','thigh'] as const){const n=finite(v[key]);if(n>0&&n<500)entry[key]=n}entry.note=string(v.note);if([entry.weight,entry.waist,entry.chest,entry.arm,entry.thigh].some(n=>n!==undefined))measurements.push(entry)}
 if(!programs.length&&!workouts.length&&!measurements.length)warnings.push('Не найдены поддерживаемые структурированные записи. Для точного импорта нужен пример файла IRONLOG 7.0; существующие данные не изменены.')
 if(x.version!==undefined)warnings.push('Источник: версия '+String(x.version)+'; проверьте предпросмотр и итоговые записи.')
 return {programs,workouts,measurements,warnings}
}
