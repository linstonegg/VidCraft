import assert from 'node:assert/strict';
import {createQuote,validateQuote} from '../../apps/web-ele/src/api/creative-video/billing.ts';
import {generate,settle,startRender,adoptVersion} from '../../apps/web-ele/src/api/creative-video/production.ts';
globalThis.localStorage={getItem:()=>null};
const shot={id:1,revision:1,text:'场景',seconds:8,referenceId:1,references:[{id:1,dataUrl:'data:image/png;base64,old'}],versions:[]};const quote=createQuote(shot);shot.referenceId=2;assert.throws(()=>validateQuote(quote,shot),/INPUT_REVISION_CHANGED/);shot.referenceId=1;
const p={shots:[shot],jobs:[],ledger:[],balance:120,sequence:0,renders:[]};generate(p,shot,false);shot.references[0].dataUrl='new';settle(p,Infinity);assert.equal(shot.versions[0].referenceImage,'data:image/png;base64,old');adoptVersion(p,1,1);const r=startRender(p);assert.equal(JSON.parse(r.shots)[0].referenceImage,'data:image/png;base64,old');
console.log('通过：参考图变更使报价失效、候选与成片引用生成时图片快照');
