const fs=require('node:fs'),path=require('node:path');
const source=path.join(__dirname,'src');
const required=['App.tsx','AnatomyMuscleMap.tsx','MuscleMap.tsx','ThemeToggle.tsx','WorkoutMiniWidget.tsx','db.ts','storage.ts','ErrorBoundary.tsx','Dynamics.tsx','ironlog.ts','main.tsx','model.ts','smart.ts','style.css','theme.css','vite-env.d.ts'];
const missing=required.filter(n=>!fs.existsSync(path.join(source,n)));
if(missing.length)throw new Error('Отсутствуют файлы: '+missing.join(', '));
for(const name of required.filter(n=>/\.tsx?$/.test(n))){const text=fs.readFileSync(path.join(source,name),'utf8');
for(const m of text.matchAll(/(?:from\s*|import\s*)["'](\.[^"']+)["']/g)){
const stem=path.resolve(source,m[1]);if(!['','.ts','.tsx','.css','.json'].some(ext=>fs.existsSync(stem+ext)))throw new Error(name+': отсутствует импорт '+m[1]);}}
const muscles=fs.readFileSync(path.join(source,'MuscleMap.tsx'),'utf8');
for(const muscle of ['shoulders','forearms'])if(!muscles.includes("'"+muscle+"'"))throw new Error('Нет мышцы: '+muscle);
console.log('Проверка структуры и импортов пройдена. Запустите npm run build для полной проверки.');
