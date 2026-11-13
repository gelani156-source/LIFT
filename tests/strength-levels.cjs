const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), ts=require('typescript')
const cache={}
function load(name){if(cache[name])return cache[name].exports;const src=fs.readFileSync(path.join(__dirname,'../src',name+'.ts'),'utf8');const js=ts.transpileModule(src,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const mod={exports:{}};cache[name]=mod;new Function('require','module','exports',js)(id=>id.startsWith('./')?load(id.slice(2)):require(id),mod,mod.exports);return mod.exports}
const {strengthLevels,STRENGTH_LIFTS}=load('strengthLevels')
const now=new Date(2026,10,20,12), body=[{id:'m',date:'2026-11-19',weight:100}]
const workout=(date,name,sets,unit='kg')=>({id:date,name:'t',programId:null,date,volume:0,exercises:[{id:'e',name,weightUnit:unit,sets}]})
const set=(weight,reps,other={})=>({id:'s',weight,reps,done:true,...other})
test('границы, общий уровень и неизменность исходных данных',()=>{const rows=STRENGTH_LIFTS.map(l=>workout('2026-11-19',l.name,[set(l.thresholds[1]*100,1)]));const before=JSON.stringify([rows,body]);const r=strengthLevels(rows,body,now);assert.deepEqual(r.lifts.map(l=>l.level),[3,3,3,3,3,3]);assert.equal(r.overall,3);assert.equal(JSON.stringify([rows,body]),before);for(const t of STRENGTH_LIFTS[0].thresholds){const below=strengthLevels([workout('2026-11-19',STRENGTH_LIFTS[0].name,[set(t*100-0.001,1)])],body,now).lifts[0].level;const at=strengthLevels([workout('2026-11-19',STRENGTH_LIFTS[0].name,[set(t*100,1)])],body,now).lifts[0].level;assert.equal(at,below+1)}})
test('последний день и лучший оценочный подход, а не старый рекорд',()=>{const name=STRENGTH_LIFTS[0].name;const r=strengthLevels([workout('2026-11-18',name,[set(200,1)]),workout('2026-11-19',name,[set(50,6),set(55,2)])],body,now);assert.equal(r.lifts[0].set.weight,50);assert.equal(r.lifts[0].set.estimate,60);assert.equal(r.overall,null)})
test('исключаются неподходящие единицы, упражнения, даты и подходы',()=>{const n=STRENGTH_LIFTS[0].name;const rows=[workout('2026-11-21',n,[set(90,1)]),workout('2026-02-30',n,[set(90,1)]),workout('2026-01-01',n,[set(90,1)]),workout('2026-11-19',n,[set(90,1)],'blocks'),workout('2026-11-19','Подтягивания',[set(90,1)]),workout('2026-11-19',n,[set(0,1),set(90,13),set(90,1.5),set(90,1,{kind:'warmup'}),set(90,1,{done:false}),set(90,1,{note:'Вес не указан'})])];assert.equal(strengthLevels(rows,body,now).lifts[0].set,null)})
test('нет веса, старый и будущий замеры, ровно 90 дней',()=>{const rows=[workout('2026-08-22',STRENGTH_LIFTS[0].name,[set(70,1)])];assert.equal(strengthLevels(rows,[],now).lifts[0].level,null);assert.equal(strengthLevels(rows,[{date:'2026-08-21',weight:100},{date:'2026-11-21',weight:100}],now).body,null);assert.ok(strengthLevels(rows,[{date:'2026-08-22',weight:100}],now).lifts[0].level)})

test('замеры сортируются по локальному календарному дню, а не исходному ISO',()=>{
  const old=process.env.TZ
  try {
    process.env.TZ='America/Los_Angeles'
    const r=strengthLevels([], [{id:'later',date:'2026-11-19',weight:90},{id:'earlier',date:'2026-11-20T01:00:00Z',weight:80}], now)
    assert.equal(r.body.id,'later')
  } finally { if(old===undefined) delete process.env.TZ; else process.env.TZ=old }
})
test('только явные кг или отсутствующая единица; названия не угадываются',()=>{
  const n=STRENGTH_LIFTS[0].name
  for(const unit of ['lb','',null,undefined,'blocks']) {
    const row=workout('2026-11-19',n,[set(100,1)])
    row.exercises[0].weightUnit=unit
    assert.equal(strengthLevels([row],body,now).lifts[0].set,null)
  }
  const legacy=workout('2026-11-19',n,[set(100,1)])
  delete legacy.exercises[0].weightUnit
  assert.ok(strengthLevels([legacy],body,now).lifts[0].set)
  for(const name of ['Жим лёжа','Жим штанги лёжа узким хватом']) assert.equal(strengthLevels([workout('2026-11-19',name,[set(100,1)])],body,now).lifts[0].set,null)
})
test('неконечные и экстремальные значения не влияют на результат',()=>{
  const n=STRENGTH_LIFTS[0].name
  const rows=[workout('2026-11-19',n,[set(Infinity,1),set(Number.MAX_VALUE,1),set(1001,1),set(100,Infinity),set(100,1)])]
  const measurements=[{date:'2026-11-20',weight:Infinity},{date:'2026-11-20',weight:501},{date:'2026-11-20',weight:0.5},...body]
  const r=strengthLevels(rows,measurements,now)
  assert.equal(r.body.weight,100)
  assert.equal(r.lifts[0].set.weight,100)
  assert.equal(strengthLevels([workout('2026-11-19',n,[set(1000,1)])],[{date:'2026-11-19',weight:500}],now).lifts[0].ratio,2)
})

test('покрытие, новые упражнения и отсутствие данных',()=>{
 const rows=STRENGTH_LIFTS.slice(3).map(l=>workout('2026-11-19',l.name,[set(l.thresholds[3]*100,1)]))
 let r=strengthLevels(rows,body,now);assert.equal(r.coverage,3);assert.equal(r.overall,5);assert.deepEqual(r.lifts.slice(3).map(l=>l.level),[5,5,5])
 r=strengthLevels(rows.slice(0,2),body,now);assert.equal(r.coverage,2);assert.equal(r.overall,null)
 assert.equal(strengthLevels([],body,now).overall,null)
})
test('старая привязка имеет приоритет над новым названием',()=>{
 const settings={version:1,aliases:[['Тяга штанги в наклоне'],[],[]],manual:[null,null,null]}
 const r=strengthLevels([workout('2026-11-19','Тяга штанги в наклоне',[set(50,1)])],body,now,settings)
 assert.ok(r.lifts[0].set);assert.equal(r.lifts[3].set,null)
})

test('старые записи блоков не становятся килограммами через привязку',()=>{
 const settings={version:1,aliases:[['Сгибания'],[],[]],manual:[null,null,null]}
 const row=workout('2026-11-19','Сгибания',[set(10,1)]);delete row.exercises[0].weightUnit
 assert.equal(strengthLevels([row],body,now,settings).lifts[0].set,null)
})
