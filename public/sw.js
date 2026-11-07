// LIFT service worker. Кэш общий для всего origin (github.io), поэтому трогаем ТОЛЬКО свои кэши с префиксом "lift-".
const CACHE='lift-shell-v3.1.1'
const scope=new URL(self.registration.scope)
const inScope=u=>u.origin===scope.origin&&u.pathname.startsWith(scope.pathname)
self.addEventListener('install',e=>e.waitUntil((async()=>{
  const cache=await caches.open(CACHE)
  // Предзагрузка оболочки: офлайн-запуск работает сразу после первого визита.
  const res=await fetch(new URL('./',scope),{cache:'reload'})
  if(!res.ok)throw new Error('shell '+res.status)
  const html=await res.clone().text()
  await cache.put(new URL('./',scope),res.clone());await cache.put(new URL('./index.html',scope),res)
  const urls=new Set(['./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png'])
  for(const m of html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g))urls.add(m[1])
  await Promise.all([...urls].map(async u=>{try{const r=await fetch(new URL(u,scope),{cache:'reload'});if(r.ok)await cache.put(new URL(u,scope),r)}catch{/* не критично */}}))
  // Скрипты из CSS/JS (чанки) подтянутся и закэшируются при первом запросе.
  await self.skipWaiting()
})()))
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('lift-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])))
self.addEventListener('message',e=>{if(e.data==='skipWaiting')self.skipWaiting()})
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return
  const url=new URL(r.url);if(!inScope(url))return
  if(r.mode==='navigate'){
    // Сеть в приоритете, и в обход HTTP-кэша GitHub Pages (max-age=600): иначе после деплоя можно получить старый index.html
    // со ссылками на уже удалённые файлы — белый экран.
    e.respondWith(fetch(r,{cache:'no-cache'}).then(res=>{if(res.ok){const c=res.clone();caches.open(CACHE).then(k=>k.put(new URL('./index.html',scope),c))}return res})
      .catch(async()=>(await caches.match(new URL('./index.html',scope)))||(await caches.match(new URL('./',scope)))||Response.error()))
    return
  }
  e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(CACHE).then(k=>k.put(r,c))}return res})))
})
