import { authorize } from './permissions.ts';
import type { Shot } from './production.ts';
export interface ReferenceImage {id:number;name:string;dataUrl:string;created:string}
export async function attachReference(shot:Shot,file:File){authorize('edit');if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('仅支持 PNG、JPEG、WebP 图片');if(file.size>1024*1024)throw Error('本地演示参考图最大 1 MB');const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('图片读取失败'));reader.readAsDataURL(file);});shot.references??=[];const reference={id:Math.max(0,...shot.references.map(r=>r.id))+1,name:file.name,dataUrl,created:new Date().toISOString()};shot.references.push(reference);shot.referenceId=reference.id;return reference;}
export function selectedReference(shot:Shot){return shot.references?.find(r=>r.id===shot.referenceId);}
