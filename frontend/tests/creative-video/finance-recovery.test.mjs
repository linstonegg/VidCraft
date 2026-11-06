import assert from 'node:assert/strict';
import {applyFinance} from '../../apps/web-ele/src/api/creative-video/finance-projection.ts';
const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
const p={renders:[{id:10,serverManaged:true,status:'success',shots:'[]'}],financeInstance:'old',shots:[{id:1,versions:[{id:9}],adopted:9}],jobs:[{id:8,serverManaged:true,status:'running'}],ledger:[{jobId:8,transactionId:'server:8:冻结',kind:'冻结',amount:24}],balance:96,sequence:9};
const state={instance:'new',revision:1,balance:120,jobs:[],entries:[]};assert.equal(applyFinance(1,p,state),true);assert.equal(p.financeArchives.length,1);assert.equal(p.financeArchives[0].ledger[0].amount,24);assert.equal(p.financeArchives[0].jobs[0].id,8);assert.equal(p.jobs.length,0);assert.equal(p.renders[0].archivedInstance,'old');assert.equal(p.renders[0].status,'success');assert.equal(p.balance,120);assert.equal(p.shots[0].adopted,9);assert.equal(applyFinance(1,p,state),false);assert.equal(p.financeArchives.length,1);
console.log('通过：服务重启归档、旧流水只读保留、候选不丢失、新余额覆盖及重复同步幂等');
