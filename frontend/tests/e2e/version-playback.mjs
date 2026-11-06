import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:process.env.LOCALAPPDATA+"/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-win64/chrome-headless-shell.exe"});const page=await browser.newPage();
const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
await page.goto('http://localhost:5777/',{waitUntil:'networkidle',timeout:120000});
const track=page.getByText('请按住滑块拖动').locator('../..');const box=await track.boundingBox();
await page.mouse.move(box.x+18,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width-10,box.y+box.height/2,{steps:20});await page.mouse.up();
if(await page.getByRole('button',{name:'登录',exact:true}).count())await page.getByRole('button',{name:'登录',exact:true}).click();await page.waitForTimeout(700);await page.getByText('登录',{exact:true}).first().click();await page.waitForTimeout(700);await page.waitForTimeout(2500);

await page.goto('http://localhost:5777/creative-video');await page.waitForTimeout(1500);
await page.goto('http://localhost:5777/projects');await page.getByText('开发演示工具（仅开发环境）',{exact:true}).click();await page.getByRole('button',{name:'添加缺失演示项目'}).click();await page.getByRole('heading',{name:'3D 数字简历推广片',exact:true}).waitFor();await page.goto('http://localhost:5777/studio/1001/storyboard');await page.locator('article').nth(14).waitFor();if(await page.locator('article').count()!==15)throw Error('种子镜头数量错误');console.log('PASS: 开发种子安装与15镜头工作台');
await page.locator('#shot-7 .compare summary').click();await page.locator('#shot-7 .compare video').first().waitFor();await page.waitForTimeout(800);await page.getByRole('button',{name:'同步播放两版'}).click();await page.waitForTimeout(500);const playingTimes=await page.locator('#shot-7 .compare video').evaluateAll(videos=>videos.map(v=>v.currentTime));if(playingTimes.length!==2||playingTimes.some(t=>t<=0))throw Error('双版本未实际播放');await page.getByRole('button',{name:'暂停两版'}).click();if(!(await page.locator('#shot-7 .compare video').evaluateAll(videos=>videos.every(v=>v.paused))))throw Error('双版本未暂停');console.log('PASS: 双版本实际同步播放与暂停');

await browser.close();if(pageErrors.length)throw Error(pageErrors.join(' | '));