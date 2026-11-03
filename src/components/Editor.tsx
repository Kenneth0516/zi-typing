import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {align} from '../core/alignment';
import {IMEController} from '../core/ime';
import {units,isPunctuation} from '../core/text';
interface Props {target:string;value:string;punctuation:boolean;disabled:boolean;lookup:boolean;fontSize:number;initialSelection:[number,number];onCommit:(value:string,type:string)=>void;onLookup:(char:string)=>void;onSelection:(a:number,b:number)=>void;onComposition:(state:boolean)=>void;onBlocked?:()=>void;}
export function Editor(p:Props){
 const field=useRef<HTMLTextAreaElement>(null),mirror=useRef<HTMLDivElement>(null),props=useRef(p);props.current=p;
 const controller=useRef<IMEController|null>(null),settle=useRef(0),selection=useRef(p.initialSelection),hadFocus=useRef(false);
 const [composing,setComposing]=useState(false),[focused,setFocused]=useState(false),[size,setSize]=useState(170),[caret,setCaret]=useState(p.initialSelection[0]);
 if(!controller.current)controller.current=new IMEController(()=>field.current?.value??'',event=>props.current.onCommit(event.value,event.inputType),p.value);
 const result=align(p.target,p.value,p.punctuation,true);
 const byOffset=new Map(result.columns.filter(c=>c.input).map(c=>[c.input!.offset,c]));
 const lastInput=result.columns.reduce((n,c,i)=>c.input?i:n,-1);
 const internalMissing=result.columns.filter((c,i)=>c.kind==='missing'&&i<lastInput);
 const gaps=new Map<number,string>();let gap='';result.columns.forEach(c=>{if(c.kind==='missing'&&!c.pending)gap+=c.target?.char??'';else if(c.input&&gap){gaps.set(c.input.offset,gap);gap='';}});
 const tail=result.columns.slice(lastInput+1).filter(c=>c.target).map(c=>c.target!.char).join('');
 const pending=p.value?tail:(p.punctuation?p.target:units(p.target).filter(u=>!isPunctuation(u.char)).map(u=>u.char).join(''));
 const locked=p.disabled||p.lookup;
 useEffect(()=>{const el=field.current!;
  const before=(e:InputEvent)=>{controller.current!.before(e.inputType);if(/insertFromPaste|insertFromDrop/.test(e.inputType)&&e.cancelable){e.preventDefault();props.current.onCommit(el.value,'blockedPaste');}};
  const paste=(e:ClipboardEvent)=>{e.preventDefault();props.current.onBlocked?.();};
  const drop=(e:DragEvent)=>{e.preventDefault();props.current.onBlocked?.();};
  const input=(e:Event)=>{const input=e as InputEvent;if(input.inputType)controller.current!.before(input.inputType);controller.current!.input(input.isComposing);};
  const start=()=>{cancelAnimationFrame(settle.current);controller.current!.start();setComposing(true);props.current.onComposition(true);};
  const update=()=>controller.current!.update();
  const end=()=>{controller.current!.end();settle.current=requestAnimationFrame(()=>{controller.current!.flush();setComposing(false);props.current.onComposition(false);});};
  el.addEventListener('beforeinput',before);el.addEventListener('input',input);el.addEventListener('paste',paste);el.addEventListener('drop',drop);el.addEventListener('compositionstart',start);el.addEventListener('compositionupdate',update);el.addEventListener('compositionend',end);
  return()=>{cancelAnimationFrame(settle.current);el.removeEventListener('beforeinput',before);el.removeEventListener('input',input);el.removeEventListener('paste',paste);el.removeEventListener('drop',drop);el.removeEventListener('compositionstart',start);el.removeEventListener('compositionupdate',update);el.removeEventListener('compositionend',end);};
 },[]);
 useLayoutEffect(()=>{const el=field.current!;if(!controller.current!.composing&&!controller.current!.settling&&el.value!==p.value){el.value=p.value;controller.current!.reset(p.value);}setSize(Math.max(170,mirror.current?.scrollHeight??170,el.scrollHeight));},[p.value,p.target,p.fontSize]);
 useEffect(()=>{const el=field.current!;if(p.lookup){hadFocus.current=true;selection.current=[el.selectionStart,el.selectionEnd];}else if(hadFocus.current){el.focus({preventScroll:true});el.setSelectionRange(...selection.current);hadFocus.current=false;}},[p.lookup]);
 useEffect(()=>{if(!locked){field.current?.focus({preventScroll:true});field.current?.setSelectionRange(...selection.current);}},[locked]);
 useEffect(()=>{if(!locked){field.current?.focus({preventScroll:true});field.current?.setSelectionRange(...p.initialSelection);}},[]);
 useEffect(()=>{const viewport=()=>{document.documentElement.style.setProperty('--visible-height',`${window.visualViewport?.height??window.innerHeight}px`);if(document.activeElement===field.current)field.current?.scrollIntoView({block:'nearest',behavior:'instant'});};window.visualViewport?.addEventListener('resize',viewport);return()=>window.visualViewport?.removeEventListener('resize',viewport);},[]);
 useLayoutEffect(()=>{if(composing||locked||document.activeElement!==field.current)return;const position=field.current?.selectionStart??caret;const characters=[...mirror.current!.querySelectorAll<HTMLElement>('[data-end]')];const anchor=characters.find(el=>Number(el.dataset.end)>=position)??characters.at(-1);if(!anchor)return;const bounds=anchor.getBoundingClientRect(),viewport=window.visualViewport;const top=viewport?.offsetTop??0,bottom=top+(viewport?.height??window.innerHeight);if(bounds.top<top+18||bounds.bottom>bottom-30)anchor.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});},[p.value,caret,composing,locked]);
 return <div className={`editor ${focused?'focused':''} ${composing?'composing':''} ${locked?'locked':''}`} style={{fontSize:p.fontSize,minHeight:size}}>
  <span id="typing-target" className="sr-only">目標文字：{p.target}</span>
  {p.lookup?<div className="lookup-target" aria-label="點選中文字查碼">{units(p.target).map((u,i)=><button key={i} className={isPunctuation(u.char)?'punctuation':''} disabled={isPunctuation(u.char)} onClick={()=>p.onLookup(u.char)} aria-label={`查碼 ${u.char}`}>{u.char}</button>)}</div>:null}
  <div ref={mirror} className="editor-mirror" aria-hidden="true">{units(p.value).map(u=>{const c=byOffset.get(u.offset);return <span key={u.offset} data-end={u.end} className={c?.kind==='equal'?'typed-correct':c?'typed-error':'ignored'} data-expected={c?.kind==='substitute'?c.target?.char:c?.kind==='extra'?'+':undefined}>{gaps.has(u.offset)?<span className="gap-marker"><span>{gaps.get(u.offset)}</span></span>:null}{u.char}</span>;})}<span className="pending">{pending}</span>{!p.value&&focused?<span className="start-caret"/>:null}</div>
  <textarea ref={field} defaultValue={p.value} className="native-editor" aria-label="打字練習輸入區" aria-describedby="typing-target" spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off" maxLength={1200} readOnly={locked} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onSelect={e=>{const el=e.currentTarget;selection.current=[el.selectionStart,el.selectionEnd];setCaret(el.selectionStart);p.onSelection(el.selectionStart,el.selectionEnd);}}/>
  {internalMissing.length>0&&!p.lookup&&!composing?<div className="missing-note">漏字：{internalMissing.map((c,i)=><span key={i}>「{c.target?.char}」</span>)}，可移動游標補回。</div>:null}
 </div>;
}
