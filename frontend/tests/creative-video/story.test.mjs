import assert from 'node:assert/strict';
import { planBeats } from '../../apps/web-ele/src/api/creative-video/story.ts';
for(const duration of [30,60,120]){const beats=planBeats(0,duration);assert.equal(beats.reduce((n,b)=>n+b.seconds,0),duration);assert.ok(beats.every(b=>b.seconds<=10&&b.seconds>0));}
assert.notDeepEqual(planBeats(0,30),planBeats(1,30));
assert.ok(planBeats(2,120,true).every(b=>b.text.includes('章')));
console.log('通过：创意差异、30/60/120秒总时长、短镜头分解、多章节');
