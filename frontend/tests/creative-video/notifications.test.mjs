import assert from 'node:assert/strict';
import { notificationApi } from '../../apps/web-ele/src/api/creative-video/notifications.ts';
import { assetApi } from '../../apps/web-ele/src/api/creative-video/assets.ts';
const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
data.set('vidcraft-projects-v1',JSON.stringify([{id:1,name:'演示',duration:30}]));
data.set('production-1',JSON.stringify({shots:[],jobs:[{id:1,shotId:7,status:'success'}],renders:[{id:2,status:'success'}],ledger:[],balance:120,sequence:2}));
assert.equal(notificationApi.scan().length,2);assert.equal(notificationApi.scan().length,2);notificationApi.read();assert.ok(notificationApi.list().every(n=>n.read));assert.ok(notificationApi.list().some(n=>n.path.includes('shot=7')));
data.set('vidcraft-assets',JSON.stringify([{id:1,projectId:1,name:'资料.pdf'},{id:2,name:'未引用.png'}]));assert.throws(()=>assetApi.remove(1),/引用/);assetApi.remove(2);assert.equal(assetApi.list().length,1);
console.log('通过：通知去重、已读持久化、镜头定位、已引用素材删除保护');
