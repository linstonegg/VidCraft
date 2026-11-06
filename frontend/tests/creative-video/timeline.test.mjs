import assert from 'node:assert/strict';
import {timelineDuration,validateTimeline,approveStoryboard,rejectShot} from '../../apps/web-ele/src/api/creative-video/timeline.ts';
globalThis.localStorage={getItem:()=>null};
const shots=[{id:1,text:'开场',seconds:8,overlap:2,revision:1},{id:2,text:'结尾',seconds:8,revision:1}];assert.equal(timelineDuration(shots),14);validateTimeline(shots,14);assert.throws(()=>validateTimeline(shots,16),/不符/);approveStoryboard(shots,14);assert.equal(shots[0].approvedRevision,1);rejectShot(shots[0],'调整动作');assert.equal(shots[0].approvedRevision,undefined);assert.equal(shots[0].reviewComment,'调整动作');shots[0].overlap=8;assert.throws(()=>validateTimeline(shots,8),/重叠/);
console.log('通过：转场净时长、目标偏差、逐镜确认、退回意见、非法重叠');
