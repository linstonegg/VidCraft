import assert from 'node:assert/strict';
import {creativeConcepts,regenerateCreative,favoriteCreative,saveCreative} from '../../apps/web-ele/src/api/creative-video/creative.ts';
const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
const before=creativeConcepts(1);favoriteCreative(1,0);saveCreative(1,0,'保留角色',true);assert.equal(JSON.parse(data.get('vidcraft-creative-1')).concept.title,before[0].title);assert.equal(regenerateCreative(1),2);const after=creativeConcepts(1);assert.notEqual(after[0].scene,before[0].scene);assert.notEqual(after[0].conflict,before[0].conflict);assert.equal(JSON.parse(data.get('vidcraft-creative-1')).locked,false);assert.equal(JSON.parse(data.get('vidcraft-creative-favorites-1'))[0].title,before[0].title);assert.equal(JSON.parse(data.get('vidcraft-creative-history-1')).length,1);
console.log('通过：创意叙事变化、旧批次历史、收藏快照、锁定失效及后续方案快照引用');
