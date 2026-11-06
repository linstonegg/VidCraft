import {authorize} from './permissions.ts';
import {studioStorage} from './storage.ts';
import {invalidateFrom} from './approvals.ts';
export type ResourceKind='intake'|'understanding'|'creative'|'script'|'storyboard';
export function restoreResourceDraft(projectId:number,kind:ResourceKind,payload:Record<string,unknown>,serverRevision:number){authorize('edit');
 const key=kind==='storyboard'?`production-${projectId}`:`vidcraft-${kind}-${projectId}`;const previous=studioStorage.getItem(key);if(previous)studioStorage.setItem(`vidcraft-recovery-backup-${projectId}-${kind}`,previous);
 const clone=JSON.parse(JSON.stringify(payload)) as Record<string,unknown>;
 if(kind==='storyboard'){const production=JSON.parse(previous||'{"shots":[],"jobs":[],"ledger":[],"balance":120,"sequence":0,"renders":[]}') as Record<string,unknown>;const oldShots=production.shots as {id:number;versions?:unknown[];adopted?:number;references?:unknown[]}[];const shots=clone.shots as Record<string,unknown>[];if(!Array.isArray(shots))throw Error('远端分镜格式错误');production.archivedShots=[...(production.archivedShots as unknown[]??[]),...oldShots.filter(old=>!shots.some(s=>s.id===old.id))];production.shots=shots.map(s=>{const old=oldShots.find(o=>o.id===s.id);return {...s,approvedRevision:undefined,versions:old?.versions??[],adopted:old?.adopted,references:old?.references??[]};});studioStorage.setItem(key,JSON.stringify(production));}
 else{if(kind==='understanding')clone.confirmed=false;if(kind==='creative')clone.locked=false;if(kind==='intake')delete clone.confirmedRevision;studioStorage.setItem(key,JSON.stringify(clone));}
 studioStorage.setItem(`vidcraft-resource-revision-${projectId}-${kind}`,String(serverRevision));const stage={intake:0,understanding:1,creative:2,script:3,storyboard:4}[kind];invalidateFrom(projectId,stage);studioStorage.setItem(`vidcraft-${kind}-dirty-${projectId}`,'true');
}
