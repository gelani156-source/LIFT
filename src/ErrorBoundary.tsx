import {Component,type ReactNode} from 'react'
import {store} from './storage'

type State={error:Error|null}
/**
 * Страховка от белого экрана: любое исключение при отрисовке показывает понятный экран восстановления
 * вместо пустой страницы. Данные в IndexedDB не затрагиваются.
 */
export default class ErrorBoundary extends Component<{children:ReactNode},State>{
  state:State={error:null}
  static getDerivedStateFromError(error:Error):State{return {error}}
  componentDidCatch(error:Error){console.error('LIFT: ошибка интерфейса',error)}
  private clearDraft=()=>{store.remove('osfit-session-draft');store.remove('osfit-rest-until');location.reload()}
  private hardReload=async()=>{
    try{const regs=await navigator.serviceWorker?.getRegistrations?.();for(const r of regs||[])await r.unregister();const keys=await caches?.keys?.();for(const k of keys||[])if(k.startsWith('lift-'))await caches.delete(k)}catch{/* ignore */}
    location.reload()
  }
  render(){
    if(!this.state.error)return this.props.children
    const btn={padding:'12px 16px',borderRadius:12,border:0,fontWeight:600,fontSize:15,margin:'6px 0',width:'100%',cursor:'pointer'} as const
    return <div role="alert" style={{maxWidth:520,margin:'0 auto',padding:'48px 20px',fontFamily:'-apple-system,system-ui,sans-serif',color:'var(--ios-text,#f5f5f7)'}}>
      <h1 style={{fontSize:24,margin:'0 0 12px'}}>Что-то пошло не так</h1>
      <p style={{opacity:.8,lineHeight:1.5}}>Приложение столкнулось с ошибкой, но ваши тренировки в базе данных не удалены. Попробуйте варианты ниже.</p>
      <button style={{...btn,background:'#0a84ff',color:'#fff'}} onClick={()=>location.reload()}>Перезагрузить</button>
      <button style={{...btn,background:'#2c2c2e',color:'#fff'}} onClick={this.clearDraft}>Сбросить черновик тренировки и перезагрузить</button>
      <button style={{...btn,background:'#2c2c2e',color:'#fff'}} onClick={()=>void this.hardReload()}>Очистить кэш приложения и перезагрузить</button>
      <pre style={{whiteSpace:'pre-wrap',fontSize:12,opacity:.6,marginTop:20}}>{String(this.state.error.message||this.state.error)}</pre>
    </div>
  }
}
