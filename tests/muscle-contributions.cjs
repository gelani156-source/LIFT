const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript')
const cache={}
function load(name){
 if(cache[name])return cache[name].exports
 const file=path.join(__dirname,'../src',name)+(fs.existsSync(path.join(__dirname,'../src',name+'.ts'))?'.ts':'.tsx')
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText
 const mod={exports:{}};cache[name]=mod
 new Function('require','module','exports',js)(id=>id.startsWith('./')?load(id.slice(2)):require(id),mod,mod.exports)
 return mod.exports
}
const {muscleContributions}=load('muscleContributions')
const {muscleLoad,exerciseMuscleLoad,labels}=load('MuscleMap')
const {anatomyPeriods}=load('anatomyPeriods')
const set=(extra={})=>({id:'s',weight:20,reps:8,done:true,kind:'work',...extra})
const line=(name,sets=[set()],extra={})=>({id:'e',name,sets,...extra})
const repeat=n=>Array.from({length:n},()=>set())
const workout=(id,date,exercises)=>({id,date,name:'fixture',programId:null,volume:0,exercises})

test('counts only valid completed non-warmup sets, including drop and zero weight',()=>{
 const rows=[line('Сгибание рук со штангой',[set(),set({weight:0}),set({kind:'drop'}),set({kind:'warmup'}),set({done:false}),set({reps:0}),set({reps:NaN}),set({weight:-1}),set({weight:Infinity})])]
 const items=muscleContributions(rows,'biceps')
 assert.equal(items.length,1)
 assert.equal(items[0].workSets,3)
 assert.equal(items[0].share,1)
 assert.equal(items[0].load,3)
})
test('includes indirect exercises and sorts by contribution, not raw set count',()=>{
 const rows=[line('Подтягивания',repeat(6)),line('Сгибание рук со штангой',repeat(4)),line('Жим штанги лёжа',repeat(10)),line('Неизвестное упражнение',repeat(10))]
 const items=muscleContributions(rows,'biceps')
 assert.deepEqual(items.map(x=>[x.name,x.workSets,x.share,x.load]),[['Сгибание рук со штангой',4,1,4],['Подтягивания',6,.5,3]])
})
test('aggregates repeated rows across sessions using catalog normalization',()=>{
 const rows=[line(' Жим  штанги лёжа ',repeat(2)),line('жим штанги лежа',repeat(3)),line('ЖИМ ШТАНГИ ЛЁЖА',repeat(1))]
 const before=JSON.stringify(rows),items=muscleContributions(rows,'chest')
 assert.equal(items.length,1)
 assert.equal(items[0].name,'Жим штанги лёжа')
 assert.equal(items[0].workSets,6)
 assert.equal(items[0].load,6)
 assert.equal(JSON.stringify(rows),before)
})
test('preserves distinct historical names even when their display aliases coincide',()=>{
 const rows=[line('Трицепс',repeat(2)),line('Трицепс в кроссовере',repeat(3)),line('Сгибания',repeat(1)),line('Сгибание ног в тренажёре',repeat(2))]
 const items=muscleContributions(rows,'triceps')
 assert.equal(items.length,2)
 assert.deepEqual(items.map(x=>x.workSets),[3,2])
 assert.equal(muscleContributions(rows,'hamstrings').length,2)
})
test('quarter and three-quarter contributions keep their precision',()=>{
 const rows=[line('Присед со штангой',repeat(3)),line('Лодочка',repeat(1))]
 assert.deepEqual(muscleContributions(rows,'glutes').map(x=>x.load),[2.25,.25])
 assert.equal(muscleContributions(rows,'forearms').length,0)
})
test('empty, unknown, unfinished and unrelated exercises produce an empty list',()=>{
 for(const rows of [[],[line('Неизвестное')],[line('Жим',[])],[line('Жим',[set({done:false})])],[line('Присед со штангой')]])assert.deepEqual(muscleContributions(rows,'chest'),[])
})
test('list totals reconcile with map load for every muscle and mixed exercises',()=>{
 const names=['Жим штанги лёжа','Сгибание рук со штангой','Подтягивания','Присед со штангой','Лодочка','Становая тяга','Брусья','Шраги','Подъём на носки','Скручивания','Разгибание ног','Сгибания','Трицепс','Ягодичный мост','Сведение рук в кроссовере']
 const rows=names.flatMap((name,i)=>[line(name,[...repeat(i%4+1),set({kind:'warmup'}),set({done:false})]),line(name,[set({kind:'drop',weight:0})])])
 const before=JSON.stringify(rows),loads=exerciseMuscleLoad(rows)
 for(const muscle of Object.keys(labels))assert.equal(muscleContributions(rows,muscle).reduce((n,x)=>n+x.load,0),loads[muscle],muscle)
 assert.equal(JSON.stringify(rows),before)
})
test('uses the exact current period, excluding previous, future and malformed dates',()=>{
 const now=Date.parse('2026-11-12T12:00:00Z'),day=86400000
 const ws=[workout('current',new Date(now-day).toISOString(),[line('Жим',repeat(2))]),workout('boundary',new Date(now-7*day).toISOString(),[line('Жим',repeat(8))]),workout('future',new Date(now+day).toISOString(),[line('Жим',repeat(9))]),workout('invalid','2026-02-30',[line('Жим',repeat(9))])]
 const current=anatomyPeriods(ws,7,now).current
 assert.deepEqual(muscleContributions(current.flatMap(w=>w.exercises),'chest').map(x=>x.workSets),[2])
 assert.equal(muscleContributions(current.flatMap(w=>w.exercises),'chest')[0].load,muscleLoad(current).chest)
 const month=anatomyPeriods(ws,30,now).current
 assert.equal(muscleContributions(month.flatMap(w=>w.exercises),'chest')[0].workSets,10)
})
test('current workout uses live completed rows without requiring a saved workout/date',()=>{
 const rows=[line('Подтягивания',[set({done:false})])]
 assert.deepEqual(muscleContributions(rows,'biceps'),[])
 const changed=[{...rows[0],sets:[{...rows[0].sets[0],done:true}]}]
 assert.equal(muscleContributions(changed,'biceps')[0].load,.5)
 assert.equal(changed[0].sets[0].weight,rows[0].sets[0].weight)
})
test('same exercise units do not affect set-based load or rewrite input weights',()=>{
 const rows=[line('Трицепс',[set({weight:4})],{weightUnit:'blocks'}),line('Трицепс',[set({weight:20})],{weightUnit:'kg'})]
 const before=JSON.stringify(rows),items=muscleContributions(rows,'triceps')
 assert.equal(items.length,1)
 assert.equal(items[0].load,2)
 assert.equal(JSON.stringify(rows),before)
})
test('equal contributions have a deterministic name order',()=>{
 const a=line('Жим штанги лёжа'),b=line('Жим гантелей лёжа')
 assert.deepEqual(muscleContributions([a,b],'chest').map(x=>x.key),muscleContributions([b,a],'chest').map(x=>x.key))
})
