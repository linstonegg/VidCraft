import assert from 'node:assert/strict';
import {projectDifferences,projectFingerprint} from '../../apps/web-ele/src/api/creative-video/project-diff.ts';
const a={id:1,name:'本地',duration:30,serverRevision:1,serverInstance:'old'};const b={...a,name:'远端',serverRevision:2,serverInstance:'new'};assert.deepEqual(projectDifferences(a,b).map(d=>d.field),['name']);assert.equal(projectFingerprint(a),projectFingerprint({...a,serverRevision:99,serverInstance:'x'}));assert.notEqual(projectFingerprint(a),projectFingerprint({...a,duration:120}));console.log('通过：字段差异识别、同步元数据忽略、业务变更指纹');
