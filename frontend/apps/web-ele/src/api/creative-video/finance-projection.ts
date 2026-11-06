import { studioStorage } from './storage.ts';
import type {Production,Job,Ledger,Render} from './production';
import type {GenerationQuote} from './billing';
export interface FinanceState {renders?:(Render&{projectId:number})[];reviews?:{projectId:number;shotId:number;revision:number;adopted?:number;rejected:number[];events:{action:string;versionId:number;date:string;actor:string;revision:number}[]}[];instance:string;revision:number;balance:number;jobs:(Omit<Job,'quote'>&{projectId:number;candidateIds:number[];quote:GenerationQuote})[];entries:(Ledger&{projectId:number;key:string})[]}
export function applyFinance(projectId:number,p:Production,server:FinanceState){
 const previous=p.financeInstance??studioStorage.getItem('vidcraft-finance-instance');const reset=!!previous&&previous!==server.instance;
 if(reset){p.renders.forEach(r=>{if(r.serverManaged){r.serverManaged=false;r.archivedInstance=previous!;if(r.status==='running'){r.status='failed';r.resetReason='Mock服务重启，旧合成任务停止；原时间线快照保留';}}});p.reviewRevisions={};p.financeArchives??=[];if(!p.financeArchives.some(a=>a.instance===previous))p.financeArchives.push({instance:previous!,archivedAt:new Date().toISOString(),balance:p.balance,jobs:JSON.parse(JSON.stringify(p.jobs.filter(j=>j.serverManaged))) as Job[],ledger:JSON.parse(JSON.stringify(p.ledger)) as Ledger[]});}
 p.financeInstance=server.instance;
 studioStorage.setItem('vidcraft-finance-instance',server.instance);studioStorage.setItem('vidcraft-account-wallet-v1',JSON.stringify({revision:server.revision,entries:server.entries}));p.balance=server.balance;p.walletRevision=server.revision;
 p.sequence=Math.max(p.sequence,...server.jobs.flatMap(j=>[j.id,...j.candidateIds]));
 const jobs=server.jobs.filter(j=>j.projectId===projectId);p.jobs=[...p.jobs.filter(j=>!j.serverManaged),...jobs.map(j=>({...j,serverManaged:true}))];p.ledger=[...p.ledger.filter(l=>!l.transactionId?.startsWith('server:')&&!server.entries.some(e=>e.projectId===projectId&&e.jobId===l.jobId)),...server.entries.filter(e=>e.projectId===projectId).map(e=>({...e,transactionId:`server:${e.transactionId}`}))];
 for(const j of jobs){const shot=p.shots.find(s=>s.id===j.shotId);if(!shot)continue;for(const id of j.candidateIds)if(!shot.versions.some(v=>v.id===id))shot.versions.push({id,revision:j.revision,prompt:j.prompt,videoUrl:'/mock-media/demo-a.mp4',referenceImage:j.referenceImage});}
 p.renders=[...p.renders.filter(r=>!r.serverManaged),...(server.renders??[]).filter(r=>r.projectId===projectId)];
 p.reviewRevisions??={};p.reviewAudit=server.reviews?.filter(r=>r.projectId===projectId).flatMap(r=>r.events.map(e=>({...e,shotId:r.shotId})))??[];for(const review of server.reviews??[]){if(review.projectId!==projectId)continue;const shot=p.shots.find(s=>s.id===review.shotId);if(!shot)continue;p.reviewRevisions[shot.id]=review.revision;shot.adopted=review.adopted;shot.versions.forEach(v=>v.rejected=review.rejected.includes(v.id));}
 return reset;
}
