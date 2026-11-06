import {studioRoleFor} from '~/utils/creative-access';
import {defineEventHandler,readBody,setResponseStatus} from 'h3';
import {verifyAccessToken} from '~/utils/jwt-utils';
import {useResponseSuccess,useResponseError} from '~/utils/response';
interface Workspace {revision:number;updated:string;data:Record<string,string>}
const instance=`mock-${Date.now()}`;const workspaces=new Map<number,Workspace>();
const allowed=(key:string)=>/^(vidcraft-(resource-revision-|projects-v1|project-sequence|reached|assets|intake-|understanding-|creative-|script-|approvals-|account-wallet-v1|brand|models|notifications)|production-|storyboard-approved-)/.test(key);
export default defineEventHandler(async event=>{
 const user=verifyAccessToken(event);if(!user){setResponseStatus(event,401);return useResponseError('UNAUTHORIZED');}
 const body=await readBody<{action:string;expectedRevision?:number;data?:Record<string,string>}>(event);const current=workspaces.get(user.id)??{revision:0,updated:'',data:{}};
 if(body?.action==='read')return useResponseSuccess({...current,instance,persistence:'server-memory'});
 if(body?.action!=='write'){setResponseStatus(event,400);return useResponseError('INVALID_ACTION');}
 if(!['owner','editor'].includes(studioRoleFor(event,user))){setResponseStatus(event,403);return useResponseError('FORBIDDEN');}
 if(body.expectedRevision!==current.revision){setResponseStatus(event,409);return useResponseError('VERSION_CONFLICT',{revision:current.revision});}
 if(!body.data||typeof body.data!=='object'||Array.isArray(body.data)||Object.entries(body.data).some(([key,value])=>!allowed(key)||typeof value!=='string')||JSON.stringify(body.data).length>8*1024*1024){setResponseStatus(event,400);return useResponseError('INVALID_WORKSPACE');}
 const next={revision:current.revision+1,updated:new Date().toISOString(),data:body.data};workspaces.set(user.id,next);return useResponseSuccess({...next,instance,persistence:'server-memory'});
});
