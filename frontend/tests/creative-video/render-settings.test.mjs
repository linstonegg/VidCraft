import assert from 'node:assert/strict';
import {defaultRenderSettings,inspectRender,validateRenderSettings} from '../../apps/web-ele/src/api/creative-video/render-settings.ts';
import {startRender} from '../../apps/web-ele/src/api/creative-video/production.ts';
globalThis.localStorage={getItem:()=>null};const p={shots:[{id:1,text:'剧情',seconds:8,revision:1,adopted:1,versions:[{id:1,revision:1,prompt:'画面'}]}],jobs:[],ledger:[],renders:[],balance:120,sequence:1};const settings=defaultRenderSettings(8);p.renderSettings=settings;assert.throws(()=>validateRenderSettings(p,settings),/审核/);settings.checks={story:true,brand:true,truth:true,audio:true};validateRenderSettings(p,settings);assert.ok(inspectRender(p,settings).some(i=>i.severity==='warning'));const r=startRender(p);settings.fps=30;assert.equal(r.settings.fps,25);settings.targetSeconds=10;assert.throws(()=>validateRenderSettings(p,settings),/不一致/);
console.log('通过：缺失正式镜头与目标时长检查、人工审核门禁、输出参数快照不可变');
