import { prompts } from '../data/prompts';
import type {Prompt,Settings} from './types';
export function pool(settings:Settings){return prompts.filter(p=>p.style===settings.style&&p.kind===settings.content&&(settings.topic==='all'||p.topic===settings.topic));}
function similarity(a:string,b:string){const grams=(s:string)=>new Set(Array.from(s).slice(0,-1).map((c,i)=>c+Array.from(s)[i+1]));const x=grams(a),y=grams(b);return [...x].filter(g=>y.has(g)).length/Math.max(1,Math.min(x.size,y.size));}
export function nextPrompt(settings:Settings,seen:string[],weak:string[]=[],random= Math.random):Prompt|undefined {
  let available=pool(settings).filter(p=>!seen.includes(p.id));
  const recent=seen.slice(-5).map(id=>prompts.find(p=>p.id===id)?.text??'');
  const diverse=available.filter(p=>recent.every(t=>similarity(t,p.text)<0.45));
  if(diverse.length)available=diverse;
  const recommended=available.filter(p=>weak.some(c=>p.text.includes(c)));
  if(recommended.length)available=recommended;
  return available[Math.min(available.length-1,Math.floor(random()*available.length))];
}
