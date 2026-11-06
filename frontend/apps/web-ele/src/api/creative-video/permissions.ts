import { studioStorage } from './storage.ts';
export type StudioRole = 'owner'|'editor'|'reviewer'|'viewer';
export type StudioAction = 'edit'|'review'|'generate'|'export';
const permissions:Record<StudioRole,StudioAction[]>={owner:['edit','review','generate','export'],editor:['edit','generate'],reviewer:['review'],viewer:[]};
let accountRole:StudioRole='owner';
export function bindStudioRole(username?:string){accountRole=username==='vben'?'owner':username==='admin'?'editor':username==='jack'?'reviewer':username?'viewer':'owner';}
export function canEmulateRole(role:StudioRole){return permissions[role].every(right=>permissions[accountRole].includes(right));}
export function currentRole():StudioRole {const role=studioStorage.getItem('vidcraft-role');return role&&Object.hasOwn(permissions,role)&&canEmulateRole(role as StudioRole)?role as StudioRole:accountRole;}
export function allowed(action:StudioAction,role=currentRole()){return permissions[role].includes(action);}
export function authorize(action:StudioAction){if(!allowed(action))throw new Error('当前演示角色无权执行此操作');}
