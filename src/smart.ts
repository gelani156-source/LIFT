import type {Program,Workout,ExerciseLine} from './model'
export const library:Record<string,string[]>={
'Грудь':['Жим штанги лёжа','Жим гантелей лёжа','Жим на наклонной скамье','Брусья','Сведение рук в кроссовере'],
'Спина':['Подтягивания','Тяга верхнего блока','Тяга горизонтального блока','Тяга штанги в наклоне','Тяга гантели одной рукой','Лодочка'],
'Ноги':['Присед со штангой','Жим ногами','Выпады','Разгибание ног','Сгибание ног','Румынская тяга'],
'Плечи':['Жим стоя','Разведение гантелей в стороны','Обратная бабочка','Махи гантелями в стороны'],
'Руки':['Сгибание рук со штангой','Сгибание рук с гантелями','Разгибание рук на блоке','Французский жим'],
'Икры':['Подъём на носки','Подъём на носки сидя'],
'Пресс':['Скручивания','Планка','Подъём ног в висе']}
export const groups=['Все',...Object.keys(library)]
export function suggestions(group:string){return group==='Все'?Object.values(library).flat():library[group]||[]}
export function groupFor(name:string){for(const [g,names] of Object.entries(library))if(names.some(x=>x.toLocaleLowerCase('ru')===name.toLocaleLowerCase('ru')))return g;const n=name.toLocaleLowerCase('ru');if(/жим.*леж|груд/.test(n))return 'Грудь';if(/тяга|подтяг|спин/.test(n))return 'Спина';if(/дельт|плеч|махи/.test(n))return 'Плечи';if(/присед|бедр|ног|выпад/.test(n))return 'Ноги';if(/бицеп|трицеп|рук/.test(n))return 'Руки';if(/икр|нос/.test(n))return 'Икры';if(/пресс|скруч|планк/.test(n))return 'Пресс';return 'Все'}
export function getExerciseAlternative(exercise:string){const group=groupFor(exercise);return suggestions(group).filter(x=>x!==exercise).slice(0,8)}
export function serializeProgram(program:Program){return JSON.stringify({format:'osfit-shared-program',version:1,program},null,2)}
export async function readProgramFile(file:File):Promise<Program>{if(file.size>2_000_000)throw new Error('Файл слишком большой');const obj=JSON.parse(await file.text()) as {format?:string,program?:Program};if(obj.format!=='osfit-shared-program'||!obj.program||typeof obj.program.name!=='string'||!Array.isArray(obj.program.exercises))throw new Error('Некорректный файл программы');if(obj.program.exercises.length>100||obj.program.exercises.some((e:ExerciseLine)=>typeof e.name!=='string'||!Array.isArray(e.sets)||e.sets.length>50))throw new Error('Некорректная структура упражнений');return obj.program}
export function weeklyMuscleSets(workouts:Workout[],group:string,days=7){const cutoff=Date.now()-days*86400000;return workouts.filter(w=>Date.parse(w.date)>=cutoff).flatMap(w=>w.exercises).filter(e=>groupFor(e.name)===group).reduce((acc,e)=>acc+e.sets.filter(s=>s.done&&s.kind!=='warmup').length,0)}
export function bodyPartPrompt(raw:string){const v=raw.trim().toLocaleLowerCase('ru');const lookup:Record<string,string>={'дельты':'Плечи','плечи':'Плечи','грудь':'Грудь','спина':'Спина','ноги':'Ноги','бицепс':'Руки','трицепс':'Руки','икры':'Икры','пресс':'Пресс'};return lookup[v]||null}
