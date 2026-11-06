import {studioRoleFor} from '~/utils/creative-access';
import {defineEventHandler,readBody,setResponseStatus} from 'h3';
import {verifyAccessToken} from '~/utils/jwt-utils';
import {useResponseSuccess,useResponseError} from '~/utils/response';
import {accountFor,progress} from '~/utils/creative-finance';
import {createServerRender} from '~/utils/creative-render';
export default defineEventHandler(async event=>{const user=verifyAccessToken(event);if(!user){setResponseStatus(event,401);return useResponseError('UNAUTHORIZED');}const body=await readBody<{projectId:number;shots:Parameters<typeof createServerRender>[2];settings:Record<string,unknown>;idempotencyKey:string}>(event);if(!['owner'].includes(studioRoleFor(event,user))){setResponseStatus(event,403);return useResponseError('FORBIDDEN');}if(!body||!Number.isSafeInteger(body.projectId)||!Array.isArray(body.shots)||!body.settings||typeof body.idempotencyKey!=='string'||!body.idempotencyKey){setResponseStatus(event,400);return useResponseError('INVALID_REQUEST');}const account=accountFor(user.id);progress(account);try{return useResponseSuccess(createServerRender(account,body.projectId,body.shots,body.settings,body.idempotencyKey));}catch(e){setResponseStatus(event,409);return useResponseError((e as Error).message);}});
