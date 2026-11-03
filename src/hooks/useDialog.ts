import {useEffect,useRef} from 'react';
export function useDialog(active:boolean,onClose:()=>void){
 const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{if(!active)return;const previous=document.activeElement as HTMLElement|null;const dialog=document.querySelector<HTMLElement>('[role="dialog"]');if(!dialog)return;
  const focusable=()=>[...dialog.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]')].filter(el=>el.getClientRects().length>0);
  focusable()[0]?.focus();
  const key=(e:KeyboardEvent)=>{if(e.isComposing)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close.current();}else if(e.key==='Tab'){const controls=focusable(),first=controls[0],last=controls.at(-1);if(e.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){e.preventDefault();first?.focus();}}};
  document.addEventListener('keydown',key,true);return()=>{document.removeEventListener('keydown',key,true);previous?.focus({preventScroll:true});};
 },[active]);
}
