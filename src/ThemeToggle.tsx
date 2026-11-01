import {useEffect,useState} from 'react'
import {store} from './storage'

type Theme='light'|'dark'
const KEY='osfit-theme'
const systemTheme=():Theme=>{try{return window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch{return 'dark'}}
export const savedTheme=():Theme=>{const saved=store.get(KEY);return saved==='light'||saved==='dark'?saved:systemTheme()}
/** Применяет тему к документу. Вызывается при запуске приложения, а не только при открытии настроек. */
export function applyTheme(theme:Theme){
  document.documentElement.dataset.theme=theme
  document.documentElement.style.colorScheme=theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#000000':'#f2f2f7')
}
export function ThemeToggle(){
  const [theme,setTheme]=useState<Theme>(savedTheme)
  useEffect(()=>{applyTheme(theme);store.set(KEY,theme)},[theme])
  return <label className="ios-theme-setting">
    <span className="ios-theme-label">{theme==='dark'?'Тёмная тема':'Светлая тема'}</span>
    <button type="button" role="switch" aria-label="Тёмная тема" aria-checked={theme==='dark'}
      className={'ios-theme-switch'+(theme==='dark'?' is-on':'')}
      onClick={()=>setTheme(v=>v==='dark'?'light':'dark')}>
      <span className="ios-theme-thumb"/>
    </button>
  </label>
}
