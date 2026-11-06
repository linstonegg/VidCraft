export interface Resource {revision:number;payload:Record<string,unknown>;confirmed:boolean;actor:string;date:string}
export const resources=new Map<string,Resource[]>();
export function confirmedShot(userId:number,projectId:number,shotId:number){const record=resources.get(`${userId}:${projectId}:storyboard`)?.at(-1);if(!record?.confirmed)return undefined;return (record.payload.shots as {id:number;revision:number;approvedRevision?:number;text:string;seconds:number;referenceId?:number}[]).find(s=>s.id===shotId&&s.approvedRevision===s.revision);}
