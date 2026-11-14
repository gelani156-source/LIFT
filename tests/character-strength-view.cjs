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
  for (const [mode,title] of [[false,'Сурикат'],[true,'Новичок']]) {
    const {CharacterScreen} = loadCharacter(mode)
    const html = renderToStaticMarkup(React.createElement(CharacterScreen, props))
    assert.equal((html.match(new RegExp(title + ' · 1 из 10','g')) || []).length, 4)
    for (const text of ['Общий уровень','Жим штанги лёжа','Присед со штангой','Становая тяга','вымышлены','не оценка подготовки','не реальные нормативы','Регулярность и достижения','Настройки достижений','Получено:']) assert.ok(html.includes(text), text)
    assert.ok(html.includes(`aria-checked="${mode}"`))
  }
})
test('отсутствующие данные не получают титул; настройки доступны при выключенных достижениях', () => {
  for (const mode of [false,true]) {
    const {CharacterScreen} = loadCharacter(mode)
    const html = renderToStaticMarkup(React.createElement(CharacterScreen, {...props,workouts:[],measurements:[],achievements:null}))
    assert.equal((html.match(/Недостаточно данных/g) || []).length,7)
    assert.ok(html.includes('Настройки достижений')); assert.ok(html.includes('Достижения регулярности выключены'))
  }
})

test('изображения и названия всех уровней соответствуют исходному порядку', () => {
  const {StrengthCharacter, STRENGTH_TITLES} = loadCharacter(false)
  assert.deepEqual([...STRENGTH_TITLES.animal], ['Сурикат','Лиса','Барсук','Волк','Рысь','Кабан','Горилла','Лев','Медведь','Тигр'])
  for (const mode of ['animal','classic']) for (let level=1; level<=10; level++) {
    const html = renderToStaticMarkup(React.createElement(StrengthCharacter,{level,mode}))
    const src = `./strength-art/${mode}/${String(level).padStart(2,'0')}.webp`
    assert.ok(html.includes(`${STRENGTH_TITLES[mode][level-1]}, игровой уровень ${level} из 10`))
    assert.ok(html.includes(`src="${src}"`), src)
    const image = fs.readFileSync(path.join(__dirname, '../public', src))
    assert.equal(image.toString('ascii',0,4),'RIFF'); assert.equal(image.toString('ascii',8,12),'WEBP')
  }
  for (const mode of ['animal','classic']) for (const level of [null,0,11,1.5,NaN]) {
    const html = renderToStaticMarkup(React.createElement(StrengthCharacter,{level,mode}))
    assert.ok(html.includes('Персонаж появится')); assert.ok(!html.includes('role="img"')); assert.ok(!html.includes('<img'))
  }
})

test('экран показывает персонажа по общему уровню, а не по отдельному упражнению', () => {
  for (const [mode, label] of [[false,'Животное: Сурикат'],[true,'Герой: Новичок']]) {
    const {CharacterScreen} = loadCharacter(mode)
    const html = renderToStaticMarkup(React.createElement(CharacterScreen, props))
    assert.ok(html.includes(label)); assert.equal((html.match(/role="img"/g) || []).length,1)
    const empty = renderToStaticMarkup(React.createElement(CharacterScreen, {...props,workouts:[],measurements:[]}))
    assert.ok(empty.includes('Персонаж появится')); assert.ok(!empty.includes('role="img"'))
  }
})
