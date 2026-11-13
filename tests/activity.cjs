const test=require('node:test'), assert=require('node:assert/strict')
const fs=require('node:fs'), path=require('node:path'), ts=require('typescript'), cache={}
function load(name){if(cache[name])return cache[name].exports; const src=fs.readFileSync(path.join(__dirname,'../src',name+'.ts'),'utf8');const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText, mod={exports:{}};cache[name]=mod;new Function('require','module','exports',js)(id=>id.startsWith('./')?load(id.slice(2)):require(id),mod,mod.exports);return mod.exports}
const {calculateActivity}=load('activity')
const now=new Date(2026,10,20,12)
const row=(id,day,n=1)=>({id,date:day,exercises:[{name:'A',sets:Array.from({length:n},()=>({done:true,weight:0,reps:1}))}]})
test('28 календарных дней, границы, перерыв и неизменность',()=>{
 const rows=[row('a','2026-10-24'),row('b','2026-10-23'),row('c','2026-11-20'),row('d','2026-11-21')], before=JSON.stringify(rows)
 assert.deepEqual(calculateActivity(rows,now),{days:2,points:4,level:1})
 assert.deepEqual(calculateActivity(rows,new Date(2026,11,19,12)),{days:0,points:0,level:0})
 assert.equal(JSON.stringify(rows),before)
})
test('лимит дня и дубли, конфликтующие ID',()=>{
 const a=row('a','2026-11-20',3), b=row('b','2026-11-20',9)
 assert.deepEqual(calculateActivity([a,structuredClone(a)],now),{days:1,points:4,level:1})
 assert.deepEqual(calculateActivity([a,b],now),{days:1,points:5,level:1})
 assert.deepEqual(calculateActivity([a,row('a','2026-11-19')],now),{days:0,points:0,level:0})
})
test('пустые и некорректные данные исключены',()=>{
 const bad=[null,{},row('x','2026-02-30'),row('y','2026-11-20',0),{id:'z',date:'2026-11-20',exercises:[{name:'',sets:[{done:true,weight:0,reps:1}]}]}, {id:'v',date:'2026-11-20',exercises:[{name:'a',sets:[{done:true,weight:NaN,reps:1},{done:true,weight:0,reps:1,kind:'warmup'}]}]}]
 assert.deepEqual(calculateActivity(bad,now),{days:0,points:0,level:0})
})
test('пороги очков и независимость от веса',()=>{
 const rows=Array.from({length:10},(_,i)=>row(String(i),`2026-11-${String(i+1).padStart(2,'0')}`,4))
 for(const [n,level] of [[0,0],[1,1],[2,2],[4,3],[7,4],[10,5]]) assert.equal(calculateActivity(rows.slice(0,n),now).level,level)
 const copy=structuredClone(rows); copy[0].exercises[0].sets[0].weight=999
 assert.deepEqual(calculateActivity(rows,now),calculateActivity(copy,now))
})
