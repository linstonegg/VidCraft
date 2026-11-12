import { Buffer } from 'node:buffer';
/** M1.1/M2.1 P0 浏览器交互检查：研究助手、素材使用位置、宣称冲突、就绪度、生成建议。 */
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/* eslint-disable unicorn/no-await-expression-member */
import { chromium } from 'playwright';

const BASE = process.env.M11_BASE_URL ?? 'http://localhost:5555';
const API = process.env.M11_API_BASE ?? 'http://localhost:5320/api';
const DIR = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(DIR, '../../../docs/screenshots/m11');

async function shot(page, name) {
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(SHOTS, `${name}.png`) });
}

let ownerToken = '';
async function resetFull() {
  const auth = await fetch(`${API}/auth/login`, {
    body: JSON.stringify({ password: '123456', username: 'owner' }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  ownerToken = (await auth.json()).data.accessToken;
  await fetch(`${API}/creative-video/v1/demo/reset`, {
    body: JSON.stringify({}),
    headers: {
      Authorization: `Bearer ${ownerToken}`,
      'content-type': 'application/json',
    },
    method: 'POST',
  });
}

async function ownerApi(path, options = {}) {
  const response = await fetch(`${API}/creative-video/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${ownerToken}`,
      'content-type': 'application/json',
      ...options.headers,
    },
  });
  return response.json();
}

async function setStoryboardShotCount(target) {
  await resetFull();
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const board = await ownerApi('/projects/project_resume_3d/storyboard');
    const shots = board.data.shots;
    if (shots.length === target) return target;
    await (shots.length > target
      ? ownerApi(`/projects/project_resume_3d/shots/${shots.at(-1).shotId}`, {
          method: 'DELETE',
        })
      : ownerApi('/projects/project_resume_3d/shots', {
          body: JSON.stringify({}),
          method: 'POST',
        }));
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error(`无法把分镜调整到 ${target}`);
}

async function createR2CanvasScenario() {
  await resetFull();
  const revisions = await ownerApi(
    '/projects/project_resume_3d/understanding/revisions',
  );
  const r1 = revisions.data.find((item) => item.status === 'APPROVED');
  const forked = await ownerApi(
    `/projects/project_resume_3d/understanding/revisions/${r1.id}/fork`,
    { body: JSON.stringify({}), method: 'POST' },
  );
  const patched = await ownerApi(
    `/projects/project_resume_3d/understanding/revisions/${forked.data.id}`,
    {
      body: JSON.stringify({
        expectedVersion: forked.data.version,
        patch: {
          prohibitedClaims: ['不得宣称未经验证的转化率提升'],
        },
      }),
      method: 'PATCH',
    },
  );
  const submitted = await ownerApi(
    `/projects/project_resume_3d/understanding/revisions/${patched.data.id}/submit-review`,
    {
      body: JSON.stringify({ expectedVersion: patched.data.version }),
      method: 'POST',
    },
  );
  await ownerApi(
    `/projects/project_resume_3d/understanding/revisions/${submitted.data.id}/approve`,
    {
      body: JSON.stringify({
        acceptHypotheses: true,
        expectedVersion: submitted.data.version,
      }),
      method: 'POST',
    },
  );
}

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
  for (let s = 1; s <= 12; s += 1) {
    await page.mouse.move(sx + ((rect.width - 24) * s) / 12, y, { steps: 2 });
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
}

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ detail, name, ok });
  process.stdout.write(
    `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}\n`,
  );
};

await resetFull();
await mkdir(SHOTS, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.M11_BROWSER_CHANNEL ?? 'chrome',
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

try {
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=请按住滑块拖动', { timeout: 90_000 });
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: '产品拥有者（演示）' }).click();
  await page.waitForTimeout(400);
  await dragCaptcha(page);
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'login' }).click();
  await page.waitForURL('**/dashboard', { timeout: 90_000 });

  // 1. 研究助手
  await page.goto(`${BASE}/studio/project_resume_3d/ingest`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('text=产品资料采集', { timeout: 60_000 });
  await page.getByRole('button', { name: /产品研究助手/ }).click();
  await page.waitForSelector('text=资料缺口', { timeout: 20_000 });
  await page.waitForSelector('text=建议优先回答', { timeout: 20_000 });
  const researchText = await page.locator('body').innerText();
  check(
    'M11-UI-01 研究助手展示资料缺口',
    researchText.includes('缺少结果类证据'),
  );
  await shot(page, 'm11-research');
  check(
    'M11-UI-02 问题区与风险提示可见',
    researchText.includes('建议优先回答') && researchText.includes('USER_NOTE'),
  );
  await page
    .locator('textarea')
    .first()
    .fill('客户反馈：他们最在意跟进提醒是否可追溯。');
  await page.getByRole('button', { name: '保存回答' }).first().click();
  await page.waitForTimeout(900);
  const historyText = await page.locator('body').innerText();
  check(
    'M11-UI-09 访谈记录可查看并提议事实',
    historyText.includes('访谈记录') &&
      historyText.includes('提议为事实') &&
      historyText.includes('客户反馈'),
  );
  await page.getByRole('button', { name: '提议为事实' }).first().click();
  await page.waitForTimeout(700);
  check(
    'M11-UI-10 事实提议只生成待审核候选',
    (await page.locator('body').innerText()).includes('已生成候选事实'),
  );
  await page.goto(`${BASE}/studio/project_resume_3d/ingest`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('text=产品资料采集', { timeout: 30_000 });

  // 2. 素材使用位置
  await page
    .getByRole('button', { name: /的更多操作/ })
    .first()
    .click();
  await page.getByRole('menuitem', { name: '使用位置' }).first().click();
  await page.waitForSelector('text=内容历史', { timeout: 20_000 });
  await page.waitForSelector('text=已在什么地方使用', { timeout: 20_000 });
  await page.waitForTimeout(400);
  const assetText = await page.locator('body').innerText();
  check(
    'M11-UI-03 素材内容版本与使用位置可见',
    assetText.includes('内容历史') &&
      assetText.includes('已在什么地方使用') &&
      assetText.includes('asset-content:'),
    JSON.stringify({
      history: assetText.includes('内容历史'),
      usage: assetText.includes('已在什么地方使用'),
      code: assetText.includes('asset-content:'),
      hasDrawer: assetText.includes('素材内容版本与使用位置'),
    }),
  );
  await page.locator('.vc-asset-usage__rights').click();
  await page.getByRole('option', { name: '授权不确定' }).click();
  await page.getByRole('button', { name: '保存用途' }).click();
  await page.waitForTimeout(700);
  check(
    'VIS-034 撤权素材阻止预览与下载并给出提示',
    (await page.locator('body').innerText()).includes(
      '已撤权素材：禁止预览、下载和新引用',
    ),
  );
  await page.locator('.vc-asset-usage__rights').click();
  await page.getByRole('option', { name: '已声明可用' }).click();
  await page.getByRole('button', { name: '保存用途' }).click();
  await page.waitForTimeout(700);

  await page.getByRole('button', { name: /新增演示内容版本/ }).click();
  await page.waitForTimeout(1000);
  const assetV2 = await page.locator('body').innerText();
  check('M11-UI-04 新增内容版本 V2 不覆盖 V1', assetV2.includes('v2 · READY'));
  await page.getByRole('button', { name: '预览采用最新版本的影响' }).click();
  await page.waitForTimeout(700);
  const replaceText = await page.locator('body').innerText();
  check(
    'M11-UI-05 采用新内容前展示影响预览',
    replaceText.includes('采用新内容需新草稿'),
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // 3. 宣称冲突
  await page.goto(`${BASE}/studio/project_crm/understanding`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('text=产品理解', { timeout: 60_000 });
  await page.getByRole('button', { name: /宣称冲突与裁决/ }).click();
  await page.waitForSelector('text=冲突列表', { timeout: 20_000 });
  const claimText = await page.locator('body').innerText();
  check(
    'M11-UI-06 冲突抽屉展示两类冲突',
    claimText.includes('自动发送回访能力存在版本范围冲突') &&
      claimText.includes('量化转化宣称缺少证据'),
  );
  await shot(page, 'm11-claims');
  check(
    'M11-UI-07 量化主张显示 BLOCKED',
    claimText.includes('BLOCKED') &&
      claimText.includes('claim-crm-conversion-80'),
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: '版本对比' }).click();
  await page.waitForSelector('text=理解报告字段级对比', { timeout: 20_000 });
  check(
    'M11-UI-11 理解报告提供字段级版本对比',
    (await page.locator('body').innerText()).includes('Diff 只读'),
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 4. 制作就绪度
  await page.goto(`${BASE}/studio/project_resume_3d/storyboard`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('text=M3 制作就绪度', { timeout: 60_000 });
  const readinessText = await page.locator('body').innerText();
  check(
    'M21-UI-01 就绪度显示可进入 M3',
    readinessText.includes('可进入 M3 准备'),
    readinessText.includes('暂不可进入') ? 'blocked' : 'ok',
  );
  await page.waitForSelector('text=画布约束', { timeout: 30_000 });
  await page.waitForSelector('text=研究上下文', { timeout: 20_000 });
  await page.waitForSelector('text=研究问题', { timeout: 20_000 });
  await page.waitForSelector('text=资产撤权', { timeout: 20_000 });
  await page.waitForSelector('text=主张阻塞', { timeout: 20_000 });
  const contextPanelText = await page.locator('body').innerText();
  check(
    'P1-UI-05 画布约束展示研究上下文/资产撤权/主张阻塞',
    contextPanelText.includes('画布约束'),
  );

  check(
    'P1-UI-03 资产/角色关系只读索引可见',
    (await page.locator('body').innerText()).includes('资产 / 角色关系') &&
      (await page.locator('body').innerText()).includes('全部资产关系') &&
      (await page.locator('body').innerText()).includes('只读索引'),
  );
  const graph = page.locator('[data-testid="asset-graph"]');
  if ((await graph.count()) > 0) {
    await graph.scrollIntoViewIfNeeded();
    const box = await graph.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        box.x + box.width / 2 + 70,
        box.y + box.height / 2 + 30,
        { steps: 4 },
      );
      await page.mouse.up();
    }
    const moved = await graph.locator('g').first().getAttribute('transform');
    await page.getByRole('button', { name: '放大关系图' }).click();
    const zoomed = await graph.locator('g').first().getAttribute('transform');
    await page.getByRole('button', { name: '重置关系图' }).click();
    const reset = await graph.locator('g').first().getAttribute('transform');
    check(
      'P1-UI-07 资产关系图支持拖拽与缩放',
      Boolean(moved?.includes('translate(')) &&
        Boolean(zoomed?.includes('scale(1.15)')) &&
        Boolean(reset?.includes('translate(0 0) scale(1)')),
      `${moved} / ${zoomed}`,
    );
  }

  const graphNode = graph.locator('[data-node-key^="asset:"]').first();
  if ((await graphNode.count()) > 0) {
    await graphNode.scrollIntoViewIfNeeded();
    const nodeBox = await graphNode.boundingBox();
    const beforeX = await graphNode.locator('rect').getAttribute('x');
    if (nodeBox) {
      await page.mouse.move(
        nodeBox.x + nodeBox.width / 2,
        nodeBox.y + nodeBox.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        nodeBox.x + nodeBox.width / 2 + 50,
        nodeBox.y + nodeBox.height / 2 + 20,
        { steps: 4 },
      );
      await page.mouse.up();
    }
    const afterX = await graphNode.locator('rect').getAttribute('x');
    await page.getByRole('button', { name: '自动布局关系图' }).click();
    const resetX = await graphNode.locator('rect').getAttribute('x');
    check(
      'P1-UI-08 资产关系图节点可拖拽并自动布局',
      beforeX !== afterX && resetX === beforeX,
      `${beforeX}/${afterX}/${resetX}`,
    );
  }

  if ((await graphNode.count()) > 0) {
    const layeredX = await graphNode.locator('rect').getAttribute('x');
    await page.getByRole('button', { name: '环绕布局关系图' }).click();
    await page.waitForTimeout(400);
    const radialX = await graphNode.locator('rect').getAttribute('x');
    await page.getByRole('button', { name: '分层布局关系图' }).click();
    await page.waitForTimeout(400);
    const layeredAgain = await graphNode.locator('rect').getAttribute('x');
    check(
      'P1-UI-09 资产关系图支持分层/环绕自动布局',
      layeredX !== radialX && layeredAgain === layeredX,
      `${layeredX}/${radialX}/${layeredAgain}`,
    );
  }

  if ((await graphNode.count()) > 0) {
    const layeredBefore = await graphNode.locator('rect').getAttribute('x');
    await page.getByRole('button', { name: '力导向布局关系图' }).click();
    await page.waitForTimeout(600);
    const forceX = await graphNode.locator('rect').getAttribute('x');
    const coordinates = await graph
      .locator('[data-node-key]')
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const rect = node.querySelector('rect');
          return [
            Number(rect?.getAttribute('x')),
            Number(rect?.getAttribute('y')),
          ];
        }),
      );
    check(
      'P1-UI-10 力导向布局改变节点位置且避免完全重叠',
      layeredBefore !== forceX &&
        coordinates.length > 1 &&
        coordinates.every(
          ([x, y]) => Number.isFinite(x) && Number.isFinite(y),
        ) &&
        new Set(coordinates.map((item) => item.join(','))).size ===
          coordinates.length,
      `${layeredBefore}/${forceX}/${coordinates.length}`,
    );
  }

  check(
    'M21-UI-05 镜头详情提供资产引用入口',
    (await page.locator('body').innerText()).includes('角色/场景/品牌资产引用'),
  );
  const overviewStartedAt = Date.now();
  await page.getByRole('button', { name: '总览', exact: true }).click();
  await page.waitForSelector('text=分镜总览', { timeout: 20_000 });
  const overviewRenderMs = Date.now() - overviewStartedAt;
  check(
    'VIS-020 15 镜头总览首屏渲染在预算内',
    overviewRenderMs < 5000,
    `${overviewRenderMs}ms`,
  );
  const overviewBeatCount = await page
    .locator('.vc-overview__groups > .vc-overview__beat')
    .count();
  check(
    'M21-UI-07 分镜总览按正式顺序与 Beat 分组展示全部镜头',
    (await page.locator('.vc-overview__grid button').count()) === 15 &&
      overviewBeatCount === 7,
    `${await page.locator('.vc-overview__grid button').count()}/${overviewBeatCount}`,
  );
  await page.getByRole('button', { name: '调整播放顺序' }).click();
  await page.waitForSelector('.vc-order-row', { timeout: 20_000 });
  check(
    'P1-UI-04 总览排序对话框只做同 Beat 调整预览',
    (await page.locator('.vc-order-row').count()) === 15,
    `${await page.locator('.vc-order-row').count()}`,
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.locator('.vc-overview__grid button').first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '查看明细' }).first().click();
  await page.waitForTimeout(500);
  const detailText = await page.locator('body').innerText();
  await page.getByRole('button', { name: '编辑视觉规范' }).click();
  await page.waitForSelector('text=角色/场景/品牌资产引用', {
    timeout: 20_000,
  });
  check(
    'M21-UI-04 视觉规范提供资产引用选择器',
    (await page.locator('body').innerText()).includes('只能写入视觉规范草稿'),
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await shot(page, 'm21-readiness');
  check(
    'M21-UI-02 就绪度包含镜头/参考图/预演项',
    detailText.includes('参考图有效') && detailText.includes('预演已批准'),
  );

  // 5. 生成建议规格
  await page.goto(`${BASE}/studio/project_resume_3d/animatic`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('text=M3 制作准备', { timeout: 60_000 });
  await page.getByRole('button', { name: '保存首镜建议' }).click();
  await page.waitForTimeout(1200);
  const specText = await page.locator('body').innerText();
  await shot(page, 'm21-generation-specs');
  check(
    'M21-UI-03 保存非付费建议规格后状态变化',
    specText.includes('CURRENT 1') && specText.includes('已保存非付费生成建议'),
  );
  check(
    'M21-UI-06 制作准备按生成方式分组且显示有效性',
    specText.includes('种生成方式') &&
      specText.includes('当前有效') &&
      specText.includes('M3 制作准备') &&
      specText.includes('采用素材') &&
      specText.includes('进入镜头生产工作台') &&
      specText.includes('逐次报价'),
  );

  // 6. 研究回答 -> 新快照 -> R2
  await page.goto(`${BASE}/studio/project_resume_3d/ingest`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('text=产品资料采集', { timeout: 60_000 });
  await page.getByRole('button', { name: /产品研究助手/ }).click();
  await page.waitForSelector('text=确认资料快照并生成 R2', { timeout: 20_000 });
  await page.getByRole('button', { name: '确认资料快照并生成 R2' }).click();
  await page.waitForURL('**/understanding**', { timeout: 60_000 });
  check(
    'M11-UI-08 确认快照后进入 R2 生成页',
    page.url().includes('/understanding'),
    page.url(),
  );

  await page.goto(`${BASE}/studio/project_resume_3d/ingest`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('text=产品资料采集', { timeout: 60_000 });
  await page
    .getByRole('button', { name: /参考广告/ })
    .first()
    .click();
  await page.getByRole('menuitem', { name: '添加参考广告' }).click();
  await page.waitForURL('**/references', { timeout: 30_000 });
  await page.waitForSelector('text=仅创意参考', { timeout: 20_000 });
  const refAdText = await page.locator('body').innerText();
  check(
    'P1-UI-01 参考广告洞察与产品事实隔离可见',
    refAdText.includes('参考广告洞察') &&
      refAdText.includes('不能作为产品证据') &&
      refAdText.includes('仅创意参考') &&
      refAdText.includes('不可复制'),
  );

  await page.goto(`${BASE}/studio/project_resume_3d/ingest`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('text=产品资料采集', { timeout: 60_000 });
  await page.locator('input[type=file][accept="video/*"]').setInputFiles({
    buffer: Buffer.from('mock reference ad bytes'),
    mimeType: 'video/mp4',
    name: 'upload-sample.mp4',
  });
  await page.waitForURL('**/references', { timeout: 30_000 });
  await page.waitForSelector('text=仅创意参考', { timeout: 20_000 });
  check(
    'P1-UI-06 参考广告真实文件选择并保留文件名',
    (await page.locator('body').innerText()).includes('upload-sample.mp4'),
  );

  await page.goto(`${BASE}/studio/project_resume_3d/angles`, {
    waitUntil: 'domcontentloaded',
  });
  const anglesRefAd = await page
    .waitForSelector('text=参考创意语言（可选）', { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  check(
    'P1-UI-02 创意方向读取同一份参考广告洞察',
    anglesRefAd && (await page.locator('body').innerText()).includes('仅灵感'),
  );

  await page.goto(`${BASE}/studio/project_resume_3d/storyboard`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('text=M3 制作就绪度', { timeout: 30_000 });
  await page.getByRole('button', { name: '总览', exact: true }).click();
  await page.waitForSelector('.vc-overview__grid button', { timeout: 30_000 });
  await page.getByRole('button', { name: '调整播放顺序' }).click();
  await page.waitForSelector('.vc-order-row', { timeout: 20_000 });
  const pairIndex = await page
    .locator('.vc-order-row')
    .evaluateAll((rows) =>
      rows.findIndex(
        (row, index) =>
          index < rows.length - 1 &&
          row.querySelector('small')?.textContent ===
            rows[index + 1]?.querySelector('small')?.textContent,
      ),
    );
  if (pairIndex >= 0) {
    await page
      .locator('.vc-order-row')
      .nth(pairIndex)
      .getByRole('button', { name: '↓' })
      .click();
    await page.getByRole('button', { name: '创建排序草稿' }).click();
    await page.waitForTimeout(2500);
  }
  const bodyAfterOrder = await page.locator('body').innerText();
  check(
    'VIS-009/VIS-029 排序创建新 SB 草稿并可在版本选择器切换',
    pairIndex >= 0 && bodyAfterOrder.includes('R2'),
    `${pairIndex}/${bodyAfterOrder.includes('R2')}`,
  );

  const history = await ownerApi('/projects/project_resume_3d/storyboard');
  const approvedBoard = history.data.storyboards.find(
    (item) => item.status === 'APPROVED',
  );
  const historicalShot = history.data.shots.find((item) =>
    approvedBoard?.orderedShotRevisionIds.includes(item.id),
  );
  if (approvedBoard && historicalShot) {
    await page.goto(
      `${BASE}/studio/project_resume_3d/storyboard?sb=${approvedBoard.id}&shot=${historicalShot.shotId}`,
      { waitUntil: 'domcontentloaded' },
    );
    await page.waitForSelector('text=历史版本只读', { timeout: 30_000 });
    const anchorText = await page.locator('body').innerText();
    check(
      'VIS-010/033 历史 SB/Shot 锚点只读定位',
      anchorText.includes(historicalShot.shotId) && anchorText.includes('只读'),
      `${approvedBoard.id}/${historicalShot.shotId}`,
    );
  }

  await page.goto(`${BASE}/studio/project_resume_3d/storyboard`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('text=画布约束', { timeout: 30_000 });
  const questionButton = page.locator('.vc-signals__question').first();
  const hadQuestion = (await questionButton.count()) > 0;
  if (hadQuestion) {
    await questionButton.click();
    await page.waitForURL('**/ingest?question=*', { timeout: 20_000 });
    await page.waitForTimeout(1500);
  }
  check(
    'VIS-026/027 画布问题点击联动研究助手并高亮',
    !hadQuestion ||
      (await page.locator('.vc-research__question.is-highlighted').count()) ===
        1,
    `${page.url()} / ${await page.locator('.vc-research__question').count()}`,
  );

  for (const target of [0, 1, 6]) {
    await setStoryboardShotCount(target);
    await page.goto(`${BASE}/studio/project_resume_3d/storyboard`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(1200);
    const overviewButton = page.getByRole('button', {
      name: '总览',
      exact: true,
    });
    if ((await overviewButton.count()) > 0) {
      await overviewButton.click();
      await page.waitForTimeout(700);
    }
    await page
      .waitForFunction(
        (count) =>
          count === 0 ||
          document.querySelectorAll('.vc-overview__grid button').length ===
            count,
        target,
        { timeout: 10_000 },
      )
      .catch(() => {});
    const cards = await page.locator('.vc-overview__grid button').count();
    const bodyText = await page.locator('body').innerText();
    check(
      `M21-UI-08 分镜 ${target} 镜动态展示`,
      target === 0
        ? cards === 0 || bodyText.includes('还没有图文分镜')
        : cards === target,
      `${cards}`,
    );
  }
  await createR2CanvasScenario();
  await page.goto(`${BASE}/studio/project_resume_3d/storyboard`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForSelector('text=R2 主张回放', { timeout: 30_000 });
  const r2Text = await page.locator('body').innerText();
  check(
    'VIS-036 R2 历史声明在画布回放并阻断',
    r2Text.includes('R2 主张回放') &&
      r2Text.includes('不得宣称未经验证的转化率提升') &&
      r2Text.includes('新增禁用声明'),
  );
  await resetFull();

  check(
    'M11/M21 控制台无应用级错误',
    errors.filter(
      (error) =>
        !error.includes('api.iconify.design') &&
        !error.includes('Failed to load resource'),
    ).length === 0,
    errors.slice(0, 2).join(' | '),
  );
} catch (error) {
  check('M11/M21 UI 检查未中断', false, error.message);
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
