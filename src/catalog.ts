import {exerciseCatalog, exerciseDisplayName, formatWeight, isWorkSet, norm, weightInKg, type Program, type Workout} from './model'
import {groupFor, suggestions} from './smart'

// Aliases only affect discovery; they never merge historical names or change units.
const aliases:Record<string,string[]> = {
  'жим штанги лежа':['жим лёжа','bench press'],
  'присед со штангой':['приседания','squat'],
  'становая тяга':['становая','deadlift'],
  'подтягивания':['pull up','pull-up'],
  'жим стоя':['армейский жим','overhead press'],
}
export type CatalogResult={name:string,group:string,latest?:string,record?:string}
type CatalogEntry=CatalogResult & {key:string,terms:string[]}
export type CatalogIndex=CatalogEntry[]
const key=(name:string)=>norm(name).replace(/\s+/g,' ')
// Preserve the stored identity when a legacy display alias differs from it.
export function catalogLabel(name:string):string{
 const display=exerciseDisplayName(name)
 return display===name?name:`${display} — исходное название: ${name}`
}
export function buildCatalogIndex(programs:Program[],workouts:Workout[]):CatalogIndex{
 const names=[...exerciseCatalog,...suggestions('Все'),...programs.flatMap(p=>p.exercises.map(e=>e.name)),...workouts.flatMap(w=>w.exercises.map(e=>e.name))]
 const unique=new Map<string,string>()
 for(const name of names){const n=name.trim();if(n&&!unique.has(key(n)))unique.set(key(n),n)}
 const history=new Map<string,{date:number,text:string,kg?:number,record?:string}>()
 for(const w of workouts){const date=Date.parse(w.date);if(!Number.isFinite(date))continue
  for(const e of w.exercises){const k=key(e.name), valid=e.sets.filter(isWorkSet);if(!valid.length)continue
   let entry=history.get(k)
   if(!entry){entry={date:-Infinity,text:''};history.set(k,entry)}
   if(date>entry.date){const s=valid[valid.length-1];entry.date=date;entry.text=`${formatWeight(e,s.weight)} × ${s.reps}`}
   for(const s of valid){const kg=weightInKg(e,s.weight);if(entry.kg===undefined||kg>entry.kg){entry.kg=kg;entry.record=`${formatWeight(e,s.weight)} × ${s.reps}`}}
  }
 }
 return Array.from(unique,([k,name])=>{const entry=history.get(k);return {key:k,name,group:groupFor(name),latest:entry?.text,record:entry?.record,terms:[name,exerciseDisplayName(name),...(Object.hasOwn(aliases,k)?aliases[k]:[])].map(key)}})
}
export function filterCatalogIndex(index:CatalogIndex,query='',group='Все',favorites:string[]=[],favoriteOnly=false,customAliases:Record<string,string[]>={}):CatalogResult[]{
 const q=key(query), favoriteKeys=new Set(favorites.map(key))
 const result:CatalogResult[]=[]
 for(const {key:k,name,group:g,latest,record,terms} of index){
  if(group!=='Все'&&group!==g||favoriteOnly&&!favoriteKeys.has(k))continue
  if(q&&!terms.some(term=>term.includes(q))&&!(Object.hasOwn(customAliases,k)?customAliases[k]:[]).some(term=>key(term).includes(q)))continue
  result.push({name,group:g,latest,record})
 }
 return result.sort((a,b)=>Number(favoriteKeys.has(key(b.name)))-Number(favoriteKeys.has(key(a.name)))||a.name.localeCompare(b.name,'ru'))
}
export function catalogResults(programs:Program[],workouts:Workout[],query='',group='Все',favorites:string[]=[],favoriteOnly=false,customAliases:Record<string,string[]>={}):CatalogResult[]{
 return filterCatalogIndex(buildCatalogIndex(programs,workouts),query,group,favorites,favoriteOnly,customAliases)
}
export function addCatalogAlias(aliasesByName:Record<string,string[]>,name:string,alias:string):Record<string,string[]>{
 const k=key(name), value=alias.trim();if(!k||!value||k==='__proto__'||k==='constructor'||k==='prototype')return aliasesByName
 const old=aliasesByName[k]||[];if(old.some(x=>key(x)===key(value)))return aliasesByName
 return {...aliasesByName,[k]:[...old,value]}
}
export function catalogKey(name:string){return key(name)}
