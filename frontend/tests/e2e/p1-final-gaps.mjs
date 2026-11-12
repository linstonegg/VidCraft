/** P1 最终补漏：50 卡片浏览器性能 + Reviewer 画布权限。 */
import process from 'node:process';

/* eslint-disable unicorn/no-await-expression-member */
import { chromium } from 'playwright';

const BASE = process.env.P1_BASE_URL ?? 'http://localhost:5555';
const API = process.env.P1_API_BASE ?? 'http://localhost:5320/api';

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ detail, name, ok });
  process.stdout.write(
    `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}\n`,
  );
};

async function captcha(page) {
  const rect = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll('div')].filter(
      (el) =>
        el.children.length === 0 &&
        ['请按住滑块拖动', '验证通过'].some((text) =>
          el.textContent?.includes(text),
        ),
    );
    const wrapper = candidates.at(-1)?.parentElement;
    const box = wrapper.getBoundingClientRect();
    return { height: box.height, width: box.width, x: box.x, y: box.y };
  });
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

async function login(page, role) {
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=请按住滑块拖动', { timeout: 60_000 });
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: role }).click();
  await page.waitForTimeout(400);
  await captcha(page);
  await page.getByRole('button', { name: 'login' }).click();
  await page.waitForURL('**/dashboard', { timeout: 90_000 });
}

async function ownerApi(path, options = {}) {
  const auth = await fetch(`${API}/auth/login`, {
    body: JSON.stringify({ password: '123456', username: 'owner' }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  const token = (await auth.json()).data.accessToken;
  const response = await fetch(`${API}/creative-video/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
  });
  return response.json();
}

const browser = await chromium.launch({
  channel: process.env.P1_BROWSER_CHANNEL ?? 'chrome',
  headless: true,
});

try {
  await ownerApi('/demo/reset', { body: '{}', method: 'POST' });
  let board = await ownerApi('/projects/project_resume_3d/storyboard');
  while (board.data.shots.length < 50) {
    await ownerApi('/projects/project_resume_3d/shots', {
      body: '{}',
      method: 'POST',
    });
    board = await ownerApi('/projects/project_resume_3d/storyboard');
  }

  const ownerContext = await browser.newContext({
    locale: 'zh-CN',
    viewport: { height: 900, width: 1440 },
  });
  const page = await ownerContext.newPage();
  await login(page, '产品拥有者（演示）');
  const startedAt = Date.now();
  await page.goto(`${BASE}/studio/project_resume_3d/storyboard`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('text=M3 制作就绪度', { timeout: 60_000 });
  await page.getByRole('button', { name: '总览', exact: true }).click();
  await page
    .waitForFunction(
      () =>
        document.querySelectorAll('.vc-overview__grid button').length === 50,
      { timeout: 30_000 },
    )
    .catch(() => {});
  const cards = await page.locator('.vc-overview__grid button').count();
  const renderMs = Date.now() - startedAt;
  const heapBefore = await page.evaluate(
    () => performance.memory?.usedJSHeapSize ?? 0,
  );
  for (let round = 0; round < 3; round += 1) {
    await page.getByRole('button', { name: '编辑', exact: true }).click();
    await page.waitForTimeout(250);
    await page.getByRole('button', { name: '总览', exact: true }).click();
    await page.waitForTimeout(350);
  }
  const heapAfter = await page.evaluate(
    () => performance.memory?.usedJSHeapSize ?? 0,
  );
  check(
    'VIS-020 50 卡片浏览器性能/重复切换稳定',
    cards === 50 &&
      renderMs < 8000 &&
      (heapBefore === 0 || heapAfter - heapBefore < 80_000_000),
    `${cards}/${renderMs}ms/${heapAfter - heapBefore}`,
  );
  await ownerContext.close();
  await ownerApi('/demo/reset', { body: '{}', method: 'POST' });

  const reviewerContext = await browser.newContext({
    locale: 'zh-CN',
    viewport: { height: 900, width: 1440 },
  });
  const reviewerPage = await reviewerContext.newPage();
  await login(reviewerPage, '审核员（演示）');
  await reviewerPage.goto(`${BASE}/studio/project_resume_3d/storyboard`, {
    waitUntil: 'domcontentloaded',
  });
  await reviewerPage.waitForSelector('text=M3 制作就绪度', {
    timeout: 60_000,
  });
  const reviewerText = await reviewerPage.locator('body').innerText();
  check(
    'VIS-017 Reviewer 画布无编辑入口且为只读',
    !reviewerText.includes('编辑视觉规范') &&
      !reviewerText.includes('新增镜头'),
    reviewerText.slice(0, 180),
  );
  await reviewerContext.close();
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
