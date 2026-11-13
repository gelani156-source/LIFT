const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const React = require('react'), {renderToStaticMarkup} = require('react-dom/server')
function loadCharacter(mode) {
  const cache = {}
  function load(name) {
    if (cache[name]) return cache[name].exports
    const file = path.join(__dirname, '../src', name + (name === 'Character' ? '.tsx' : '.ts'))
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText
    const mod = {exports:{}}; cache[name] = mod
    new Function('require','module','exports',js)(id => id === 'react' ? {...React, useState: initial => typeof initial === 'boolean' ? [mode, () => {}] : React.useState(initial)} : id.startsWith('./') ? load(id.slice(2)) : require(id), mod, mod.exports)
    return mod.exports
  }
  return load('Character')
}
const today = new Date(), day = [today.getFullYear(), String(today.getMonth()+1).padStart(2,'0'), String(today.getDate()).padStart(2,'0')].join('-')
const workouts = ['Жим штанги лёжа','Присед со штангой','Становая тяга'].map((name,i) => ({id:String(i), date:day, exercises:[{id:'e',name,weightUnit:'kg',sets:[{id:'s',weight:10,reps:1,done:true}]}]}))
const props = {workouts, measurements:[{id:'m',date:day,weight:100}], achievements:{level:1,days:1,badges:[{target:1,earned:true}]}, onBack:()=>{},onSettings:()=>{}}
test('оба режима показывают одни уровни силы с разными титулами и достижения', () => {
  for (const [mode,title] of [[false,'Мышь'],[true,'Новичок']]) {
    const {CharacterScreen} = loadCharacter(mode)
    const html = renderToStaticMarkup(React.createElement(CharacterScreen, props))
    assert.equal((html.match(new RegExp(title + ' · 1 из 5','g')) || []).length, 4)
    for (const text of ['Общий уровень','Жим штанги лёжа','Присед со штангой','Становая тяга','вымышлены','не оценка подготовки','не реальные нормативы','Регулярность и достижения','Настройки достижений','Получено:']) assert.ok(html.includes(text), text)
    assert.ok(html.includes(`aria-checked="${mode}"`))
  }
})
test('отсутствующие данные не получают титул; настройки доступны при выключенных достижениях', () => {
  for (const mode of [false,true]) {
    const {CharacterScreen} = loadCharacter(mode)
    const html = renderToStaticMarkup(React.createElement(CharacterScreen, {...props,workouts:[],measurements:[],achievements:null}))
    assert.equal((html.match(/Недостаточно данных/g) || []).length,4)
    assert.ok(html.includes('Настройки достижений')); assert.ok(html.includes('Достижения регулярности выключены'))
  }
})
