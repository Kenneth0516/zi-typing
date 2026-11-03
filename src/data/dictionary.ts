import {assetUrl} from '../core/assets';
export interface Dictionary { [character:string]:string[] }
let cache:Promise<Dictionary>|undefined;
export function loadDictionary(){return cache??=fetch(assetUrl('data/cangjie5.json')).then(r=>{if(!r.ok)throw new Error('字表未能載入');return r.json() as Promise<Dictionary>;}).catch(e=>{cache=undefined;throw e;});}
const roots:Record<string,string>={a:'日',b:'月',c:'金',d:'木',e:'水',f:'火',g:'土',h:'竹',i:'戈',j:'十',k:'大',l:'中',m:'一',n:'弓',o:'人',p:'心',q:'手',r:'口',s:'尸',t:'廿',u:'山',v:'女',w:'田',x:'難',y:'卜',z:'重'};
export const codeRoots=(code:string)=>[...code].map(c=>roots[c]??c).join(' ');
export const quickCode=(code:string)=>code.length<=1?code:code[0]+code.at(-1);
