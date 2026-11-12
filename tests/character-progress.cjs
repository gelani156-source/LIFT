const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const source = fs.readFileSync(path.join(__dirname, '../src/characterProgress.ts'), 'utf8')
const js = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText
const mod = {exports:{}}
new Function('require','module','exports',js)(require,mod,mod.exports)
const {characterProgress} = mod.exports
const badges = days => [1,5,15,30,60].map(target => ({target, earned: days>=target}))
test('прогресс берёт следующий порог из результата достижений', () => {
  for (const [days,target,remaining] of [[0,1,1],[1,5,4],[4,5,1],[5,15,10],[59,60,1]]) {
    const result={days,level:badges(days).filter(b=>b.earned).length,badges:badges(days)}
    const before=JSON.stringify(result)
    assert.deepEqual(characterProgress(result),{target,remaining})
    assert.equal(JSON.stringify(result),before)
  }
  assert.equal(characterProgress({days:60,level:5,badges:badges(60)}),null)
})
