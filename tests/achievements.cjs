const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const cache = {}
function load(name) {
  if (cache[name]) return cache[name].exports
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', name + '.ts'), 'utf8')
  const js = ts.transpileModule(src, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
  const mod = {exports:{}}; cache[name] = mod
  new Function('require','module','exports',js)(id => id.startsWith('./') ? load(id.slice(2)) : require(id), mod, mod.exports)
  return mod.exports
}
const {calculateAchievements} = load('achievements')
const now = new Date(2026, 10, 20, 12)
const workout = (id, day, overrides={}) => ({id, name:'Пример', programId:null, date:new Date(2026,10,day,12).toISOString(), volume:999999, exercises:[{id:'e', name:'Пример', sets:[{id:'s', weight:0, reps:1, done:true}]}], ...overrides})
test('пороги, только уникальные дни, без изменения исходных данных', () => {
  const rows = Array.from({length:15}, (_,i)=>workout(String(i), i+1))
  rows.push(workout('duplicate', 1), {...rows[1]})
  const before = JSON.stringify(rows)
  const result = calculateAchievements(rows, now)
  assert.equal(result.days,15); assert.equal(result.level,3)
  assert.deepEqual(result.badges.map(b=>b.earned),[true,true,true,false,false])
  assert.equal(JSON.stringify(rows),before)
})
test('пустые, разминка, невыполненные, некорректные и будущие не учитываются', () => {
  const bad = [workout('a',1,{exercises:[]}), workout('b',2,{exercises:[{name:'',sets:[{done:true,weight:0,reps:1}]}]}), workout('c',3,{exercises:[{name:'A',sets:[{done:true,kind:'warmup',weight:1,reps:1}]}]}), workout('d',4,{exercises:[{name:'A',sets:[{done:false,weight:1,reps:1}]}]}), workout('e',5,{exercises:[{name:'A',sets:[{done:true,weight:NaN,reps:1}]}]}), workout('f',6,{date:'2026-02-30T12:00:00Z'}), workout('g',21), workout('',7)]
  assert.equal(calculateAchievements(bad,now).days,0)
})
test('конфликт одинакового ID на разных днях не засчитывается', () => {
  assert.equal(calculateAchievements([workout('same',1),workout('same',2),workout('other',2)],now).days,1)
})
test('уровень не зависит от веса, объёма и числа подходов', () => {
  const a = workout('a',1); const b = structuredClone(a)
  b.volume=1e12; b.exercises[0].sets[0].weight=1000; b.exercises[0].sets.push({...b.exercises[0].sets[0]})
  assert.deepEqual(calculateAchievements([a],now), calculateAchievements([b],now))
})
test('граничные уровни и нулевая история', () => {
  const rows = Array.from({length:60},(_,i)=>({ ...workout(String(i),1), date:new Date(2026,0,i+1,12).toISOString()}))
  for (const [n, level] of [[0,0],[1,1],[4,1],[5,2],[14,2],[15,3],[29,3],[30,4],[59,4],[60,5]]) assert.equal(calculateAchievements(rows.slice(0,n),now).level,level)
})
