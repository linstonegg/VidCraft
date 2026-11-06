import type {H3Event} from 'h3';
import {getHeader} from 'h3';
export type CreativeRole='owner'|'editor'|'reviewer'|'viewer';
const rights:Record<CreativeRole,string[]>={owner:['edit','review','generate','export'],editor:['edit','generate'],reviewer:['review'],viewer:[]};
export function accountRole(username:string):CreativeRole{return username==='vben'?'owner':username==='admin'?'editor':username==='jack'?'reviewer':'viewer';}
export function effectiveRole(username:string,requested?:string):CreativeRole{const base=accountRole(username);if(requested&&Object.hasOwn(rights,requested)&&rights[requested as CreativeRole].every(right=>rights[base].includes(right)))return requested as CreativeRole;return base;}
export function studioRoleFor(event:H3Event,user:{username:string}){return effectiveRole(user.username,getHeader(event,'x-mock-role'));}
