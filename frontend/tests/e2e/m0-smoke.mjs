/**
 * VidCraft M0 冒烟脚本（Playwright，非 Test Runner，直接 node 运行）。
 *
 * 前置条件：前端已在 BASE_URL 启动，且 Nitro Mock 可用。
 * 运行：node tests/e2e/m0-smoke.mjs
 * 可用环境变量：M0_BASE_URL、M0_SCREENSHOT_DIR
 */

import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const BASE_URL = process.env.M0_BASE_URL ?? 'http://localhost:5555';
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SHOT_DIR = resolve(
  SCRIPT_DIR,
  process.env.M0_SCREENSHOT_DIR ?? '../../../docs/screenshots',
);

const results = [];

function record(name, ok, detail = '') {
  results.push({ detail, name, ok });
  process.stdout.write(
    `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}\n`,
  );
}

async function shot(page, name) {
  // 等待进入/淡出动画结束，避免截到 loading 或过渡中的半透明状态
  await page.waitForTimeout(900);
  await page.screenshot({
    path: resolve(SHOT_DIR, `${name}.png`),
    fullPage: false,
  });
}

async function fillCaptcha(page) {
  const rect = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll('div')].filter(
      (el) =>
        el.children.length === 0 &&
        ['请按住滑块拖动', '验证通过'].some((text) =>
          el.textContent?.includes(text),
        ),
    );
    const content = candidates.at(-1);
    const wrapper = content?.parentElement;
    if (!wrapper) {
      return null;
    }
    const box = wrapper.getBoundingClientRect();
    return { height: box.height, width: box.width, x: box.x, y: box.y };
  });
  if (!rect) {
    throw new Error('未找到滑块验证组件');
  }
  const startX = rect.x + 18;
  const y = rect.y + rect.height / 2;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  for (let step = 1; step <= 12; step += 1) {
    await page.mouse.move(startX + ((rect.width - 24) * step) / 12, y, {
      steps: 2,
    });
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
}

async function login(page, roleLabel) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=请按住滑块拖动', { timeout: 60_000 });
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: roleLabel }).click();
  await page.waitForTimeout(400);
  await fillCaptcha(page);
  await page.getByRole('button', { name: 'login' }).click();
  await page.waitForURL('**/dashboard', { timeout: 60_000 });
  await page.waitForSelector('text=VidCraft 工作台', { timeout: 30_000 });
}

async function run() {
  await mkdir(SHOT_DIR, { recursive: true });

  // 使用本机安装的 Chrome（避免额外下载 Playwright 浏览器）
  const browser = await chromium.launch({
    channel: process.env.M0_BROWSER_CHANNEL ?? 'chrome',
    headless: true,
  });
  const context = await browser.newContext({
    locale: 'zh-CN',
    reducedMotion: process.env.M0_REDUCED_MOTION ?? 'no-preference',
    viewport: { height: 900, width: 1440 },
  });
  const page = await context.newPage();
  const apiCalls = [];
  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('/api/creative-video/')) {
      apiCalls.push({ status: response.status(), url });
    }
  });

  // 1. 登录页与品牌
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=请按住滑块拖动', { timeout: 60_000 });
  const title = await page.title();
  const bodyText = await page.locator('body').innerText();
  record(
    'M0-T03 中文登录页 + VidCraft 标题',
    title.includes('VidCraft') && bodyText.includes('演示模式'),
  );
  await shot(page, 'm0-01-login');

  // 2. owner 登录
  await login(page, '产品拥有者（演示）');
  await page.waitForTimeout(800);
  const dashboardText = await page.locator('body').innerText();
  record(
    'M0-T04 owner 登录到工作台 + Mock Banner',
    dashboardText.includes('VidCraft 工作台') &&
      dashboardText.includes('演示模式'),
  );
  await shot(page, 'm0-02-dashboard');

  // 3. 项目列表：通过侧栏菜单进入，覆盖 RouterView 切换不空白
  await page.locator("a[href='/projects']").first().click();
  const spinnerSeen = await page
    .waitForSelector('.vc-route-loading .vc-route-loading__loader', {
      timeout: 3000,
    })
    .then(() => true)
    .catch(() => false);
  record('M0-T04 页面切换 loading 动画保留', spinnerSeen);
  const transitionDuration = await page
    .waitForSelector('.fade-slide-enter-active', { timeout: 3000 })
    .then((handle) =>
      handle.evaluate((el) => getComputedStyle(el).transitionDuration),
    )
    .catch(() => '0s');
  record(
    'M0-T04 页面切换动画保留',
    transitionDuration !== '' && transitionDuration !== '0s',
    `transitionDuration=${transitionDuration}`,
  );
  await page.waitForSelector('.vc-project-card', { timeout: 40_000 });
  record(
    'M0-T04 菜单切换后内容区正常渲染',
    (await page.locator('h1').filter({ hasText: '项目中心' }).count()) > 0,
  );
  await page.getByRole('button', { name: '恢复演示数据' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: '确定' }).click();
  await page.waitForTimeout(1800);
  await page.waitForSelector('.vc-project-card', { timeout: 40_000 });
  await page.waitForTimeout(600);
  const cards = await page.locator('.vc-project-card').count();
  const projectsText = await page.locator('body').innerText();
  record('M0-T06 项目列表显示四个种子项目', cards === 4, `cards=${cards}`);
  record(
    'M0-T06 项目数据来自 HTTP 业务接口',
    apiCalls.some(
      (call) =>
        call.url.includes('/creative-video/v1/projects') && call.status === 200,
    ),
  );
  record('M0 种子标题存在', projectsText.includes('3D 网页简历营销片'));
  await shot(page, 'm0-03-projects');

  // 已缓存的页面再次切换也应显示 loading
  await page.locator("a[href='/dashboard']").first().click();
  const cachedLoading = await page
    .waitForSelector('.vc-route-loading .vc-route-loading__loader', {
      timeout: 3000,
    })
    .then(() => true)
    .catch(() => false);
  await page.waitForSelector('text=VidCraft 工作台', { timeout: 30_000 });
  await page.locator("a[href='/projects']").first().click();
  await page.waitForSelector('.vc-project-card', { timeout: 30_000 });
  record('M0-T04 已缓存页面切换仍显示 loading', cachedLoading);

  // 4. Studio 深链（M1 起卡片点击进入详情，“继续”按钮进入 Studio）
  await page.waitForTimeout(1000);
  await page.locator('.vc-m1-card__continue').first().click();
  try {
    await page.waitForSelector('.vidcraft-studio', { timeout: 25_000 });
  } catch {
    // 首次加载时 Vite 可能正在预构建依赖并触发整页刷新，导致点击丢失，重试一次
    await page.waitForSelector('.vc-project-card', { timeout: 30_000 });
    await page.locator('.vc-m1-card__continue').first().click();
    await page.waitForSelector('.vidcraft-studio', { timeout: 60_000 });
  }
  await page.waitForTimeout(800);
  record(
    'M0-T07 卡片进入 Studio 深链',
    page.url().includes('/studio/project_resume_3d/'),
    page.url(),
  );
  const stageCount = await page.locator('.vc-stage-nav__item').count();
  const studioText = await page.locator('body').innerText();
  record(
    'M0-T07 Studio 全屏 + 八步导航 + 项目名',
    stageCount === 8 &&
      studioText.includes('3D 网页简历营销片') &&
      studioText.includes('资料'),
    `stages=${stageCount}`,
  );
  const hasSidebar = await page
    .locator('.vben-layout-sidebar, .vben-menu')
    .count();
  record('M0-T07 Studio 不渲染后台侧栏', hasSidebar === 0);
  await shot(page, 'm0-04-studio-ingest');

  // 5. Studio 刷新保持深链
  const studioUrl = page.url();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.vidcraft-studio', { timeout: 40_000 });
  record('M0-T08 Studio 刷新保持深链', page.url() === studioUrl);
  await shot(page, 'm0-05-studio-reload');

  // 6. 不存在的项目
  await page.goto(`${BASE_URL}/studio/not_exists/ingest`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('text=项目不存在或已被移除', { timeout: 30_000 });
  record(
    'M0-T09 无效项目不白屏且有返回入口',
    await page.getByText('返回项目列表').first().isVisible(),
  );
  await shot(page, 'm0-06-studio-not-found');

  // 7. 1366 宽度 Studio
  await page.setViewportSize({ height: 768, width: 1366 });
  await page.goto(`${BASE_URL}/studio/project_resume_3d/understanding`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('.vidcraft-studio', { timeout: 30_000 });
  await page.waitForTimeout(500);
  record(
    'M0-T16 1366 宽度 Studio 可用',
    (await page.locator('.vc-stage-nav__item').count()) === 8,
  );
  await shot(page, 'm0-07-studio-1366');

  // 7b. 1920 宽度 Studio
  await page.setViewportSize({ height: 1080, width: 1920 });
  await page.goto(`${BASE_URL}/studio/project_resume_3d/animatic`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('.vidcraft-studio', { timeout: 30_000 });
  record(
    'M0-T16 1920 宽度 Studio 可用',
    (await page.locator('.vc-stage-nav__item').count()) === 8,
  );
  await shot(page, 'm0-10-studio-1920');

  // 7c. 未知路由的品牌 404
  await page.goto(`${BASE_URL}/not-a-vidcraft-page`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(1800);
  const notFoundText = await page.locator('body').innerText();
  record(
    'M0-06 未知路由显示 VidCraft 404 文案',
    notFoundText.includes('页面不存在或已被移除'),
  );
  await shot(page, 'm0-11-not-found');

  // 8. owner 可见账单
  await page.setViewportSize({ height: 900, width: 1440 });
  await page.goto(`${BASE_URL}/billing`, { waitUntil: 'domcontentloaded' });
  await page
    .waitForSelector('text=积分与账单', { timeout: 30_000 })
    .catch(() => undefined);
  const billingText = await page.locator('body').innerText();
  record('M0-T04 owner 可访问积分与账单', billingText.includes('积分与账单'));

  // 8b. 新标签页登录态（共享 context 存储）
  const newTab = await context.newPage();
  await newTab.goto(`${BASE_URL}/projects`, { waitUntil: 'domcontentloaded' });
  await newTab.waitForTimeout(2500);
  const newTabCards = await newTab.locator('.vc-project-card').count();
  record(
    'M0-T13 新标签页保持登录态并加载项目',
    newTab.url().includes('/projects') && newTabCards === 4,
    newTab.url(),
  );
  await newTab.close();

  // 9. reviewer 权限差异
  const reviewerContext = await browser.newContext({
    locale: 'zh-CN',
    viewport: { height: 900, width: 1440 },
  });
  const reviewerPage = await reviewerContext.newPage();
  await login(reviewerPage, '审核员（演示）');
  await reviewerPage.waitForTimeout(800);
  const reviewerMenu = await reviewerPage.locator('body').innerText();
  record('M0-T05 reviewer 无设置菜单', !reviewerMenu.includes('模型设置'));
  await reviewerPage.goto(`${BASE_URL}/billing`, {
    waitUntil: 'domcontentloaded',
  });
  await reviewerPage
    .waitForFunction(
      () => /访问被拒绝|没有权限|无权|403/.test(document.body.innerText),
      null,
      { timeout: 15_000 },
    )
    .catch(() => null);
  const reviewerBilling = await reviewerPage.locator('body').innerText();
  record(
    'M0-T11 无权限路由给出 403 反馈',
    reviewerBilling.includes('访问被拒绝') ||
      reviewerBilling.includes('没有权限') ||
      reviewerBilling.includes('无权') ||
      reviewerBilling.includes('403'),
    reviewerBilling.slice(0, 120).replaceAll('\n', ' '),
  );
  await shot(reviewerPage, 'm0-08-reviewer-forbidden');
  await reviewerContext.close();

  // 10. Demo Reset
  await page.goto(`${BASE_URL}/projects`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.vc-project-card', { timeout: 30_000 });
  await page.getByRole('button', { name: '恢复演示数据' }).click();
  await page.getByRole('button', { name: '确定' }).click();
  await page.waitForTimeout(1500);
  const resetText = await page.locator('body').innerText();
  record(
    'M0-T12 Demo Reset 恢复四个项目并有提示',
    (await page.locator('.vc-project-card').count()) === 4 &&
      resetText.includes('演示数据已恢复初始状态'),
  );

  // 11. Mock 不可用错误态（拦截业务请求模拟；只拦接口，不拦 Vite 模块）
  const businessApiFilter = (url) =>
    url.pathname.startsWith('/api/creative-video/v1/');
  await page.route(businessApiFilter, (route) => route.abort());
  await page.goto(`${BASE_URL}/projects`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=演示服务暂时不可用', { timeout: 40_000 });
  record(
    'M0-T10 Mock 不可用时显示可重试错误态',
    await page.getByRole('button', { name: '重试' }).isVisible(),
  );
  await shot(page, 'm0-09-projects-error');
  await page.unroute(businessApiFilter);
  await page.getByRole('button', { name: '重试' }).click();
  await page.waitForSelector('.vc-project-card', { timeout: 40_000 });
  record(
    'M0-T10 重试后恢复项目列表',
    (await page.locator('.vc-project-card').count()) === 4,
  );

  // 12. 控制台错误（忽略第三方字体与主动中断请求的告警）
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const appErrors = consoleErrors.filter(
    (text) =>
      !text.includes('favicon') &&
      !text.includes('ERR_FAILED') &&
      !text.includes('Failed to load resource'),
  );
  record(
    'M0 控制台无应用级错误',
    appErrors.length === 0,
    appErrors.slice(0, 3).join(' | '),
  );

  await context.close();
  await browser.close();

  const failed = results.filter((item) => !item.ok);
  process.stdout.write(
    `\n${results.length - failed.length}/${results.length} passed\n`,
  );
  if (failed.length > 0) {
    process.stdout.write(
      `failed: ${failed.map((item) => item.name).join(', ')}\n`,
    );
    process.exitCode = 1;
  }
}

await run();
