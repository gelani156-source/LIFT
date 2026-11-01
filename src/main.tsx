import React from 'react'
import {createRoot} from 'react-dom/client'
// Порядок важен: базовые стили → тема. Иначе стили темы перекрываются базовыми.
import './style.css'
import './theme.css'
import App from './App'
import ErrorBoundary from './ErrorBoundary'
import {applyTheme,savedTheme} from './ThemeToggle'
import {requestPersistence} from './db'

try{applyTheme(savedTheme())}catch{/* тема по умолчанию */}
createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><App/></ErrorBoundary></React.StrictMode>)
void requestPersistence()
// Service worker только в production-сборке: в dev он кэшировал модули Vite и показывал устаревший код.
if('serviceWorker' in navigator&&import.meta.env.PROD){window.addEventListener('load',()=>{navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(console.warn)})}
