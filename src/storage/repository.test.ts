import 'fake-indexeddb/auto';
import {describe,it,expect} from 'vitest';
import {repository,importBackup} from './repository';
import {defaults,type Session} from '../core/types';
const make=(id:string):Session=>({id,startedAt:'2026-11-03T00:00:00Z',settings:defaults,device:'desktop',elapsedMs:30000,currentId:'a',value:'',selection:[0,0],seen:['a'],attempts:[],events:[],lookups:[],assisted:false});
describe('本機資料及匯入合併',()=>{
 it('保存及讀取設定、草稿及歷史',async()=>{await repository.set('settings',defaults);expect(await repository.get('settings')).toEqual(defaults);await repository.set('draft',make('draft'));expect((await repository.get<Session>('draft'))?.id).toBe('draft');await repository.save(make('one'));expect((await repository.sessions()).some(s=>s.id==='one')).toBe(true);});
 it('相同 ID 及內容去重，有衝突另存，現有資料不被覆蓋',async()=>{const one=make('merge');await repository.save(one);const a=await importBackup(JSON.stringify({version:1,sessions:[one]}));expect(a.added).toBe(0);const changed={...one,elapsedMs:40000};const b=await importBackup(JSON.stringify({version:1,sessions:[changed]}));expect(b.conflicts).toBe(1);const rows=await repository.sessions();expect(rows.find(s=>s.id==='merge')?.elapsedMs).toBe(30000);expect(rows.some(s=>s.id!=='merge'&&s.elapsedMs===40000)).toBe(true);});
 it('拒絕格式錯誤的備份',async()=>{await expect(importBackup('{"version":1,"sessions":[{}]}')).rejects.toThrow();});
 it('重新匯入有衝突的備份亦不重複加入',async()=>{const original=make('repeat');await repository.save(original);const raw=JSON.stringify({version:1,sessions:[{...original,elapsedMs:45678}]});expect((await importBackup(raw)).added).toBe(1);expect((await importBackup(raw)).added).toBe(0);});
});
