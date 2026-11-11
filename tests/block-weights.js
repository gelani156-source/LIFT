/* Browser-only, dependency-free regression assertions against actual TS sources.
 * Open block-weights.html; window.blockWeightTestResult contains the final status.
 * React hooks/JSX are inert test doubles: analytics are inspected as element props.
 */
(async()=>{
 const output=document.querySelector('#results'),log=[];let assertions=0
 const assert=(ok,message)=>{assertions++;if(!ok)throw new Error(message)}
 const eq=(actual,expected,message)=>assert(Object.is(actual,expected),`${message}: expected ${expected}, received ${actual}`)
 const near=(actual,expected,message)=>assert(Math.abs(actual-expected)<1e-8,`${message}: expected ${expected}, received ${actual}`)
 try{
  if(!window.ts)throw new Error('TypeScript compiler unavailable (CDN/network required)')
  const sources={},cache={};let hookValues=[],hookIndex=0
  const element=(type,props)=>({type,props:props||{}})
  const modules={react:{useState:initial=>[hookIndex<hookValues.length?hookValues[hookIndex++]:typeof initial==='function'?initial():initial,()=>{}],useMemo:fn=>fn()},'react/jsx-runtime':{jsx:element,jsxs:element,Fragment:Symbol('Fragment')},'./AnatomyMuscleMap':{default:()=>null}}
  for(const name of ['model','storage','db','smart','ironlog','MuscleMap','localCoach','Dynamics']){
   const ext=['MuscleMap','Dynamics'].includes(name)?'tsx':'ts'
   const response=await fetch(`../src/${name}.${ext}?test=${Date.now()}`,{cache:'no-store'})
   if(!response.ok)throw new Error(`Cannot read ${name}: ${response.status}`)
   const compiled=ts.transpileModule(await response.text(),{fileName:`${name}.${ext}`,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},reportDiagnostics:true})
   const errors=(compiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error)
   assert(!errors.length,`${name} syntax: ${errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join('; ')}`)
   sources[`./${name}`]=compiled.outputText
  }
  const require=id=>{
   if(modules[id])return modules[id]
   if(cache[id])return cache[id].exports
   if(!sources[id])throw new Error(`Unexpected import: ${id}`)
   const mod={exports:{}};cache[id]=mod
   new Function('require','module','exports',sources[id])(require,mod,mod.exports)
   return mod.exports
  }
  const m=require('./model'),db=require('./db'),smart=require('./smart'),iron=require('./ironlog'),muscles=require('./MuscleMap'),Dynamics=require('./Dynamics').default
  const set=(weight,reps=10,extra={})=>({id:`s-${weight}`,weight,reps,done:true,...extra})
  const ex=(name,sets=[set(6)],extra={})=>({id:`e-${name}`,name,sets,...extra})
  const workout=exercises=>({id:'w',name:'Workout',date:new Date().toISOString(),programId:null,exercises,volume:999999})
  for(const name of ['Трицепс','  ТРИЦЕПС  ','Сгибания',' сгибания ']){
   const e=ex(name)
   eq(m.weightUnitOf(e),'blocks',`${name}: inferred unit`)
   eq(m.weightInKg(e,6),30,`${name}: 5kg block`)
   eq(m.formatWeight(e,6),'6 бл. (30 кг)',`${name}: block label`)
   eq(m.volumeOf([e]),300,`${name}: volume`)
  }
  for(const name of ['Трицепс в кроссовере','Сгибание ног в тренажёре','Сгибание ног','Трицепс на блоке','Сгибания рук','Сгибания ног','Трицепс!','Жим','toString','constructor','__proto__']){
   eq(m.weightUnitOf(ex(name)),'kg',`${name}: no broad inference`)
   eq(m.exerciseDisplayName(name),name,`${name}: unchanged source name`)
  }
  eq(m.weightInKg(ex('Трицепс',[],{weightUnit:'kg'}),6),6,'explicit kg overrides alias')
  eq(m.formatWeight(ex('Трицепс',[],{weightUnit:'kg'}),30),'30 кг','explicit kg formatting')
  eq(m.weightInKg(ex('Жим',[],{weightUnit:'blocks'}),6),30,'explicit blocks for any name')
  eq(m.weightInKg(ex('Сгибания'),2.5),12.5,'fractional raw blocks remain supported')
  eq(m.formatWeight(ex('Сгибания'),0),'0 бл. (0 кг)','zero blocks label')
  eq(m.exerciseDisplayName(' ТРИЦЕПС '),'Трицепс в кроссовере','triceps display alias')
  eq(m.exerciseDisplayName('сгибания'),'Сгибание ног в тренажёре','leg curl display alias')
  const raw=ex('Сгибания',[set(6),set(8,8,{kind:'drop'}),set(100,10,{kind:'warmup'}),set(100,10,{done:false}),set(-3),set(NaN),set(3,0),set(3,Infinity)])
  const before=JSON.stringify(raw)
  eq(m.volumeOf([raw,ex('Жим',[set(20,5)])]),720,'mixed-unit volume excludes warmup/incomplete/invalid')
  eq(JSON.stringify(raw),before,'analytics never mutate raw weights or IDs')
  near(m.estimate1RM(m.weightInKg(raw,6),10),40,'Epley receives converted kg once')
  eq(m.estimate1RM(m.weightInKg(raw,6),1),30,'single-rep max is kg')
  eq(m.estimate1RM(m.weightInKg(raw,6),13),0,'high-rep max remains excluded')
  for(const weightUnit of ['kg','blocks']){
   const source=ex('Трицепс',[set(6)],{weightUnit,note:'keep',superset:'pair'})
   const cleaned=db.cleanExercise(source)
   eq(cleaned.weightUnit,weightUnit,'sanitizer preserves explicit unit')
   eq(cleaned.name,source.name,'sanitizer preserves persisted name')
   eq(cleaned.id,source.id,'sanitizer preserves exercise ID')
   eq(cleaned.sets[0].id,source.sets[0].id,'sanitizer preserves set ID')
   eq(cleaned.sets[0].weight,6,'sanitizer preserves raw weight')
   const program={id:'p',name:'Program',createdAt:new Date().toISOString(),exercises:[source]}
   const restored=await smart.readProgramFile(new File([smart.serializeProgram(program)],'program.json'))
   const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v)
   eq(canonical(restored),canonical(program),'portable program roundtrip preserves all fields')
   const cleanedWorkout=db.cleanWorkout(workout([source]))
   eq(cleanedWorkout.exercises[0].weightUnit,weightUnit,'workout/backup sanitizer preserves unit')
  }
  assert(!('weightUnit' in db.cleanExercise(ex('Трицепс'))),'legacy inferred unit remains optional, no migration')
  assert(!('weightUnit' in db.cleanExercise(ex('Трицепс',[],{weightUnit:'lb'}))),'invalid explicit unit is dropped')
  log.push('PASS: unit inference, kg conversion, formatting, raw data/IDs, volume, 1RM, sanitizers, portable roundtrip')
  const imported=iron.convertIronlog({workouts:[{date:'2026-11-01',exercises:[
   {name:'Трицепс',sets:[{weight:6,reps:10},{weight:90,reps:10,kind:'warmup'}]},
   {name:'Сгибания',weightUnit:'kg',sets:[{weight:6,reps:10}]},
   {name:'Тяга',weightUnit:'blocks',note:'cable',superset:'pair',sets:[{weight:4,reps:8,kind:'drop',note:'keep',rpe:8,rir:2,tempo:'3010'}]}
  ]}]})
  const iw=imported.workouts[0]
  eq(iw.volume,520,'Ironlog computes kg once and excludes preserved warmup')
  eq(iw.exercises[0].sets[0].weight,6,'Ironlog leaves block weight raw')
  eq(iw.exercises[1].weightUnit,'kg','Ironlog preserves explicit kg override')
  eq(iw.exercises[2].weightUnit,'blocks','Ironlog preserves explicit blocks')
  eq(iw.exercises[2].note,'cable','Ironlog preserves exercise note')
  eq(iw.exercises[2].superset,'pair','Ironlog preserves superset')
  eq(iw.exercises[2].sets[0].kind,'drop','Ironlog preserves set kind')
  eq(iw.exercises[2].sets[0].rpe,8,'Ironlog preserves RPE')
  eq(iw.exercises[2].sets[0].rir,2,'Ironlog preserves RIR')
  eq(iw.exercises[2].sets[0].tempo,'3010','Ironlog preserves tempo')
  eq(iw.exercises[2].sets[0].note,'keep','Ironlog preserves set note')
  const ip=iron.convertIronlog({programs:[{name:'P',exercises:[{name:'Custom',weightUnit:'blocks',sets:[{weight:3,reps:8}]}]}]})
  eq(ip.programs[0].exercises[0].weightUnit,'blocks','Ironlog program unit metadata')
  for(const name of ['Сгибания',' СГИБАНИЯ ','Сгибание ног в тренажёре']){
   eq(smart.groupFor(name),'Ноги',`${name}: smart group is legs`)
   eq(JSON.stringify(muscles.classify(name)),JSON.stringify(['hamstrings']),`${name}: hamstrings only`)
  }
  for(const name of ['Трицепс',' ТРИЦЕПС ','Трицепс в кроссовере']){
   eq(smart.groupFor(name),'Руки',`${name}: smart group is arms`)
   eq(JSON.stringify(muscles.classify(name)),JSON.stringify(['triceps']),`${name}: triceps, not chest`)
  }
  assert(muscles.classify('Сгибание рук со штангой').includes('biceps'),'real arm curls still train biceps')
  assert(muscles.classify('Сведение рук в кроссовере').includes('chest'),'chest crossover still trains chest')
  const legHistory=[workout([ex('Сгибания',[set(6),set(100,10,{kind:'warmup'}),set(6,10,{done:false})])])]
  eq(muscles.muscleLoad(legHistory).hamstrings,1,'muscle load counts work sets, not kg/blocks')
  eq(muscles.muscleLoad(legHistory).biceps,0,'short leg curls add no biceps load')
  eq(muscles.exerciseMuscleLoad(legHistory[0].exercises).hamstrings,1,'current muscle load uses same rule')
  eq(smart.weeklyMuscleSets(legHistory,'Ноги'),1,'weekly groups count short leg curls')
  eq(smart.weeklyMuscleSets(legHistory,'Руки'),0,'weekly arms exclude short leg curls')
  log.push('PASS: Ironlog metadata/volume, classification, weekly sets and muscle load')
  const nodes=root=>{
   if(Array.isArray(root))return root.flatMap(nodes)
   if(!root||typeof root!=='object'||!root.props)return []
   return [root,...nodes(root.props.children)]
  }
  const history=[workout([ex('Трицепс',[set(6),set(8,8,{kind:'drop'}),set(100,10,{kind:'warmup'})])])]
  const render=(metric,group='strength',workouts=history)=>{
   hookValues=[group,'all',metric,'Трицепс','weight'];hookIndex=0
   return nodes(Dynamics({workouts,measurements:[],goals:[{exercise:'Трицепс',kind:'weight',target:45}]}))
  }
  for(const [metric,expected] of [['max',40],['e1rm',40*(1+8/30)],['volume',620],['bestSet',320],['reps',10]]){
   const tree=render(metric)
   const chart=tree.find(n=>typeof n.type==='function'&&n.props.points)
   assert(!!chart,`${metric}: strength chart exists`)
   near(chart.props.points[0].value,expected,`${metric}: analytics kg conversion`)
   eq(chart.props.unit,metric==='reps'?'повт.':'кг',`${metric}: unit`)
   const option=tree.find(n=>n.type==='option'&&n.props.value==='Трицепс')
   eq(option.props.children,'Трицепс в кроссовере','analytics display label only, stable option key')
   if(metric==='max')eq(chart.props.goal,45,'goals already use kg, no double conversion')
  }
  const kgHistory=[workout([ex('Трицепс',[set(6)],{weightUnit:'kg'})])]
  eq(render('max','strength',kgHistory).find(n=>typeof n.type==='function'&&n.props.points).props.points[0].value,6,'Dynamics respects explicit kg override on alias')
  const general=render('max','general').filter(n=>typeof n.type==='function'&&n.props.points)
  eq(general[0].props.points[0].value,620,'general workout volume recalculated, ignores stale saved volume')
  eq(general[1].props.points[0].value,620,'weekly volume in kg')
  eq(general[2].props.points[0].value,1,'weekly frequency unaffected by weight unit')
  log.push('PASS: actual Dynamics max, Epley, volume, best-set, repetitions, display labels and general/weekly charts')
  window.blockWeightTestResult={passed:true,assertions,checks:log}
  output.textContent=log.join('\n')+`\n\nPASS: ${assertions} assertions (TypeScript ${ts.version})`
 }catch(error){
  window.blockWeightTestResult={passed:false,assertions,error:String(error),stack:error.stack}
  output.textContent=log.join('\n')+`\n\nFAIL after ${assertions} assertions: ${error.stack||error}`
 }
})()
