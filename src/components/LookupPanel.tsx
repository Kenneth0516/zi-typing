import {assetUrl} from '../core/assets';
import {useEffect,useState} from 'react';
import {X,BookOpen,ArrowUpRight} from 'lucide-react';
import {loadDictionary,codeRoots,quickCode} from '../data/dictionary';
import type {Dictionary} from '../data/dictionary';
export function LookupPanel({character,onClose,timed}:{character:string|null;onClose:()=>void;timed:boolean}){
 const [dictionary,setDictionary]=useState<Dictionary|null>(null),[error,setError]=useState(false);
 useEffect(()=>{loadDictionary().then(setDictionary).catch(()=>setError(true));},[]);
 const codes=character?dictionary?.[character]?.filter(code=>!code.startsWith('z')):undefined;
 return <aside className="lookup-panel" aria-label="查碼面板">
  <div className="panel-title"><span><BookOpen size={17}/> 字碼小幫手</span><button onClick={onClose} className="icon-button" aria-label="返回打字"><X size={18}/></button></div>
  {!character?<div className="lookup-empty"><span className="lookup-glyph">字</span><h3>想起個字，忘記字碼？</h3><p>點選練習區嘅中文字，<br/>慢慢搵返你嘅記憶。</p></div>:<><div className="lookup-char">{character}</div>{error?<p>字表未能載入，請檢查連線後重新開啟。</p>:!dictionary?<p>正在載入字表…</p>:!codes?.length?<p className="lookup-no-data">暫無資料</p>:<div className="code-list">{codes.map(code=><div className="code-option" key={code}><span className="tiny-label">倉頡五代</span><div className="code-keys">{[...code].map((k,i)=><kbd key={i}>{k.toUpperCase()}</kbd>)}</div><div className="code-roots">{codeRoots(code)}</div><div className="quick-row"><span>速成</span><strong>{quickCode(code).toUpperCase()}</strong><span>{codeRoots(quickCode(code))}</span></div></div>)}</div>}</>}
  <div className="lookup-note">{timed?'測速繼續計時，今次紀錄會標示使用提示。':'查碼期間已暫停計時。返回打字後繼續。'}<br/>速成候選次序因系統而異。</div>
  <a className="source-link" href={assetUrl('data/metadata.json')} target="_blank" rel="noreferrer">Rime 倉頡五代 · 版本及來源 <ArrowUpRight size={13}/></a>
  <button className="primary full" onClick={onClose}>返回打字</button>
 </aside>;
}
