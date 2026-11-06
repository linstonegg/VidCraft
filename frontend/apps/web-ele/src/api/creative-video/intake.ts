import { studioStorage } from './storage.ts';
import { invalidateFrom } from './approvals.ts';
export interface Evidence {kind?:'WEB'|'DOCUMENT'|'RECORDING'|'USER_STATEMENT';page?:number;timestamp?:string;excerpt?:string;missing?:boolean;id:number; statement:string; level:'事实'|'推测'|'待核实'; source:string}
export interface Intake {revision:number; needsLogin:boolean; authorized:boolean; redacted:boolean; evidence:Evidence[]; confirmedRevision?:number}
export const intakeApi={
 load(id:number):Intake{return JSON.parse(studioStorage.getItem(`vidcraft-intake-${id}`)||'{"revision":1,"needsLogin":false,"authorized":false,"redacted":false,"evidence":[]}') as Intake;},
 save(id:number,state:Intake){studioStorage.setItem(`vidcraft-intake-${id}`,JSON.stringify(state));},
 collect(id:number,url:string,assets:{name:string}[]){const state=this.load(id);let parsed:URL;try{parsed=new URL(url);}catch{throw new Error('请输入有效产品网址');}if(!['https:','http:'].includes(parsed.protocol))throw new Error('网址协议不受支持');if(state.needsLogin&&!state.authorized)throw new Error('请确认演示环境授权');if(!state.redacted)throw new Error('请确认资料已脱敏');state.revision++;invalidateFrom(id,1);state.evidence=[{id:1,statement:'用户提交了产品网址；网页内容尚未真实采集',level:'事实',source:url},...assets.map((a,i)=>({id:i+2,statement:`已记录素材 ${a.name}，尚未解析内容`,level:'事实' as const,source:a.name})),{id:assets.length+2,statement:'目标用户可能需要更直观的产品价值表达',level:'推测',source:'Mock 用户洞察，需用户核实'}];this.save(id,state);return state;}
};

export function validateEvidence(e:Evidence){if(!e.statement.trim()||!e.source.trim())throw Error('证据内容与来源不能为空');if(e.page!==undefined&&(!Number.isInteger(e.page)||e.page<1))throw Error('文档页码应为正整数');if(e.timestamp&&!/^\d{2,}:\d{2}(?::\d{2})?$/.test(e.timestamp))throw Error('录屏时间请使用 mm:ss 或 hh:mm:ss');if(e.timestamp){const parts=e.timestamp.split(':').map(Number);if(parts.at(-1)!>59||(parts.length===3&&parts[1]!>59))throw Error('时间戳分秒必须小于60');}if(e.excerpt&&e.excerpt.length>5000)throw Error('来源摘录最多5000字');}
