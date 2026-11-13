import {useState} from 'react'
import {characterProgress} from './characterProgress'
import {STRENGTH_LIFTS, strengthLevels} from './strengthLevels'
import type {calculateAchievements} from './achievements'
import type {Measurement, Workout} from './model'

type Achievements = ReturnType<typeof calculateAchievements>

function ProgressDetails({achievements}: {achievements: Achievements}) {
  const next = characterProgress(achievements)
  return <><strong>Уровень {achievements.level} из {achievements.badges.length}</strong><p>Зачтено дней: {achievements.days}</p>{next ? <><progress aria-label="Дни до следующего уровня" value={achievements.days} max={next.target}/><p className="muted small">Следующий уровень — зачтено {achievements.days} из {next.target} · осталось {next.remaining}</p></> : <p className="muted small">Достигнут максимальный уровень</p>}</>
}

export function CharacterCard({achievements, onOpen}: {achievements: Achievements | null, onOpen: () => void}) {
  return <div className="card character-card"><h2>Персонаж</h2>{achievements ? <ProgressDetails achievements={achievements}/> : <p className="muted small">Достижения выключены</p>}<button type="button" className="btn secondary" onClick={onOpen}>Открыть персонажа</button></div>
}

export const STRENGTH_TITLES = {
  animal: ['Мышь', 'Лиса', 'Волк', 'Медведь', 'Слон'],
  classic: ['Новичок', 'Ученик', 'Мастер', 'Чемпион', 'Легенда']
} as const

export function strengthTitle(level: number | null, mode: keyof typeof STRENGTH_TITLES): string {
  return level === null ? 'Недостаточно данных' : `${STRENGTH_TITLES[mode][level - 1]} · ${level} из 5`
}

function StrengthView({workouts, measurements, mode}: {workouts: Workout[], measurements: Measurement[], mode: keyof typeof STRENGTH_TITLES}) {
  const result = strengthLevels(workouts, measurements)
  return <><h2>Условные игровые уровни силы</h2>
    <p className="muted small">Названия и пороги вымышлены: это игра, а не оценка подготовки и не реальные нормативы. Не сравнивайте людей и не повышайте нагрузку ради уровня.</p>
    <p>Общий уровень: <strong>{strengthTitle(result.overall, mode)}</strong></p>
    <p>{result.body ? `Вес тела: ${result.body.weight} кг · ${result.body.date}` : 'Нет подходящего замера веса тела за последние 90 дней. Добавьте его в разделе замеров.'}</p>
    {result.lifts.map(l => <div className="record" key={l.name}><span>{l.name}<br/><small>{l.set ? `${l.set.weight} кг × ${l.set.reps} · ${l.set.day} · расчётный 1ПМ ${l.set.estimate.toFixed(1)} кг` : 'Нет подходящего подхода за последние 90 дней'}</small></span><strong>{strengthTitle(l.level, mode)}</strong></div>)}
    <p className="muted small">Уровни не оценивают здоровье или технику.</p>
    <p className="muted small">Берётся последний день с выполненным рабочим подходом 1–12 повторов в кг и лучший расчётный 1ПМ этого дня: вес × (1 + повторы/30), для одного повтора — вес. Используется последний замер массы за 90 календарных дней, не обязательно на дату подхода. Оба результата должны быть не старше 90 дней; будущие записи исключены. Разминка, блоки и другие упражнения не учитываются.</p>
    <p className="muted small">Уровень = 1 плюс число достигнутых порогов отношения 1ПМ к текущему весу тела. Пороги (уровни 2–5): {STRENGTH_LIFTS.map(l=>`${l.name}: ${l.thresholds.join(' / ')}`).join('; ')}. Общий уровень — среднее трёх уровней, округлённое вниз; доступен только при наличии всех трёх. Данные и оценки могут меняться при исправлении истории.</p>
  </>
}

export function CharacterScreen({achievements, workouts, measurements, onBack, onSettings}: {achievements: Achievements | null, workouts: Workout[], measurements: Measurement[], onBack: () => void, onSettings: () => void}) {
  const [strength, setStrength] = useState(false)
  return <section><button type="button" className="back" onClick={onBack}>← Назад</button><p className="eyebrow">ВАШ ПРОГРЕСС</p><h1>Персонаж</h1><div className="card character-card"><div className="character-avatar" aria-hidden="true">★</div><div className="ios-theme-setting"><span>Режим: {strength ? 'названия уровней' : 'животные'}</span><button type="button" role="switch" aria-label="Включить названия уровней вместо животных" aria-checked={strength} className={'ios-theme-switch'+(strength?' is-on':'')} onClick={()=>setStrength(v=>!v)}><span className="ios-theme-thumb"/></button></div>{<StrengthView workouts={workouts} measurements={measurements} mode={strength ? 'classic' : 'animal'}/>}<h2>Регулярность и достижения</h2>{achievements ? <><ProgressDetails achievements={achievements}/><h2>Достижения</h2><ul>{achievements.badges.map(b=><li key={b.target}>{b.earned?'Получено':'Пока не получено'}: {b.target} {b.target===1?'день':'дней'} с тренировкой</li>)}</ul><p className="muted small">Прогресс рассчитывается по текущей истории и может измениться после исправления или удаления записей. Не более одного зачёта за местный календарный день; учитывается сохранённая тренировка с выполненным рабочим подходом.</p><p className="muted small">Уровни не оценивают здоровье. Отдых важен; увеличивать частоту тренировок или вес ради уровня не нужно.</p></> : <><p>Достижения регулярности выключены.</p><p className="muted small">Их можно включить в настройках. История тренировок не изменится.</p></>}<button type="button" className="btn secondary" onClick={onSettings}>Настройки достижений</button></div></section>
}
