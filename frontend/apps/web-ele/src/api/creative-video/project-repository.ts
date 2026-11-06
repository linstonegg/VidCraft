import {requestClient} from '#/api/request';
import {currentRole} from './permissions';
import type {Project} from './index';
interface RemoteProject {revision:number;data:Project;updated:string;instance?:string}
export const remoteProjects={
 list(){return requestClient.post<{instance:string;items:RemoteProject[]}>('/creative-video/projects',{action:'list'});},
 save(project:Project){return requestClient.post<RemoteProject>('/creative-video/projects',{action:'save',project,expectedRevision:project.serverRevision??0},{headers:{'x-mock-role':currentRole()}});}
};
