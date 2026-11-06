import assert from 'node:assert/strict';
import {brandApi,modelDefaults} from '../../apps/web-ele/src/api/creative-video/settings.ts';
import {isRenderOutdated} from '../../apps/web-ele/src/api/creative-video/production.ts';
const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
data.set('vidcraft-projects-v1',JSON.stringify([{id:1}]));const b=brandApi.load();b.name='我的品牌';assert.equal(brandApi.save(b),1);assert.equal(brandApi.load().revision,2);
data.set('vidcraft-models',JSON.stringify({video:'premium',resolution:'1080p'}));assert.deepEqual(modelDefaults(),{model:'premium',resolution:'1080p'});
const p={shots:[{id:1,adopted:2,seconds:5}]};const r={shots:JSON.stringify([{id:1,version:2,seconds:5}])};assert.equal(isRenderOutdated(p,r),false);p.shots[0].adopted=3;assert.equal(isRenderOutdated(p,r),true);
console.log('通过：品牌修订、全局影响、模型默认值、成片过期识别');
