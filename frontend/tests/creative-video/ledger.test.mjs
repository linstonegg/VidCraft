import assert from 'node:assert/strict';
import {recordLedger} from '../../apps/web-ele/src/api/creative-video/ledger.ts';
const p={balance:120,ledger:[]};recordLedger(p,1,'冻结',24,'确认');assert.equal(p.balance,96);recordLedger(p,1,'冻结',24,'重复');assert.equal(p.balance,96);recordLedger(p,1,'结算',24,'交付');assert.equal(p.balance,96);assert.equal(p.ledger.length,2);assert.equal(p.ledger[0].balanceBefore,120);assert.equal(p.ledger[0].balanceAfter,96);assert.ok(p.ledger[0].transactionId);assert.ok(p.ledger[0].created);
recordLedger(p,2,'冻结',24,'任务2');recordLedger(p,2,'释放',24,'失败');assert.equal(p.balance,96);assert.throws(()=>recordLedger(p,3,'冻结',200,'余额不足'),/不足/);assert.equal(p.ledger.length,4);
console.log('通过：唯一交易ID、幂等入账、余额前后值、失败释放、余额不足无流水');
