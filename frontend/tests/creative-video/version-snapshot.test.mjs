import assert from 'node:assert/strict';
import {recordRevision,restoreRevision} from '../../apps/web-ele/src/api/creative-video/shots.ts';
import {isRenderOutdated} from '../../apps/web-ele/src/api/creative-video/production.ts';
import {defaultRenderSettings} from '../../apps/web-ele/src/api/creative-video/render-settings.ts';
globalThis.localStorage={getItem:()=>null};const s={id:1,text:'旧',seconds:8,revision:1,referenceId:2,overlap:1,generationMode:'AI_VIDEO',versions:[],adopted:9};recordRevision(s);s.referenceId=3;s.overlap=0;s.revision++;recordRevision(s);restoreRevision(s,1);assert.equal(s.referenceId,2);assert.equal(s.overlap,1);assert.equal(s.adopted,9);assert.equal(s.approvedRevision,undefined);
const settings=defaultRenderSettings(8);const p={shots:[],renderSettings:settings};const r={shots:'[]',settings:structuredClone(settings)};assert.equal(isRenderOutdated(p,r),false);settings.checks.story=true;assert.equal(isRenderOutdated(p,r),false);settings.resolution='1080p';assert.equal(isRenderOutdated(p,r),true);
console.log('通过：完整修订恢复、正式引用保留、输出规格变化使成片过期、审核勾选不误报过期');
