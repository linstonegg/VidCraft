import { studioStorage } from './storage.ts';
import { projectApi } from './index.ts';
import { loadProduction, persist, settle } from './production.ts';
export interface StudioNotice {id:string;projectId:number;shotId?:number;title:string;path:string;read:boolean;created:string}
const key='vidcraft-notifications';
export const notificationApi={
 list():StudioNotice[]{return JSON.parse(studioStorage.getItem(key)||'[]') as StudioNotice[];},
 scan(){const notices=this.list();for(const project of projectApi.list()){const p=loadProduction(project.id,project.duration);const before=JSON.stringify(p);settle(p);if(JSON.stringify(p)!==before)persist(project.id,p);for(const j of p.jobs){if(!['success','partial','failed','reconciling','cancelled'].includes(j.status))continue;const id=`${project.id}:job:${j.id}:${j.status}`;if(!notices.some(n=>n.id===id))notices.unshift({id,projectId:project.id,shotId:j.shotId,title:`${project.name} · 镜头 ${j.shotId} · ${j.status==='success'||j.status==='partial'?'新候选待审核':j.status==='failed'?'生成失败，费用已释放':j.status==='cancelled'?'提交前已取消，费用已释放':'费用等待核对'}`,path:`/studio/${project.id}/generate?shot=${j.shotId}`,read:false,created:new Date().toISOString()});}for(const r of p.renders){if(r.status!=='success'&&r.status!=='failed')continue;const id=`${project.id}:render:${r.id}:${r.status}`;if(!notices.some(n=>n.id===id))notices.unshift({id,projectId:project.id,title:`${project.name} · 合成${r.status==='success'?'完成':'失败'}`,path:`/studio/${project.id}/render`,read:false,created:new Date().toISOString()});}}studioStorage.setItem(key,JSON.stringify(notices));return notices;},
 read(id?:string){studioStorage.setItem(key,JSON.stringify(this.list().map(n=>!id||n.id===id?{...n,read:true}:n)));}
};
