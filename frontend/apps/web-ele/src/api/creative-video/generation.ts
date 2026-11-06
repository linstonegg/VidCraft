import { requestClient } from '#/api/request';
import { currentRole } from './permissions';
import type { GenerationQuote, QuoteInput } from './billing';
const snapshot=(s:QuoteInput)=>({id:s.id,revision:s.revision,text:s.text,seconds:s.seconds,referenceId:s.referenceId});
const headers=()=>({'x-mock-role':currentRole()});
export const generationApi={
 render(projectId:number,shots:{id:number;version:number;seconds:number;overlap?:number;narration?:string;subtitle?:string}[],settings:import('./render-settings').RenderSettings,idempotencyKey:string){return requestClient.post('/creative-video/render',{projectId,shots,settings,idempotencyKey},{headers:headers()});},
 review(projectId:number,shotId:number,versionId:number,action:'adopt'|'reject',expectedRevision:number){return requestClient.post('/creative-video/review',{projectId,shotId,versionId,action,expectedRevision},{headers:headers()});},
 state(){return requestClient.post<import('./server-finance').FinanceState>('/creative-video/generation',{action:'state'},{headers:headers()});},
 action(action:'cancel'|'reconcile'|'topup',projectId:number,options:{jobId?:number;outcome?:'success'|'failed';amount?:number}){return requestClient.post<import('./server-finance').FinanceState>('/creative-video/generation',{action,projectId,...options},{headers:headers()});},
 quote(input:QuoteInput,model:GenerationQuote['model'],resolution:GenerationQuote['resolution'],candidates:number,aspect='9:16'){return requestClient.post<GenerationQuote>('/creative-video/generation',{action:'quote',input:snapshot(input),model,resolution,candidates,aspect},{headers:headers()});},
 submit(input:QuoteInput,quoteId:number,idempotencyKey:string,projectId=0,fail=false,timeout=false,failedCandidates=0){return requestClient.post<{id:string;quoteId:number;status:string}>('/creative-video/generation',{action:'submit',input:{...snapshot(input),referenceImage:input.referenceImage},quoteId,idempotencyKey,projectId,fail,timeout,failedCandidates},{headers:headers()});}
};
