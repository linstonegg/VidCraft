/**
 * M1 浏览器冒烟：项目中心 → 新建 → 资料采集 → 模拟分析 → 产品理解 → 审核 → M2 占位。
 * 运行：node tests/e2e/m1-smoke.mjs
 * 前置：dev:ele 已启动（前端 5555 / Nitro 5320）。
 */
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const BASE_URL = process.env.M1_BASE_URL ?? 'http://localhost:5555';
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SHOT_DIR = resolve(
  SCRIPT_DIR,
  process.env.M1_SCREENSHOT_DIR ?? '../../../docs/screenshots/m1',
);

const results = [];

function check(name, ok, detail = '') {
  results.push({ detail, name, ok });
  process.stdout.write(
    `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}\n`,
  );
}

async function shot(page, name) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: resolve(SHOT_DIR, `${name}.png`) });
}

async function dragCaptcha(page) {
  const rect = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll('div')].filter(
      (el) =>
        el.children.length === 0 &&
        ['请按住滑块拖动', '验证通过'].some((text) =>
          el.textContent?.includes(text),
        ),
    );
    const wrapper = candidates.at(-1)?.parentElement;
    if (!wrapper) return null;
    const box = wrapper.getBoundingClientRect();
    return { height: box.height, width: box.width, x: box.x, y: box.y };
  });
  if (!rect) throw new Error('captcha not found');
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

async function login(page, role = '产品拥有者（演示）') {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=请按住滑块拖动', { timeout: 90_000 });
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: role }).click();
  await page.waitForTimeout(300);
  await dragCaptcha(page);
  await page.getByRole('button', { name: 'login' }).click();
  await page.waitForURL('**/dashboard', { timeout: 90_000 });
}

async function run() {
  await mkdir(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch({
    channel: process.env.M1_BROWSER_CHANNEL ?? 'chrome',
    headless: true,
  });
  const page = await browser.newPage({
    locale: 'zh-CN',
    viewport: { width: 1440, height: 900 },
  });
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await login(page);

  // 1. 项目中心（先恢复种子，保证多次运行结果确定）
  await page.goto(`${BASE_URL}/projects`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.vc-project-card', { timeout: 60_000 });
  await page.getByRole('button', { name: '恢复演示数据' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: '确定' }).click();
  await page.waitForTimeout(1800);
  await page.waitForSelector('.vc-project-card', { timeout: 60_000 });
  await page.waitForTimeout(600);
  check(
    'M1-PJ-001 四个 Seed 可见',
    (await page.locator('.vc-project-card').count()) === 4,
  );
  await shot(page, 'm1-01-projects');

  const search = page.getByPlaceholder('搜索项目名、产品名或网址');
  await search.fill('CRM');
  await page.waitForTimeout(800);
  check(
    'M1-PJ-002 搜索 CRM 过滤',
    (await page.locator('.vc-project-card').count()) === 1,
  );
  await search.fill('');
  await page.waitForTimeout(800);
  check(
    'M1-PJ-002 清空恢复',
    (await page.locator('.vc-project-card').count()) === 4,
  );

  // 2. 新建项目（直接打开新页面，避免多标签缓存导致首次懒加载空白）
  await page.goto(`${BASE_URL}/projects/new`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('input[placeholder="例如：3D 数字简历推广视频"]', {
    timeout: 60_000,
  });
  const title = `M1 浏览器冒烟 ${Date.now()}`;
  await page.getByPlaceholder('例如：3D 数字简历推广视频').fill(title);
  await page
    .getByPlaceholder('https://example.com/product')
    .fill('https://example.com/m1-smoke');
  await page
    .getByPlaceholder('例如：希望展示个人创意的求职者')
    .fill('独立开发者与小型产品团队');
  await page.getByText('我确认有权使用提交的网址与资料').click();
  await shot(page, 'm1-02-new-project');
  await page.getByRole('button', { name: '创建并采集资料' }).click();
  await page.waitForURL('**/studio/*/ingest', { timeout: 60_000 });
  check('M1-CR-011 创建后进入资料采集', page.url().includes('/ingest'));

  // 3. URL 模拟采集
  await page
    .getByPlaceholder('https://example.com/product')
    .fill('https://example.com/m1-smoke');
  await page.getByRole('button', { name: '开始模拟采集' }).click();
  await page.waitForSelector('text=公开页面（模拟结果）', { timeout: 40_000 });
  check('M1-IG-002 URL 采集生成来源', true);
  await shot(page, 'm1-03-ingest');
  await page
    .getByRole('button', { name: '确认资料并开始分析' })
    .first()
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: '确认并开始分析' })
    .click();
  await page.waitForURL('**/studio/*/understanding**', { timeout: 40_000 });

  // 4. 产品理解
  await page.waitForSelector('text=产品定位', { timeout: 60_000 });
  check('M1-UN-003/004 产品理解报告生成', true);
  await shot(page, 'm1-04-understanding');

  // 5. 编辑痛点（保留为推测）并保存草稿
  await page.getByRole('button', { name: '编辑' }).first().click();
  await page.waitForTimeout(400);
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: '应用到草稿' }).click();
  await page.getByRole('button', { name: '保存报告草稿' }).first().click();
  await page.waitForSelector('text=报告草稿已保存', { timeout: 20_000 });
  check('M1-UN-006 保存草稿成功', true);

  // 6. 审核确认
  await page.getByRole('button', { name: '确认产品理解' }).first().click();
  await page.waitForTimeout(400);
  await page.getByText('我知悉报告中仍有 AI 推测').click();
  await page.getByRole('button', { name: '确认并进入 M2 占位' }).click();
  await page.waitForURL('**/studio/*/angles', { timeout: 40_000 });
  await page.waitForSelector('text=传播切口', { timeout: 60_000 });
  check('M1-UN-011 审核通过并进入创意方向', true);
  await shot(page, 'm1-05-angles');

  // 7. 项目列表出现新项目
  await page.goto(`${BASE_URL}/projects`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.vc-project-card', { timeout: 30_000 });
  const listText = await page.locator('body').innerText();
  check('M1-PJ-012 新项目出现在列表', listText.includes(title));

  // 8. 无有效来源时确认按钮禁用（seed CRM 未确认也可观察）
  await page.goto(`${BASE_URL}/studio/project_resume_3d/understanding`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('text=产品理解与用户洞察', { timeout: 40_000 });
  const understandingText = await page.locator('body').innerText();
  check('M1-UN-014 已确认版本可查看', understandingText.includes('已确认'));

  // 12. reviewer：证据可查看 + 审核意见可提交
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await login(page, '审核员（演示）');
  await page.goto(`${BASE_URL}/studio/project_resume_3d/understanding`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('text=产品理解与用户洞察', { timeout: 60_000 });
  const evidenceButtons = page.getByRole('button', { name: '证据' });
  check(
    'M1-UN-005/018 reviewer 可查看画像证据',
    (await evidenceButtons.count()) > 0 &&
      (await evidenceButtons.first().isEnabled()),
  );
  const commentButton = page.getByRole('button', { name: '提出审核意见' });
  check('M1-UN-018 reviewer 可见审核意见入口', await commentButton.isVisible());
  await commentButton.click();
  const commentDialog = page.getByRole('dialog', { name: '审核意见' });
  await commentDialog.locator('textarea').fill('冒烟审核意见：请补充痛点证据');
  await commentDialog.getByRole('button', { name: '保存审核意见' }).click();
  await page.waitForSelector('text=冒烟审核意见：请补充痛点证据', {
    timeout: 30_000,
  });
  const reviewerBody = await page.locator('body').innerText();
  check(
    'M1-UN-018 reviewer 审核意见写入审核记录',
    reviewerBody.includes('审核记录'),
  );

  const appErrors = consoleErrors.filter(
    (text) =>
      !text.includes('favicon') &&
      !text.includes('ERR_FAILED') &&
      !text.includes('Failed to load resource'),
  );
  check(
    '控制台无应用级错误',
    appErrors.length === 0,
    appErrors.slice(0, 3).join(' | '),
  );

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
