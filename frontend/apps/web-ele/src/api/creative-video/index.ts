import { studioStorage } from './storage.ts';
import { authorize } from './permissions.ts';
export interface Project {serverRevision?:number;serverInstance?:string; productName?:string; description?:string; audience?:string; market?:string; channels?:string[]; aspect?:string; styles?:string[]; licensed?:boolean; archived?:boolean; deleted?:boolean; updatedAt?:string; createdAt?:string; id: number; name: string; url: string; stage: number; duration: number; angle: number; report: string }
const key = 'vidcraft-projects-v1';
function nextProjectId(){const id=Math.max(Date.now(),Number(studioStorage.getItem('vidcraft-project-sequence')||0)+1);studioStorage.setItem('vidcraft-project-sequence',String(id));return id;}
export const stages = ['产品资料', '产品理解', '创意方向', '剧本规划', '图文分镜', '动态预演', '镜头视频', '最终合成'];
export const projectApi = {
  list(): Project[] { return JSON.parse(studioStorage.getItem(key) || '[]') as Project[]; },
  save(projects: Project[]) { studioStorage.setItem(key, JSON.stringify(projects)); },
  create(name: string): Project { authorize('edit');if(!name.trim()||name.trim().length>100)throw new Error('项目名应为 1 至 100 字');return {createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(), id: nextProjectId(), name:name.trim(), url: '', stage: 0, duration: 30, angle: 0, report: '待核实的产品理解草稿：请补充产品定位、核心功能、目标用户与差异。\n当前没有真实网页解析结果。所有功能主张须由你提供的资料证实。\nMock 创意以 3D 简历演示为样例，其他产品需要自行调整。' }; },
  rename(project:Project,name:string){authorize('edit');if(!name.trim()||name.trim().length>100)throw new Error('项目名应为 1 至 100 字');project.name=name.trim();project.updatedAt=new Date().toISOString();},
  archive(project:Project){authorize('edit');project.archived=!project.archived;},
  softDelete(project:Project){authorize('edit');project.deleted=true;},
  restore(project:Project){authorize('edit');project.deleted=false;},
  duplicate(project:Project):Project{authorize('edit');const copy={...project,serverRevision:undefined,serverInstance:undefined,id:nextProjectId(),name:project.name.slice(0,96)+' 副本',stage:0,deleted:false,archived:false,createdAt:new Date().toISOString()};const intake=studioStorage.getItem(`vidcraft-intake-${project.id}`);if(intake)studioStorage.setItem(`vidcraft-intake-${copy.id}`,intake);return copy;},
};
