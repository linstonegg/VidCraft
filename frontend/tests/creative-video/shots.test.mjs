import assert from 'node:assert/strict';
import {recordRevision,restoreRevision,addShot,removeShot,splitShot,mergeShot} from '../../apps/web-ele/src/api/creative-video/shots.ts';
globalThis.localStorage={getItem:()=>null};
const s={id:1,text:'原始',seconds:8,revision:1,versions:[],adopted:12};const p={shots:[s],jobs:[],renders:[]};recordRevision(s);s.text='修改';s.revision++;recordRevision(s);restoreRevision(s,1);assert.equal(s.text,'原始');assert.equal(s.revision,3);assert.equal(s.adopted,12);
splitShot(p,0);assert.equal(p.shots.length,2);assert.equal(p.shots.reduce((n,s)=>n+s.seconds,0),8);assert.equal(p.shots[1].history[0].seconds,4);
mergeShot(p,0);assert.equal(p.shots.length,1);assert.equal(s.seconds,8);
const copy=addShot(p,0,s);p.renders.push({shots:JSON.stringify([{id:copy.id}])});assert.throws(()=>removeShot(p,copy.id),/引用/);
p.renders=[];removeShot(p,copy.id);const next=addShot(p,0);assert.ok(next.id>copy.id);
console.log('通过：历史保留和恢复、正式引用不覆盖、拆分合并时长、依赖保护、镜头ID不复用');
