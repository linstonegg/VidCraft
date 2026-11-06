import { authorize } from './permissions.ts';
export interface QuoteInput {id:number;revision:number;text:string;seconds:number;referenceId?:number;referenceImage?:string}
export interface GenerationQuote {aspect?:string;id:number;shotId:number;hash:string;model:'standard'|'premium';resolution:'720p'|'1080p';candidates:number;cost:number;expires:number;status:'QUOTED'|'HELD'|'EXPIRED';}
export function inputHash(s:QuoteInput){return JSON.stringify([s.id,s.revision,s.text,s.seconds,s.referenceId??null]);}
export function createQuote(s:QuoteInput,model:GenerationQuote['model']='standard',resolution:GenerationQuote['resolution']='720p',candidates=1):GenerationQuote{
 authorize('generate');if(!Number.isFinite(s.seconds)||s.seconds<=0||s.seconds>20)throw new Error('模型支持 1 至 20 秒');if(!Number.isInteger(candidates)||candidates<1||candidates>3)throw new Error('候选数应为 1 至 3');
 return {id:Date.now(),shotId:s.id,hash:inputHash(s),model,resolution,candidates,cost:Math.ceil(s.seconds*(model==='premium'?5:3)*(resolution==='1080p'?1.5:1)*candidates),expires:Date.now()+60000,status:'QUOTED'};
}
export function validateQuote(q:GenerationQuote,s:QuoteInput,now=Date.now()){
 if(q.status!=='QUOTED')throw new Error('报价已使用或失效');if(now>q.expires){q.status='EXPIRED';throw new Error('报价过期，请重新报价');}if(q.hash!==inputHash(s))throw new Error('INPUT_REVISION_CHANGED：分镜已修改，请重新报价');
}
