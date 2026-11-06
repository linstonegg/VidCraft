import {studioRoleFor} from '~/utils/creative-access';
import {defineEventHandler,readBody,setResponseStatus} from 'h3';
import {verifyAccessToken} from '~/utils/jwt-utils';
import {useResponseSuccess,useResponseError} from '~/utils/response';
import {accountFor,progress} from '~/utils/creative-finance';
import {reviewCandidate} from '~/utils/creative-review';
export default defineEventHandler(async event=>{
 const user=verifyAccessToken(event);if(!user){setResponseStatus(event,401);return useResponseError('UNAUTHORIZED');}
 if(!['owner','reviewer'].includes(studioRoleFor(event,user))){setResponseStatus(event,403);return useResponseError('FORBIDDEN');}
 const body=await readBody<{projectId:number;shotId:number;versionId:number;expectedRevision:number;action:'adopt'|'reject'}>(event);
 if(!body||![body.projectId,body.shotId,body.versionId,body.expectedRevision].every(Number.isSafeInteger)||!['adopt','reject'].includes(body.action)){setResponseStatus(event,400);return useResponseError('INVALID_REVIEW');}
 const account=accountFor(user.id);progress(account);const generated=account.jobs.some(j=>j.projectId===body.projectId&&j.shotId===body.shotId&&['success','partial'].includes(j.status)&&j.candidateIds.includes(body.versionId));const seeded=body.projectId===1001&&body.shotId===7&&body.versionId===1;
 if(!generated&&!seeded){setResponseStatus(event,404);return useResponseError('CANDIDATE_NOT_FOUND');}
 account.reviews??=[];const index=account.reviews.findIndex(r=>r.projectId===body.projectId&&r.shotId===body.shotId);
 try{const next=reviewCandidate(account.reviews[index]??(seeded?{projectId:1001,shotId:7,revision:0,adopted:1,rejected:[2],events:[]}:undefined),body.projectId,body.shotId,body.versionId,body.action,body.expectedRevision,user.username);if(index<0)account.reviews.push(next);else account.reviews[index]=next;return useResponseSuccess(next);}catch(e){setResponseStatus(event,409);return useResponseError((e as Error).message);}
});
