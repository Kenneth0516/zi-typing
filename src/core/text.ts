export const isHan = (s: string) => /\p{Script=Han}/u.test(s);
export const isPunctuation = (s: string) => /^[\p{P}\p{Z}\s]+$/u.test(s);
export interface Unit { char: string; offset: number; end: number }
const segmenter = new Intl.Segmenter('zh-HK', { granularity: 'grapheme' });
export function units(text: string): Unit[] {
  return [...segmenter.segment(text)].map(s => ({ char: s.segment, offset: s.index, end: s.index + s.segment.length }));
}
export function comparable(text: string, punctuation: boolean): Unit[] {
  return units(text).filter(u => punctuation || !isPunctuation(u.char));
}
export function hanCount(text: string) { return units(text).filter(u => isHan(u.char)).length; }
