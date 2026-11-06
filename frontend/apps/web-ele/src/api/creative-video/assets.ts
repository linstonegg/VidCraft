import { studioStorage } from './storage.ts';
import { authorize } from './permissions.ts';
export interface Asset { id:number; name:string; size:number; type:string; created:string; projectId?:number }
const key='vidcraft-assets';
export const assetApi={
 list():Asset[]{return JSON.parse(studioStorage.getItem(key)||'[]') as Asset[];},
 add(files:File[],projectId?:number){const assets=this.list();for(const f of files){if(f.size>100*1024*1024)throw new Error('单个素材不能超过 100 MB');if(!/\.(pdf|docx?|png|jpe?g|webp|mp4|mov)$/i.test(f.name))throw new Error('不支持此文件类型');}files.forEach((f,i)=>assets.push({id:Date.now()+i,projectId,name:f.name,size:f.size,type:f.type,created:new Date().toISOString()}));studioStorage.setItem(key,JSON.stringify(assets));},
 remove(id:number){authorize('edit');const asset=this.list().find(a=>a.id===id);if(asset?.projectId)throw new Error('该素材已被项目资料引用，请先在项目中解除引用；删除不会抹除历史证据');studioStorage.setItem(key,JSON.stringify(this.list().filter(a=>a.id!==id)));}
};
