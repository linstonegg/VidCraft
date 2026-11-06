import assert from 'node:assert/strict';
import {saveScript,loadScript,validateBeats} from '../../apps/web-ele/src/api/creative-video/script.ts';
import {loadProduction} from '../../apps/web-ele/src/api/creative-video/production.ts';
const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
assert.throws(()=>validateBeats([{text:'剧情',seconds:8}],30),/不符/);
saveScript(1,'完整故事扩写',[{text:'人工编辑剧情',seconds:8}],8);assert.equal(loadProduction(1,8).shots[0].text,'人工编辑剧情');
saveScript(1,'完整故事扩写',[{text:'新版',seconds:8}],8);assert.equal(loadScript(1).history[0].beats[0].text,'人工编辑剧情');
assert.throws(()=>saveScript(1,'扩写',[{text:'错误时长',seconds:3}],8),/不符/);assert.equal(loadScript(1).beats[0].text,'新版');assert.equal(data.get('vidcraft-script-dirty-1'),'true');
console.log('通过：时长门禁、人工剧情进入分镜、修订历史、无效输入不覆盖已保存剧本');
