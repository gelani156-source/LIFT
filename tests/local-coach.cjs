// node --test tests/local-coach.cjs
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const cache = {}
function load(name) {
 if(cache[name]) return cache[name].exports
 const source=fs.readFileSync(path.join(__dirname,'../src',name+'.ts'),'utf8')
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
 const mod={exports:{}}; cache[name]=mod
 new Function('require','module','exports',js)(id=>id.startsWith('./')?load(id.slice(2)):require(id),mod,mod.exports)
 return mod.exports
}
const {localCoach}=load('localCoach')
const now=Date.parse('2026-11-10T12:00:00Z'), day=86400000
const set=(weight=10,reps=10,extra={})=>({id:'s',weight,reps,done:true,...extra})
const workout=(id,days,sets=[set()],extra={})=>({id,name:'Тест',programId:null,date:new Date(now-days*day).toISOString(),volume:999,exercises:[{id:'e',name:'Жим',sets}],...extra})
test('empty or insufficient history never makes a trend claim',()=>{
 const empty=localCoach([],now); assert.equal(empty.current.sessions,0); assert.match(empty.message,/Недостаточно данных/)
 assert.match(localCoach([workout('a',1),workout('b',8)],now).message,/Недостаточно данных/)
})
test('boundaries, work sets, block conversion and stored volume',()=>{
 const block=workout('a',7,[set(6,10),set(3,5,{kind:'warmup'}),set(2,8,{done:false})],{exercises:[{id:'e',name:'Трицепс',sets:[set(6,10),set(3,5,{kind:'warmup'}),set(2,8,{done:false})]}]})
 const r=localCoach([block,workout('b',14),workout('c',14.01),workout('d',0)],now)
 assert.deepEqual(r.current,{sessions:2,sets:2,volume:400})
 assert.deepEqual(r.previous,{sessions:1,sets:1,volume:100})
})
test('compares only adequately populated windows without automatic progression',()=>{
 const r=localCoach([workout('a',1,[set(),set()]),workout('b',2),workout('c',8),workout('d',9)],now)
 assert.match(r.comparison,/2 → 3 \(\+1\)/); assert.match(r.message,/Не спеши/)
 const down=localCoach([workout('a',1),workout('b',2),workout('c',8,[set(),set()]),workout('d',9)],now)
 assert.match(down.message,/снизилось/)
})
test('rejects duplicate IDs, invalid and future dates and nonfinite volume',()=>{
 const bad=workout('bad',1,[set(Number.MAX_VALUE,2)])
 const r=localCoach([workout('dup',1),workout('dup',8),workout('invalid',1,undefined,{date:'oops'}),workout('future',-1),bad,workout('ok',1)],now)
 assert.equal(r.excluded,5); assert.equal(r.current.sessions,1); assert.equal(r.previous.sessions,0)
})
test('bodyweight work set counts but contributes zero external tonnage',()=>{
 const r=localCoach([workout('a',1,[set(0,8),set(10,0),set(10,5,{kind:'drop'})])],now)
 assert.deepEqual(r.current,{sessions:1,sets:2,volume:50})
})
