const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), ts=require('typescript')
function editor(onSave, badAliases=false) {
  const cache={}; const setters=[]; let index=0
  function load(name){
    if(cache[name])return cache[name].exports
    let source=fs.readFileSync(path.join(__dirname,'../src',name+(name==='Character'?'.tsx':'.ts')),'utf8')
    if(name==='Character')source=source.replace('function LiftEditor(', 'export function LiftEditor(')
    const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText
    const mod={exports:{}};cache[name]=mod
    new Function('require','module','exports',js)(id=>id==='react'?{useState:value=>{const i=index++;setters[i]=[];return [badAliases&&i===3?'Жим штанги лёжа':value,v=>setters[i].push(v)]}}:id.startsWith('./')?load(id.slice(2)):require(id),mod,mod.exports)
    return mod.exports
  }
  const settings=load('strengthSettings').emptyStrengthSettings();settings.manual[0]={date:'2020-01-01',weight:50,reps:5}
  const tree=load('Character').LiftEditor({index:0,settings,disabled:false,onSave})
  function find(node){if(!node||typeof node!=='object')return null;if(node.type==='button'&&node.props.children==='Удалить ручной подход')return node;for(const c of [node.props?.children].flat(Infinity)){const found=find(c);if(found)return found}return null}
  find(tree).props.onClick();return setters
}
test('ошибка записи не очищает введённые вес и повторы',()=>{const s=editor(()=>false);assert.deepEqual(s[0],[]);assert.deepEqual(s[1],[])})
test('ошибка проверки не очищает поля и не вызывает запись',()=>{let calls=0;const s=editor(()=>{calls++;return true},true);assert.equal(calls,0);assert.deepEqual(s[0],[]);assert.deepEqual(s[1],[])})
test('успешное удаление очищает поля',()=>{const s=editor(()=>true);assert.deepEqual(s[0],['']);assert.deepEqual(s[1],[''])})
