import { align } from './alignment';
import { comparable, isHan,units } from './text';
import type {Attempt,EditEvent,Session} from './types';
export function editEvent(target:string,before:string,after:string,punctuation:boolean,inputType:string,at:number,promptId:string):EditEvent {
  const previous=units(before),next=units(after);let start=0;
  while(start<previous.length&&start<next.length&&previous[start].char===next[start].char)start++;
  let oldEnd=previous.length,newEnd=next.length;
  while(oldEnd>start&&newEnd>start&&previous[oldEnd-1].char===next[newEnd-1].char){oldEnd--;newEnd--;}
  const left=next[start]?.offset??after.length,endBefore=previous[oldEnd]?.offset??before.length,endAfter=next[newEnd]?.offset??after.length;
  const beforeLeft=previous[start]?.offset??before.length;
  const inserted=comparable(after.slice(left,endAfter),punctuation).length;
  const alignment=align(target,after,punctuation,true);
  const added=alignment.columns.filter(c=>c.input&&c.input.offset>=left&&c.input.offset<endAfter);
  const assisted=/paste|drop|replacement|yank/i.test(inputType);
  return {at,promptId,before,after,inputType,inserted,firstCorrect:added.filter(c=>c.kind==='equal').length,
    firstEntries:/history/i.test(inputType)?[]:added.map(c=>({key:c.target?`${promptId}:target:${c.target.offset}`:`${promptId}:extra:${c.input!.offset}:${at}`,correct:c.kind==='equal'})),
    correction:endBefore>beforeLeft||inserted>0&&beforeLeft<before.length,
    removed:comparable(before.slice(beforeLeft,endBefore),punctuation).length,
    errors:added.filter(c=>c.kind!=='equal').map(c=>c.target?.char??c.input?.char??'').filter(isHan),assisted};
}
export function makeAttempt(id:string,target:string,input:string,punctuation:boolean,status:Attempt['status'],live=false):Attempt {
  const a=align(target,input,punctuation,live||status==='partial');
  return {id:crypto.randomUUID(),promptId:id,target,input,status,correct:a.correct,correctHan:a.correctHan,wrong:a.wrong,missing:a.missing,extra:a.extra};
}
export function score(session:Session) {
  const counted=session.attempts.filter(a=>a.status!=='skipped');
  const sum=(key:'correct'|'correctHan'|'wrong'|'missing'|'extra')=>counted.reduce((n,a)=>n+a[key],0);
  const correct=sum('correct'),wrong=sum('wrong'),missing=sum('missing'),extra=sum('extra');
  const entered=session.events.reduce((n,e)=>n+e.inserted,0);
  const first=new Map<string,boolean>();session.events.forEach(e=>e.firstEntries?.forEach(entry=>{if(!first.has(entry.key))first.set(entry.key,entry.correct);}));
  return {cpm:session.elapsedMs>0?sum('correctHan')/(session.elapsedMs/60000):0,
    accuracy:correct+wrong+missing+extra?correct/(correct+wrong+missing+extra)*100:0,
    firstAccuracy:first.size?[...first.values()].filter(Boolean).length/first.size*100:entered?session.events.reduce((n,e)=>n+e.firstCorrect,0)/entered*100:0,
    correctHan:sum('correctHan'),wrong,missing,extra,
    corrections:session.events.filter(e=>(e.correction??e.removed>0)&&!/history/i.test(e.inputType)).length,
    completed:counted.filter(a=>a.status==='complete').length,
    withErrors:counted.filter(a=>a.status==='complete'&&a.wrong+a.missing+a.extra>0).length,
    skipped:session.attempts.filter(a=>a.status==='skipped').length,
    partial:counted.filter(a=>a.status==='partial').length,lookups:session.lookups.length};
}
