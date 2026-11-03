export type Style='written'|'spoken';
export type Topic='all'|'life'|'social'|'study'|'work'|'travel'|'tech'|'society';
export interface Settings {method:'cangjie'|'quick';mode:'free'|'timed';duration:30|60|120;goal:0|10|20|50;style:Style;topic:Topic;content:'sentence'|'article';punctuation:boolean;theme:'light'|'dark'|'system';fontSize:number;}
export const defaults:Settings={method:'cangjie',mode:'free',duration:60,goal:0,style:'written',topic:'all',content:'sentence',punctuation:false,theme:'light',fontSize:30};
export interface Prompt {id:string;text:string;style:Style;topic:Exclude<Topic,'all'>;kind:'sentence'|'article';difficulty:1|2|3;count:number;source:string;license:string;review:'reviewed';}
export interface EditEvent {at:number;promptId:string;before:string;after:string;inputType:string;inserted:number;firstCorrect:number;firstEntries?:{key:string;correct:boolean}[];correction?:boolean;removed:number;errors:string[];assisted:boolean;}
export interface Attempt {id:string;promptId:string;target:string;input:string;status:'complete'|'skipped'|'partial';correct:number;correctHan:number;wrong:number;missing:number;extra:number;}
export interface Session {id:string;startedAt:string;finishedAt?:string;settings:Settings;device:'desktop'|'mobile';elapsedMs:number;currentId:string;value:string;selection:[number,number];seen:string[];attempts:Attempt[];events:EditEvent[];lookups:string[];assisted:boolean;}
