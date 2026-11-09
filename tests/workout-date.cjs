// Run with node --test tests/workout-date.cjs (TZ is varied by the caller).
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const root = path.join(__dirname, '..')
const cache = {}
function load(name) {
  if (cache[name]) return cache[name].exports
  const source = fs.readFileSync(path.join(root, 'src', name + '.ts'), 'utf8')
  const js = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS}}).outputText
  const mod = {exports: {}}; cache[name] = mod
  new Function('require', 'module', 'exports', js)(id => id.startsWith('./') ? load(id.slice(2)) : require(id), mod, mod.exports)
  return mod.exports
}
const {workoutDate, localDay} = load('model')
const {cleanWorkout} = load('db')
test('new workout without selected day uses completion timestamp', () => {
  const now = new Date('2026-11-09T01:02:03.456Z')
  assert.equal(workoutDate('', undefined, now), now.toISOString())
})
test('selected past date remains the same local calendar day and survives backup sanitizer', () => {
  const date = workoutDate('2026-10-15')
  assert.equal(localDay(date), '2026-10-15')
  const w = cleanWorkout({id:'x', name:'Тренировка 7', date, programId:null, exercises:[], volume:0})
  assert.equal(w.date, date)
  assert.equal(w.name, 'Тренировка 7')
})
test('editing preserves timestamp for same day or empty legacy draft; changing day replaces it', () => {
  const original = new Date(2026, 10, 9, 4, 5).toISOString()
  assert.equal(workoutDate('2026-11-09', original), original)
  assert.equal(workoutDate('', original), original)
  assert.equal(localDay(workoutDate('2026-10-01', original)), '2026-10-01')
})
test('reject invalid or impossible dates instead of silently changing day', () => {
  for (const day of ['bad', '2026-02-30', '2026-13-01', '2026-1-01']) assert.throws(() => workoutDate(day), /корректную дату/)
})
