import assert from 'node:assert/strict';
import {timelineSrt} from '../../apps/web-ele/src/api/creative-video/export.ts';
const text=timelineSrt([{seconds:8,overlap:2,subtitle:'第一镜字幕'},{seconds:7,subtitle:'第二镜字幕'}]);assert.ok(text.includes('00:00:00,000 --> 00:00:08,000'));assert.ok(text.includes('00:00:06,000 --> 00:00:13,000'));assert.ok(text.includes('第二镜字幕'));console.log('通过：时间线字幕导出、转场重叠时间码、字幕内容快照');
