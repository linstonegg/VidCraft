import assert from 'node:assert/strict';
import {loadUnderstanding,saveUnderstanding} from '../../apps/web-ele/src/api/creative-video/understanding.ts';
import {creativeConcepts,angleLibrary,saveCreative} from '../../apps/web-ele/src/api/creative-video/creative.ts';
const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
const d=loadUnderstanding(1);assert.equal(d.insights.length,5);assert.ok(d.insights.every(i=>i.level==='hypothesis'));d.positioning='测试产品';saveUnderstanding(1,d,true);assert.equal(loadUnderstanding(1).confirmed,true);d.positioning='新定位';saveUnderstanding(1,d);assert.equal(JSON.parse(data.get('vidcraft-understanding-history-1'))[0].positioning,'测试产品');assert.equal(angleLibrary.length,10);const c=creativeConcepts(1);assert.equal(c.length,3);assert.notEqual(c[0].scene,c[1].scene);assert.ok(c[0].reason.includes('新定位'));saveCreative(1,1,'禁止夸大',true);assert.equal(JSON.parse(data.get('vidcraft-creative-1')).understandingRevision,2);
console.log('通过：五痛点候选、证据推测标记、理解确认历史、十类切口、差异创意和理解引用');
