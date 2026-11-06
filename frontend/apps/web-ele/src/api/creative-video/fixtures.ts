import { studioStorage } from './storage.ts';
import { projectApi } from './index.ts';
import type { Project } from './index.ts';
import type { Production } from './production.ts';
import { currentRole } from './permissions.ts';
export const seedIds=[1001,1002,1003,1004];
export const resumeShots=[
 ['招聘者面对一堆相似 PDF',8,'AI_VIDEO'],['主角不断修改简历版式',8,'AI_VIDEO'],['数不清的同质化简历',7,'MOTION_GRAPHICS'],['主角困惑，提出新想法',9,'AI_VIDEO'],['静态纸张突然变形',8,'IMAGE_ANIMATION'],['3D 空间初现',7,'AI_VIDEO'],['纸张破碎，3D 人物跳出',8,'AI_VIDEO'],['角色周围项目卡片浮现',9,'MOTION_GRAPHICS'],['工作成果变成立体场景',9,'AI_VIDEO'],['技能标签动态聚合',7,'MOTION_GRAPHICS'],['主角与数字空间互动',8,'AI_VIDEO'],['网页真实成果切入',8,'REAL_FOOTAGE'],['页面创意包装与惊艳展示',9,'IMAGE_ANIMATION'],['产品价值收束',8,'AI_VIDEO'],['Logo、网址与自然 CTA',7,'MOTION_GRAPHICS']
] as const;
export function installSeeds(replace=false){
 if(currentRole()!=='owner')throw Error('仅拥有者可管理演示种子');
 const existing=projectApi.list();const names=['3D 数字简历推广片','AI 个人知识库','CRM 销售协作','产品营销视频 Agent'];
 const descriptions=['静态 PDF → 可互动网页，展示形式差异；不承诺招聘效果','收藏很多却找不到：以检索场景展示价值，检索效果待核实','跟进遗漏与协作场景：登录后功能需演示授权','产品已经上线，但需要寻找值得传播的故事'];
 const reached=JSON.parse(studioStorage.getItem('vidcraft-reached')||'{}') as Record<number,number>;
 seedIds.forEach((id,index)=>{if(replace){studioStorage.removeItem(`production-${id}`);studioStorage.removeItem(`vidcraft-script-${id}`);studioStorage.removeItem(`vidcraft-script-dirty-${id}`);}if(existing.some(p=>p.id===id)&&!replace)return;
 const project:Project={id,name:names[index]!,productName:names[index],url:`https://example.com/demo/${id}`,stage:index===0?4:0,duration:index===0?120:30,angle:index===0?0:1,report:`演示产品定位：${descriptions[index]}\n事实来源：内置 Mock 产品说明，不代表已访问真实网站。\n推测痛点需人工核对。`,licensed:true,channels:['抖音','微信视频号'],aspect:'9:16',createdAt:'2026-11-05T00:00:00.000Z'};
 const previous=existing.findIndex(p=>p.id===id);if(previous>=0)existing[previous]=project;else existing.push(project);
 reached[id]=project.stage;
 if(index===0){const shots=resumeShots.map(([text,seconds,generationMode],i)=>({id:i+1,text,seconds,generationMode,storyBeatId:Math.min(7,Math.floor(i/2)+1),revision:i===6?2:1,versions:i===6?[{id:1,revision:1,prompt:'人物平稳走出纸面，当前正式版本'},{id:2,revision:2,prompt:'人物在爆炸中出现',rejected:true}]:[],adopted:i===6?1:undefined,narration:text,subtitle:text,motion:'叙事推进',transition:'硬切',overlap:0}));
 const production:Production={shots,jobs:[],ledger:[],balance:120,sequence:2,renders:[]};studioStorage.setItem(`production-${id}`,JSON.stringify(production));
 studioStorage.setItem(`vidcraft-script-${id}`,JSON.stringify({revision:1,strategy:'完整故事扩写',beats:['同质化困境','寻找表达突破','静态到立体转变','角色与作品展开','经历可视化','真实产品揭示','价值收束与行动号召'].map((text,i)=>({text,seconds:shots.filter(s=>s.storyBeatId===i+1).reduce((n,s)=>n+s.seconds,0)})),script:shots.map(s=>s.text).join('\n'),history:[],date:'2026-11-05T00:00:00.000Z'}));
 }
 studioStorage.setItem(`vidcraft-intake-${id}`,JSON.stringify({revision:1,needsLogin:index===2,authorized:false,redacted:false,evidence:[]}));
 });projectApi.save(existing);studioStorage.setItem('vidcraft-reached',JSON.stringify(reached));
 if(replace){const notices=JSON.parse(studioStorage.getItem('vidcraft-notifications')||'[]') as {projectId:number}[];studioStorage.setItem('vidcraft-notifications',JSON.stringify(notices.filter(n=>!seedIds.includes(n.projectId))));const wallet=studioStorage.getItem('vidcraft-account-wallet-v1');if(wallet){const parsed=JSON.parse(wallet) as {revision:number;entries:{projectId:number}[]};parsed.entries=parsed.entries.filter(e=>!seedIds.includes(e.projectId));parsed.revision++;studioStorage.setItem('vidcraft-account-wallet-v1',JSON.stringify(parsed));}for(const id of seedIds){studioStorage.removeItem(`storyboard-approved-${id}`);studioStorage.removeItem(`vidcraft-approvals-${id}`);}}
}
