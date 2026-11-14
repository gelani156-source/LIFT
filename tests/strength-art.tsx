import React from 'react'
import {createRoot} from 'react-dom/client'
import {StrengthCharacter, STRENGTH_TITLES} from '../src/Character'
import '../src/style.css'

// Только синтетические уровни; приложение и его хранилища здесь не запускаются.
function Fixture() {
  return <main className="character-screen"><h1>Проверка иллюстраций</h1>{(['animal','classic'] as const).map(mode => <section key={mode}><h2>{mode}</h2>{Array.from({length:10}, (_,i) => <div className="card character-screen-card" key={i}><div className="strength-overall"><StrengthCharacter level={i+1} mode={mode}/><strong>{STRENGTH_TITLES[mode][i]} · {i+1} из 10</strong></div></div>)}</section>)}<section className="card character-screen-card"><div className="strength-overall"><StrengthCharacter level={null} mode="animal"/><strong>Недостаточно данных</strong></div></section></main>
}
createRoot(document.getElementById('root')!).render(<Fixture/>)
