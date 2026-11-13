import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {calculateAchievements} from './achievements'
import {CharacterCard, CharacterScreen} from './Character'
import {ThemeToggle} from './ThemeToggle'
import WorkoutMiniWidget from './WorkoutMiniWidget'
import Dynamics from './Dynamics'
import ExerciseCard from './ExerciseCard'
import MuscleMap from './AnatomyMuscleMap'
import AnatomyExplorer from './AnatomyExplorer'
import {store} from './storage'
import {exerciseMuscleLoad} from './MuscleMap'
import {groups, suggestions, serializeProgram, readProgramFile, getExerciseAlternative, weeklyMuscleSets, bodyPartPrompt} from './smart'
import {buildCatalogIndex, filterCatalogIndex, catalogLabel, catalogKey, addCatalogAlias} from './catalog'
import {CATALOG_STORAGE_KEY, readCatalogPreferences, updateCatalogPreferences, type CatalogPreferences} from './catalogStorage'

import {convertIronlog} from './ironlog'
import {
  Dumbbell, CalendarDays, ChartNoAxesCombined, Plus, Trash2, ChevronLeft,
  Check, Download, Upload, Settings, Save, Play, Copy, PenLine, ArrowLeft, Search, Activity
} from 'lucide-react'
import {
  cleanExercises, loadSnapshot, saveProgram, deleteProgram, saveWorkout,
  deleteWorkout, importBackup, exportBackup, allSchedule, saveSchedule, deleteSchedule, getProfile, saveProfile, saveMeasurement, deleteMeasurement
} from './db'
import {
  blankSet, cloneLines, estimate1RM, exerciseCatalog, isWorkSet, localDay, uid, volumeOf, workoutDate,
  weightUnitOf, weightInKg, formatWeight, exerciseDisplayName,
  type Program, type Workout, type ExerciseLine, type SetLine, type Schedule, type Profile, type Measurement
} from './model'


// OSFIT unified update — templates, portable sessions, responsive SVG and compact UI.
const OSFIT_CSS = `
.osfit-goals-panel{margin:18px 0;padding:14px;border:1px solid var(--separator,#39404b);border-radius:16px}.osfit-goal-card{padding:14px;margin:10px 0;border-radius:13px;background:var(--surface-secondary,#20252c);border:1px solid var(--separator,#39404b)}.osfit-goal-card .input{margin:6px 0 12px}.osfit-goal-card p{margin:8px 0}.osfit-goal-card small{opacity:.75}.osfit-goal-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.osfit-goal-progress{height:5px;background:rgba(130,130,140,.25);border-radius:20px;overflow:hidden;margin:12px 0 8px}.osfit-goal-progress>div{height:100%;background:#0a84ff;border-radius:20px}.osfit-goal-alert{padding:12px 16px;border-radius:12px;background:var(--surface-secondary,#20252c);border:1px solid #0a84ff;display:flex;justify-content:space-between;gap:10px}.osfit-goal-alert button{border:0;background:none;color:inherit}

 .osfit-period-pills{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:12px 0}
.osfit-period-pills button{min-width:0;background:var(--surface-2,#23252a);color:var(--text,#d8dae1);border:1px solid var(--border,#3c4047);border-radius:12px;padding:12px 3px;font-size:12px;cursor:pointer}
.osfit-period-pills button.selected{background:var(--accent,#0a84ff);color:white;border-color:var(--accent,#0a84ff);font-weight:700}
.osfit-session-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px}
.osfit-session-toolbar .btn{white-space:nowrap}
.osfit-exercise-summary{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;text-align:left;background:transparent;color:inherit;border:0;padding:4px 0}.osfit-exercise-summary strong{font-size:15px}.osfit-completed{opacity:.66}.osfit-extras-toggle{background:#1b2930;border:1px solid #374b54;color:#0a84ff;padding:7px 12px;border-radius:9px;font-size:12px;margin:7px 0}.osfit-group-filters{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.osfit-group-filters button{border:1px solid #3e525b;background:#19242a;color:#c3d5d7;border-radius:15px;padding:8px 12px;font-size:12px}.osfit-group-filters .active{background:#0a84ff;color:#13261c}.osfit-compact .set-row{margin-bottom:4px}.osfit-compact .set-extras{display:none}.osfit-compact .set-row .row-remove{display:none}.osfit-compact .exercise-options{display:none}.osfit-compact .set-row:focus-within .set-extras{display:grid}.osfit-inline-actions{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.osfit-inline-actions button{font-size:12px;padding:7px 10px;border-radius:8px;background:#25333a;color:#e4e4e9;border:1px solid #425861}.osfit-goal{font-size:13px;color:#98989d}.osfit-pick-list{max-height:320px;overflow:auto}.osfit-section{padding:12px;border:1px solid #33444b;border-radius:12px;margin:10px 0}

*,*::before,*::after{box-sizing:border-box}
.app,.content,.card,section,.measure-grid,.measure-grid>label{min-width:0;max-width:100%}
.content input.input,.content select.input,.content textarea.input,.content input[type="date"],.content input[type="month"]{display:block;box-sizing:border-box;width:100%;max-width:100%;min-width:0}
.content input[type="date"],.content input[type="month"]{-webkit-appearance:none;appearance:none;min-height:48px;overflow:hidden}
.content input[type="date"]::-webkit-date-and-time-value{text-align:left;min-width:0}
.measure-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.bottom-nav{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));padding-bottom:max(12px,env(safe-area-inset-bottom))}
.bottom-nav button{min-width:0;padding-inline:2px}.bottom-nav button span{font-size:11px;white-space:nowrap}
.osfit-template-list{display:grid;gap:8px;margin:12px 0}.osfit-template-list button{text-align:left;padding:14px;background:#192127;color:#e9f3f3;border:1px solid #37434a;border-radius:12px}
.osfit-template-list small{display:block;color:#9aaeb1;margin-top:5px}.osfit-helper{font-size:12px;color:#99aeb0;margin:8px 0 16px}
.osfit-sex-svg{width:100%;max-width:320px;max-height:440px;display:block;margin:0 auto}
.osfit-input-row{display:flex;align-items:center;gap:8px}.osfit-input-row input{flex:1;min-width:0}
.osfit-view-buttons{display:flex;gap:8px;justify-content:center;margin:12px 0}
.osfit-view-buttons button{border:1px solid #47565b;border-radius:9px;background:#1d282d;color:#dde8e8;padding:9px 16px}
.osfit-view-buttons button.active{border-color:#0a84ff;color:#0a84ff}
@media(max-width:390px){.content{padding-inline:14px}.card{padding-inline:14px}.measure-grid{gap:8px}.bottom-nav button span{font-size:10px}}

/* OSFIT 4.8: consistent iOS spacing */
.measure-grid{column-gap:14px;row-gap:22px;margin-top:18px}
.measure-grid>label{display:flex;flex-direction:column;gap:10px;line-height:1.4}
.measure-grid>label .input{margin-top:0!important}
.osfit-stat-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:4px;margin-bottom:22px}
.osfit-stat-cards>div{display:flex;flex-direction:column;align-items:flex-start;gap:8px;min-width:0;justify-content:space-between}
.osfit-stat-cards>div small{display:block;margin:0;line-height:1.35}
.osfit-stat-cards>div b{display:block;line-height:1.25;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.osfit-empty-chart{border:1px dashed var(--border,#41444d);color:var(--muted,#9299a4);border-radius:14px;padding:22px 14px;font-size:13px;text-align:center;margin:10px 0 18px}
.osfit-goals-panel>.osfit-goal-card{margin-top:12px}
.osfit-goals-panel .field-label{display:block;margin-top:16px;margin-bottom:8px}
.osfit-goals-panel .input{margin-bottom:8px}
.content .field-label{line-height:1.45}
.content .input{scroll-margin-bottom:120px}
.content{padding-bottom:max(30px,env(safe-area-inset-bottom))}
.app{padding-bottom:calc(100px + env(safe-area-inset-bottom))}
.bottom-nav{padding-bottom:max(12px,env(safe-area-inset-bottom));z-index:20}
.muscle-legend button.active{border-color:#0a84ff!important;background:rgba(10,132,255,.16)!important;color:#0a84ff!important}
@media(max-width:390px){.measure-grid{column-gap:10px;row-gap:18px}.osfit-stat-cards{gap:7px}.osfit-stat-cards>div{padding:12px 9px}}

`;
const PLAN_TEMPLATES: {title:string,desc:string,days:{name:string,items:[string,number,number][]}[]}[]=[
{title:'Фулбади A/B/C',desc:'3 дня · всё тело',days:[{name:'Фулбади A',items:[['Присед со штангой',3,8],['Жим штанги лёжа',3,8],['Тяга штанги в наклоне',3,10],['Планка',3,30]]},{name:'Фулбади B',items:[['Румынская тяга',3,8],['Жим стоя',3,8],['Тяга верхнего блока',3,10],['Выпады',3,10]]},{name:'Фулбади C',items:[['Жим ногами',3,10],['Жим гантелей лёжа',3,10],['Подтягивания',3,8],['Скручивания',3,15]]}]},
{title:'Верх / Низ',desc:'4 дня · Upper / Lower',days:[{name:'Верх A',items:[['Жим штанги лёжа',4,6],['Тяга штанги в наклоне',4,8],['Жим стоя',3,8],['Сгибание рук с гантелями',3,12]]},{name:'Низ A',items:[['Присед со штангой',4,6],['Румынская тяга',3,8],['Подъём на носки',3,15]]},{name:'Верх B',items:[['Жим гантелей лёжа',3,10],['Подтягивания',3,8],['Разведение гантелей в стороны',3,12]]},{name:'Низ B',items:[['Жим ногами',4,10],['Сгибание ног',3,12],['Выпады',3,10]]}]},
{title:'Тяни / Толкай / Ноги',desc:'3 дня · Push/Pull/Legs',days:[{name:'Толкай',items:[['Жим штанги лёжа',4,8],['Жим стоя',3,8],['Брусья',3,10]]},{name:'Тяни',items:[['Подтягивания',4,8],['Тяга штанги в наклоне',3,10],['Сгибание рук со штангой',3,12]]},{name:'Ноги',items:[['Присед со штангой',4,8],['Румынская тяга',3,10],['Подъём на носки',4,15]]}]},
{title:'Классический сплит',desc:'3 дня · по мышечным группам',days:[{name:'Грудь / Трицепс',items:[['Жим штанги лёжа',4,8],['Жим на наклонной скамье',3,10],['Разгибание рук на блоке',3,12]]},{name:'Спина / Бицепс',items:[['Подтягивания',4,8],['Тяга горизонтального блока',3,10],['Сгибание рук с гантелями',3,12]]},{name:'Ноги / Плечи',items:[['Присед со штангой',4,8],['Сгибание ног',3,12],['Жим стоя',3,8]]}]},
{title:'Силовой базовый',desc:'3 дня · базовые движения',days:[{name:'Сила A',items:[['Присед со штангой',5,5],['Жим штанги лёжа',5,5],['Тяга штанги в наклоне',3,8]]},{name:'Сила B',items:[['Становая тяга',3,5],['Жим стоя',5,5],['Подтягивания',3,8]]},{name:'Сила C',items:[['Присед со штангой',3,5],['Жим штанги лёжа',5,5],['Румынская тяга',3,8]]}]},
{title:'Гибкий цикл A/B',desc:'Чередование без привязки к дням недели',days:[{name:'Цикл A',items:[['Присед со штангой',3,8],['Жим штанги лёжа',3,8],['Тяга верхнего блока',3,10]]},{name:'Цикл B',items:[['Румынская тяга',3,8],['Жим стоя',3,8],['Подтягивания',3,8]]}]}
];
const toLines=(items:[string,number,number][]):ExerciseLine[]=>items.map(([name,n,reps])=>({id:uid(),name,sets:Array.from({length:n},()=>({...blankSet(),reps}))}));

// Compact local ZIP/XLSX reader. Only simple .xlsx worksheets; formulas are read via cached values.
async function xlsxAsRows(file:File):Promise<string[][]>{
 const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer);let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break}
 if(end<0)throw new Error('Не найден ZIP-контейнер XLSX');let pos=view.getUint32(end+16,true);const count=view.getUint16(end+10,true);const entries=new Map<string,{offset:number,packed:number,method:number}>();
 for(let j=0;j<count;j++){if(view.getUint32(pos,true)!==0x02014b50)break;const method=view.getUint16(pos+10,true),packed=view.getUint32(pos+20,true),nl=view.getUint16(pos+28,true),el=view.getUint16(pos+30,true),cl=view.getUint16(pos+32,true),offset=view.getUint32(pos+42,true);const name=new TextDecoder().decode(bytes.slice(pos+46,pos+46+nl));entries.set(name,{offset,packed,method});pos+=46+nl+el+cl}
 async function read(name:string){const e=entries.get(name);if(!e)return '';const start=e.offset+30+view.getUint16(e.offset+26,true)+view.getUint16(e.offset+28,true),data=bytes.slice(start,start+e.packed);if(e.method===0)return new TextDecoder().decode(data);if(e.method!==8)throw new Error('Неподдерживаемое сжатие XLSX');const stream=new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw' as CompressionFormat));return await new Response(stream).text()}
 const shared=await read('xl/sharedStrings.xml');const doc=new DOMParser();const strings=shared?Array.from(doc.parseFromString(shared,'text/xml').getElementsByTagName('si')).map(el=>el.textContent||''):[];const path=Array.from(entries.keys()).find(x=>/^xl\/worksheets\/sheet\d+\.xml$/.test(x));if(!path)throw new Error('Лист XLSX не найден');const xml=doc.parseFromString(await read(path),'text/xml');const rows=Array.from(xml.getElementsByTagName('row')).slice(0,2000);return rows.map(row=>{const result:string[]=[];for(const cell of Array.from(row.getElementsByTagName('c'))){const ref=cell.getAttribute('r')||'A';let idx=0;for(const ch of (ref.match(/^[A-Z]+/)?.[0]||'A'))idx=idx*26+ch.charCodeAt(0)-64;idx--;if(idx>80)continue;const value=cell.getElementsByTagName('v')[0]?.textContent||cell.getElementsByTagName('is')[0]?.textContent||'';result[idx]=cell.getAttribute('t')==='s'?strings[Number(value)]||'':value}return result.map(v=>v||'')})
}
function tableToTraining(rows:string[][]):ExerciseLine[]{
 const groups=new Map<string,SetLine[]>();for(const [idx,row] of rows.entries()){if(idx===0&&row.some(x=>/упражнен|exercise|weight|вес|повтор/i.test(x)))continue;const name=(row[0]||'').trim();if(!name)continue;const weight=Number((row[1]||'0').replace(',','.')),reps=Number(row[2]||8),done=/^(1|true|да|yes|done|✓|x)$/i.test((row[3]||'').trim());if(!Number.isFinite(weight)||!Number.isFinite(reps)||weight<0||reps<0)continue;groups.set(name,[...(groups.get(name)||[]),{...blankSet(),weight,reps,done}])}return Array.from(groups,([name,sets])=>({id:uid(),name,sets}))
}
function fromPortableJson(data:unknown):ExerciseLine[]{
 if(!data||typeof data!=='object')throw new Error('Неверная структура JSON');const obj=data as Record<string,unknown>;const candidate=Array.isArray(obj.exercises)?obj.exercises:Array.isArray(obj.rows)?obj.rows:Array.isArray(obj.workouts)?(obj.workouts[0] as Record<string,unknown>)?.exercises:null;
 if(!Array.isArray(candidate))throw new Error('Нет списка exercises/rows в JSON');return candidate.map((raw:unknown)=>{const x=raw as Record<string,unknown>;const name=String(x.name||x.exercise||'').trim();const sets=Array.isArray(x.sets)?x.sets.map((v:unknown)=>{const a=v as Record<string,unknown>;return {...blankSet(),weight:Number(a.weight||0),reps:Number(a.reps||0),done:a.done===true||a.completed===true}}):[];if(!name||!sets.length||sets.some(s=>!Number.isFinite(s.weight)||!Number.isFinite(s.reps)||s.weight<0||s.reps<0))throw new Error('Ошибочный подход в импортируемом JSON');return {id:uid(),name,sets,...(x.weightUnit==='kg'||x.weightUnit==='blocks'?{weightUnit:x.weightUnit}: {})}})
}

// Черновик из localStorage может быть повреждён (старая версия, ручная правка): чистим структуру, чтобы не уронить интерфейс.
type Draft={name:string,rows:ExerciseLine[],activeProgramId:string|null,editingWorkoutId:string|null,sessionDate:string}
const readDraft=():Draft|null=>{try{const raw=JSON.parse(store.get('osfit-session-draft')||'null') as Record<string,unknown>|null;if(!raw||typeof raw!=='object'||!Array.isArray(raw.rows))return null;return {name:typeof raw.name==='string'?raw.name:'Тренировка',rows:cleanExercises(raw.rows),activeProgramId:typeof raw.activeProgramId==='string'?raw.activeProgramId:null,editingWorkoutId:typeof raw.editingWorkoutId==='string'?raw.editingWorkoutId:null,sessionDate:typeof raw.sessionDate==='string'?raw.sessionDate:''}}catch{return null}}
type Tab = 'train' | 'history' | 'progress' | 'calendar' | 'body' | 'muscles' | 'character'
type Editor = 'program' | 'session' | null
const formatDate = (s: string) => new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
const fmt = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 1 })
const newLine = (name: string): ExerciseLine => ({ id: uid(), name, sets: [blankSet(), blankSet(), blankSet()] })
const newSet = (weight: number, reps: number): SetLine => ({ id: uid(), weight, reps, done: false })

// LIFT: импорт IRONLOG TXT — все блоки нагрузки, варианты порядка и неизвестный вес.
// Вес гантелей хранится для ОДНОЙ гантели. Автоматического удвоения тоннажа здесь нет.
function parseTrainingText(text: string): { exercises: ExerciseLine[], warnings: string[] } {
  const exercises: ExerciseLine[] = []
  const warnings: string[] = []
  const days = /^(понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)\s*[:.]?$/i
  const bodyGroups = /^(дельты|плечи|грудь|спина|ноги|бицепс|трицепс|пресс|икры)$/i
  const strip = (v: string) => v.replace(/^\s*(?:[-*•]\s*)?(?:\[\s*[xX]?\s*\]\s*)?/, '').trim()
  const weightNumber = String.raw`\d+(?:[.,]\d+)?`
  const sep = String.raw`[/\*×xх]`
  const weightBlock = new RegExp(`^(${weightNumber})\\s+(\\d{1,2})\\s*${sep}\\s*(\\d{1,3})(?=\\s|$)`, 'i')
  const singleBlock = new RegExp(`^(${weightNumber})\\s*${sep}\\s*(\\d{1,3})(?=\\s|$)`, 'i')
  const countFirst = new RegExp(`^(\\d{1,2})\\s*${sep}\\s*(\\d{1,3})(?:\\s+(${weightNumber}|\\?))?$`, 'i')
  const number = (v: string) => Number(v.replace(',', '.'))
  const make = (weight: number, reps: number, count: number, unknown: boolean): SetLine[] =>
    Array.from({length: count}, () => ({
      ...newSet(weight, reps),
      ...(unknown ? {note: 'Вес не указан — уточнить перед тренировкой'} : {})
    }))
  const valid = (weight: number, reps: number, count: number) =>
    Number.isFinite(weight) && weight >= 0 && weight <= 9999 &&
    Number.isInteger(reps) && reps >= 1 && reps <= 300 &&
    Number.isInteger(count) && count >= 1 && count <= 30

  for (const raw of text.split(/\r?\n|;/)) {
    const line = strip(raw)
    if (!line || days.test(line)) continue
    if (/^дельты$/i.test(line)) {
      exercises.push({id:uid(),name:'Армейский жим',sets:make(0,10,4,true),note:'Автовыбор для дельт: уточни упражнение и рабочий вес'})
      warnings.push('«Дельты»: выбран армейский жим 4×10 — проверь упражнение и укажи вес')
      continue
    }
    if (bodyGroups.test(line)) {
      const group = bodyPartPrompt(line)
      exercises.push({id:uid(),name:line,sets:[]})
      warnings.push(`«${line}» — уточни упражнение и подходы${group ? '. Варианты: ' + suggestions(group).slice(0,4).join(', ') : ''}`)
      continue
    }

    let name = ''
    let found: SetLine[] = []
    let unknown = false
    let dumbbell = false
    // Ищем границу между названием и первым числовым блоком.
    // Проверяем каждый числовой токен: цифры в названиях тоже возможны.
    // Снаряд допускается после чисел: «Бицепс 4/10 15 гантели».
    const trailingEquipment = /\s+(?:(?:с|со)\s+штангой|(?:с\s+)?гантел(?:ями|и|ей))\s*$/i
    const normalized = line.replace(/\s*кг(?=\s|$)/gi, '').replace(trailingEquipment, '').trim()
    for (const token of normalized.matchAll(/\d+(?:[.,]\d+)?/g)) {
      if (token.index === undefined || token.index === 0) continue
      const prefix = normalized.slice(0, token.index).trim()
      if (!prefix) continue
      const tail = normalized.slice(token.index).trim()
      const local: SetLine[] = []
      let localUnknown = false
      let recognized = false
      const direct = tail.match(countFirst)
      if (direct) {
        const first = Number(direct[1]), reps = Number(direct[2]), last = direct[3]
        // 3/12 15 кг = 3×12 по 15; 110/5 4 = 4×5 по 110.
        // Для неоднозначных записей вес/повторы/количество выдаём предупреждение.
        let count = first, weight = last && last !== '?' ? number(last) : 0
        if (last && last !== '?' && first > 30 && Number.isInteger(weight) && weight <= 30) {
          count = weight; weight = first
          warnings.push(`Проверь формат «${line}»: принято как ${count}×${reps} с весом ${weight} кг`)
        }
        if (valid(weight, reps, count)) {
          localUnknown = last === '?' || (last === undefined && !/пресс|скручив|подтяг|планк|отжим|брусь/i.test(prefix))
          local.push(...make(weight, reps, count, localUnknown))
          recognized = true
        }
      }
      if (!recognized) {
        let rest = tail
        let blocks = 0
        while (rest && blocks < 40) {
          const weighted = rest.match(weightBlock)
          if (weighted) {
            const weight = number(weighted[1]), count = Number(weighted[2]), reps = Number(weighted[3])
            if (!valid(weight, reps, count)) break
            local.push(...make(weight, reps, count, false))
            rest = rest.slice(weighted[0].length).trim(); blocks++; continue
          }
          const single = rest.match(singleBlock)
          if (single) {
            const weight = number(single[1]), reps = Number(single[2])
            if (!valid(weight, reps, 1)) break
            local.push(...make(weight, reps, 1, false))
            rest = rest.slice(single[0].length).trim(); blocks++; continue
          }
          break
        }
        recognized = local.length > 0 && !rest
      }
      if (recognized && local.length && local.length <= 300) {
        name = prefix; found = local; unknown = localUnknown
        dumbbell = /гантел/i.test(line)
        break
      }
    }
    if (!found.length || !name) {warnings.push(`Не распознано: ${line}`);continue}
    if (/^бицепс(?:\s+(?:с\s+)?гантел(?:ями|и|ей))?$/i.test(name)) {
      name = /гантел/i.test(line) ? 'Сгибание рук с гантелями' : 'Сгибание рук со штангой'
    } else if (/^шраги(?:\s+(?:(?:с|со)\s+штангой|(?:с\s+)?гантел(?:ями|и|ей)))?$/i.test(name)) {
      name = /штанг/i.test(line) ? 'Шраги со штангой' : /гантел/i.test(line) ? 'Шраги с гантелями' : 'Шраги'
    }
    if (unknown) warnings.push(`«${line}»: вес неизвестен, заполни его перед тренировкой`)
    const note = [unknown ? 'Вес уточнить' : '', dumbbell ? 'Вес указан для одной гантели; тоннаж в текущей версии не удваивается автоматически' : ''].filter(Boolean).join('. ')
    const existing = exercises.find(e => e.name.toLocaleLowerCase('ru') === name.toLocaleLowerCase('ru'))
    if (existing) {
      existing.sets.push(...found)
      if (note) existing.note = [existing.note, note].filter(Boolean).join('. ')
    } else exercises.push({id:uid(),name,sets:found,...(note ? {note} : {})})
  }
  return {exercises,warnings}
}

export default function App() {
  const [tab, setTab] = useState<Tab>('train')
  const [editor, setEditor] = useState<Editor>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [achievementsEnabled, setAchievementsEnabled] = useState(() => {try{return window.localStorage.getItem('lift-achievements-enabled') === 'true'}catch{return false}})
  const toggleAchievements = (enabled: boolean) => {try{window.localStorage.setItem('lift-achievements-enabled', String(enabled));setAchievementsEnabled(enabled)}catch{setError('Не удалось сохранить настройку достижений. Изменение не применено.')}}
  const achievements = achievementsEnabled ? calculateAchievements(workouts) : null
  const catalogIndex=useMemo(()=>buildCatalogIndex(programs,workouts),[programs,workouts])
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [bodyForm, setBodyForm] = useState({date:localDay(),weight:'',waist:'',chest:'',arm:'',thigh:'',hips:'',neck:'',note:''})
  const [calendarMonth, setCalendarMonth] = useState(localDay().slice(0,7))
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [personalRecord, setPersonalRecord] = useState<{exercise:string,weight:number,reps:number,estimated:number}|null>(null)
  const [lastSummary, setLastSummary] = useState<{name:string,exercises:number,sets:number,volume:number,prs:string[]}|null>(null)
  const [name, setName] = useState('')
  const [rows, setRows] = useState<ExerciseLine[]>([])
  const [miniRevision,setMiniRevision]=useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeProgramId, setActiveProgramId] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [picker, setPicker] = useState(false)
  const [exerciseCard, setExerciseCard] = useState<string|null>(null)
  const closePicker = () => { setPicker(false); setExerciseCard(null) }
  const [query, setQuery] = useState('')
  const [groupFilter,setGroupFilter]=useState('Все')
  const [catalogPreferences,setCatalogPreferences]=useState<CatalogPreferences>({version:1,favorites:[],aliases:{}})
  const {favorites:catalogFavorites,aliases:catalogAliases}=catalogPreferences
  const [catalogFavoriteOnly,setCatalogFavoriteOnly]=useState(false)
  useEffect(()=>{
    const reload=()=>{try{setCatalogPreferences(readCatalogPreferences(window.localStorage))}catch{setError('Не удалось прочитать настройки каталога. Существующие данные не изменены.')}}
    reload()
    const sync=(event:StorageEvent)=>{if(event.key===CATALOG_STORAGE_KEY||event.key===null)reload()}
    window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)
  },[])
  const saveCatalog=(update:(current:CatalogPreferences)=>CatalogPreferences)=>{
    try{setCatalogPreferences(updateCatalogPreferences(window.localStorage,update))}
    catch{setError('Не удалось сохранить настройки каталога. Изменение не применено; проверьте доступность и свободное место хранилища.')}
  }
  const [viewMode,setViewMode]=useState<'simple'|'compact'|'expanded'>(()=>{const v=store.get('osfit-view-mode');return v==='simple'||v==='expanded'||v==='compact'?v:store.get('osfit-compact')==='false'?'expanded':'compact'})
  const compact=viewMode!=='expanded'
  const changeViewMode=(v:'simple'|'compact'|'expanded')=>{setViewMode(v);store.set('osfit-view-mode',v)}
  const [expandedRows,setExpandedRows]=useState<string[]>([])
  const [extrasRows,setExtrasRows]=useState<string[]>([])
  const [undoRows,setUndoRows]=useState<ExerciseLine[][]>([])
  type GoalKind = 'weight'|'reps'|'estimated'
  type StrengthGoal = {id:string,exercise:string,kind:GoalKind,target:number,minimumReps:number,referenceWeight:number,createdAt:string,completedAt?:string,achieved?:number}
  const [goals,setGoals]=useState<StrengthGoal[]>(()=>{try{const raw=JSON.parse(store.get('osfit-strength-goals')||'null');if(Array.isArray(raw))return raw;const old=Number(store.get('osfit-goal-weight')||0);return old>0?[{id:uid(),exercise:store.get('osfit-goal-name')||'Жим штанги лёжа',kind:'estimated',target:old,minimumReps:1,referenceWeight:0,createdAt:new Date().toISOString()}]:[]}catch{return []}})
  const [goalExercise,setGoalExercise]=useState('')
  const [goalKind,setGoalKind]=useState<GoalKind>('weight')
  const [goalTarget,setGoalTarget]=useState('')
  const [goalReps,setGoalReps]=useState('1')
  const [goalReferenceWeight,setGoalReferenceWeight]=useState('0')
  const [goalArchive,setGoalArchive]=useState(false)
  const [showGoalForm,setShowGoalForm]=useState(false)
  const [goalNotice,setGoalNotice]=useState<string[]>([])
  useEffect(()=>{store.set('osfit-strength-goals',JSON.stringify(goals))},[goals])
  const goalScore=(g:StrengthGoal,history:Workout[])=>{
    let maximum=0
    for(const w of history)for(const e of w.exercises){if(e.name.trim().toLocaleLowerCase('ru')!==g.exercise.trim().toLocaleLowerCase('ru'))continue
      for(const set of e.sets){if(!set.done||set.kind==='warmup'||set.weight<0||set.reps<=0)continue
        const kg=weightInKg(e,set.weight)
        const score=g.kind==='weight'?(set.reps>=g.minimumReps?kg:0):g.kind==='reps'?(kg>=g.referenceWeight?set.reps:0):estimate1RM(kg,set.reps)
        maximum=Math.max(maximum,score)
      }
    }
    return maximum
  }
  const addGoal=()=>{const target=Number(goalTarget.replace(',','.'));const reps=Number(goalReps);const referenceWeight=Number(goalReferenceWeight.replace(',','.'))
    if(!goalExercise.trim()||!Number.isFinite(target)||target<=0||!Number.isInteger(reps)||reps<1||reps>1000||!Number.isFinite(referenceWeight)||referenceWeight<0){setError('Проверьте название, целевое значение и повторения');return}
    const goal:StrengthGoal={id:uid(),exercise:goalExercise.trim(),kind:goalKind,target,minimumReps:reps,referenceWeight,createdAt:new Date().toISOString()}
    const current=goalScore(goal,workouts)
    setGoals(old=>[...old,{...goal,...(current>=target?{completedAt:new Date().toISOString(),achieved:current}:{})}]);setGoalTarget('');setGoalExercise('');tell('Цель добавлена')
  }
  useEffect(()=>{if(!workouts.length)return;setGoals(old=>{const newly:string[]=[];const next=old.map(g=>{if(g.completedAt)return g;const value=goalScore(g,workouts);if(value>=g.target){newly.push(g.exercise);return {...g,completedAt:new Date().toISOString(),achieved:value}}return g});if(newly.length)setGoalNotice(newly);return newly.length?next:old})},[workouts])
  const [comparison,setComparison]=useState<[string,string]>(['',''])
  const [backupAt,setBackupAt]=useState(()=>store.get('osfit-last-backup')||'')

  const [settings, setSettings] = useState(false)
  const [detail, setDetail] = useState<Workout | null>(null)
  const [importing, setImporting] = useState(false)
  const [textImport, setTextImport] = useState(false)
  const [planText, setPlanText] = useState('')
  const [planName, setPlanName] = useState('Импорт из IRONLOG')
  const [profile,setProfile]=useState<Profile>(getProfile)
  const [schedule,setSchedule]=useState<Schedule[]>([])
  const [plannedDate,setPlannedDate]=useState(localDay())
  const [plannedProgram,setPlannedProgram]=useState('')
  const [repeatDays,setRepeatDays]=useState(0)
  const [musclePeriod,setMusclePeriod]=useState(()=>Number(store.get('osfit-muscle-period'))||7)
  const [draft,setDraft]=useState(false)
  const [showTemplates,setShowTemplates]=useState(false)
  const [restInput,setRestInput]=useState(()=>String(Number(store.get('osfit-rest')||90)))
  const [weightInput,setWeightInput]=useState(()=>String(getProfile().weightStep))
  const [portableInfo,setPortableInfo]=useState('')
  const portableRef=useRef<HTMLInputElement>(null)

  const [restDuration,setRestDuration]=useState(()=>Number(store.get('osfit-rest')||90))
  const [restUntil,setRestUntil]=useState(()=>Number(store.get('osfit-rest-until')||0))
  const [clock,setClock]=useState(Date.now())
  const [editingWorkoutId,setEditingWorkoutId]=useState<string|null>(null)
  const [sessionDate,setSessionDate]=useState('')
  const [ironlogFile,setIronlogFile]=useState<File|null>(null)
  const [ironlogPreview,setIronlogPreview]=useState<{programs:Program[],workouts:Workout[],measurements:Measurement[],warnings:string[]}|null>(null)
  useEffect(()=>{if(!restUntil)return;const timer=window.setInterval(()=>setClock(Date.now()),1000);return()=>window.clearInterval(timer)},[restUntil])
  const secondsLeft=Math.max(0,Math.ceil((restUntil-clock)/1000))
  useEffect(()=>{if(editor==='session'&&rows.length){store.set('osfit-session-draft',JSON.stringify({name,rows,activeProgramId,editingWorkoutId,sessionDate}))}},[editor,rows,name,activeProgramId,editingWorkoutId,sessionDate])
  const saveSessionDraft = () => {
    if(editor!=='session') return
    try {
      store.set('osfit-session-draft', JSON.stringify({name,rows,activeProgramId,editingWorkoutId,sessionDate,savedAt:new Date().toISOString()}))
      setDraft(true)
      setDirty(false)
      setEditor(null)
      closePicker()
      tell('Тренировка сохранена. Продолжить можно на главной.')
    } catch (e) { setError('Не удалось сохранить черновик: '+String(e)) }
  }
  const restoreDraft=()=>{const d=readDraft();if(!d){setError('Черновик повреждён или отсутствует');store.remove('osfit-session-draft');setDraft(false);return}setName(d.name);setRows(d.rows);setActiveProgramId(d.activeProgramId);setEditingWorkoutId(d.editingWorkoutId);setSessionDate(d.sessionDate);setExpandedRows([]);setUndoRows([]);setEditor('session');setDraft(false)}
  const storeProfile=(patch:Partial<Profile>)=>{setProfile(old=>{const p={...old,...patch};saveProfile(p);return p})}
  const addPlanned=async()=>{if(!plannedProgram)return setError('Выберите программу');try{await saveSchedule({id:uid(),date:plannedDate,programId:plannedProgram,repeatDays:repeatDays||undefined});setSchedule(await allSchedule());tell('Тренировка запланирована')}catch(e){setError(String(e))}}
  const removePlanned=async(id:string)=>{await deleteSchedule(id);setSchedule(await allSchedule())}
  const upcoming=(day:string)=>schedule.filter(a=>{const delta=Math.round((Date.parse(day+'T12:00:00')-Date.parse(a.date+'T12:00:00'))/86400000);return delta>=0&&(delta===0||!!a.repeatDays&&delta%a.repeatDays===0)})

  useEffect(()=>{setDraft(!!store.get('osfit-session-draft'))},[])
  const createTemplate=async(index:number)=>{try{const tmpl=PLAN_TEMPLATES[index];for(const day of tmpl.days)await saveProgram({id:uid(),name:day.name,createdAt:new Date().toISOString(),exercises:toLines(day.items)});await load();setShowTemplates(false);tell(`Добавлено программ: ${tmpl.days.length}`)}catch(e){setError(String(e))}}
  const savePortable=()=>{if(editor!=='session'||!rows.length)return;const data={format:'osfit-active-session',version:1,name,sessionDate,exercises:rows,savedAt:new Date().toISOString()};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='osfit-active-session.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);tell('Файл текущей тренировки сохранён')}
  const importPortable=async(file:File)=>{try{const extension=file.name.split('.').pop()?.toLowerCase();let exercises:ExerciseLine[]=[];let importedDate='',importedName='';if(extension==='json'){const data=JSON.parse(await file.text());exercises=fromPortableJson(data);if(data?.format==='osfit-active-session'){if(typeof data.sessionDate==='string'&&data.sessionDate){workoutDate(data.sessionDate);importedDate=data.sessionDate}if(typeof data.name==='string')importedName=data.name}}else if(extension==='xlsx')exercises=tableToTraining(await xlsxAsRows(file));else if(extension==='csv'){const text=await file.text();const delim=text.split(/\r?\n/)[0].includes(';')?';':',';exercises=tableToTraining(text.split(/\r?\n/).map(x=>x.split(delim).map(v=>v.trim().replace(/^"|"$/g,''))))}else if(extension==='txt')exercises=parseTrainingText(await file.text()).exercises;else throw new Error('Поддерживаются TXT, JSON, CSV и XLSX');if(!exercises.length)throw new Error('Не найдено распознанных упражнений');if(!window.confirm(`Импортировать ${exercises.length} упражнений? Текущая тренировка и сохранённый черновик будут заменены.`))return;setName(importedName||file.name.replace(/\.[^.]+$/,''));setRows(exercises);setActiveProgramId(null);setEditingWorkoutId(null);setSessionDate(importedDate);setEditor('session');setSettings(false);setTextImport(false);setShowTemplates(false);setDirty(true);setPortableInfo(`Импортировано ${exercises.length} упражнений. Проверьте выполненные подходы.`);tell('Тренировка загружена')}catch(e){setError(e instanceof Error?e.message:String(e))}}
  const startRest=()=>{setClock(Date.now());const until=Date.now()+restDuration*1000;setRestUntil(until);store.set('osfit-rest-until',String(until))}
  const file = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const {programs:p,workouts:w,measurements:m,schedule:a} = await loadSnapshot()
    setSchedule(a);setMeasurements(m.sort((a,b)=>b.date.localeCompare(a.date)))
    setPrograms(p.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    setWorkouts(w.sort((a, b) => Date.parse(b.date)-Date.parse(a.date)))
  }, [])
  useEffect(() => {
    load().catch(e => setError(String(e))).finally(() => setBusy(false))
  }, [load])
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', listener)
    return () => window.removeEventListener('beforeunload', listener)
  }, [dirty])

  const tell = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 3600) }
  const abandon = () => {
    if (editor === 'session') {
      try {
        store.set('osfit-session-draft',JSON.stringify({name,rows,activeProgramId,editingWorkoutId,sessionDate,savedAt:new Date().toISOString()}))
        setDraft(true)
        setDirty(false)
        setEditor(null)
        closePicker()
        return true
      } catch (e) { setError('Не удалось сохранить тренировку: '+String(e)); return false }
    }
    if (dirty && !window.confirm('Есть несохранённые изменения. Выйти без сохранения?')) return false
    setEditor(null); setDirty(false); closePicker()
    return true
  }
  const switchTab = (next: Tab) => {
    if (!abandon()) return
    setTab(next); setDetail(null); setSettings(false); setTextImport(false)
  }
  const beginProgram = (p?: Program) => {
    if (!abandon()) return
    setName(p?.name ?? 'Новая программа')
    setRows(p ? structuredClone(p.exercises) : [])
    setEditingId(p?.id ?? null)
    setEditor('program'); setDirty(false)
  }
  const beginSession = (p: Program) => {
    if (store.get('osfit-session-draft') && !window.confirm('Есть сохранённая незавершённая тренировка. Начать новую вместо неё? Старая будет заменена.')) return
    if (!abandon()) return
    setName(p.name); setRows(cloneLines(p.exercises));setExpandedRows([]);setUndoRows([])
    setActiveProgramId(p.id); setEditingWorkoutId(null); setSessionDate(''); setEditor('session'); setDirty(false)
  }
  const changeRow = (index: number, fn: (r: ExerciseLine) => ExerciseLine) => {
    setUndoRows(old=>[...old.slice(-9),structuredClone(rows)])
    setRows(old => old.map((r, i) => i === index ? fn(r) : r)); setDirty(true)
  }
  const changeSet = (i: number, j: number, patch: Partial<SetLine>) => {
    const line = rows[i]
    const before = line?.sets[j]
    if (editor === 'session' && line && before && patch.done === true && !before.done && before.kind!=='warmup') {
      const updated = {...before, ...patch}
      const newValue = updated.weight > 0 && updated.reps > 0 ? estimate1RM(weightInKg(line,updated.weight), updated.reps) : 0
      const recordValues=(e:ExerciseLine,sets=e.sets)=>sets.filter(s=>isWorkSet(s)&&s.weight>0).map(s=>estimate1RM(weightInKg(e,s.weight),s.reps))
      const previousValues = [
        ...workouts.flatMap(w => w.exercises.filter(e => e.name.toLowerCase() === line.name.toLowerCase()).flatMap(e => recordValues(e))),
        ...rows.flatMap((r,ri) => r.name.toLowerCase() === line.name.toLowerCase() ? recordValues(r,r.sets.filter((_,si) => ri !== i || si !== j)) : [])
      ]
      const previousBest = Math.max(0,...previousValues)
      if (newValue > previousBest + 0.001) {
        setPersonalRecord({exercise:exerciseDisplayName(line.name),weight:weightInKg(line,updated.weight),reps:updated.reps,estimated:newValue})
      }
    }
    changeRow(i, r => ({ ...r, sets: r.sets.map((s, k) => k === j ? { ...s, ...patch } : s) }))
  }
  const addExercise = (exercise: string) => {
    setUndoRows(old=>[...old.slice(-9),structuredClone(rows)]);setRows(old => [...old, newLine(exercise)]); setDirty(true); closePicker(); setQuery('')
  }
  const saveCurrent = async () => {
    try {
      setError('')
      if (!name.trim()) throw new Error('Введите название')
      if (!rows.length) throw new Error('Добавьте хотя бы одно упражнение')
      if (editor === 'program') {
        const prev = programs.find(p => p.id === editingId)
        await saveProgram({ id: editingId ?? uid(), createdAt: prev?.createdAt ?? new Date().toISOString(), name: name.trim(), exercises: rows })
        tell('Программа сохранена')
      } else if (editor === 'session') {
        const original=workouts.find(w=>w.id===editingWorkoutId)
        const oldRecords = new Map<string,number>()
        for (const w of workouts.filter(w => w.id !== editingWorkoutId)) for (const e of w.exercises) for (const set of e.sets) {
          if (!isWorkSet(set) || set.weight <= 0) continue
          const key=e.name.toLowerCase()
          oldRecords.set(key,Math.max(oldRecords.get(key)??0,estimate1RM(weightInKg(e,set.weight),set.reps)))
        }
        const records: string[] = []
        for (const e of rows) {
          const scored = e.sets.filter(s=>isWorkSet(s) && s.weight>0).map(s=>estimate1RM(weightInKg(e,s.weight),s.reps))
          const score=Math.max(0,...scored)
          if(score>0 && score>(oldRecords.get(e.name.toLowerCase())??0)+0.001)records.push(e.name)
        }
        await saveWorkout({ id: editingWorkoutId ?? uid(), name: name.trim(), date: workoutDate(sessionDate,original?.date), programId: activeProgramId, exercises: rows, volume: volumeOf(rows) })
        setLastSummary({name:name.trim(),exercises:rows.length,sets:rows.reduce((n,r)=>n+r.sets.filter(s=>s.done).length,0),volume:volumeOf(rows),prs:records})
        setPersonalRecord(null)
        tell('Тренировка сохранена')
      }
      await load(); if(editor==='session')store.remove('osfit-session-draft'); setEditor(null); closePicker(); setEditingWorkoutId(null); setDirty(false);setRestUntil(0)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }
  const removeP = async (id: string) => {
    if (!window.confirm('Удалить программу? История останется.')) return
    try { await deleteProgram(id); await load() } catch (e) { setError(String(e)) }
  }
  const editWorkout=(w:Workout)=>{if(store.get('osfit-session-draft')&&!window.confirm('Есть сохранённая незавершённая тренировка. Редактировать запись вместо неё? Черновик будет заменён.'))return;setDetail(null);setTab('history');setName(w.name);setRows(structuredClone(w.exercises));setActiveProgramId(w.programId);setEditingWorkoutId(w.id);setSessionDate(localDay(w.date));setEditor('session');setDirty(false)}
  const removeW = async (id: string) => {
    if (!window.confirm('Удалить запись о тренировке?')) return
    try { await deleteWorkout(id); setDetail(null); await load() } catch (e) { setError(String(e)) }
  }
  const download = async () => {
    try {
      const data = await exportBackup()
      const url = URL.createObjectURL(new Blob([JSON.stringify({...data,strengthGoals:goals}, null, 2)], { type: 'application/json' }))
      const a = document.createElement('a'); a.href = url
      a.download = `osfit-backup-${localDay()}.json`
      a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      const stamp = new Date().toISOString(); setBackupAt(stamp); store.set('osfit-last-backup', stamp)
      tell('Архив подготовлен')
    } catch (e) { setError(String(e)) }
  }
  const upload = async (f: File) => {
    try {
      const payload = JSON.parse(await f.text())
      if (!window.confirm(payload.version===4 ? 'Импорт заменит программы, историю и ручные данные силы. Продолжить?' : 'Импорт заменит программы и историю. Ручные данные силы сохранятся: в старом архиве их нет. Продолжить?')) return
      setImporting(true); await importBackup(payload); if(Array.isArray(payload.strengthGoals)){setGoals(payload.strengthGoals.filter((g:StrengthGoal)=>typeof g?.id==='string'&&typeof g.exercise==='string'&&typeof g.target==='number'))}else{setGoals([])} await load(); setSettings(false)
      tell('Данные восстановлены')
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setImporting(false); if (file.current) file.current.value = '' }
  }
  const parsed = parseTrainingText(planText)
  const importPlan = async () => {
    try {
      if (!planName.trim()) throw new Error('Укажите название программы')
      if (parsed.exercises.some(e=>e.sets.length===0) && !window.confirm('Есть мышечные группы без конкретного упражнения и подходов. Заполните их в редакторе после импорта. Продолжить?')) return
      if (!parsed.exercises.length) throw new Error('Нет распознанных упражнений')
      if (parsed.warnings.length && !window.confirm(`Есть замечания: ${parsed.warnings.length}. Проверь распознанные упражнения. Сохранить?`)) return
      await saveProgram({ id: uid(), name: planName.trim(), exercises: parsed.exercises, createdAt: new Date().toISOString() })
      await load(); setTextImport(false); setPlanText(''); tell('Программа импортирована')
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }

  const saveBody = async () => {
    try {
      const value = (v:string) => v.trim() === '' ? undefined : Number(v.replace(',', '.'))
      const m:Measurement = {id:uid(),date:bodyForm.date,weight:value(bodyForm.weight),waist:value(bodyForm.waist),chest:value(bodyForm.chest),arm:value(bodyForm.arm),thigh:value(bodyForm.thigh),hips:value(bodyForm.hips),neck:value(bodyForm.neck),note:bodyForm.note}
      if (!m.date || ![m.weight,m.waist,m.chest,m.arm,m.thigh].some(v=>v!==undefined)) throw new Error('Укажите дату и хотя бы один замер')
      if ([m.weight,m.waist,m.chest,m.arm,m.thigh].some(v=>v!==undefined && (!Number.isFinite(v)||v<=0||v>500))) throw new Error('Проверьте значения замеров')
      await saveMeasurement(m); await load(); tell('Замеры сохранены')
      setBodyForm(x=>({...x,weight:'',waist:'',chest:'',arm:'',thigh:'',note:''}))
    } catch(e) { setError(e instanceof Error?e.message:String(e)) }
  }
  const removeBody = async(id:string) => { if(!window.confirm('Удалить замер?')) return; try {await deleteMeasurement(id);await load()}catch(e){setError(String(e))} }
  const activeMuscles=exerciseMuscleLoad(rows)
  const recommendedWeight=(exercise:ExerciseLine)=>{for(const w of workouts){const line=w.exercises.find(e=>e.name.toLowerCase()===exercise.name.toLowerCase());if(!line)continue;const done=line.sets.filter(s=>isWorkSet(s)&&s.weight>0);if(!done.length)continue;const step=weightUnitOf(exercise)==='blocks'?5:profile.weightStep;const top=Math.max(...done.map(s=>weightInKg(line,s.weight)));const kg=Math.round((top+(done.every(s=>s.reps>=8)?step:0))/step)*step;return weightUnitOf(exercise)==='blocks'?kg/5:kg}return null}
  const handleIronlog=async(f:File)=>{setIronlogFile(f);setIronlogPreview(null);try{const raw=JSON.parse(await f.text()) as unknown;const result=convertIronlog(raw);setIronlogPreview(result)}catch(e){setError(e instanceof Error?e.message:String(e))}}
  const applyIronlog=async()=>{if(!ironlogPreview||!ironlogFile)return;try{if(!window.confirm(`Добавить ${ironlogPreview.workouts.length} тренировок и ${ironlogPreview.programs.length} программ? Существующие записи останутся.`))return;for(const p of ironlogPreview.programs)await saveProgram(p);for(const w of ironlogPreview.workouts)await saveWorkout(w);for(const m of ironlogPreview.measurements)await saveMeasurement(m);await load();setIronlogPreview(null);setIronlogFile(null);tell('Данные IRONLOG добавлены')}catch(e){setError(String(e))}}
  // The mini widget operates on the active workout or its locally saved draft.
  // Never reorder the source rows; the widget sorts only its presentation.
  const miniDraft=(()=>{if(editor==='session')return {name,rows};return readDraft()})()
  const toggleMiniExercise=(id:string)=>{
    const update=(current:ExerciseLine[])=>current.map(e=>{
      if(e.id!==id||!e.sets.length)return e
      const finish=!e.sets.every(s=>s.done)
      return {...e,sets:e.sets.map(s=>({...s,done:finish}))}
    })
    if(editor==='session'){
      setUndoRows(old=>[...old.slice(-9),structuredClone(rows)])
      setRows(update)
      setDirty(true)
    }else{
      try{const raw=JSON.parse(store.get('osfit-session-draft')||'null');const d=readDraft();if(!raw||!d)return;raw.rows=update(d.rows);store.set('osfit-session-draft',JSON.stringify(raw));setDraft(true);setMiniRevision(n=>n+1)}catch{setError('Не удалось сохранить состояние мини-виджета')}
    }
  }
  const sortedRows=editor==='session'?[...rows.filter(r=>!r.sets.length||r.sets.some(s=>!s.done)),...rows.filter(r=>r.sets.length>0&&r.sets.every(s=>s.done))]:rows
  const undo=()=>{const prev=undoRows.at(-1);if(!prev)return;setRows(prev);setUndoRows(x=>x.slice(0,-1));setDirty(true)}
  const toggleRow=(id:string)=>setExpandedRows(x=>x.includes(id)?x.filter(v=>v!==id):[...x,id])
  const changeExercise=(index:number)=>{const old=rows[index];const options=getExerciseAlternative(old.name);const text=window.prompt('Выбери замену:\n'+options.map((x,i)=>`${i+1}. ${x}`).join('\n')+'\nВведите номер', '1');if(!text)return;const n=Number(text);if(!Number.isInteger(n)||n<1||n>options.length)return;changeRow(index,r=>({...r,name:options[n-1]}))}
  const exportProgram=(p:Program)=>{const blob=new Blob([serializeProgram(p)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='osfit-program.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  const importSharedProgram=async(file:File)=>{try{const p=await readProgramFile(file);await saveProgram({...p,id:uid(),createdAt:new Date().toISOString()});await load();tell('Программа импортирована')}catch(e){setError(String(e))}}
  const doneCount = rows.reduce((n, r) => n + r.sets.filter(s => s.done).length, 0)
  const setCount = rows.reduce((n, r) => n + r.sets.length, 0)

  return <div className="app">
    <header className="header">
      <div className="brand"><span className="brand-icon"><Dumbbell size={22}/></span><div><strong>LIFT</strong><small>ТРЕНИРОВКИ БЕЗ ЛИШНЕГО</small></div></div>
      <button title="Настройки и архив" className="icon-btn" onClick={() => { if (!abandon()) return; setTextImport(false); setSettings(true) }}><Settings size={22}/></button>
    </header>
    {error && <div className="error" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}
    {notice && <div className="toast">{notice}</div>}
    {goalNotice.length>0&&<div className="osfit-goal-alert" role="status">🏆 Цель достигнута: {goalNotice.join(', ')} <button onClick={()=>setGoalNotice([])} aria-label="Закрыть">×</button></div>}
    {personalRecord && editor === 'session' && <div className="osfit-pr" role="status"><span>🏆 Новый рекорд 1ПМ: <b>{personalRecord.exercise}</b> · {personalRecord.weight} кг × {personalRecord.reps} (≈{fmt(personalRecord.estimated)} кг)</span><button aria-label="Закрыть уведомление" onClick={()=>setPersonalRecord(null)}>×</button></div>}
    {lastSummary && !editor && <div className="osfit-report" role="region" aria-label="Итоги завершённой тренировки"><div className="osfit-report-head"><strong>✓ Тренировка сохранена · {lastSummary.name}</strong><button onClick={()=>setLastSummary(null)} aria-label="Закрыть отчёт">×</button></div><div className="osfit-report-stats"><span>Упражнений <b>{lastSummary.exercises}</b></span><span>Подходов <b>{lastSummary.sets}</b></span><span>Тоннаж <b>{fmt(lastSummary.volume)} кг</b></span><span>Новых 1ПМ <b>{lastSummary.prs.length}</b></span></div>{lastSummary.prs.length>0&&<p>🏆 {lastSummary.prs.join(', ')}</p>}<p className="muted small">Рекорды рассчитаны по формуле Эпли, а не по фактическому максимуму.</p></div>}
    <style>{OSFIT_CSS + `.osfit-pr,.osfit-report{position:relative;margin:12px 16px;padding:14px;border:1px solid #3f7761;border-radius:14px;background:#172820;color:#e5f6ed;z-index:5}.osfit-pr{display:flex;justify-content:space-between;gap:12px;align-items:center}.osfit-pr button,.osfit-report-head button{border:0;background:transparent;color:inherit;font-size:24px;cursor:pointer}.osfit-report-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.osfit-report-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.osfit-report-stats span{display:flex;flex-direction:column;font-size:12px;color:#acc5b8}.osfit-report-stats b{font-size:17px;color:#ecfff3}.osfit-report p{margin:10px 0 0}`}</style><main className="content">
      {miniDraft&&miniDraft.rows.length>0&&!settings&&!detail&&!textImport&&(editor==='session'||(!editor&&tab==='train'))&&<WorkoutMiniWidget key={miniRevision} name={miniDraft.name} exercises={miniDraft.rows} onToggle={toggleMiniExercise} onOpen={editor==='session'?undefined:restoreDraft} compact={editor==='session'}/>}

      {!editor&&!settings&&!detail&&!textImport&&['history','body','muscles'].includes(tab)&&<div className="osfit-view-buttons"><button className={tab==='history'?'active':''} onClick={()=>switchTab('history')}>История</button><button className={tab==='body'?'active':''} onClick={()=>switchTab('body')}>Замеры</button><button className={tab==='muscles'?'active':''} onClick={()=>switchTab('muscles')}>Мышцы</button></div>}
      {busy ? <p>Загрузка данных…</p> : settings ? <section className={compact?'osfit-compact':''}>
        <button className="back" onClick={() => setSettings(false)}><ArrowLeft size={17}/> Назад</button>
        <h1>Настройки и данные</h1>
        <div className="osfit-settings-row"><ThemeToggle/></div>
        <section className="osfit-section" aria-labelledby="achievements-title">
          <h2 id="achievements-title">Достижения и уровни</h2>
          <label className="field-label"><input type="checkbox" checked={achievementsEnabled} onChange={e=>toggleAchievements(e.target.checked)}/> Показывать достижения и уровни</label>
          <p className="muted small">Необязательно. Отдых важен; уровни не оценивают здоровье и не требуют тренироваться чаще или увеличивать вес.</p>
          {achievements && <>
            <p><strong>Уровень {achievements.level} из 5</strong> · зачтено дней: {achievements.days}</p>
            <ul>{achievements.badges.map(b=><li key={b.target}>{b.earned?'Получено':'Пока не получено'}: {b.target} {b.target===1?'день':'дней'} с тренировкой</li>)}</ul>
            <p className="muted small">Правила: за календарный день в местном часовом поясе — не более одного зачёта. В сохранённой тренировке нужен именованный элемент и выполненный неразминочный подход с конечным весом ≥ 0 и положительными повторениями. Будущие и некорректные даты, пустые записи и конфликтующие ID исключаются. Повторные записи в один день не добавляют зачёт. Вес и тоннаж не влияют на уровень.</p>
            <p className="muted small">Это пересчёт текущей истории, а не награды навсегда: исправление, удаление или смена часового пояса может изменить результат. Копии с разными ID и датами автоматически не распознать. Никакие тренировки не изменяются; настройка остаётся только в этом браузере и не входит в архив.</p>
          </>}
        </section>
        <div className="osfit-goals-panel">
          <h2>Силовые цели</h2><p className="muted small">Несколько целей по любым упражнениям. Достижение проверяется по выполненным рабочим подходам; цели остаются до выполнения или удаления.</p>
          <div className="osfit-segmented"><button className={!goalArchive?'active':''} onClick={()=>setGoalArchive(false)}>Активные ({goals.filter(g=>!g.completedAt).length})</button><button className={goalArchive?'active':''} onClick={()=>setGoalArchive(true)}>Достигнутые ({goals.filter(g=>g.completedAt).length})</button></div>
          {goals.filter(g=>Boolean(g.completedAt)===goalArchive).map(g=>{const bestResult=g.completedAt?(g.achieved??goalScore(g,workouts)):goalScore(g,workouts);const unit=g.kind==='reps'?'повт.':'кг';return <article className="osfit-goal-card" key={g.id}>
            <div className="osfit-goal-head"><strong>{g.completedAt?'🏆 ':''}{g.exercise}</strong><div style={{display:'flex',alignItems:'center'}}>{!g.completedAt&&<button className="icon-btn" title="Изменить цель" aria-label="Изменить цель" onClick={()=>{const input=window.prompt('Новое целевое значение',String(g.target));if(input===null)return;const newTarget=Number(input.replace(',','.'));if(!(newTarget>0&&Number.isFinite(newTarget))){setError('Введите положительное число');return}setGoals(xs=>xs.map(x=>x.id===g.id?{...x,target:newTarget}:x))}}><PenLine size={17}/></button>}<button className="icon-btn" title="Удалить цель" aria-label="Удалить цель" onClick={()=>{if(window.confirm('Удалить эту цель?'))setGoals(xs=>xs.filter(x=>x.id!==g.id))}}><Trash2 size={17}/></button></div></div>
            <p>{g.kind==='weight'?`Вес ${g.target} кг × ${g.minimumReps} повторений`:g.kind==='reps'?`${g.target} повторений при весе от ${g.referenceWeight} кг`:`Расчётный 1ПМ ${g.target} кг`}</p>
            <div className="osfit-goal-progress"><div style={{width:`${Math.min(100,Math.max(0,bestResult/g.target*100))}%`}}/></div>
            <small>{g.completedAt?`Достигнута ${new Date(g.completedAt).toLocaleDateString('ru-RU')} · результат ${Number(bestResult.toFixed(2))} ${unit}`:`Лучший результат: ${Number(bestResult.toFixed(2))} ${unit}`}</small>
          </article>})}
          {!goalArchive&&<button className="btn secondary full" type="button" aria-expanded={showGoalForm} onClick={()=>setShowGoalForm(v=>!v)}>{showGoalForm?'Скрыть форму':'＋ Добавить цель'}</button>}
          {!goalArchive&&showGoalForm&&<div className="osfit-goal-card"><strong>Новая цель</strong><label className="field-label">Упражнение</label><input className="input" list="osfit-goal-exercises" placeholder="Название упражнения" value={goalExercise} onChange={e=>setGoalExercise(e.target.value)}/><datalist id="osfit-goal-exercises">{Array.from(new Set([...exerciseCatalog,...programs.flatMap(p=>p.exercises.map(e=>e.name))])).map(x=><option key={x} value={x}/>)}</datalist>
            <label className="field-label">Показатель</label><select className="input" value={goalKind} onChange={e=>setGoalKind(e.target.value as GoalKind)}><option value="weight">Вес и повторения</option><option value="reps">Повторения при заданном весе</option><option value="estimated">Расчётный 1ПМ</option></select>
            <label className="field-label">Целевое значение ({goalKind==='reps'?'повторения':'кг'})</label><input className="input" type="number" min="0" step="any" inputMode="decimal" value={goalTarget} onChange={e=>setGoalTarget(e.target.value)}/>
            {goalKind==='weight'&&<><label className="field-label">Минимум повторений с этим весом</label><input className="input" type="number" min="1" step="1" value={goalReps} onChange={e=>setGoalReps(e.target.value)}/></>}
            {goalKind==='reps'&&<><label className="field-label">Минимальный вес (кг, 0 — без веса)</label><input className="input" type="number" min="0" step="any" value={goalReferenceWeight} onChange={e=>setGoalReferenceWeight(e.target.value)}/></>}
            <button className="btn primary full" onClick={addGoal}><Plus size={17}/> Сохранить цель</button>
          </div>}
        </div>
        <p className="muted">Данные хранятся только в этом браузере. Создавайте резервные копии.</p>
        <button className="btn primary full" onClick={() => void download()}><Download size={18}/> Скачать архив JSON</button>
        <button className="btn secondary full" disabled={importing} onClick={() => file.current?.click()}><Upload size={18}/> Восстановить из JSON</button>
        <input ref={file} hidden type="file" accept="application/json,.json" onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f) }}/>
        <p className="muted small">Восстановление заменяет текущие данные. Поддерживаются совместимые резервные копии OSFIT.</p>
        <h2>Профиль и настройки атлета</h2>
        <label className="field-label">Модель атлета</label><select className="input" value={profile.sex} onChange={e=>storeProfile({sex:e.target.value as Profile['sex']})}><option value="male">Мужская</option><option value="female">Женская</option></select>
        <label className="field-label">Рост (см)</label><input className="input" type="number" value={profile.height} onChange={e=>storeProfile({height:Number(e.target.value)})}/>
        <label className="field-label">Дата рождения</label><input className="input" type="date" value={profile.birthDate} onChange={e=>storeProfile({birthDate:e.target.value})}/>
        <label className="field-label">Цель</label><select className="input" value={profile.goal} onChange={e=>storeProfile({goal:e.target.value})}><option>Сила и масса</option><option>Сила</option><option>Набор мышечной массы</option><option>Поддержание формы</option></select>
        <label className="field-label">Шаг прибавки веса (кг)</label><input className="input" type="number" step="any" min="0.25" value={weightInput} onChange={e=>setWeightInput(e.target.value)} onBlur={()=>{const v=Number(weightInput.replace(',','.'));if(Number.isFinite(v)&&v>=0.25&&v<=100)storeProfile({weightStep:v});else setWeightInput(String(profile.weightStep))}}/>
        <label className="field-label"><input type="checkbox" checked={profile.autoProgress} onChange={e=>storeProfile({autoProgress:e.target.checked})}/> Включить рекомендации прогрессии</label>
        <label className="field-label">Отдых между подходами (секунды)</label>
        <input className="input" type="number" min="0" max="3600" step="1" value={restInput} onChange={e=>setRestInput(e.target.value)} onBlur={()=>{const v=Number(restInput);if(Number.isInteger(v)&&v>=0&&v<=3600){setRestDuration(v);store.set('osfit-rest',String(v))}else setRestInput(String(restDuration))}}/>
        <label className="field-label">Импорт продолжения тренировки (TXT / JSON / CSV / XLSX)</label><input className="input" type="file" accept=".txt,.json,.csv,.xlsx" onChange={e=>{const f=e.target.files?.[0];if(f)void importPortable(f);e.target.value=''}}/>
        <p className="osfit-helper">CSV/XLSX: столбцы «упражнение, вес, повторы, выполнено». JSON: массив exercises с sets. Перед импортом делается предпросмотр-подтверждение.</p>
        <label className="field-label">Перенос JSON из Scriptable IRONLOG</label>
        <input className="input" type="file" accept=".json,application/json" onChange={e=>{const f=e.target.files?.[0];if(f)void handleIronlog(f)}}/>
        {ironlogPreview&&<div className="card"><strong>Предпросмотр переноса</strong><p>Тренировок: {ironlogPreview.workouts.length} · Программ: {ironlogPreview.programs.length} · Замеров: {ironlogPreview.measurements.length}</p>{ironlogPreview.warnings.slice(0,12).map((w,i)=><p className="muted small" key={i}>{w}</p>)}<button className="btn primary full" disabled={!ironlogPreview.workouts.length&&!ironlogPreview.programs.length&&!ironlogPreview.measurements.length} onClick={()=>void applyIronlog()}>Добавить распознанные данные</button></div>}
        <div className="card"><strong>LIFT 1.0 — Smart Workout</strong><p className="muted small">IndexedDB · офлайн PWA · без аккаунтов</p></div>
      </section> : textImport ? <section>
        <button className="back" onClick={() => setTextImport(false)}><ChevronLeft size={18}/> К программам</button>
        <p className="eyebrow">ИМПОРТ IRONLOG</p><h1>Импорт плана</h1>
        <label className="field-label">Название программы</label>
        <input className="input title-input" value={planName} onChange={e => setPlanName(e.target.value)}/>
        <label className="field-label">Импорт TXT / CSV</label><input className="input" type="file" accept=".txt,.csv,text/plain,text/csv" onChange={e=>{const f=e.target.files?.[0];if(f)void f.text().then(t=>setPlanText(f.name.toLowerCase().endsWith('.csv')?t.replace(/;/g,' ').replace(/,(?=\s*[^\d])/g,' '):t))}}/>
        <label className="field-label">Вставьте упражнения (каждое с новой строки)</label>
        <textarea className="input" style={{ width: '100%', minHeight: 170, boxSizing: 'border-box' }} value={planText} onChange={e => setPlanText(e.target.value)} placeholder={'Среда\nЖим 80 4/6\nПрисед 4/8 92,5\nПресс 4*20'}/>
        <p className="muted small">Поддерживаются несколько блоков: «Жим 95 3/6 75 3/10», «Становая тяга 110/5 4», «Пресс». Сомнительные строки проверяйте перед сохранением.</p>
        <div className="card"><strong>Распознано: {parsed.exercises.length}</strong>
          {parsed.exercises.map(e => <p className="muted small" key={e.id}>{e.name}: {e.sets.length ? e.sets.map((set,i)=>({set,i})).filter(({set,i})=>i===0||set.weight!==e.sets[i-1].weight||set.reps!==e.sets[i-1].reps).map(({set,i},index,groups)=>`${(index+1<groups.length?groups[index+1].i:e.sets.length)-i}×${set.reps} · ${set.note?.includes('Вес не указан')?'вес уточнить':formatWeight(e,set.weight)}`).join(' | ') : 'Упражнение и подходы требуют уточнения'}{e.note&&<span> · {e.note}</span>}</p>)}
          {parsed.warnings.map((w, i) => <p className="small" key={i} style={{ color: '#e59b51' }}>{w}</p>)}
        </div>
        <button className="btn primary full" onClick={() => void importPlan()} disabled={!parsed.exercises.length}><Save size={18}/> Сохранить программу</button>
      </section> : editor ? <section>
        <div className="osfit-session-toolbar"><button className="back" onClick={abandon}><ChevronLeft size={18}/> Назад</button>{editor==='session'&&<button className="btn secondary compact" onClick={saveSessionDraft}><Save size={16}/> Сохранить и выйти</button>}</div>
        <div className="page-heading"><div><p className="eyebrow">{editor === 'program' ? 'КОНСТРУКТОР' : 'АКТИВНАЯ ТРЕНИРОВКА'}</p><h1>{editor === 'program' ? 'Редактор программы' : 'Тренировка'}</h1></div></div>
        <label className="field-label">Название</label>
        <input className="input title-input" value={name} onChange={e => { setName(e.target.value); setDirty(true) }} placeholder="Название"/>
        {editor === 'session' && <><label className="field-label" htmlFor="session-date">Дата тренировки</label><input id="session-date" className="input" type="date" value={sessionDate} onChange={e=>{setSessionDate(e.target.value);setDirty(true)}}/><p className="osfit-helper">Если дата не выбрана, используется дата завершения. Номер тренировки можно указать в названии.</p></>}
        {editor === 'session' && <><button className="btn secondary full" onClick={savePortable}><Download size={17}/> Экспортировать текущую тренировку</button>{portableInfo&&<p className="osfit-helper">{portableInfo}</p>}</>}
        {editor === 'session' && <div className="card"><div className="exercise-head"><strong>Таймер отдыха</strong><button className="btn secondary compact" onClick={startRest}>Старт {restDuration} с</button></div><strong>{secondsLeft>0?`${Math.floor(secondsLeft/60)}:${String(secondsLeft%60).padStart(2,'0')}`:'Готов'}</strong><button className="tiny-icon" onClick={()=>setRestUntil(0)}>Сброс</button></div>}
        {editor === 'session' && <div className="osfit-inline-actions"><button onClick={undo} disabled={!undoRows.length}>↶ Отменить действие</button><div className="osfit-segmented" role="group" aria-label="Вид тренировки">{(['simple','compact','expanded'] as const).map(v=><button key={v} className={viewMode===v?'active':''} aria-pressed={viewMode===v} onClick={()=>changeViewMode(v)}>{v==='simple'?'Простой':v==='compact'?'Компактный':'Расширенный'}</button>)}</div></div>}
        {editor === 'session' && <div className="session-stats"><span><b>{doneCount}</b> / {setCount} подходов</span><span><b>{fmt(volumeOf(rows))}</b> кг тоннаж</span></div>}
        {sortedRows.map((r) => {const i=rows.findIndex(v=>v.id===r.id);const finished=editor==='session'&&r.sets.length>0&&r.sets.every(v=>v.done);const collapsed=finished|| (viewMode==='simple'? !expandedRows.includes(r.id):expandedRows.includes(r.id));return <article className={'exercise-card'+(finished?' osfit-completed':'')} key={r.id}>
          <div className="exercise-head"><div><span className="exercise-number">{String(i + 1).padStart(2, '0')}</span><strong>{exerciseDisplayName(r.name)}</strong></div><button className="tiny-icon" title="Удалить упражнение" onClick={() => { setRows(old => old.filter((_, k) => k !== i)); setDirty(true) }}><Trash2 size={17}/></button></div>
          <button className="osfit-exercise-summary" onClick={()=>toggleRow(r.id)}><span>{finished?'✓ Завершено · ':''}{r.sets.filter(x=>x.done).length}/{r.sets.length} подходов · {r.sets.length ? `${formatWeight(r,r.sets.find(s=>!s.done)?.weight ?? r.sets[0].weight)} × ${r.sets.find(s=>!s.done)?.reps ?? r.sets[0].reps}` : 'Нет подходов'}</span><span>{collapsed?'Развернуть':'Свернуть'}</span></button>
          {viewMode==='simple' && editor==='session' && !finished && <div className="osfit-simple"><div className="osfit-simple-plan">{r.sets.length?`${formatWeight(r,r.sets.find(s=>!s.done)?.weight??r.sets[0].weight)} × ${r.sets.find(s=>!s.done)?.reps??r.sets[0].reps} · ${r.sets.length} подходов`:'Нет подходов'}</div><div className="osfit-progress-track"><div style={{width:`${r.sets.length?100*r.sets.filter(s=>s.done).length/r.sets.length:0}%`}}/></div><button className="btn primary full" disabled={!r.sets.some(s=>!s.done)} onClick={()=>{const j=r.sets.findIndex(s=>!s.done);if(j>=0)changeSet(i,j,{done:true})}}>✓ Выполнить следующий подход</button>{r.sets.some(s=>s.done)&&<button className="osfit-simple-undo" onClick={()=>{const j=r.sets.map(s=>s.done).lastIndexOf(true);if(j>=0)changeSet(i,j,{done:false})}}>↶ Отменить подход</button>}</div>}
          <label className="field-label">Единицы ввода
            <select className="input" aria-label={`Единицы нагрузки: ${exerciseDisplayName(r.name)}`} value={weightUnitOf(r)} onChange={e=>changeRow(i,x=>({...x,weightUnit:e.target.value as 'kg'|'blocks'}))}>
              <option value="kg">Килограммы</option><option value="blocks">Блоки по 5 кг</option>
            </select>
          </label>
          {weightUnitOf(r)==='blocks'&&<p className="muted small">Введите количество блоков. 1 блок = 5 кг; тоннаж и рекорды считаются в кг.</p>}
          {!collapsed&&<><div className="osfit-inline-actions"><button onClick={()=>changeExercise(i)}>Заменить упражнение</button><button onClick={()=>setExtrasRows(v=>v.includes(r.id)?v.filter(x=>x!==r.id):[...v,r.id])}>RPE / RIR / темп</button></div>
          <div className="exercise-options"><label>Суперсет <input className="input" placeholder="A, B..." value={r.superset||''} onChange={e=>changeRow(i,x=>({...x,superset:e.target.value}))}/></label><label>Заметка <input className="input" placeholder="Техника" value={r.note||''} onChange={e=>changeRow(i,x=>({...x,note:e.target.value}))}/></label></div>
          <div className="set-headers"><span>Подход</span><span>{weightUnitOf(r)==='blocks'?'Блоки × 5 кг':'Вес, кг'}</span><span>Повторы</span><span>{editor === 'session' ? 'Готово' : 'План'}</span></div>
          {r.sets.map((s, j) => <div className="set-row" key={s.id}>
            <span className="set-index">{j + 1}</span>
            <input aria-label={`${weightUnitOf(r)==='blocks'?'Количество блоков':'Вес в кг'} подхода ${j + 1}`} type="number" min="0" max="9999" step={weightUnitOf(r)==='blocks'?1:0.5} inputMode="decimal" placeholder="0" value={s.weight||''} onChange={e => changeSet(i, j, { weight: Math.max(0, Number(e.target.value) || 0) })}/>
            <input aria-label={`Повторы подхода ${j + 1}`} type="number" min="0" max="999" inputMode="numeric" placeholder="0" value={s.reps||''} onChange={e => changeSet(i, j, { reps: Math.max(0, Number(e.target.value) || 0) })}/>
            {editor === 'session' ? <label className="check-wrap"><input aria-label={`Выполнен подход ${j + 1}`} type="checkbox" checked={s.done} onChange={e => changeSet(i, j, { done: e.target.checked })}/><span><Check size={17}/></span></label> : <span className="muted center">—</span>}
            <div className="set-extras" style={{display:compact&&!extrasRows.includes(r.id)?'none':undefined}}><select aria-label="Тип подхода" value={s.kind||'work'} onChange={e=>changeSet(i,j,{kind:e.target.value as SetLine['kind']})}><option value="work">Рабочий</option><option value="warmup">Разминка</option><option value="drop">Дроп-сет</option></select><input aria-label="RPE" title="RPE" type="number" placeholder="RPE" min="1" max="10" step="0.5" value={s.rpe??''} onChange={e=>changeSet(i,j,{rpe:e.target.value?Number(e.target.value):undefined})}/><input aria-label="RIR" title="RIR" type="number" placeholder="RIR" min="0" max="10" value={s.rir??''} onChange={e=>changeSet(i,j,{rir:e.target.value?Number(e.target.value):e.target.value==='0'?0:undefined})}/><input aria-label="Темп" placeholder="Темп 3-1-1-0" value={s.tempo||''} onChange={e=>changeSet(i,j,{tempo:e.target.value})}/></div>
            <button title="Удалить подход" className="row-remove" onClick={() => changeRow(i, x => ({ ...x, sets: x.sets.filter((_, k) => k !== j) }))}>×</button>
          </div>)}
          {editor==='session'&&profile.autoProgress&&<p className="muted small">Рекомендация следующего рабочего веса: {recommendedWeight(r)===null?'нет данных':formatWeight(r,recommendedWeight(r)!)} (прибавка {weightUnitOf(r)==='blocks'?'1 блок (5 кг)':`${profile.weightStep} кг`} при 8+ повторах во всех выполненных подходах прошлой тренировки)</p>}
          <button className="add-set" onClick={() => changeRow(i, x => ({ ...x, sets: [...x.sets, {...(x.sets.at(-1)||blankSet()),id:uid(),done:false}] }))}><Plus size={16}/> Добавить подход</button>
          </>}
        </article>})}
        {picker ? <div className="card picker"><div className="picker-title"><b>Добавить упражнение</b><button className="tiny-icon" onClick={() => closePicker()}>×</button></div>
          <div className="search"><Search size={17}/><input autoFocus placeholder="Поиск или своё название" value={query} onChange={e => setQuery(e.target.value)}/></div>
          <div className="osfit-group-filters">{groups.map(g=><button key={g} className={groupFilter===g?'active':''} aria-pressed={groupFilter===g} onClick={()=>setGroupFilter(g)}>{g}</button>)}<button className={catalogFavoriteOnly?'active':''} aria-pressed={catalogFavoriteOnly} onClick={()=>setCatalogFavoriteOnly(v=>!v)}>★ Избранное</button></div>
          <p className="muted small">Избранное и синонимы сохраняются в этом браузере, но не входят в резервную копию. Рекорд — максимальный вес рабочего подхода.</p>
          {query.trim()&&!catalogFavoriteOnly&&<button className="btn secondary full" onClick={()=>addExercise(query.trim())}>Добавить своё: {query.trim()}</button>}
          {exerciseCard&&<ExerciseCard name={exerciseCard} workouts={workouts} onClose={()=>setExerciseCard(null)}/>}
          <div className="osfit-pick-list">{filterCatalogIndex(catalogIndex,query,groupFilter,catalogFavorites,catalogFavoriteOnly,catalogAliases).map(item=>{const k=catalogKey(item.name),fav=catalogFavorites.includes(k);return <div key={k} className="osfit-section"><div className="osfit-inline-actions"><button aria-label={`${fav?'Убрать из избранного':'В избранное'}: ${item.name}`} aria-pressed={fav} onClick={()=>saveCatalog(old=>({...old,favorites:old.favorites.includes(k)?old.favorites.filter(x=>x!==k):[...old.favorites,k]}))}>{fav?'★':'☆'}</button><button onClick={()=>addExercise(item.name)}>{catalogLabel(item.name)} <Plus size={15}/></button><button type="button" aria-label={`Карточка: ${item.name}`} onClick={()=>setExerciseCard(item.name)}>Карточка</button><button aria-label={`Добавить синоним: ${item.name}`} onClick={()=>{const alias=window.prompt(`Синоним для «${item.name}»`);if(alias)saveCatalog(old=>({...old,aliases:addCatalogAlias(old.aliases,item.name,alias)}))}}>Синоним</button></div><small className="muted">{item.group==='Все'?'Без группы':item.group} · При добавлении: {weightUnitOf({name:item.name})==='blocks'?'блоки × 5 кг':'кг'}{item.latest?` · Последний: ${item.latest}`:''}{item.record?` · Рекорд: ${item.record}`:''}</small></div>})}</div>
        </div> : <button className="btn secondary full" onClick={() => setPicker(true)}><Plus size={18}/> Добавить упражнение</button>}
        <button className="btn primary full save-btn" onClick={() => void saveCurrent()}><Save size={18}/>{editor === 'program' ? 'Сохранить программу' : 'Завершить и сохранить'}</button>
        {editor === 'session' && <p className="small muted center">В подсчёт результатов попадут только отмеченные подходы.</p>}
      </section> : detail ? <section>
        <button className="back" onClick={() => setDetail(null)}><ChevronLeft size={18}/> История</button>
        <p className="eyebrow">{formatDate(detail.date)}</p><h1>{detail.name}</h1>
        <div className="metrics two"><div><small>Тоннаж</small><b>{fmt(volumeOf(detail.exercises))} кг</b></div><div><small>Подходы</small><b>{detail.exercises.reduce((n, r) => n + r.sets.filter(s => s.done).length, 0)}</b></div></div>
        {detail.exercises.map(r => <div className="card" key={r.id}><strong>{exerciseDisplayName(r.name)}</strong>{r.sets.filter(s => s.done).map((s, i) => <p className="muted small" key={s.id}>{i + 1}. {formatWeight(r,s.weight)} × {s.reps} · 1ПМ ≈ {fmt(estimate1RM(weightInKg(r,s.weight), s.reps))} кг</p>)}</div>)}
        <button className="btn secondary full" onClick={() => editWorkout(detail)}><PenLine size={17}/> Редактировать тренировку</button>
        <button className="btn danger full" onClick={() => void removeW(detail.id)}><Trash2 size={17}/> Удалить запись</button>
      </section> : tab === 'character' ? <CharacterScreen achievements={achievements} workouts={workouts} measurements={measurements} onBack={()=>switchTab('train')} onSettings={()=>setSettings(true)}/> : tab === 'train' ? <section>
        <div className="page-heading"><div><p className="eyebrow">ВАШИ ТРЕНИРОВКИ</p><h1>Мои программы</h1></div><button className="btn primary compact" onClick={() => beginProgram()}><Plus size={17}/> Создать</button></div>
        <CharacterCard achievements={achievements} onOpen={()=>switchTab('character')}/>
        {draft&&<button className="btn primary full" onClick={restoreDraft}>Продолжить незавершённую тренировку</button>}
        <button className="btn secondary full" onClick={() => setShowTemplates(v=>!v)}><Dumbbell size={17}/> Готовые системы тренировок</button>
        {backupAt&&<p className="osfit-helper">Последняя резервная копия: {new Date(backupAt).toLocaleDateString('ru-RU')}</p>}
        {workouts.length>0&&<details className="osfit-section"><summary>Рабочий объём по группам за 7 дней</summary>{groups.filter(g=>g!=='Все').map(g=><p key={g} className="osfit-goal">{g}: {weeklyMuscleSets(workouts,g)} подходов</p>)}</details>}
        {showTemplates&&<div className="osfit-template-list">{PLAN_TEMPLATES.map((t,i)=><button key={t.title} onClick={()=>void createTemplate(i)}><strong>{t.title}</strong><small>{t.desc} · создаст {t.days.length} программы</small></button>)}</div>}
        <button className="btn secondary full" onClick={()=>portableRef.current?.click()}><Upload size={17}/> Продолжить тренировку из файла</button>
        <input ref={portableRef} hidden type="file" accept=".txt,.json,.csv,.xlsx" onChange={e=>{const f=e.target.files?.[0];if(f)void importPortable(f);e.target.value=''}}/>
        <label className="btn secondary full" style={{ marginBottom: 10 }}>Импорт общей программы <input hidden type="file" accept=".json" onChange={e=>{const f=e.target.files?.[0];if(f)void importSharedProgram(f);e.target.value=''}}/></label>
        <button className="btn secondary full" style={{ marginBottom: 16 }} onClick={() => setTextImport(true)}><Upload size={17}/> Импорт IRONLOG</button>
        {!programs.length ? <div className="empty"><Dumbbell size={38}/><h2>Начните с программы</h2><p>Добавьте упражнения и подходы — затем приступайте к тренировке.</p><button className="btn primary" onClick={() => beginProgram()}><Plus size={16}/> Создать программу</button></div> : programs.map(p => <article className="program-card" key={p.id}>
          <div className="program-top"><span className="program-mark"><Dumbbell size={19}/></span><div><strong>{p.name}</strong><p className="muted small">{p.exercises.length} упражнений · {p.exercises.reduce((n, x) => n + x.sets.length, 0)} подходов</p></div></div>
          <div className="program-actions"><button onClick={() => beginSession(p)} className="btn primary"><Play size={16} fill="currentColor"/> Начать</button><button title="Редактировать" className="btn secondary icon-only" onClick={() => beginProgram(p)}><PenLine size={17}/></button><button title="Поделиться программой" className="btn secondary icon-only" onClick={()=>exportProgram(p)}><Download size={17}/></button><button title="Копировать" className="btn secondary icon-only" onClick={() => { void saveProgram({ ...p, id: uid(), name: p.name + ' (копия)', createdAt: new Date().toISOString() }).then(load).catch(e => setError(String(e))) }}><Copy size={17}/></button><button title="Удалить" className="btn secondary icon-only" onClick={() => void removeP(p.id)}><Trash2 size={17}/></button></div>
        </article>)}
      </section> : tab === 'history' ? <section>
        <div className="page-heading"><div><p className="eyebrow">ЖУРНАЛ</p><h1>История</h1></div></div>
        {workouts.length>1&&<div className="osfit-section"><strong>Сравнить тренировки</strong><div className="osfit-input-row"><select className="input" value={comparison[0]} onChange={e=>setComparison(v=>[e.target.value,v[1]])}><option value="">Первая дата</option>{workouts.map(w=><option value={w.id} key={w.id}>{formatDate(w.date)} · {w.name}</option>)}</select><select className="input" value={comparison[1]} onChange={e=>setComparison(v=>[v[0],e.target.value])}><option value="">Вторая дата</option>{workouts.map(w=><option value={w.id} key={w.id}>{formatDate(w.date)} · {w.name}</option>)}</select></div>{comparison.every(Boolean)&&<p className="osfit-goal">Разница тоннажа: {fmt(volumeOf(workouts.find(w=>w.id===comparison[1])?.exercises||[])-volumeOf(workouts.find(w=>w.id===comparison[0])?.exercises||[]))} кг</p>}</div>}
        {!workouts.length ? <div className="empty"><CalendarDays size={36}/><h2>Пока нет тренировок</h2><p>Завершённые тренировки будут появляться здесь.</p></div> : workouts.map(w => <button className="history-card" key={w.id} onClick={() => setDetail(w)}><div className="history-date"><b>{new Date(w.date).getDate()}</b><small>{new Date(w.date).toLocaleDateString('ru-RU', { month: 'short' })}</small></div><div className="history-body"><strong>{w.name}</strong><small>{w.exercises.length} упражнений · {fmt(volumeOf(w.exercises))} кг</small></div><span className="history-arrow">›</span></button>)}
      </section> : tab === 'calendar' ? <section>
        <div className="page-heading"><div><p className="eyebrow">РАСПИСАНИЕ</p><h1>Календарь</h1></div></div>
        <div className="card"><strong>Запланировать тренировку</strong><label className="field-label">Дата начала</label><input className="input" type="date" value={plannedDate} onChange={e=>setPlannedDate(e.target.value)}/><label className="field-label">Программа</label><select className="input" value={plannedProgram} onChange={e=>setPlannedProgram(e.target.value)}><option value="">Выбрать программу</option>{programs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><label className="field-label">Повторять</label><select className="input" value={repeatDays} onChange={e=>setRepeatDays(Number(e.target.value))}><option value={0}>Однократно</option><option value={2}>Каждые 2 дня</option><option value={3}>Каждые 3 дня</option><option value={7}>Раз в неделю</option><option value={14}>Раз в 14 дней</option></select><button className="btn primary full" onClick={()=>void addPlanned()}>Добавить в календарь</button></div>
        <input className="input" type="month" value={calendarMonth} onChange={e=>setCalendarMonth(e.target.value)}/>
        <div className="calendar-grid">{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d=><strong key={d}>{d}</strong>)}
        {Array.from({length:(new Date(Number(calendarMonth.slice(0,4)),Number(calendarMonth.slice(5))-1,1).getDay()+6)%7},(_,i)=><span key={'empty'+i}/>)}
        {Array.from({length:new Date(Number(calendarMonth.slice(0,4)),Number(calendarMonth.slice(5)),0).getDate()},(_,i)=>{
          const date=`${calendarMonth}-${String(i+1).padStart(2,'0')}`
          const count=workouts.filter(w=>localDay(w.date)===date).length;const scheduled=upcoming(date).length
          return <button key={date} className={count?'trained':scheduled?'planned':''} onClick={()=>{if(count){setTab('history');tell(`Тренировок за ${date}: ${count}`)}}}>{i+1}{count>0?<small>●</small>:scheduled>0?<small>○</small>:null}</button>
        })}</div>
        <h2 className="section-title">План занятий</h2>{schedule.map(a=><div className="card" key={a.id}><div className="exercise-head"><strong>{a.date} · {programs.find(p=>p.id===a.programId)?.name||'Удалённая программа'}</strong><button className="tiny-icon" onClick={()=>void removePlanned(a.id)}><Trash2 size={17}/></button></div><p className="muted small">{a.repeatDays?`Повтор каждые ${a.repeatDays} дней`:'Однократно'}</p><button className="btn secondary" onClick={()=>{const p=programs.find(p=>p.id===a.programId);if(p)beginSession(p)}}>Начать</button></div>)}
        <h2 className="section-title">Тренировки месяца</h2>
        {workouts.filter(w=>localDay(w.date).startsWith(calendarMonth)).length===0?<p className="muted">Нет записей за месяц</p>:workouts.filter(w=>localDay(w.date).startsWith(calendarMonth)).map(w=><button className="history-card" key={w.id} onClick={()=>{setTab('history');setDetail(w)}}>{formatDate(w.date)} · {w.name}</button>)}
      </section> : tab === 'body' ? <section>
        <p className="eyebrow">АНТРОПОМЕТРИЯ</p><h1>Замеры тела</h1>
        <div className="card"><label className="field-label">Дата</label><input className="input" type="date" value={bodyForm.date} onChange={e=>setBodyForm(x=>({...x,date:e.target.value}))}/>
        <div className="measure-grid">{([['weight','Вес, кг'],['waist','Талия, см'],['chest','Грудь, см'],['arm','Рука, см'],['thigh','Бедро, см'],['hips','Таз, см'],['neck','Шея, см']] as const).map(([key,label])=><label key={key}>{label}<input className="input" inputMode="decimal" placeholder="—" value={bodyForm[key]} onChange={e=>setBodyForm(x=>({...x,[key]:e.target.value}))}/></label>)}</div>
        <label className="field-label">Заметка</label><input className="input" value={bodyForm.note} onChange={e=>setBodyForm(x=>({...x,note:e.target.value}))}/>
        <button className="btn primary full" onClick={()=>void saveBody()}><Save size={17}/> Сохранить замеры</button></div>
        <h2 className="section-title">История замеров</h2>
        {!measurements.length?<p className="muted">Замеров пока нет</p>:measurements.map(m=><div className="card" key={m.id}><div className="exercise-head"><strong>{m.date}</strong><button className="tiny-icon" onClick={()=>void removeBody(m.id)}><Trash2 size={17}/></button></div><p className="muted small">{([['weight','Вес','кг'],['waist','Талия','см'],['chest','Грудь','см'],['arm','Рука','см'],['thigh','Бедро','см'],['hips','Таз','см'],['neck','Шея','см']] as const).filter(([k])=>m[k]!==undefined).map(([k,n,u])=>`${n}: ${m[k]} ${u}`).join(' · ')}</p>{m.note&&<p>{m.note}</p>}</div>)}
      </section> : tab === 'muscles' ? <section>
        <p className="eyebrow">АНАТОМИЯ НАГРУЗКИ</p><h1>Атлет и мышцы</h1>
        <div className="osfit-period-pills" role="group" aria-label="Период подсветки мышц">{[7,30,90,365].map(n=><button type="button" aria-pressed={musclePeriod===n} className={musclePeriod===n?'selected':''} key={n} onClick={()=>{setMusclePeriod(n);store.set('osfit-muscle-period',String(n))}}>{n===7?'7 дней':n===30?'30 дней':n===90?'90 дней':'1 год'}</button>)}</div>
        <AnatomyExplorer workouts={workouts} days={musclePeriod} sex={profile.sex}/>
        <h2>Мышцы текущей тренировки</h2><MuscleMap sex={profile.sex} loads={activeMuscles} exercises={rows} scope="Текущая тренировка"/>
      </section> : <section>
        <Dynamics workouts={workouts} measurements={measurements} sex={profile.sex} goals={goals}/>
      </section>}
    </main>
    {!editor && !settings && !detail && !textImport && <nav className="bottom-nav" aria-label="Основная навигация">
      <button className={tab === 'train' ? 'active' : ''} onClick={() => switchTab('train')}><Dumbbell size={21}/><span>Тренировка</span></button>
      
      <button className={tab === 'calendar' ? 'active' : ''} onClick={() => switchTab('calendar')}><CalendarDays size={21}/><span>Календарь</span></button>
      <button className={tab === 'progress' ? 'active' : ''} onClick={() => switchTab('progress')}><ChartNoAxesCombined size={21}/><span>Динамика</span></button>
      
      <button className={['history','body','muscles'].includes(tab) ? 'active' : ''} onClick={() => switchTab('history')}><Activity size={21}/><span>Ещё</span></button>
    </nav>}
  </div>
}
