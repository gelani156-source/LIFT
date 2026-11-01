// Безопасная обёртка над localStorage: в приватном режиме, при заблокированных cookie или переполнении
// браузер бросает исключение. Раньше это приводило к белому экрану при запуске.
const mem=new Map<string,string>()
export const store={
  get(key:string):string|null{try{return window.localStorage.getItem(key)}catch{return mem.get(key)??null}},
  set(key:string,value:string):boolean{try{window.localStorage.setItem(key,value);return true}catch{mem.set(key,value);return false}},
  remove(key:string){try{window.localStorage.removeItem(key)}catch{/* ignore */}mem.delete(key)},
  json<T>(key:string,fallback:T):T{try{const raw=store.get(key);return raw===null?fallback:JSON.parse(raw) as T}catch{return fallback}}
}
