import assert from 'node:assert/strict';
import {accountFor,transact,progress} from '../../apps/backend-mock/utils/creative-finance.ts';
const a=accountFor(700);transact(a,1,1,'冻结',24,'确认');assert.equal(a.balance,96);transact(a,1,1,'冻结',24,'重复');assert.equal(a.balance,96);
a.jobs.push({id:1,projectId:1,shotId:7,revision:1,prompt:'剧情',due:0,status:'running',cost:24,fail:false,timeout:false,quote:{candidates:2},authorizedAt:'now',idempotencyKey:'x',candidateIds:[]});progress(a);progress(a);assert.equal(a.entries.filter(e=>e.kind==='结算').length,1);assert.equal(a.jobs[0].candidateIds.length,2);assert.equal(a.balance,96);assert.equal(accountFor(701).balance,120);
transact(a,2,2,'冻结',24,'确认');a.jobs.push({...a.jobs[0],id:2,projectId:2,status:'running',timeout:true,candidateIds:[]});progress(a);assert.equal(a.jobs[1].status,'reconciling');assert.equal(a.balance,72);assert.throws(()=>transact(a,3,3,'冻结',100,'不足'),/INSUFFICIENT/);
console.log('通过：服务端共享钱包、幂等冻结结算、候选唯一、账号隔离、未知结果保留冻结');
