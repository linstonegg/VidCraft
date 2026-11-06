import type {Production} from './production.ts';
import {recordRevision} from './shots.ts';
import {authorize} from './permissions.ts';
export type RevisionField='text'|'motion'|'narration'|'subtitle';
export interface RevisionChange {shotId:number;revision:number;field:RevisionField;before:string;after:string}
export interface RevisionPlan {intent:'SCRIPT_TEXT'|'MOTION_ACTION'|'NARRATION_AUDIO'|'GLOBAL_CHARACTER';scope:'SINGLE_SHOT'|'GLOBAL';feedback:string;rationale:string;changes:RevisionChange[];preservedFields:string[];requiresNewVideo:boolean;requiresRequote:boolean;uncertainties:string[];status:'PROPOSED'|'APPLIED'|'REJECTED'}
export function proposeRevision(p:Production,shotId:number,feedback:string):RevisionPlan {
 if(!feedback.trim())throw Error('请描述修改要求');const shot=p.shots.find(s=>s.id===shotId);if(!shot)throw Error('镜头不存在');
 const global=/全片|所有镜头|全局/.test(feedback);const audio=/旁白|配音|字幕/.test(feedback);const motion=/运镜|镜头推进|摇镜|推拉|镜头运动/.test(feedback);const field:RevisionField=audio?(/字幕/.test(feedback)?'subtitle':'narration'):motion?'motion':'text';
 const targets=global?p.shots:[shot];return {intent:audio?'NARRATION_AUDIO':motion?'MOTION_ACTION':global?'GLOBAL_CHARACTER':'SCRIPT_TEXT',scope:global?'GLOBAL':'SINGLE_SHOT',feedback,rationale:audio?'反馈涉及音频或字幕，仅更新对应文本轨；不强制重新生成画面。':motion?'反馈涉及镜头运动，重新生成画面前需要审核并重新报价。':'反馈涉及剧情或全片视觉表现，先审阅修改再生成。',changes:targets.map(s=>({shotId:s.id,revision:s.revision,field,before:s[field]??'',after:feedback.replace(/^(旁白|字幕|配音|运镜)[：:]\s*/, '')})),preservedFields:['镜头时长','正式视频引用','历史候选','积分流水',...(audio?['剧情画面','运镜','参考图']:['旁白','字幕','参考图'])],requiresNewVideo:!audio,requiresRequote:!audio,uncertainties:['此计划为规则模拟，不代表模型理解；请逐条核对修改后的字段。',...(global?['全局修改涉及全部镜头，请核对角色与场景连续性。']:[])],status:'PROPOSED'};
}
export function applyRevision(p:Production,plan:RevisionPlan){authorize('edit');if(plan.status!=='PROPOSED')throw Error('修改计划已处理');for(const c of plan.changes){const s=p.shots.find(s=>s.id===c.shotId);if(!s||s.revision!==c.revision||(s[c.field]??'')!==c.before)throw Error('版本冲突：镜头已变化，请重新提出修改计划');}
 for(const c of plan.changes){const s=p.shots.find(s=>s.id===c.shotId)!;recordRevision(s);s[c.field]=c.after;s.revision++;s.approvedRevision=undefined;if(!plan.requiresNewVideo)s.audioDirty=true;recordRevision(s);}p.revisionPlans??=[];plan.status='APPLIED';p.revisionPlans.push(JSON.parse(JSON.stringify(plan)) as RevisionPlan);
}

