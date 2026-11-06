import { studioStorage } from './storage.ts';
export interface Approval {stage:number; fingerprint:string; date:string}
const key=(id:number)=>`vidcraft-approvals-${id}`;
export function approvals(id:number):Approval[]{return JSON.parse(studioStorage.getItem(key(id))||'[]') as Approval[];}
export function confirmStage(id:number,stage:number,fingerprint:string){const list=approvals(id).filter(a=>a.stage!==stage);list.push({stage,fingerprint,date:new Date().toISOString()});studioStorage.setItem(key(id),JSON.stringify(list));}
export function invalidateFrom(id:number,stage:number){studioStorage.setItem(key(id),JSON.stringify(approvals(id).filter(a=>a.stage<stage)));studioStorage.removeItem(`storyboard-approved-${id}`);const reached=JSON.parse(studioStorage.getItem('vidcraft-reached')||'{}') as Record<number,number>;reached[id]=Math.min(reached[id]??stage,stage);studioStorage.setItem('vidcraft-reached',JSON.stringify(reached));}
