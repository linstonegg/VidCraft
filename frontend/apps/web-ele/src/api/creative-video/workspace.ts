import {requestClient} from '#/api/request';
import {currentRole} from './permissions';
export interface WorkspaceSnapshot {revision:number;updated:string;data:Record<string,string>;instance:string;persistence:'server-memory'}
export const workspaceApi={read(){return requestClient.post<WorkspaceSnapshot>('/creative-video/workspace',{action:'read'});},write(data:Record<string,string>,expectedRevision:number){return requestClient.post<WorkspaceSnapshot>('/creative-video/workspace',{action:'write',data,expectedRevision},{headers:{'x-mock-role':currentRole()}});}};
