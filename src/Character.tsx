import {characterProgress} from './characterProgress'
import type {calculateAchievements} from './achievements'

type Achievements = ReturnType<typeof calculateAchievements>

function ProgressDetails({achievements}: {achievements: Achievements}) {
  const next = characterProgress(achievements)
  return <><strong>Уровень {achievements.level} из {achievements.badges.length}</strong><p>Зачтено дней: {achievements.days}</p>{next ? <><progress aria-label="Дни до следующего уровня" value={achievements.days} max={next.target}/><p className="muted small">Следующий уровень — зачтено {achievements.days} из {next.target} · осталось {next.remaining}</p></> : <p className="muted small">Достигнут максимальный уровень</p>}</>
}

export function CharacterCard({achievements, onOpen}: {achievements: Achievements | null, onOpen: () => void}) {
  return <div className="card character-card"><h2>Персонаж</h2>{achievements ? <ProgressDetails achievements={achievements}/> : <p className="muted small">Достижения выключены</p>}<button type="button" className="btn secondary" onClick={onOpen}>Открыть персонажа</button></div>
}

export function CharacterScreen({achievements, onBack, onSettings}: {achievements: Achievements | null, onBack: () => void, onSettings: () => void}) {
  return <section><button type="button" className="back" onClick={onBack}>← Назад</button><p className="eyebrow">ВАШ ПРОГРЕСС</p><h1>Персонаж</h1><div className="card character-card"><div className="character-avatar" aria-hidden="true">★</div>{achievements ? <><ProgressDetails achievements={achievements}/><h2>Достижения</h2><ul>{achievements.badges.map(b=><li key={b.target}>{b.earned?'Получено':'Пока не получено'}: {b.target} {b.target===1?'день':'дней'} с тренировкой</li>)}</ul><p className="muted small">Прогресс рассчитывается по текущей истории и может измениться после исправления или удаления записей. Не более одного зачёта за местный календарный день; учитывается сохранённая тренировка с выполненным рабочим подходом.</p><p className="muted small">Уровни не оценивают здоровье. Отдых важен; увеличивать частоту тренировок или вес ради уровня не нужно.</p></> : <><p>Достижения и уровни выключены.</p><p className="muted small">Их можно включить в настройках. История тренировок не изменится.</p></>}<button type="button" className="btn secondary" onClick={onSettings}>Настройки достижений</button></div></section>
}
