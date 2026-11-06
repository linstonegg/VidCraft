import {requestClient} from '#/api/request';
import {currentRole} from './permissions';
import {studioStorage} from './storage';
export interface ResourceRecord {revision:number;payload:Record<string,unknown>;confirmed:boolean;actor:string;date:string}
export const resourceApi={
 read(projectId:number,kind:'understanding'|'script'|'creative'|'storyboard'|'intake'){return requestClient.post<{current:ResourceRecord|null;history:ResourceRecord[]}>('/creative-video/resources',{action:'read',projectId,kind});},
 async save(projectId:number,kind:'understanding'|'script'|'creative'|'storyboard'|'intake',payload:object,confirm=false){if(kind==='understanding')payload={...payload,intakeServerRevision:Number(studioStorage.getItem(`vidcraft-resource-revision-${projectId}-intake`)||0)};const key=`vidcraft-resource-revision-${projectId}-${kind}`;const revision=Number(studioStorage.getItem(key)||0);const result=await requestClient.post<ResourceRecord>('/creative-video/resources',{action:'save',projectId,kind,payload,confirm,expectedRevision:revision},{headers:{'x-mock-role':currentRole()}});studioStorage.setItem(key,String(result.revision));return result;}
};
