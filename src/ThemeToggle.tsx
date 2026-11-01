import {useEffect,useState} from 'react'
import './theme.css'

type Theme='light'|'dark'
const KEY='osfit-theme'
const systemTheme=():Theme=>window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'
const savedTheme=():Theme=>{
  const saved=localStorage.getItem(KEY)
  return saved==='light'||saved==='dark'?saved:systemTheme()
}

export function ThemeToggle(){
  const [theme,setTheme]=useState<Theme>(savedTheme)
  useEffect(()=>{
    document.documentElement.dataset.theme=theme
    document.documentElement.style.colorScheme=theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#000000':'#f2f2f7')
    localStorage.setItem(KEY,theme)
  },[theme])
  return <label className="ios-theme-setting">
    <span className="ios-theme-label">{theme==='dark'?'Тёмная тема':'Светлая тема'}</span>
    <button type="button" role="switch" aria-label="Тёмная тема" aria-checked={theme==='dark'}
      className={'ios-theme-switch'+(theme==='dark'?' is-on':'')}
      onClick={()=>setTheme(v=>v==='dark'?'light':'dark')}>
      <span className="ios-theme-thumb"/>
    </button>
  </label>
}
