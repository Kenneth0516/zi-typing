import type { Session,Settings } from '../core/types';
export interface PracticeRepository {get<T>(key:string):Promise<T|undefined>;set<T>(key:string,value:T):Promise<void>;sessions():Promise<Session[]>;save(session:Session):Promise<void>;}
export const isQA=typeof location!=='undefined'&&new URLSearchParams(location.search).get('qa')==='1';
const DB=isQA?'zi-typing-qa-v1':'zi-typing-v1';
let connection:Promise<IDBDatabase>|undefined;
function db(){return connection??=new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>{request.result.createObjectStore('kv');request.result.createObjectStore('sessions',{keyPath:'id'});};request.onsuccess=()=>resolve(request.result);request.onerror=()=>{connection=undefined;reject(request.error);};});}
async function request<T>(store:string,mode:IDBTransactionMode,operation:(s:IDBObjectStore)=>IDBRequest):Promise<T>{const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction(store,mode);const result=operation(tx.objectStore(store));tx.oncomplete=()=>resolve(result.result as T);tx.onabort=()=>reject(tx.error??new Error('儲存交易中止'));tx.onerror=()=>reject(tx.error);});}
export const repository:PracticeRepository={get:<T>(key:string)=>request<T|undefined>('kv','readonly',s=>s.get(key)),set:async(key,value)=>{await request('kv','readwrite',s=>s.put(value,key));},sessions:()=>request<Session[]>('sessions','readonly',s=>s.getAll()),save:async(session)=>{await request('sessions','readwrite',s=>s.put(session));}};
export interface Backup {version:1;exportedAt:string;settings:Settings;sessions:Session[];draft?:Session|null;}
export async function exportBackup(settings:Settings){const backup:Backup={version:1,exportedAt:new Date().toISOString(),settings,sessions:await repository.sessions(),draft:await repository.get<Session>('draft')};const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`字序備份-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function validSession(value:unknown):value is Session {
  if(!value||typeof value!=='object')return false;const s=value as Session;
  const strings=(a:unknown):a is string[]=>Array.isArray(a)&&a.every(v=>typeof v==='string');
  const nonnegative=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
  return typeof s.id==='string'&&s.id.length<200&&Number.isFinite(Date.parse(s.startedAt))&&nonnegative(s.elapsedMs)&&
    Array.isArray(s.attempts)&&s.attempts.every(a=>a&&typeof a.id==='string'&&typeof a.target==='string'&&typeof a.input==='string'&&['complete','skipped','partial'].includes(a.status)&&['correct','correctHan','wrong','missing','extra'].every(k=>nonnegative(a[k as keyof typeof a])))&&
    Array.isArray(s.events)&&s.events.every(e=>e&&typeof e.before==='string'&&typeof e.after==='string'&&typeof e.inputType==='string'&&strings(e.errors)&&nonnegative(e.inserted)&&nonnegative(e.firstCorrect)&&nonnegative(e.removed)&&(e.firstEntries===undefined||Array.isArray(e.firstEntries)&&e.firstEntries.every(f=>typeof f.key==='string'&&typeof f.correct==='boolean')))&&
    strings(s.lookups)&&strings(s.seen)&&!!s.settings&&['cangjie','quick'].includes(s.settings.method)&&['free','timed'].includes(s.settings.mode)&&['written','spoken'].includes(s.settings.style)&&typeof s.settings.punctuation==='boolean'&&typeof s.value==='string'&&Array.isArray(s.selection)&&s.selection.length===2&&s.selection.every(nonnegative);
}
function canonical(value:unknown):string {if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;if(value&&typeof value==='object')return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;return JSON.stringify(value);}
function payload(session:Session){const {id,...rest}=session;return canonical(rest);}
/** Future sync adapters must merge immutable session IDs; never overwrite a conflict. */
export async function importBackup(raw:string){const backup=JSON.parse(raw) as Backup;if(backup.version!==1||!Array.isArray(backup.sessions)||!backup.sessions.every(validSession))throw new Error('備份格式不正確');const database=await db();
 return new Promise<{added:number;conflicts:number}>((resolve,reject)=>{const tx=database.transaction('sessions','readwrite'),store=tx.objectStore('sessions'),request=store.getAll();let added=0,conflicts=0;
  request.onsuccess=()=>{const existing=request.result as Session[];const byId=new Map(existing.map(s=>[s.id,s])),contents=new Set(existing.map(payload));
   for(const session of backup.sessions){const content=payload(session);if(contents.has(content))continue;const old=byId.get(session.id);const entry=old?{...session,id:crypto.randomUUID()}:session;if(old)conflicts++;store.add(entry);byId.set(entry.id,entry);contents.add(content);added++;}
  };tx.oncomplete=()=>resolve({added,conflicts});tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);
 });}
