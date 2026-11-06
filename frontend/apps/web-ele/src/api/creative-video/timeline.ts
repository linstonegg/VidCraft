import { authorize } from './permissions.ts';
import type { Shot } from './production.ts';
export function timelineDuration(shots:Shot[]){return shots.reduce((n,s,i)=>n+s.seconds-(i<shots.length-1?(s.overlap??0):0),0);}
export function validateTimeline(shots:Shot[],target:number){if(!shots.length)throw Error('时间线不能为空');for(const [i,s] of shots.entries()){if(!s.text.trim()||!Number.isFinite(s.seconds)||s.seconds<1||s.seconds>20)throw Error(`镜头 ${s.id} 剧情或时长无效`);const overlap=s.overlap??0;const next=shots[i+1];if(!Number.isFinite(overlap)||overlap<0||overlap>=s.seconds||(next&&overlap>=next.seconds))throw Error(`镜头 ${s.id} 转场重叠时间无效`);}const total=timelineDuration(shots);if(Math.abs(total-target)>0.01)throw Error(`时间线净时长 ${total} 秒与目标 ${target} 秒不符`);}
export function approveShot(shot:Shot){authorize('review');if(!shot.text.trim())throw Error('请填写镜头剧情');shot.approvedRevision=shot.revision;}
export function rejectShot(shot:Shot,reason:string){authorize('review');if(!reason.trim())throw Error('请填写退回原因');shot.approvedRevision=undefined;shot.reviewComment=reason;}
export function approveStoryboard(shots:Shot[],target:number){authorize('review');validateTimeline(shots,target);shots.forEach(approveShot);}
