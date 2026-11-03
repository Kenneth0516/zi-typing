import {useEffect,useRef,useState} from 'react';
import {PracticeClock} from '../core/clock';
import {align,canSubmit} from '../core/alignment';
import {nextPrompt} from '../core/prompts';
import {editEvent,makeAttempt,score} from '../core/scoring';
import {repository} from '../storage/repository';
import {prompts} from '../data/prompts';
import type {Session,Settings} from '../core/types';
export function usePractice(settings:Settings,onSaved:()=>void,onError:(s:string)=>void,enabled=true){
 const [session,setSession]=useState<Session|null>(null),[elapsed,setElapsed]=useState(0),[paused,setPaused]=useState(false),[result,setResult]=useState<Session|null>(null),[draft,setDraft]=useState<Session|null>(null);
 const ref=useRef<Session|null>(null),clock=useRef(new PracticeClock()),pauses=useRef(new Set<string>()),saveChain=useRef(Promise.resolve()),weak=useRef<string[]>([]);
 const started=useRef(false),[booted,setBooted]=useState(false);
 function persist(s:Session|null){const snapshot=s?structuredClone({...s,elapsedMs:clock.current.elapsed()}):null;saveChain.current=saveChain.current.then(()=>repository.set('draft',snapshot)).catch(()=>onError('未能保存本機紀錄，請匯出備份，並檢查瀏覽器儲存權限。'));}
 function publish(s:Session){ref.current=s;setSession(s);setElapsed(clock.current.elapsed());persist(s);}
 function create(config:Settings,focus:string[]=[]){const prompt=nextPrompt(config,[],focus);if(!prompt){onError('這個組合暫時未有題目，請選擇其他主題。');return;}
   clock.current=new PracticeClock();pauses.current.clear();started.current=false;weak.current=focus;setPaused(false);setResult(null);setDraft(null);
   publish({id:crypto.randomUUID(),startedAt:new Date().toISOString(),settings:{...config},device:matchMedia('(pointer:coarse)').matches?'mobile':'desktop',elapsedMs:0,currentId:prompt.id,value:'',selection:[0,0],seen:[prompt.id],attempts:[],events:[],lookups:[],assisted:false});
 }
 function pause(reason:string){const s=ref.current;if(!s||s.finishedAt||s.settings.mode==='timed')return;pauses.current.add(reason);clock.current.pause();setPaused(true);persist(s);}
 function resume(reason:string){pauses.current.delete(reason);if(pauses.current.size===0){setPaused(false);if(started.current&&!ref.current?.finishedAt)clock.current.start();}}
 function finish(){const current=ref.current;if(!current||current.finishedAt)return;clock.current.pause();let s={...current,elapsedMs:current.settings.mode==='timed'?Math.min(clock.current.elapsed(),current.settings.duration*1000):clock.current.elapsed(),finishedAt:new Date().toISOString()};
   const prompt=prompts.find(p=>p.id===s.currentId);if(prompt&&s.value){s={...s,attempts:[...s.attempts,makeAttempt(prompt.id,prompt.text,s.value,s.settings.punctuation,'partial')]};}
   ref.current=s;setSession(s);setElapsed(s.elapsedMs);setResult(s);persist(null);
   saveChain.current=saveChain.current.then(()=>repository.save(s)).then(()=>onSaved()).catch(()=>onError('成績未能保存，請匯出備份後重試。'));
 }
 function advance(status:'complete'|'skipped'){
   const current=ref.current;if(!current||current.finishedAt)return;
   const prompt=prompts.find(p=>p.id===current.currentId)!;
   if(status==='complete'&&!canSubmit(align(prompt.text,current.value,current.settings.punctuation)))return;
   const attempt=makeAttempt(prompt.id,prompt.text,current.value,current.settings.punctuation,status);
   const s={...current,value:'',selection:[0,0] as [number,number],attempts:[...current.attempts,attempt]};
   const next=nextPrompt(current.settings,current.seen,weak.current);
   if(!next||s.settings.mode==='free'&&s.settings.goal>0&&score(s).completed>=s.settings.goal){publish(s);finish();if(!next)onError('此組題目已全部練習過，已結算本次成績。');return;}
   publish({...s,currentId:next.id,seen:[...s.seen,next.id]});
 }
 function commit(value:string,inputType:string){const current=ref.current;if(!current||current.finishedAt||paused||value===current.value)return;
   if(current.settings.mode==='timed'&&started.current&&clock.current.elapsed()>=current.settings.duration*1000){finish();return;}
   const prompt=prompts.find(p=>p.id===current.currentId)!;
   if(!started.current&&value){started.current=true;clock.current.start();}
   const event=editEvent(prompt.text,current.value,value,current.settings.punctuation,inputType,clock.current.elapsed(),prompt.id);
   const s={...current,value,events:[...current.events,event],assisted:current.assisted||event.assisted,elapsedMs:clock.current.elapsed()};publish(s);
   if(align(prompt.text,value,s.settings.punctuation).complete)advance('complete');
 }
 function lookup(char:string){const current=ref.current;if(!current||current.finishedAt)return;pause('lookup');publish({...current,lookups:[...current.lookups,char]});}
 function selection(start:number,end:number){if(ref.current)ref.current.selection=[start,end];}
 function restore(){if(!draft)return;clock.current=new PracticeClock(undefined,draft.elapsedMs);started.current=draft.events.length>0;pauses.current.clear();if(draft.settings.mode==='free'){pauses.current.add('manual');setPaused(true);}else if(started.current)clock.current.start();publish(draft);setDraft(null);}
 useEffect(()=>{repository.get<Session>('draft').then(s=>{if(s&&!s.finishedAt&&(s.events.length||s.attempts.length))setDraft(s);}).catch(()=>onError('此瀏覽器未能使用 IndexedDB；練習可繼續，但紀錄暫時無法保存。')).finally(()=>setBooted(true));},[]);
 useEffect(()=>{if(!booted||!enabled||draft)return;const previous=ref.current;const keys:(keyof Settings)[]=['method','mode','duration','goal','style','topic','content','punctuation'];if(!previous||(previous.finishedAt||!started.current&&!previous.attempts.length)&&keys.some(k=>previous.settings[k]!==settings[k]))create(settings);},[booted,enabled,draft,settings.method,settings.mode,settings.duration,settings.goal,settings.style,settings.topic,settings.content,settings.punctuation]);
 useEffect(()=>{const timer=setInterval(()=>{const s=ref.current;if(!s||s.finishedAt)return;const ms=clock.current.elapsed();setElapsed(ms);if(s.settings.mode==='timed'&&started.current&&ms>=s.settings.duration*1000)finish();},100);return()=>clearInterval(timer);},[]);
 useEffect(()=>{const save=()=>persist(ref.current?.finishedAt?null:ref.current);const interval=setInterval(save,3000);window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',save);return()=>{clearInterval(interval);window.removeEventListener('pagehide',save);document.removeEventListener('visibilitychange',save);};},[]);
 return {session,elapsed,paused,result,draft,create,commit,advance,finish,pause,resume,lookup,selection,restore,hideDraft:()=>{setDraft(null);persist(ref.current);},closeResult:()=>setResult(null),started:started.current};
}
