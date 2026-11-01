import type { ExerciseLine } from './model'

type Props = {
  name: string
  exercises: ExerciseLine[]
  onToggle: (id: string) => void
  onOpen?: () => void
  compact?: boolean
}

// Each check marks all scheduled sets as done. Unticking resets the exercise.
// Source order is preserved; only the visual order changes.
export default function WorkoutMiniWidget({name,exercises,onToggle,onOpen,compact=false}:Props){
  const ordered=[...exercises].sort((a,b)=>Number(isFinished(a))-Number(isFinished(b)))
  const completed=exercises.filter(isFinished).length
  return <section className={'osfit-mini-widget'+(compact?' osfit-mini-compact':'')} aria-label="Мини-виджет активной тренировки">
    <header className="osfit-mini-head">
      <div><div className="osfit-mini-brand">OSFIT <span>· ТРЕНИРОВКА</span></div><strong>{name||'Текущая тренировка'}</strong></div>
      <div className="osfit-mini-count">{completed}/{exercises.length}</div>
    </header>
    <div className="osfit-mini-track" role="progressbar" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={exercises.length}><span style={{width:`${exercises.length?100*completed/exercises.length:0}%`}}/></div>
    <div className="osfit-mini-list">{ordered.map(e=>{const finished=isFinished(e);const count=e.sets.filter(s=>s.done).length;return <button type="button" key={e.id} className={'osfit-mini-exercise'+(finished?' is-done':'')} onClick={()=>onToggle(e.id)} aria-pressed={finished} aria-label={`${finished?'Отменить выполнение':'Отметить выполненным'}: ${e.name}`}>
      <span className="osfit-mini-info"><span className="osfit-mini-name">{e.name}</span><small>{e.sets.length?`${count}/${e.sets.length} подходов`:'Нет подходов'}</small></span><span className="osfit-mini-check" aria-hidden="true">{finished?'✓':''}</span>
    </button>})}</div>
    {onOpen&&<button type="button" className="osfit-mini-open" onClick={onOpen}>Открыть тренировку →</button>}
    <p className="osfit-mini-footnote">Галочка отмечает все подходы упражнения. Изменения сохраняются локально.</p>
  </section>
}

export function isFinished(e:ExerciseLine){return e.sets.length>0&&e.sets.every(s=>s.done)}
