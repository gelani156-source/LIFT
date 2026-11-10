import {catalogKey} from './catalog'

// Separate versioned key; no IndexedDB upgrade or changes to training data.
export const CATALOG_STORAGE_KEY='lift-catalog-preferences-v1'
export type CatalogPreferences={version:1,favorites:string[],aliases:Record<string,string[]>}
const empty=():CatalogPreferences=>({version:1,favorites:[],aliases:{}})
export function readCatalogPreferences(storage:Pick<Storage,'getItem'>):CatalogPreferences{
 const raw=storage.getItem(CATALOG_STORAGE_KEY)
 if(raw===null)return empty()
 const data:unknown=JSON.parse(raw)
 if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Повреждены настройки каталога')
 const x=data as Record<string,unknown>
 if(x.version!==1||!Array.isArray(x.favorites)||!x.aliases||typeof x.aliases!=='object'||Array.isArray(x.aliases))throw new Error('Неподдерживаемые или повреждённые настройки каталога')
 if(!x.favorites.every(v=>typeof v==='string')||!Object.values(x.aliases).every(v=>Array.isArray(v)&&v.every(a=>typeof a==='string')))throw new Error('Повреждены настройки каталога')
 const favorites=[...new Set((x.favorites as string[]).map(catalogKey).filter(Boolean))]
 const aliases:Record<string,string[]>={}
 for(const [name,values] of Object.entries(x.aliases as Record<string,string[]>)){
  const k=catalogKey(name);if(!k||k==='__proto__'||k==='constructor'||k==='prototype')continue
  for(const value of values){const v=value.trim();if(v&&!(aliases[k]||[]).some(a=>catalogKey(a)===catalogKey(v)))(aliases[k]??=[]).push(v)}
 }
 return {version:1,favorites,aliases}
}
export function updateCatalogPreferences(storage:Pick<Storage,'getItem'|'setItem'>,update:(current:CatalogPreferences)=>CatalogPreferences):CatalogPreferences{
 // Read before every write to preserve unrelated changes from another tab. Never overwrite unreadable data.
 const next=update(readCatalogPreferences(storage))
 storage.setItem(CATALOG_STORAGE_KEY,JSON.stringify(next))
 return next
}
