import assert from 'node:assert/strict';
import {projectApi} from '../../apps/web-ele/src/api/creative-video/index.ts';
const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
assert.throws(()=>projectApi.create(''),/项目名/);assert.throws(()=>projectApi.create('x'.repeat(101)),/项目名/);
const p=projectApi.create('演示');projectApi.rename(p,'新名称');assert.equal(p.name,'新名称');
projectApi.archive(p);assert.equal(p.archived,true);projectApi.archive(p);assert.equal(p.archived,false);
data.set(`production-${p.id}`,'历史任务与账务');projectApi.softDelete(p);assert.equal(p.deleted,true);assert.equal(data.get(`production-${p.id}`),'历史任务与账务');projectApi.restore(p);assert.equal(p.deleted,false);
const copy=projectApi.duplicate(p);assert.notEqual(copy.id,p.id);assert.equal(copy.stage,0);assert.equal(copy.name,'新名称 副本');
console.log('通过：项目名校验、重命名、归档恢复、软删除账务保留、复制');
