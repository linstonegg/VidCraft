import { validateRenderSettings } from './render-settings.ts';
import type { RenderSettings } from './render-settings.ts';
import type { RevisionPlan } from './revision.ts';
import { splitBeatsToShots } from './story.ts';
import { studioStorage } from './storage.ts';
import { loadWallet, walletTotals, commitWallet } from './wallet.ts';
import { recordLedger } from './ledger.ts';
import type { ReferenceImage } from './media.ts';
import type { ShotSnapshot } from './shots.ts';
import { createQuote, validateQuote } from './billing.ts';
import type { GenerationQuote } from './billing.ts';
import { authorize } from './permissions.ts';
export interface Version { videoUrl?:string; referenceImage?:string; id: number; revision: number; prompt: string; rejected?: boolean }
export interface Shot { audioDirty?:boolean; generationMode?:string;storyBeatId?:number; overlap?:number;approvedRevision?:number;reviewComment?:string; references?:ReferenceImage[];referenceId?:number; history?:ShotSnapshot[]; narration?:string; subtitle?:string; motion?:string; transition?:string; music?:string; id: number; text: string; seconds: number; revision: number; versions: Version[]; adopted?: number }
export interface Job {stage?:string;submittedAt?:number;failedCandidates?:number; serverManaged?:boolean; authorizedAt?:string;idempotencyKey?:string; referenceImage?:string; id: number; shotId: number; revision: number; prompt: string; due: number; status: 'running'|'success'|'failed'|'cancelled'|'timeout'|'reconciling'|'partial'; cost: number; fail: boolean; timeout?: boolean; quote?:GenerationQuote; cancelled?:boolean }
export interface Ledger { transactionId?:string;created?:string;balanceBefore?:number;balanceAfter?:number;reason?:string; jobId: number; kind: '冻结'|'结算'|'释放'|'演示充值'; amount: number }
export interface Render {archivedInstance?:string;resetReason?:string;serverManaged?:boolean;projectId?:number; settings?:RenderSettings; videoUrl?:string;id:number; shots:string; date:string; status?:'running'|'success'|'failed'|'cancelled'; due?:number; fail?:boolean}
export interface Production {reviewRevisions?:Record<number,number>;reviewAudit?:{shotId:number;action:string;versionId:number;date:string;actor:string;revision:number}[]; financeInstance?:string;financeArchives?:{instance:string;archivedAt:string;balance:number;jobs:Job[];ledger:Ledger[]}[]; renderSettings?:RenderSettings; revisionPlans?:RevisionPlan[]; walletRevision?:number; storageRevision?:number;shotSequence?:number; shots: Shot[]; jobs: Job[]; ledger: Ledger[]; balance: number; sequence: number; renders: Render[] }
export function loadProduction(id: number, duration: number): Production {
 const raw=studioStorage.getItem(`production-${id}`); if(raw){const p=JSON.parse(raw) as Production;const w=loadWallet();p.balance=walletTotals(w).available;p.walletRevision=w.revision;return p;}
 const script=JSON.parse(studioStorage.getItem(`vidcraft-script-${id}`)||'{}') as {beats?:{text:string;seconds:number}[]};
 const beats=script.beats?.length?script.beats:[{text:'请先生成剧本与故事节拍',seconds:duration}];
 return { shots:splitBeatsToShots(beats).map((beat,i)=>({id:i+1,text:beat.text,storyBeatId:beat.storyBeatId,seconds:beat.seconds,narration:beat.text,subtitle:beat.text,motion:'缓慢推进',transition:'叠化',music:'轻快电子',revision:1,versions:[]})),jobs:[],ledger:[],balance:walletTotals(loadWallet()).available,walletRevision:loadWallet().revision,sequence:0,renders:[] };
}
export function persist(id:number,p:Production) {
 const key=`production-${id}`;const raw=studioStorage.getItem(key);const stored=raw?JSON.parse(raw) as Production:undefined;
 if((stored?.storageRevision??0)!==(p.storageRevision??0))throw new Error('版本冲突：其他页面已更新项目，请重新载入后再操作');
 const wallet=commitWallet(id,p.ledger,p.walletRevision);p.walletRevision=wallet.revision;p.balance=walletTotals(wallet).available;
 p.storageRevision=(p.storageRevision??0)+1;studioStorage.setItem(key,JSON.stringify(p));
}
export function settle(p:Production, now=Date.now()) {
 for(const r of p.renders)if(!r.serverManaged&&r.status==='running'&&(r.due??0)<=now)r.status=r.fail?'failed':'success';
 for(const j of p.jobs) if(!j.serverManaged && j.status==='running' && j.due<=now) {
 if(j.timeout){j.status='reconciling';continue;}
 j.status=j.fail?'failed':'success';recordLedger(p,j.id,j.fail?'释放':'结算',j.cost,j.fail?'任务明确失败或核对未收费':'生成成功交付候选');
 if(!j.fail) for(let i=0;i<(j.quote?.candidates??1);i++)p.shots.find(s=>s.id===j.shotId)?.versions.push({id:i===0?j.id:++p.sequence,revision:j.revision,prompt:j.prompt,referenceImage:j.referenceImage,videoUrl:i%2===0?'/mock-media/demo-a.mp4':'/mock-media/demo-b.mp4'});
 }
}
export function generate(p:Production,s:Shot,fail:boolean,quote?:GenerationQuote) {
 authorize('generate');
 if(p.jobs.some(j=>(j.status==='running'||j.status==='reconciling')&&j.shotId===s.id))throw new Error('该镜头已有进行中的任务');
 const q=quote??createQuote(s);validateQuote(q,s);const cost=q.cost;if(p.balance<cost)throw new Error('可用积分不足');
 q.status='HELD';const id=++p.sequence;recordLedger(p,id,'冻结',cost,'用户确认报价并授权生成');p.jobs.push({id,shotId:s.id,revision:s.revision,prompt:s.text,due:Date.now()+4000,status:'running',cost,fail,authorizedAt:new Date().toISOString(),idempotencyKey:`quote-${q.id}`,quote:q,referenceImage:s.references?.find(r=>r.id===s.referenceId)?.dataUrl});
}
export function cancel(_p:Production,j:Job) {authorize('generate');if(j.status!=='running')return;j.status='reconciling';j.cancelled=true;}
export function reconcile(p:Production,j:Job,outcome:'success'|'failed'){
 authorize('generate');if(j.status!=='reconciling')return;j.timeout=false;j.fail=outcome==='failed';j.status='running';j.due=0;settle(p);
}
export function topup(p:Production,amount:100|500){authorize('generate');recordLedger(p,++p.sequence,'演示充值',amount,'仅演示充值，无真实支付');}


export function adoptVersion(p:Production,shotId:number,versionId:number) {
 authorize('review');
 const shot=p.shots.find(s=>s.id===shotId);const version=shot?.versions.find(v=>v.id===versionId);
 if(!shot||!version||version.rejected)throw new Error('候选不存在或已拒绝');
 shot.adopted=version.id;
}
export function rejectVersion(p:Production,shotId:number,versionId:number){
 authorize('review');
 const shot=p.shots.find(s=>s.id===shotId);const version=shot?.versions.find(v=>v.id===versionId);
 if(!shot||!version)throw new Error('候选不存在');version.rejected=true;if(shot.adopted===versionId)shot.adopted=undefined;
}

export function startRender(p:Production,fail=false){
 authorize('export');
 if(p.renderSettings)validateRenderSettings(p,p.renderSettings);
 if(p.renders.some(r=>r.status==='running'))throw new Error('已有进行中的合成任务');
 if(!p.shots.length||p.shots.some(s=>!s.versions.some(v=>v.id===s.adopted&&!v.rejected)))throw new Error('请先采用全部镜头候选');
 const snapshot=p.shots.map(s=>{const v=s.versions.find(v=>v.id===s.adopted)!;return {id:s.id,version:v.id,revision:v.revision,prompt:v.prompt,narration:s.narration,subtitle:s.subtitle,seconds:s.seconds,overlap:s.overlap??0,referenceImage:v.referenceImage};});
 const result:Render={settings:p.renderSettings?JSON.parse(JSON.stringify(p.renderSettings)) as RenderSettings:undefined,id:++p.sequence,shots:JSON.stringify(snapshot),date:new Date().toISOString(),status:'running',due:Date.now()+5000,fail,videoUrl:'/mock-media/demo-a.mp4'};p.renders.push(result);return result;
}

export function isRenderOutdated(p:Production,r:Render){
 if(r.settings&&p.renderSettings){const {checks:_oldChecks,...oldOutput}=r.settings;const {checks:_newChecks,...currentOutput}=p.renderSettings;if(JSON.stringify(oldOutput)!==JSON.stringify(currentOutput))return true;}
 const snapshot=JSON.parse(r.shots) as {id:number;version:number;seconds:number;overlap?:number;narration?:string;subtitle?:string}[];
 return snapshot.length!==p.shots.length||snapshot.some((s,i)=>{const current=p.shots[i];return !current||current.id!==s.id||current.adopted!==s.version||current.seconds!==s.seconds||(current.overlap??0)!==(s.overlap??0)||current.narration!==s.narration||current.subtitle!==s.subtitle;});
}
