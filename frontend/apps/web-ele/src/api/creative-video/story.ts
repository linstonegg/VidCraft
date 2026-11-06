export interface StoryBeat {text:string;seconds:number}
export function planBeats(angle:number,duration:number,multi=false):StoryBeat[]{
 const stories=[['一页纸容不下完整的你','人物触碰纸张边缘，寻找出口','纸张碎裂，立体世界展开','项目与经历构成立体空间','展示真实产品的交互界面','探索属于你的故事'],['反复修改简历，却难以表达独特经历','主角望着相似的页面感到困惑','发现另一种表达方式','作品和经历以可探索形式展开','产品交互演示，展示表达方式','让经历被看见，开始探索'],['镜头进入一座由经历构成的城市','作品成为建筑，技能形成道路','主角带领观众穿越个人世界','从宏观场景切换到真实交互界面','说明展示形式，避免效果承诺','你的经历，值得被探索']];
 const beats=stories[angle]||stories[0]!;const count=Math.max(beats.length,Math.ceil(duration/10));return Array.from({length:count},(_,i)=>({text:`${multi?`第 ${Math.floor(i/4)+1} 章 · `:''}${beats[Math.min(beats.length-1,Math.floor(i*beats.length/count))]}${count>6?` · 情节 ${i+1}`:''}`,seconds:Math.floor(duration/count)+(i<duration%count?1:0)}));
}

export function splitBeatsToShots(beats:StoryBeat[]){return beats.flatMap((b,index)=>{const count=Math.ceil(b.seconds/20);return Array.from({length:count},(_,i)=>({text:b.text,storyBeatId:index+1,seconds:Math.floor(b.seconds/count)+(i<b.seconds%count?1:0)}));});}
