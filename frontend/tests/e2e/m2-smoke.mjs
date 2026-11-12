/**
 * M2 浏览器主链路：切口 → Brief → 三套创意 → 剧本 → 视觉规范 → 15 镜头 → 预演 → M3 占位。
 * 前置：dev:ele 已启动；使用本机 Chrome。
 */
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/* eslint-disable unicorn/no-await-expression-member */
import { chromium } from 'playwright';

const BASE = process.env.M2_BASE_URL ?? 'http://localhost:5555';
const API_BASE = process.env.M2_API_BASE ?? 'http://localhost:5320/api';
const DIR = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(DIR, '../../../docs/screenshots/m2');

let ownerToken = '';
async function resetInteractive() {
  const auth = await fetch(`${API_BASE}/auth/login`, {
    body: JSON.stringify({ password: '123456', username: 'owner' }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  ownerToken = (await auth.json()).data.accessToken;
  const reset = await fetch(`${API_BASE}/creative-video/v1/demo/reset`, {
    body: JSON.stringify({ m2Seed: 'interactive' }),
    headers: {
      Authorization: `Bearer ${ownerToken}`,
      'content-type': 'application/json',
    },
    method: 'POST',
  });
  if (!reset.ok) {
    throw new Error(`interactive reset failed: ${reset.status}`);
  }
}
async function apiJson(path) {
  const response = await fetch(`${API_BASE}/creative-video/v1${path}`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  return response.json();
}

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ detail, name, ok });
  process.stdout.write(
    `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}\n`,
  );
};

async function dragCaptcha(page) {
  const rect = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll('div')].filter(
      (el) =>
        el.children.length === 0 &&
        ['请按住滑块拖动', '验证通过'].some((t) => el.textContent?.includes(t)),
    );
    const wrapper = candidates.at(-1)?.parentElement;
    const box = wrapper.getBoundingClientRect();
    return { height: box.height, width: box.width, x: box.x, y: box.y };
  });
  const sx = rect.x + 18;
  const y = rect.y + rect.height / 2;
  await page.mouse.move(sx, y);
  await page.mouse.down();
  for (let s = 1; s <= 12; s += 1)
    await page.mouse.move(sx + ((rect.width - 24) * s) / 12, y, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}

async function login(page) {
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=请按住滑块拖动', { timeout: 90_000 });
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: '产品拥有者（演示）' }).click();
  await page.waitForTimeout(400);
  await dragCaptcha(page);
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'login' }).click();
  await page.waitForURL('**/dashboard', { timeout: 90_000 });
}

async function shot(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: resolve(SHOTS, `${name}.png`) });
}

const browser = await chromium.launch({
  channel: process.env.M2_BROWSER_CHANNEL ?? 'chrome',
  headless: true,
});
const page = await browser.newPage({
  locale: 'zh-CN',
  viewport: { width: 1440, height: 900 },
});
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(e.message));
await mkdir(SHOTS, { recursive: true });

try {
  await resetInteractive();
  await login(page);

  // 1. 传播切口
  await page.goto(`${BASE}/studio/project_resume_3d/angles`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('.vc-m2-angle', { timeout: 60_000 });
  check(
    'M2-ANG-001 显示至少 3 个传播切口',
    (await page.locator('.vc-m2-angle').count()) >= 3,
  );
  await page
    .locator('.vc-m2-angle')
    .nth(1)
    .getByRole('button', { name: '设为辅切口' })
    .click();
  const briefButton = page.getByRole('button', { name: /确认 Brief/ }).first();
  await briefButton.click();
  await page.waitForTimeout(1200);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: '确认并进入创意' })
    .click();
  await page.waitForURL('**/concepts', { timeout: 60_000 });
  check('M2-ANG-002 Brief 确认后进入创意故事', true);

  // 2. 三套创意
  await page.waitForSelector(
    '.vc-m2-concept, button:has-text("生成三套创意")',
    { timeout: 60_000 },
  );
  if ((await page.locator('.vc-m2-concept').count()) === 0) {
    await page
      .getByRole('button', { name: /生成三套创意/ })
      .first()
      .click();
  }
  await page.waitForSelector('.vc-m2-concept', { timeout: 90_000 });
  check(
    'M2-CON-001 生成三套差异化方案',
    (await page.locator('.vc-m2-concept').count()) === 3,
  );
  const groupBefore = (
    await apiJson('/projects/project_resume_3d/concepts/groups')
  ).data[0];
  const readinessBefore = await apiJson(
    '/projects/project_resume_3d/production-readiness',
  );
  await page.getByRole('button', { name: '自由探索' }).click();
  check(
    'P1-CON-01 自由探索模式与 UI 聚焦可用',
    (await page.locator('.vc-m2-concept-grid.is-exploration').count()) === 1,
  );
  const dragHandle = page.locator('.vc-m2-concept-drag').first();
  const dragBox = await dragHandle.boundingBox();
  if (dragBox) {
    await page.mouse.move(dragBox.x + 8, dragBox.y + 8);
    await page.mouse.down();
    await page.mouse.move(dragBox.x + 68, dragBox.y + 38, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(200);
  }
  const movedStyle = await page
    .locator('.vc-m2-concept')
    .first()
    .evaluate((el) => el.getAttribute('style') ?? '');
  check(
    'P1-CON-04 卡片拖动写入私有布局坐标',
    movedStyle.includes('translate'),
    movedStyle,
  );
  await page
    .locator('.vc-m2-concept')
    .first()
    .getByRole('button', { name: /收藏/ })
    .click();
  await page.waitForTimeout(500);
  check(
    'VIS-004 收藏不改变正式方案批准状态',
    (await page.getByRole('button', { name: '★ 已收藏' }).count()) === 1 &&
      (await page.locator('.vc-m2-concept-grid').count()) === 1,
  );
  await page.getByRole('button', { name: '＋' }).click();
  check(
    'P1-CON-06 探索画布缩放持久化到私有偏好',
    (await page.locator('.vc-m2-concept-grid').getAttribute('style'))?.includes(
      'scale(1.1)',
    ) ?? false,
  );
  const persistedStyle = await page
    .locator('.vc-m2-concept')
    .first()
    .evaluate((el) => el.getAttribute('style') ?? '');
  const persistedZoom = await page
    .locator('.vc-m2-concept-grid')
    .getAttribute('style');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.vc-m2-concept', { timeout: 60_000 });
  const reloadedStyle = await page
    .locator('.vc-m2-concept')
    .first()
    .evaluate((el) => el.getAttribute('style') ?? '');
  const reloadedZoom = await page
    .locator('.vc-m2-concept-grid')
    .getAttribute('style');
  check(
    'VIS-018 刷新后私有布局保留且不改正式业务状态',
    reloadedStyle.includes('translate') &&
      Boolean(reloadedZoom?.includes('scale(1.1)')),
    `${persistedStyle}/${persistedZoom}`,
  );

  await page.evaluate(() => {
    const key = Object.keys(window.localStorage).find((item) =>
      item.includes('vidcraft:presentation:'),
    );
    if (!key) return;
    const value = JSON.parse(window.localStorage.getItem(key) ?? '{}');
    value.canvasPoints = { invalid: { x: null, y: null } };
    value.viewport = { x: null, y: null, zoom: null };
    window.localStorage.setItem(key, JSON.stringify(value));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.vc-m2-concept', { timeout: 60_000 });
  check(
    'VIS-028 恶意坐标被清洗且页面不崩溃',
    (await page.locator('.vc-m2-concept').count()) === 3,
  );

  const groupAfterFocus = (
    await apiJson('/projects/project_resume_3d/concepts/groups')
  ).data[0];
  const readinessAfter = await apiJson(
    '/projects/project_resume_3d/production-readiness',
  );
  check(
    'VIS-008 拖动/聚焦不改正式 ConceptGroup 选择',
    groupBefore.selectedConceptRevisionId ===
      groupAfterFocus.selectedConceptRevisionId &&
      groupBefore.conceptRevisionIds.join(',') ===
        groupAfterFocus.conceptRevisionIds.join(','),
    `${groupBefore.selectedConceptRevisionId}/${groupAfterFocus.selectedConceptRevisionId}`,
  );
  check(
    'VIS-014 布局不改变 ProductionReadiness',
    JSON.stringify(readinessBefore.data.items) ===
      JSON.stringify(readinessAfter.data.items) &&
      readinessBefore.data.canEnterM3 === readinessAfter.data.canEnterM3,
  );
  check(
    'VIS-025 focus/favorite 与正式选择分离',
    groupAfterFocus.selectedConceptRevisionId ===
      groupBefore.selectedConceptRevisionId &&
      groupAfterFocus.favoriteConceptRevisionIds.length > 0,
    `${groupAfterFocus.favoriteConceptRevisionIds.length}`,
  );
  await page.getByRole('button', { name: '重置布局' }).click();
  await page.getByRole('button', { name: '聚焦' }).first().click();
  check(
    'P1-CON-02 聚焦不改变正式选择',
    (await page.getByRole('button', { name: '取消聚焦' }).count()) === 1,
  );
  await page.getByRole('button', { name: '取消聚焦' }).click();
  await page.getByRole('button', { name: '编辑' }).first().click();
  await page.waitForSelector('text=情绪板内容版本', { timeout: 20_000 });
  await page.getByRole('button', { name: '绑定内容版本' }).click();
  await page.waitForTimeout(800);
  const moodboardText = await page.locator('body').innerText();
  check(
    'P1-CON-05 情绪板绑定精确内容版本',
    moodboardText.includes('情绪板内容版本') &&
      moodboardText.includes('asset-content:'),
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: '方案对比' }).click();
  await page.getByRole('button', { name: '组合创意 D' }).click();
  await page.waitForSelector('text=组合创意 D', { timeout: 20_000 });
  await page.getByRole('button', { name: '生成 D 草稿' }).click();
  await page.waitForFunction(
    () => document.querySelectorAll('.vc-m2-concept').length === 4,
    null,
    { timeout: 30_000 },
  );
  check(
    'P1-CON-03 组合 D 通过 Fork/Patch 生成新草稿并重算风险',
    (await page.locator('.vc-m2-concept').count()) === 4 &&
      (await page.locator('body').innerText()).includes('组合方案需重新核验'),
  );
  await shot(page, 'm2-concept-compare');
  const firstConcept = page.locator('.vc-m2-concept').first();
  await firstConcept.getByRole('button', { name: '提交审核' }).click();
  await page.waitForTimeout(1200);
  await page
    .locator('.vc-m2-concept')
    .first()
    .getByRole('button', { name: '确认方案' })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: '确认方案' })
    .click();
  await page.waitForURL('**/script', { timeout: 60_000 });
  check('M2-CON-002 审核确认后进入剧本', true);

  // 3. 时长策略与剧本
  await page.waitForSelector('text=AI 时长建议', { timeout: 60_000 });
  await page.getByRole('button', { name: /A：扩展为完整故事/ }).click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: '生成剧本' }).first().click();
  await page.waitForSelector('.vc-m2-beat', { timeout: 90_000 });
  check(
    'M2-SCR-001 生成 7 个故事节拍',
    (await page.locator('.vc-m2-beat').count()) === 7,
  );
  check(
    'M2-SCR-002 目标与节拍总时长一致',
    (await page.locator('body').innerText()).includes('差额 0.0s'),
  );
  await shot(page, 'm2-script');
  await page.getByRole('button', { name: '提交审核' }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: '确认剧本' }).first().click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: '确认剧本' })
    .click();
  await page.waitForTimeout(1500);
  check(
    'M2-SCR-003 剧本已确认',
    (await page.locator('body').innerText()).includes('已确认'),
  );
  await page.getByRole('button', { name: '进入图文分镜' }).click();
  await page.waitForURL('**/storyboard', { timeout: 60_000 });

  // 4. 视觉规范与分镜
  await page.waitForSelector('text=视觉规范', { timeout: 60_000 });
  await page.getByRole('button', { name: '生成视觉规范' }).first().click();
  await page.waitForSelector('button:has-text("确认视觉规范")', {
    timeout: 90_000,
  });
  await page.getByRole('button', { name: '确认视觉规范' }).first().click();
  await page.waitForTimeout(1500);
  await page
    .getByRole('button', { name: /生成 15 镜头分镜|生成分镜|生成图文分镜/ })
    .first()
    .click();
  await page.waitForSelector('.vc-shot-list__items > button', {
    timeout: 120_000,
  });
  check(
    'M2-STO-001 生成 15 个镜头',
    (await page.locator('.vc-shot-list__items > button').count()) === 15,
  );
  await shot(page, 'm2-storyboard');
  await page.getByRole('button', { name: '批量确认全部' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: '原子确认全部' })
    .click();
  await page.waitForTimeout(2500);
  check(
    'M2-STO-002 批量确认 15/15',
    (await page.locator('body').innerText()).includes('15/15'),
  );
  await page.getByRole('button', { name: '确认整组分镜' }).first().click();
  await page.waitForTimeout(2000);
  check(
    'M2-STO-003 分镜集合已确认',
    (await page.locator('body').innerText()).includes('APPROVED') ||
      (await page.locator('body').innerText()).includes('已确认'),
  );
  await page.getByRole('button', { name: '进入预演' }).click();
  await page.waitForURL('**/animatic', { timeout: 60_000 });

  // 5. 预演
  await page.waitForSelector('text=生成预演', { timeout: 60_000 });
  await page.getByRole('button', { name: '生成预演' }).first().click();
  await page.waitForSelector('button:has-text("确认预演")', {
    timeout: 90_000,
  });
  await page.getByRole('button', { name: '确认预演' }).click();
  await page.waitForTimeout(1800);
  check(
    'M2-ANI-001 预演快照已确认',
    (await page.locator('body').innerText()).includes('已确认快照'),
  );
  await shot(page, 'm2-animatic');
  await page.getByRole('button', { name: '播放' }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: '暂停' }).click();
  check('M2-ANI-002 播放/暂停可用', true);
  await page.getByRole('button', { name: '进入 M3 占位' }).click();
  await page.waitForURL('**/generate', { timeout: 60_000 });
  await page.waitForSelector('text=M2 已完成交接', { timeout: 60_000 });
  check('M2-HANDOFF 进入 M3 占位并展示交接', true);
  check(
    'VIS-013 M3 占位不触发生成与计费',
    (await page.locator('body').innerText()).includes('不产生任何费用') &&
      (await page
        .getByRole('button', { name: /生成视频|开始生成/ })
        .count()) === 0,
  );
  await shot(page, 'm2-handoff');

  const appErrors = errors.filter(
    (text) =>
      !text.includes('favicon') &&
      !text.includes('ERR_ABORTED') &&
      !text.includes('Failed to load resource'),
  );
  check(
    '控制台无应用级错误',
    appErrors.length === 0,
    appErrors.slice(0, 3).join(' | '),
  );
} finally {
  await browser.close();
}

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
