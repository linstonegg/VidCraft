import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:process.env.LOCALAPPDATA+"/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-win64/chrome-headless-shell.exe"});const page=await browser.newPage();
const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
await page.goto('http://localhost:5777/',{waitUntil:'networkidle',timeout:120000});
const track=page.getByText('请按住滑块拖动').locator('../..');const box=await track.boundingBox();
await page.mouse.move(box.x+18,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width-10,box.y+box.height/2,{steps:20});await page.mouse.up();
if(await page.getByRole('button',{name:'登录',exact:true}).count())await page.getByRole('button',{name:'登录',exact:true}).click();await page.waitForTimeout(700);await page.getByText('登录',{exact:true}).first().click();await page.waitForTimeout(700);await page.waitForTimeout(2500);

await page.goto('http://localhost:5777/creative-video');await page.waitForTimeout(1500);

const menus=await page.locator('[role=menu]').allTextContents();const menuText=menus.join(' ');for(const name of ['演示','关于','Naive UI','GitHub','Element Plus'])if(menuText.includes(name))throw Error('模板菜单仍存在：'+name);
for(const name of ['工作台','创意视频工作台','素材库','任务中心','积分与账单'])if(!menuText.includes(name))throw Error('业务菜单缺失：'+name);
await page.getByRole('button',{name:'打开创作通知'}).click();await page.getByRole('heading',{name:/创作通知/}).waitFor();
console.log('PASS: 模板菜单已移除、业务菜单保留、顶部通知进入业务页面');await browser.close();if(pageErrors.length)throw Error(pageErrors.join(' | '));
