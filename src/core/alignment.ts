import { comparable, isHan, type Unit } from './text';
export type Operation = 'equal' | 'substitute' | 'missing' | 'extra';
export interface Column { kind: Operation; target?: Unit; input?: Unit; pending?:boolean }
export interface Alignment {
  columns: Column[]; correct: number; correctHan: number; wrong: number; missing: number; extra: number;
  accuracy: number; complete: boolean; coverage: number; inputCount: number; targetCount: number;
}
/** Deterministic Levenshtein alignment; exact matches then substitutions win ties.
 * Offsets always refer to the original UTF-16 string, including ignored punctuation. */
export function align(target: string, input: string, punctuation = true, partial = false): Alignment {
  const a = comparable(target, punctuation), b = comparable(input, punctuation);
  const width = b.length + 1;
  const dp = new Uint16Array((a.length + 1) * width);
  for (let i=0;i<=a.length;i++) dp[i*width+b.length]=partial?0:a.length-i;
  for (let j=0;j<=b.length;j++) dp[a.length*width+j]=b.length-j;
  for(let i=a.length-1;i>=0;i--) for(let j=b.length-1;j>=0;j--) {
    dp[i*width+j] = Math.min(dp[(i+1)*width+j+1]+(a[i].char===b[j].char?0:1), dp[(i+1)*width+j]+1, dp[i*width+j+1]+1);
  }
  const columns: Column[]=[]; let i=0,j=0;
  while(i<a.length||j<b.length) {
    if(partial&&j===b.length){columns.push({kind:'missing',target:a[i++],pending:true});continue;}
    const cost=dp[i*width+j];
    if(i<a.length&&j<b.length&&a[i].char===b[j].char&&cost===dp[(i+1)*width+j+1]) { columns.push({kind:'equal',target:a[i++],input:b[j++]}); }
    else if(i<a.length&&j<b.length&&cost===dp[(i+1)*width+j+1]+1) { columns.push({kind:'substitute',target:a[i++],input:b[j++]}); }
    else if(i<a.length&&cost===dp[(i+1)*width+j]+1) { columns.push({kind:'missing',target:a[i++]}); }
    else { columns.push({kind:'extra',input:b[j++]}); }
  }
  const correct=columns.filter(c=>c.kind==='equal').length;
  const wrong=columns.filter(c=>c.kind==='substitute').length;
  const missing=columns.filter(c=>c.kind==='missing'&&!c.pending).length;
  const extra=columns.filter(c=>c.kind==='extra').length;
  return { columns,correct,correctHan:columns.filter(c=>c.kind==='equal'&&isHan(c.target!.char)).length,
    wrong,missing,extra,accuracy:correct/Math.max(1,correct+wrong+missing+extra)*100,
    complete:a.length>0&&wrong+missing+extra===0&&!columns.some(c=>c.pending),coverage:Math.min(1,b.length/Math.max(1,a.length)),inputCount:b.length,targetCount:a.length };
}
export function canSubmit(result: Alignment) { return result.coverage>=0.8 && result.inputCount>0; }
export function errorCharacters(result: Alignment) {
  return result.columns.filter(c=>c.kind!=='equal').map(c=>c.target?.char??c.input?.char??'').filter(isHan);
}
