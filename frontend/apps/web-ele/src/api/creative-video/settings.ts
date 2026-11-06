import { studioStorage } from './storage.ts';
import { authorize } from './permissions.ts';
import { invalidateFrom } from './approvals.ts';
export interface BrandSettings {name:string;color:string;characters:string;scenes:string;visualStyle:string;voice:string;forbidden:string;aspect:string;fps:number;safeArea:number;revision:number}
export const brandApi={
 load():BrandSettings{return JSON.parse(studioStorage.getItem('vidcraft-brand')||'{"name":"VidCraft","color":"#6471d5","characters":"主角服饰、发型保持一致","scenes":"自然柔光，场景连续","visualStyle":"3D 创意动画","voice":"简体中文，自然有节奏","forbidden":"禁止虚构效果数据、客户评价；产品 Logo 和页面文字须准确","aspect":"9:16","fps":25,"safeArea":10,"revision":1}') as BrandSettings;},
 save(value:BrandSettings){authorize('edit');if(!value.name.trim())throw new Error('品牌名不能为空');if(value.fps<24||value.fps>60||value.safeArea<0||value.safeArea>30)throw new Error('请检查帧率和字幕安全区');const previous=this.load();value.revision=previous.revision+1;studioStorage.setItem('vidcraft-brand',JSON.stringify(value));const projects=JSON.parse(studioStorage.getItem('vidcraft-projects-v1')||'[]') as {id:number}[];projects.forEach(p=>invalidateFrom(p.id,4));return projects.length;}
};
export function modelDefaults(){const raw=JSON.parse(studioStorage.getItem('vidcraft-models')||'{}') as {video?:string;resolution?:string};return {model:raw.video==='premium'?'premium' as const:'standard' as const,resolution:raw.resolution==='1080p'?'1080p' as const:'720p' as const};}
