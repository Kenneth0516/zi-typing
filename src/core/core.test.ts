import {describe,it,expect} from 'vitest';
import {align,canSubmit} from './alignment';
import {PracticeClock} from './clock';
import {IMEController} from './ime';
import {editEvent,makeAttempt,score} from './scoring';
import {defaults,type Session} from './types';
import {nextPrompt,pool} from './prompts';
import {codeRoots,quickCode} from '../data/dictionary';
const session=(patch:Partial<Session>={}):Session=>({id:'test',startedAt:new Date().toISOString(),settings:defaults,device:'desktop',elapsedMs:60000,currentId:'a',value:'',selection:[0,0],seen:[],attempts:[],events:[],lookups:[],assisted:false,...patch});
describe('文字對齊',()=>{
 it('正確文字',()=>{expect(align('今天我要去學校。','今天我要去學校。').complete).toBe(true);});
 it('漏字不令後續全錯',()=>{const a=align('今天我要去學校。','今天我去學校。');expect(a.missing).toBe(1);expect(a.wrong).toBe(0);expect(a.correctHan).toBe(6);expect(a.columns.find(c=>c.kind==='missing')?.target?.char).toBe('要');});
 it('多字',()=>{const a=align('今天去學校','今天要去學校');expect(a.extra).toBe(1);expect(a.wrong).toBe(0);});
 it('錯字',()=>{const a=align('今天去學校','今天去學笑');expect(a.wrong).toBe(1);});
 it('重複字採用固定對齊',()=>{const a=align('人人都開心','人都開心');expect(a.missing).toBe(1);expect(a.wrong).toBe(0);expect(a.columns[0].kind).toBe('equal');});
 it('可以中途插入漏字',()=>{expect(align('今天我要去學校','今天我去學校').complete).toBe(false);expect(align('今天我要去學校','今天我要去學校').complete).toBe(true);});
 it('可以選取取代及 Delete',()=>{expect(align('今天我去學校','今天去我學校').complete).toBe(false);expect(align('今天我去學校','今天我去學校').accuracy).toBe(100);});
 it('忽略所有標點，並保留原文 offsets',()=>{const a=align('你好，香港！','你，好香港',false);expect(a.complete).toBe(true);expect(a.correctHan).toBe(4);expect(a.columns[1].input?.offset).toBe(2);});
 it('標點開啟時計錯但不增加中文字數',()=>{const a=align('你好！','你好。');expect(a.wrong).toBe(1);expect(a.correctHan).toBe(2);});
 it('不足八成不能完成',()=>{expect(canSubmit(align('一二三四五六七八九十','一二三'))).toBe(false);expect(canSubmit(align('一二三四五六七八九十','一二三四五六七八'))).toBe(true);});
 it('支援增補平面中文字及組合字',()=>{expect(align('𠮷香港','𠮷香港').correctHan).toBe(3);});
 it('即時對齊把未輸入尾段視作待輸入，唔當漏字',()=>{const a=align('香港今日天氣好','香港',false,true);expect(a.accuracy).toBe(100);expect(a.missing).toBe(0);expect(a.complete).toBe(false);expect(a.columns.filter(c=>c.pending)).toHaveLength(5);});
 it('部分輸入不為了配對遠處同字而大幅跳動',()=>{const a=align('今天我要去學校','學',false,true);expect(a.columns[0].kind).toBe('substitute');expect(a.correctHan).toBe(0);});
});
describe('原生 IME 閘門',()=>{
 it('組字開始和更新不提交',()=>{let value='';const commits:string[]=[];const ime=new IMEController(()=>value,e=>commits.push(e.value));ime.start();value='oi';ime.update();ime.input(true);expect(commits).toEqual([]);});
 it('先 input 後 compositionend，只提交一次',()=>{let value='';const commits:string[]=[];const ime=new IMEController(()=>value,e=>commits.push(e.value));ime.start();value='今';ime.input(true);ime.end();ime.flush();ime.input(false);expect(commits).toEqual(['今']);});
 it('先 compositionend 後 input，只讀最終 DOM',()=>{let value='oi';const commits:string[]=[];const ime=new IMEController(()=>value,e=>commits.push(e.value));ime.start();ime.end();value='今';ime.input(false);expect(commits).toEqual([]);ime.flush();expect(commits).toEqual(['今']);});
 it('候選字確認前不錯誤換句',()=>{let value='';let completed=0;const ime=new IMEController(()=>value,e=>{if(align('香港',e.value).complete)completed++;});ime.start();value='香港';ime.input(true);expect(completed).toBe(0);ime.end();ime.flush();expect(completed).toBe(1);});
 it('取消組字不產生輸入事件',()=>{let value='';const commits:string[]=[];const ime=new IMEController(()=>value,e=>commits.push(e.value));ime.start();value='碼';ime.input(true);value='';ime.end();ime.flush();expect(commits).toEqual([]);});
 it('連續 compositionstart 期間不 flush',()=>{let value='今';const commits:string[]=[];const ime=new IMEController(()=>value,e=>commits.push(e.value));ime.start();ime.end();ime.start();ime.flush();expect(commits).toEqual([]);ime.end();ime.flush();expect(commits).toEqual(['今']);});
 it('Backspace、取代和撤銷保留 inputType',()=>{let value='今天';const commits:{value:string;inputType:string}[]=[];const ime=new IMEController(()=>value,e=>commits.push(e));ime.input();ime.before('deleteContentBackward');value='今';ime.input();ime.before('historyUndo');value='今天';ime.input();expect(commits.map(c=>c.inputType)).toEqual(['insertText','deleteContentBackward','historyUndo']);});
});
describe('有效計時',()=>{
 it('首次 start 前為零，暫停、查碼期間不累積',()=>{let now=0;const c=new PracticeClock(()=>now);now=10000;expect(c.elapsed()).toBe(0);c.start();now+=3000;c.pause();now+=60000;expect(c.elapsed()).toBe(3000);c.start();now+=2000;expect(c.elapsed()).toBe(5000);});
 it('重複 start 和 pause 不重複計時',()=>{let now=0;const c=new PracticeClock(()=>now);c.start();now=1000;c.start();now=2000;c.pause();c.pause();expect(c.elapsed()).toBe(2000);});
 it('恢復只計保存的有效時間',()=>{const c=new PracticeClock(()=>99999,12000);expect(c.elapsed()).toBe(12000);});
});
describe('成績及事件歷史',()=>{
 it('刪除重打只計最終正確字一次',()=>{const target='香港';const events=[editEvent(target,'','香',false,'insertText',1,'a'),editEvent(target,'香','',false,'deleteContentBackward',2,'a'),editEvent(target,'','香港',false,'insertText',3,'a')];const s=session({events,attempts:[makeAttempt('a',target,'香港',false,'complete')]});expect(score(s).cpm).toBe(2);expect(score(s).corrections).toBe(1);});
 it('跳過不增加正確字數但保留時間',()=>{const s=session({attempts:[makeAttempt('a','香港','香港',false,'skipped')]});expect(score(s).cpm).toBe(0);expect(score(s).skipped).toBe(1);expect(s.elapsedMs).toBe(60000);});
 it('標點不增加 CPM',()=>{expect(score(session({attempts:[makeAttempt('a','香港！','香港！',true,'complete')]})).cpm).toBe(2);});
 it('修正後保留首次錯誤，重打不能改善首次準確率',()=>{const event=editEvent('香港','','香巷',false,'insertText',1,'a');const corrected=editEvent('香港','香巷','香港',false,'insertText',2,'a');const r=score(session({events:[event,corrected],attempts:[makeAttempt('a','香港','香港',false,'complete')]}));expect(event.errors).toEqual(['港']);expect(r.accuracy).toBe(100);expect(r.firstAccuracy).toBe(50);});
 it('貼上及自動取代標記為輔助',()=>{for(const type of ['insertFromPaste','insertFromDrop','insertReplacementText'])expect(editEvent('香港','','香港',false,type,0,'a').assisted).toBe(true);});
 it('部分完成不算完整句子，尾段未輸入不當漏字，仍計已輸入正確字',()=>{const r=score(session({attempts:[makeAttempt('a','香港天氣好','香港',false,'partial')]}));expect(r.completed).toBe(0);expect(r.partial).toBe(1);expect(r.cpm).toBe(2);expect(r.missing).toBe(0);expect(r.accuracy).toBe(100);});
 it('補回中途漏字計一次修正，末尾正常輸入不計修正',()=>{const e=editEvent('今天我要去學校','今天我去學校','今天我要去學校',false,'insertText',2,'a');expect(score(session({events:[e]})).corrections).toBe(1);expect(editEvent('香港天氣好','香港','香港天',false,'insertText',3,'a').correction).toBe(false);});
 it('帶錯完成保存所有錯誤',()=>{const r=score(session({attempts:[makeAttempt('a','香港天氣好','香巷天氣好',false,'complete')]}));expect(r.withErrors).toBe(1);expect(r.wrong).toBe(1);});
});
describe('題庫及查碼',()=>{
 it('同一場不重複，題庫用盡返回 undefined',()=>{const settings={...defaults,topic:'work' as const};const seen:string[]=[];for(let i=0;i<pool(settings).length;i++){const p=nextPrompt(settings,seen,[],()=>0)!;expect(seen).not.toContain(p.id);seen.push(p.id);}expect(nextPrompt(settings,seen)).toBeUndefined();});
 it('弱項優先推薦現有實用句子',()=>{const p=nextPrompt(defaults,[],['窗'],()=>0);expect(p?.text).toContain('窗');});
 it('速成首尾及單碼規則',()=>{expect(quickCode('hqi')).toBe('hi');expect(quickCode('a')).toBe('a');expect(codeRoots('hqi')).toBe('竹 手 戈');});
});
