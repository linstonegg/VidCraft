import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:process.env.LOCALAPPDATA+"/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-win64/chrome-headless-shell.exe"});const page=await browser.newPage();
const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
await page.goto('http://localhost:5777/',{waitUntil:'networkidle',timeout:120000});
const track=page.getByText('请按住滑块拖动').locator('../..');const box=await track.boundingBox();
await page.mouse.move(box.x+18,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width-10,box.y+box.height/2,{steps:20});await page.mouse.up();
if(await page.getByRole('button',{name:'登录',exact:true}).count())await page.getByRole('button',{name:'登录',exact:true}).click();await page.waitForTimeout(700);await page.getByText('登录',{exact:true}).first().click();await page.waitForTimeout(700);await page.waitForTimeout(2500);

await page.goto('http://localhost:5777/creative-video');await page.waitForTimeout(1500);
await page.getByPlaceholder('给你的下一个创意项目起个名字').fill('E2E 3D简历');
await page.getByRole('button',{name:'＋ 新建项目'}).click();await page.waitForTimeout(700);
await page.getByPlaceholder('https://your-product.com').fill('https://example.com');await page.getByText('我有权使用所提供的资料、素材和演示环境').click();await page.getByRole('button',{name:'创建并进入资料采集'}).click();await page.waitForTimeout(700);
await page.waitForTimeout(700);await page.getByPlaceholder('https://your-product.com').filter({visible:true}).fill('https://example.com');
await page.getByText('确认素材已脱敏，未包含真实客户或账户数据').click();await page.waitForTimeout(700);
await page.getByRole('button',{name:'开始模拟采集'}).click();await page.waitForTimeout(700);
await page.getByRole('button',{name:'确认并继续 →'}).click();await page.waitForTimeout(700);
await page.getByRole('button',{name:'确认当前证据'}).click();await page.getByRole('button',{name:'确认结构化产品理解'}).click();await page.waitForTimeout(700);
await page.getByRole('button',{name:'确认并继续 →'}).click();await page.waitForTimeout(700);
await page.getByRole('button',{name:'保存并锁定方向'}).click();
await page.getByRole('button',{name:'确认并继续 →'}).click();await page.waitForTimeout(700);
await page.getByRole('button',{name:'生成故事节拍与剧本（Mock）'}).click();await page.waitForTimeout(700);
await page.getByRole('button',{name:'确认并继续 →'}).click();await page.waitForTimeout(700);
await page.getByRole('button',{name:'确认当前分镜'}).waitFor();
console.log('PASS: 登录→新建→脱敏采集→证据确认→创意→剧本→分镜');
await page.locator('article').first().locator('input[type=file]').setInputFiles({name:'reference.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGv0AAAAASUVORK5CYII=','base64')});
await page.waitForTimeout(500);await page.locator('article').first().getByAltText('reference.png').waitFor();
console.log('PASS: 本地参考图上传与显示');

await page.reload();await page.getByRole('button',{name:'确认当前分镜'}).waitFor();
console.log('PASS: Studio 刷新恢复');
await page.getByRole('button',{name:'确认当前分镜',exact:true}).click();await page.waitForTimeout(700);
await page.getByRole('button',{name:'确认并继续 →'}).click();await page.waitForTimeout(700);
await page.getByRole('button',{name:'确认并继续 →'}).click();await page.waitForTimeout(700);
await page.getByRole('button',{name:'演示充值 +500'}).click();await page.waitForTimeout(1000);
await page.route('**/api/creative-video/generation',route=>route.abort());
await page.getByText(/连接中断，已暂停新生成提交/).waitFor();
if(!(await page.getByRole('button',{name:'生成视频 / 重新报价'}).first().isDisabled()))throw Error('离线仍允许生成');
await page.unroute('**/api/creative-video/generation');await page.getByRole('button',{name:'重新连接',exact:true}).click();await page.waitForTimeout(1500);
console.log('PASS: 服务断网禁用提交与重连');
for(const article of await page.locator('article').all()){
 await article.getByRole('button',{name:'生成视频 / 重新报价'}).click();
 await page.getByRole('button',{name:'确认冻结并生成',exact:true}).click();
 await page.waitForTimeout(5100);
 await article.getByRole('button',{name:'采用 / 回退（免费）'}).last().click();await article.getByRole('button',{name:'当前正式版本',exact:true}).waitFor();
}
await page.getByRole('button',{name:'确认并继续 →'}).click();await page.waitForTimeout(700);
for(const label of ['已核对故事连贯、开头钩子与节奏','已核对角色、品牌和真实产品展示','已核对广告主张与素材授权','已核对旁白、字幕、音乐与CTA'])await page.getByText(label,{exact:true}).click();
await page.getByRole('button',{name:'合成模拟快照'}).click();await page.waitForTimeout(6100);
await page.getByRole('button',{name:'导出模拟记录'}).waitFor({state:'visible'});
if(await page.getByRole('button',{name:'导出模拟记录'}).isDisabled())throw Error('成功合成后导出未启用');
console.log('PASS: 逐镜头报价→生成→采用→异步合成→导出可用');
const subtitleDownload=page.waitForEvent('download');await page.getByRole('button',{name:'导出选定成片字幕 SRT'}).click();const subtitle=await subtitleDownload;const stream=await subtitle.createReadStream();let content='';for await(const chunk of stream)content+=chunk.toString('utf8');if(!subtitle.suggestedFilename().endsWith('.srt')||!content.includes('-->')||!content.includes('00:00:00,000'))throw Error('SRT下载内容无效');console.log('PASS: 按合成快照下载SRT字幕及时间码');

await page.goto('http://localhost:5777/notifications');await page.getByRole('heading',{name:/创作通知/}).waitFor();await page.getByText(/新候选待审核/).first().waitFor();console.log('PASS: 创作通知页面与任务完成记录');
await page.goto('http://localhost:5777/billing');await page.getByRole('button',{name:'报价与流水'}).first().click();await page.getByText('模拟订单与账单详情',{exact:true}).waitFor();console.log('PASS: 账单关联报价与交易详情');
await page.goto('http://localhost:5777/projects');await page.getByText('开发演示工具（仅开发环境）',{exact:true}).click();await page.getByRole('button',{name:'添加缺失演示项目'}).click();await page.getByRole('heading',{name:'3D 数字简历推广片',exact:true}).waitFor();await page.goto('http://localhost:5777/studio/1001/storyboard');await page.locator('article').nth(14).waitFor();if(await page.locator('article').count()!==15)throw Error('种子镜头数量错误');console.log('PASS: 开发种子安装与15镜头工作台');
await page.locator('#shot-7 .compare summary').click();await page.locator('#shot-7 .compare video').first().waitFor();await page.waitForTimeout(800);await page.getByRole('button',{name:'同步播放两版'}).click();await page.waitForTimeout(500);const playingTimes=await page.locator('#shot-7 .compare video').evaluateAll(videos=>videos.map(v=>v.currentTime));if(playingTimes.length!==2||playingTimes.some(t=>t<=0))throw Error('双版本未实际播放');await page.getByRole('button',{name:'暂停两版'}).click();if(!(await page.locator('#shot-7 .compare video').evaluateAll(videos=>videos.every(v=>v.paused))))throw Error('双版本未暂停');console.log('PASS: 双版本实际同步播放与暂停');

await page.goto('http://localhost:5777/dashboard');await page.getByRole('button',{name:'保存当前工作区到服务端'}).click();await page.getByText('当前账号工作区已保存到Nitro内存',{exact:true}).waitFor();console.log('PASS: Nitro工作区保存入口');
await browser.close();if(pageErrors.length)throw Error('页面脚本错误：'+pageErrors.join(' | '));


