import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:process.env.LOCALAPPDATA+'/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-win64/chrome-headless-shell.exe'});
const page=await browser.newPage();await page.goto('http://localhost:5777/');
for(const name of ['demo-a.mp4','demo-b.mp4','demo-portrait.mp4']){const result=await page.evaluate(async name=>{const video=document.createElement('video');video.muted=true;video.src='/mock-media/'+name;document.body.append(video);await new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=reject;});await video.play();await new Promise(resolve=>setTimeout(resolve,400));const result={duration:video.duration,width:video.videoWidth,height:video.videoHeight,time:video.currentTime};video.pause();video.remove();return result;},name);assert.equal(result.duration,4);assert.ok(result.time>0);if(name.includes('portrait'))assert.ok(result.height>result.width);console.log('PASS:',name,'metadata/playback');}
await browser.close();
