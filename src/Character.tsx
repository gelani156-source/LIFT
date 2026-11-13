import {useEffect, useRef, useState} from 'react'
import {characterProgress} from './characterProgress'
import {calculateActivity} from './activity'
import {STRENGTH_LIFTS, strengthLevels} from './strengthLevels'
import {emptyStrengthSettings, validStrengthSettings, type StrengthSettings} from './strengthSettings'
import {loadStrengthSettings, writeStrengthSettings, type StoredStrengthSnapshot} from './db'
import {localDay} from './model'
import type {calculateAchievements} from './achievements'
import type {Measurement, Workout} from './model'

type Achievements = ReturnType<typeof calculateAchievements>
function ProgressDetails({achievements}: {achievements: Achievements}) {
  const next = characterProgress(achievements)
  return <><strong>Уровень {achievements.level} из {achievements.badges.length}</strong><p>Зачтено дней: {achievements.days}</p>{next ? <><progress aria-label="Дни до следующего уровня" value={achievements.days} max={next.target}/><p className="muted small">Следующий уровень — зачтено {achievements.days} из {next.target} · осталось {next.remaining}</p></> : <p className="muted small">Достигнут максимальный уровень</p>}</>
}
function ActivityDetails({workouts}: {workouts: Workout[]}) {
  const a = calculateActivity(workouts)
  return <><h2>Текущая игровая активность</h2><p><strong>Уровень {a.level} из 5</strong> · {a.points} очков · {a.days} дней за 28 календарных дней</p><p className="muted small">Условная игра, не оценка здоровья, интенсивности или подготовки. Отдых важен; не увеличивайте вес, объём или частоту ради уровня. Вес и сила учитываются отдельно.</p><details><summary>Как считается активность</summary><p className="muted small">Сегодня и 27 предыдущих местных календарных дней. За день с выполненным рабочим подходом — 1 очко и по 1 за первые четыре подхода, максимум 5 очков в день. Пороги уровней 1–5: 1, 8, 20, 35, 50 очков; меньше 1 — уровень 0. При перерыве старые дни выходят из окна, поэтому уровень снижается. Пустые, будущие, некорректные записи и конфликтующие ID исключаются; повторы одного ID не суммируются. Вес не влияет. Достижения за всю историю показаны отдельно и могут измениться при исправлении или удалении истории.</p></details></>
}
export function CharacterCard({achievements, workouts, onOpen}: {achievements: Achievements | null, workouts: Workout[], onOpen: () => void}) {
  return <div className="card character-card"><h2>Персонаж</h2>{achievements ? <ActivityDetails workouts={workouts}/> : <p className="muted small">Достижения выключены</p>}<button type="button" className="btn secondary" onClick={onOpen}>Открыть персонажа</button></div>
}
export const STRENGTH_TITLES = {animal: ['Мышь', 'Белка', 'Лиса', 'Рысь', 'Волк', 'Пантера', 'Медведь', 'Тигр', 'Слон', 'Дракон'], classic: ['Новичок', 'Ученик', 'Практик', 'Атлет', 'Опытный', 'Сильный', 'Мастер', 'Эксперт', 'Чемпион', 'Легенда']} as const
export function strengthTitle(level: number | null, mode: keyof typeof STRENGTH_TITLES): string {
  return level === null ? 'Недостаточно данных' : `${STRENGTH_TITLES[mode][level - 1]} · ${level} из 10`
}
function LiftEditor({index, settings, disabled, onSave}: {index:number, settings:StrengthSettings, disabled:boolean, onSave:(data:StrengthSettings)=>boolean | Promise<boolean>}) {
  const current=settings.manual[index]
  const [weight,setWeight]=useState(current ? String(current.weight) : '')
  const [reps,setReps]=useState(current ? String(current.reps) : '')
  const [date,setDate]=useState(current?.date ?? localDay())
  const [aliases,setAliases]=useState((settings.aliases[index] ?? []).join('\n'))
  const [error,setError]=useState('')
  const update=(manual:StrengthSettings['manual'][number], newAliases:string[])=>{
    const data:StrengthSettings={...settings, manual:STRENGTH_LIFTS.map((_,i)=>i===index?manual:settings.manual[i] ?? null), aliases:STRENGTH_LIFTS.map((_,i)=>i===index?newAliases:settings.aliases[i] ?? [])}
    if (!validStrengthSettings(data)) {setError('Проверьте дату, вес (больше 0 и не более 1000 кг), целые повторы от 1 до 12 и названия: они не должны повторяться или совпадать со стандартными названиями.'); return}
    if (manual && manual.date > localDay()) {setError('Дата ручного подхода не может быть будущей.'); return}
    setError(''); return onSave(data)
  }
  return <details className="strength-editor"><summary>Ручной подход и привязка названий</summary>
    <p className="muted small">Ручной подход хранится отдельно и не добавляется в историю тренировок. Укажите дату выполнения. Можно сохранить подход для каждого упражнения.</p>
    <div className="strength-fields"><label>Вес, кг<input className="input" type="number" min="0.01" max="1000" step="any" value={weight} onChange={e=>setWeight(e.target.value)}/></label><label>Повторы<input className="input" type="number" min="1" max="12" step="1" value={reps} onChange={e=>setReps(e.target.value)}/></label><label>Дата<input className="input" type="date" max={localDay()} value={date} onChange={e=>setDate(e.target.value)}/></label></div>
    <label className="strength-alias">Свои названия — по одному в строке<textarea className="input" rows={3} value={aliases} onChange={e=>setAliases(e.target.value)} /></label>
    <p className="muted small">Привязывайте только точно соответствующие упражнения; история и названия в ней не изменятся. Регистр и «ё/е» не различаются. Явная привязка имеет приоритет перед новым стандартным названием.</p>
    {error && <p role="alert">{error}</p>}
    <div className="strength-actions"><button type="button" className="btn secondary" disabled={disabled} onClick={()=>update(weight.trim() || reps.trim() ? {date,weight:Number(weight),reps:Number(reps)} : null,aliases.split('\n').map(a=>a.trim()).filter(Boolean))}>Сохранить</button>{current && <button type="button" className="btn secondary" disabled={disabled} onClick={()=>{const saved=update(null,aliases.split('\n').map(a=>a.trim()).filter(Boolean)); if(saved instanceof Promise){void saved.then(ok=>{if(ok){setWeight('');setReps('')}})}else if(saved){setWeight('');setReps('')}}}>Удалить ручной подход</button>}</div>
  </details>
}
function StrengthView({workouts, measurements, mode}: {workouts: Workout[], measurements: Measurement[], mode: keyof typeof STRENGTH_TITLES}) {
  const [snapshot,setSnapshot]=useState<StoredStrengthSnapshot|null>(null)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(true)
  const saving=useRef(false)
  const [notice,setNotice]=useState('')
  useEffect(()=>{let active=true;loadStrengthSettings().then(value=>{if(active)setSnapshot(value)}).catch(e=>{if(active)setError(String(e))}).finally(()=>{if(active)setBusy(false)});return ()=>{active=false}},[])
  const result = strengthLevels(workouts, measurements, new Date(), error ? undefined : snapshot?.data)
  const save=async(data:StrengthSettings)=>{
    if(!snapshot||saving.current)return false
    saving.current=true;setBusy(true)
    try{const next=await writeStrengthSettings(snapshot,data);setSnapshot(next);setNotice('Данные силы сохранены на этом устройстве и включаются в резервную копию.');return true}
    catch(e){setError(String(e));setNotice('');return false}
    finally{saving.current=false;setBusy(false)}
  }
  return <><div className="strength-intro"><h2>Условные игровые уровни силы</h2>
    <p className="muted small">Названия и пороги вымышлены: это игра, а не оценка подготовки и не реальные нормативы. Не сравнивайте людей и не повышайте нагрузку ради уровня.</p></div>
    {error && <p role="alert">{error} Расчёт показан только по истории; проверьте хранилище и сохраните копию до восстановления.</p>}
    <p className="muted small" role="status">{notice}</p>
    <div className="strength-overall"><span>Общий уровень силы · игровой</span><strong>{strengthTitle(result.overall, mode)}</strong><small>Учтено упражнений: {result.coverage} из {result.lifts.length}. {result.overall===null ? 'Нужны актуальный вес тела и уровни хотя бы трёх упражнений.' : 'Среднее доступных уровней; состав упражнений влияет на результат.'}</small></div>
    <p className="muted small">{result.body ? `Вес тела: ${result.body.weight} кг · ${result.body.date}` : 'Нет подходящего замера веса тела за последние 90 дней. Добавьте его в разделе замеров.'}</p>
    <div className="strength-grid">{result.lifts.map((l,index) => <article className="strength-lift" key={l.name}><div className="strength-lift-head"><strong>{l.name}</strong><span>{strengthTitle(l.level, mode)}</span></div><p className="muted small">{l.set ? `${l.set.weight} кг × ${l.set.reps} · ${l.set.day} · ${l.set.source==='manual'?'ручной ввод':'тренировка'} · расчётный 1ПМ ${l.set.estimate.toFixed(1)} кг` : 'Нет подходящего подхода за последние 90 дней: проверьте название, дату, килограммы и выполненные рабочие подходы 1–12 повторов или введите данные вручную.'}{!result.body && l.set ? ' Нет актуального веса тела для уровня.' : ''}</p><LiftEditor key={snapshot ? 'loaded' : 'loading'} index={index} settings={snapshot?.data ?? emptyStrengthSettings()} disabled={busy || !!error || !snapshot} onSave={save}/></article>)}</div>
    <details className="strength-explanation"><summary>Как рассчитывается игровой уровень</summary><p className="muted small">Уровни не оценивают здоровье или технику. Берётся последний день с выполненным рабочим подходом 1–12 повторов в кг или ручным подходом и лучший расчётный 1ПМ этого дня: вес × (1 + повторы/30), для одного повтора — вес. Используется последний замер массы за 90 календарных дней, не обязательно на дату подхода. Оба результата должны быть не старше 90 дней; будущие записи исключены. Разминка, блоки и другие упражнения не учитываются.</p><p className="muted small">Уровень = 1 плюс число достигнутых вымышленных порогов отношения 1ПМ к текущему весу тела. Пороги отношения (уровни 2–10): {STRENGTH_LIFTS.map(l=>`${l.name}: ${l.thresholds.join(' / ')}`).join('; ')}. Общий уровень — среднее доступных уровней упражнений, округлённое вниз; необходимы хотя бы три. Каждый уровень имеет одинаковый вес, поэтому при изменении состава упражнений сравнение со старым результатом условно. Не смешиваются веса разных упражнений: сначала для каждого применяются собственные пороги. Гантели, подтягивания с весом тела и тренажёры сюда не приравниваются; привязки допустимы только для того же движения и единицы измерения. Данные и оценки могут меняться при исправлении истории. Настройки и ручные данные хранятся локально отдельно от тренировок.</p></details>
  </>
}
export function CharacterScreen({achievements, workouts, measurements, onBack, onSettings}: {achievements: Achievements | null, workouts: Workout[], measurements: Measurement[], onBack: () => void, onSettings: () => void}) {
  const [strength, setStrength] = useState(false)
  return <section className="character-screen"><button type="button" className="back" onClick={onBack}>← Назад</button><p className="eyebrow">ВАШ ПРОГРЕСС</p><h1>Персонаж</h1><div className="card character-card character-screen-card"><div className="character-top"><div className="character-avatar" aria-hidden="true">★</div><div><span className="character-kicker">ВАШ ПУТЬ</span><strong>Игровой прогресс</strong></div></div><div className="ios-theme-setting character-mode"><span>Режим: {strength ? 'названия уровней' : 'животные'}</span><button type="button" role="switch" aria-label="Включить названия уровней вместо животных" aria-checked={strength} className={'ios-theme-switch'+(strength?' is-on':'')} onClick={()=>setStrength(v=>!v)}><span className="ios-theme-thumb"/></button></div><StrengthView workouts={workouts} measurements={measurements} mode={strength ? 'classic' : 'animal'}/>{achievements && <ActivityDetails workouts={workouts}/>}<details className="strength-explanation"><summary>Регулярность и достижения</summary>{achievements ? <><ProgressDetails achievements={achievements}/><h2>Достижения</h2><ul>{achievements.badges.map(b=><li key={b.target}>{b.earned?'Получено':'Пока не получено'}: {b.target} {b.target===1?'день':'дней'} с тренировкой</li>)}</ul><p className="muted small">Прогресс рассчитывается по текущей истории и может измениться после исправления или удаления записей. Не более одного зачёта за местный календарный день; учитывается сохранённая тренировка с выполненным рабочим подходом.</p><p className="muted small">Уровни не оценивают здоровье. Отдых важен; увеличивать частоту тренировок или вес ради уровня не нужно.</p></> : <><p>Достижения регулярности выключены.</p><p className="muted small">Их можно включить в настройках. История тренировок не изменится.</p></>}<button type="button" className="btn secondary" onClick={onSettings}>Настройки достижений</button></details></div></section>
}
