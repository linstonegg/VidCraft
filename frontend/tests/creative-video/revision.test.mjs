import assert from 'node:assert/strict';
import {proposeRevision,applyRevision} from '../../apps/web-ele/src/api/creative-video/revision.ts';
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null};
const p={shots:[{id:1,text:'原剧情',narration:'旧旁白',seconds:8,revision:1,versions:[],adopted:9},{id:3,text:'其他镜头',seconds:8,revision:1,versions:[]}],ledger:[],balance:120};
const text=proposeRevision(p,1,'纸张先破碎再出现人物');assert.equal(text.scope,'SINGLE_SHOT');assert.equal(text.changes[0].before,'原剧情');applyRevision(p,text);assert.equal(p.shots[0].adopted,9);assert.equal(p.shots[1].revision,1);assert.equal(p.balance,120);assert.equal(p.ledger.length,0);assert.throws(()=>applyRevision(p,text),/已处理/);
const audio=proposeRevision(p,1,'旁白：换一种表达方式');assert.equal(audio.requiresNewVideo,false);applyRevision(p,audio);assert.equal(p.shots[0].narration,'换一种表达方式');assert.equal(p.shots[0].audioDirty,true);
const global=proposeRevision(p,1,'全片统一角色服装');assert.equal(global.changes.length,2);p.shots[1].revision++;assert.throws(()=>applyRevision(p,global),/版本冲突/);assert.equal(global.status,'PROPOSED');
console.log('通过：局部差异、正式引用保留、无扣费、仅旁白更新、全局影响、原子冲突拒绝和重复应用保护');
