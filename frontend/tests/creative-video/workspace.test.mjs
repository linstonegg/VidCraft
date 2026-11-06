import assert from 'node:assert/strict';
import {bindStudioAccount,studioStorage,exportStudioWorkspace,importStudioWorkspace} from '../../apps/web-ele/src/api/creative-video/storage.ts';
const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),get length(){return data.size},key:i=>[...data.keys()][i]};
bindStudioAccount('vben');studioStorage.setItem('vidcraft-projects-v1','[{"id":1}]');studioStorage.setItem('vidcraft-account-wallet-v1','{"revision":1,"entries":[]}');studioStorage.setItem('vidcraft-role','owner');data.set('auth-token','do-not-export');const snapshot=exportStudioWorkspace();assert.equal(Object.keys(snapshot).length,2);assert.equal(snapshot['auth-token'],undefined);assert.equal(snapshot['vidcraft-role'],undefined);
bindStudioAccount('admin');assert.deepEqual(exportStudioWorkspace(),{});importStudioWorkspace(snapshot);assert.equal(studioStorage.getItem('vidcraft-projects-v1'),'[{"id":1}]');assert.equal(data.get('auth-token'),'do-not-export');assert.throws(()=>importStudioWorkspace({'auth-token':'bad'}),/不支持/);
console.log('通过：工作区导出账号隔离、排除登录与角色数据、恢复白名单和非业务数据保留');
