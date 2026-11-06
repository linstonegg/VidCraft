import assert from 'node:assert/strict';
import {reviewCandidate} from '../../apps/backend-mock/utils/creative-review.ts';
const first=reviewCandidate(undefined,1,7,101,'adopt',0,'owner');assert.equal(first.adopted,101);assert.equal(first.revision,1);assert.throws(()=>reviewCandidate(first,1,7,102,'adopt',0,'reviewer'),/CONFLICT/);const second=reviewCandidate(first,1,7,102,'reject',1,'reviewer');assert.equal(second.adopted,101);assert.ok(second.rejected.includes(102));assert.throws(()=>reviewCandidate(second,1,7,102,'adopt',2,'owner'),/REJECTED/);const third=reviewCandidate(second,1,7,101,'reject',2,'reviewer');assert.equal(third.adopted,undefined);assert.equal(third.events.length,3);assert.equal(third.events[1].actor,'reviewer');
console.log('通过：服务端采用拒绝、旧审核冲突、正式引用保留及审核事件记录');
