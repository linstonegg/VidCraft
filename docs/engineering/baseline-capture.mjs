/**
 * 原版（上游 v5.7.0）基线截图脚本，仅用于 M0 §2.1 留存证据。
 * 运行：node capture-baseline.mjs
 * 前置：D:\LSProject\_vben-baseline 的 dev:ele 已在 http://localhost:5777 启动。
 */
import { mkdir } from 'node:fs/promises';
import process from 'node:process';

import { chromium } from 'playwright';

const BASE_URL = process.env.BASELINE_URL ?? 'http://localhost:5777';
const OUT =
  process.env.BASELINE_OUT ?? 'D:/LSProject/VidCraft/docs/screenshots/baseline';

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
  await page.waitForTimeout(400);
}

async function run() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    locale: 'zh-CN',
    viewport: { width: 1440, height: 900 },
  });

  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=请按住滑块拖动', { timeout: 90_000 });
  await page.waitForTimeout(1200);
  process.stdout.write(`title: ${await page.title()}\n`);
  await page.screenshot({ path: `${OUT}/baseline-01-login.png` });

  await dragCaptcha(page);
  await page.getByRole('button', { name: 'login' }).click();
  await page.waitForURL('**/analytics', { timeout: 90_000 });
  await page.waitForTimeout(2500);
  process.stdout.write(`home url: ${page.url()}\n`);
  await page.screenshot({ path: `${OUT}/baseline-02-home.png` });

  await browser.close();
}

await run();
