import {validateModelInput} from '~/utils/creative-models';
import {studioRoleFor} from '~/utils/creative-access';
import {confirmedShot} from '~/utils/creative-resources';
import {accountFor,progress,transact,financeInstance,cancelServerJob} from '~/utils/creative-finance';
import { defineEventHandler, readBody,  createError, setResponseStatus } from 'h3';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { useResponseSuccess, useResponseError } from '~/utils/response';
interface Input {id:number;revision:number;text:string;seconds:number;referenceId?:number;referenceImage?:string}
interface Quote {id:number;shotId:number;hash:string;model:'standard'|'premium';resolution:'720p'|'1080p';candidates:number;aspect:string;cost:number;expires:number;status:'QUOTED'|'HELD'|'EXPIRED'}
const quotes=new Map<string,Quote>();const submissions=new Map<string,{hash:string;receipt:{id:string;quoteId:number;status:string}}>();let sequence=0;
export default defineEventHandler(async event=>{try{
 const user=verifyAccessToken(event);if(!user)throw createError({statusCode:401,statusMessage:'UNAUTHORIZED'});
 const role=studioRoleFor(event,user);if(!['owner','editor','reviewer','viewer'].includes(role))throw createError({statusCode:403,statusMessage:'FORBIDDEN'});
 const body=await readBody<{action:string;projectId?:number;jobId?:number;amount?:number;outcome?:'success'|'failed';fail?:boolean;timeout?:boolean;failedCandidates?:number;input:Input;model?:Quote['model'];resolution?:Quote['resolution'];candidates?:number;aspect?:string;quoteId?:number;idempotencyKey?:string}>(event);
 const account=accountFor(user.id);progress(account);
 if(body.action==='state')return useResponseSuccess({...account,instance:financeInstance});
 if(!['owner','editor'].includes(role))throw createError({statusCode:403,statusMessage:'FORBIDDEN'});
 if(body.action==='topup'){if(body.amount!==100&&body.amount!==500)throw createError({statusCode:400,statusMessage:'INVALID_AMOUNT'});transact(account,body.projectId??0,++account.sequence,'演示充值',body.amount,'无真实支付');return useResponseSuccess({...account,instance:financeInstance});}
 if(body.action==='cancel'||body.action==='reconcile'){const job=account.jobs.find(j=>j.id===body.jobId);if(!job)throw createError({statusCode:404,statusMessage:'JOB_NOT_FOUND'});if(body.action==='cancel'&&job.status==='running'){cancelServerJob(account,job);}if(body.action==='reconcile'&&job.status==='reconciling'){if(!['success','failed'].includes(body.outcome??''))throw createError({statusCode:400,statusMessage:'INVALID_OUTCOME'});job.timeout=false;job.fail=body.outcome==='failed';job.status='running';job.due=0;progress(account);}return useResponseSuccess({...account,instance:financeInstance});}
 const input=body?.input;if(!input||!Number.isInteger(input.id)||!Number.isInteger(input.revision)||typeof input.text!=='string'||input.text.length>20000||!Number.isFinite(input.seconds)||input.seconds<1||input.seconds>20)throw createError({statusCode:400,statusMessage:'INVALID_INPUT'});
 const hash=JSON.stringify([input.id,input.revision,input.text,input.seconds,input.referenceId??null]);
 if(body.action==='quote'){
 const model=body.model??'standard',resolution=body.resolution??'720p',candidates=body.candidates??1;
 if(!['standard','premium'].includes(model)||!['720p','1080p'].includes(resolution)||!Number.isInteger(candidates)||candidates<1||candidates>3)throw createError({statusCode:400,statusMessage:'INVALID_OPTIONS'});
 const aspect=body.aspect??'9:16';const capabilityError=validateModelInput(model,input.seconds,resolution,aspect);if(capabilityError)throw createError({statusCode:422,statusMessage:capabilityError});
 const quote:Quote={aspect,id:++sequence,shotId:input.id,hash,model,resolution,candidates,cost:Math.ceil(input.seconds*(model==='premium'?5:3)*(resolution==='1080p'?1.5:1)*candidates),expires:Date.now()+60000,status:'QUOTED'};quotes.set(`${user.id}:${quote.id}`,quote);return useResponseSuccess(quote);
 }
 if(body.action!=='submit'||!body.idempotencyKey)throw createError({statusCode:400,statusMessage:'INVALID_ACTION'});
 const key=`${user.id}:${body.idempotencyKey}`;const requestHash=JSON.stringify([body.quoteId,hash,body.projectId??0,body.fail??false,body.timeout??false,body.failedCandidates??0]);const existing=submissions.get(key);
 if(existing){if(existing.hash!==requestHash)throw createError({statusCode:409,statusMessage:'IDEMPOTENCY_CONFLICT'});return useResponseSuccess(existing.receipt);}
 const quote=quotes.get(`${user.id}:${body.quoteId}`);if(!quote)throw createError({statusCode:404,statusMessage:'QUOTE_NOT_FOUND'});
 if(quote.hash!==hash)throw createError({statusCode:409,statusMessage:'INPUT_REVISION_CHANGED'});
 if(quote.expires<Date.now())throw createError({statusCode:410,statusMessage:'QUOTE_EXPIRED'});
 if(quote.status!=='QUOTED')throw createError({statusCode:409,statusMessage:'QUOTE_ALREADY_USED'});
 if(input.referenceImage&&(typeof input.referenceImage!=='string'||input.referenceImage.length>1500000||!/^data:image\/(png|jpeg|webp);base64,/.test(input.referenceImage)))throw createError({statusCode:400,statusMessage:'INVALID_REFERENCE'});
 const projectId=body.projectId??0;
 const shot=confirmedShot(user.id,projectId,input.id);if(!shot||shot.revision!==input.revision||shot.text!==input.text||shot.seconds!==input.seconds||(shot.referenceId??null)!==(input.referenceId??null))throw createError({statusCode:409,statusMessage:'STORYBOARD_REVISION_NOT_APPROVED'});
 if(!Number.isInteger(projectId)||projectId<0)throw createError({statusCode:400,statusMessage:'INVALID_PROJECT'});
 if(account.jobs.some(j=>j.projectId===projectId&&j.shotId===input.id&&['running','reconciling'].includes(j.status)))throw createError({statusCode:409,statusMessage:'JOB_ALREADY_RUNNING'});
 if(account.balance<quote.cost)throw createError({statusCode:422,statusMessage:'INSUFFICIENT_BALANCE'});
 if(body.failedCandidates!==undefined&&(!Number.isInteger(body.failedCandidates)||body.failedCandidates<0||body.failedCandidates>quote.candidates))throw createError({statusCode:400,statusMessage:'INVALID_CANDIDATE_FAILURE_COUNT'});
 const jobId=++account.sequence;transact(account,projectId,jobId,'冻结',quote.cost,'报价确认与任务创建原子提交');
 account.jobs.push({id:jobId,projectId,shotId:input.id,revision:input.revision,prompt:input.text,due:Date.now()+4000,status:'running',cost:quote.cost,fail:body.fail??false,timeout:body.timeout??false,quote,authorizedAt:new Date().toISOString(),idempotencyKey:body.idempotencyKey,submittedAt:Date.now()+1000,stage:'queued',failedCandidates:Math.max(0,Math.min(Number(body.failedCandidates)||0,quote.candidates)),candidateIds:[],referenceImage:input.referenceImage});
 quote.status='HELD';const receipt={id:`submission-${++sequence}`,quoteId:quote.id,status:'ACCEPTED'};submissions.set(key,{hash:requestHash,receipt});return useResponseSuccess(receipt);
}catch(error){const e=error as {statusCode?:number;statusMessage?:string};setResponseStatus(event,e.statusCode??500);return useResponseError(e.statusMessage??'INTERNAL_ERROR',{code:e.statusMessage??'INTERNAL_ERROR'});}
});
