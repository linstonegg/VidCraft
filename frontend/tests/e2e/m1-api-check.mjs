/**
 * M1 API 闭环检查（无需浏览器，直接打 Nitro Mock）。
 * 运行：node tests/e2e/m1-api-check.mjs
 * 前置：前端 dev:ele 已启动（Nitro 5320）。
 */

import process from 'node:process';

const BASE = process.env.M1_API_BASE ?? 'http://localhost:5320/api';
const results = [];

function check(name, ok, detail = '') {
  results.push({ detail, name, ok });
  process.stdout.write(
    `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}\n`,
  );
}

async function login(username) {
  const response = await fetch(`${BASE}/auth/login`, {
    body: JSON.stringify({ password: '123456', username }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  const body = await response.json();
  return body.data?.accessToken;
}

async function api(path, options = {}, token) {
  const response = await fetch(`${BASE}/creative-video/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...options.headers,
    },
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { body, status: response.status };
}

async function waitJob(jobId, token, timeoutMs = 20_000) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeoutMs) {
    const { body } = await api(`/jobs/${jobId}`, {}, token);
    last = body.data;
    if (['CANCELLED', 'FAILED', 'SUCCEEDED'].includes(last?.status)) {
      return last;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return last;
}

async function main() {
  const ownerToken = await login('owner');
  check('owner 登录', Boolean(ownerToken));

  // 先恢复种子，保证重复运行结果确定
  await api('/demo/reset', { method: 'POST' }, ownerToken);

  const list = await api('/projects?page=1&pageSize=20', {}, ownerToken);
  check(
    '四个 Seed 项目',
    list.body.data?.total === 4,
    `total=${list.body.data?.total}`,
  );
  check(
    'Seed 阶段正确',
    list.body.data?.items?.some(
      (item) =>
        item.id === 'project_resume_3d' && item.currentStage === 'ANGLES',
    ),
  );

  const idempotencyKey = `m1-create-${Date.now()}`;
  const payload = {
    aspectRatio: '9:16',
    description: 'M1 闭环检查项目',
    durationSec: 120,
    language: 'zh-CN',
    market: 'CN',
    marketingObjective: 'signup',
    platforms: ['douyin', 'wechat_channels'],
    productName: '测试产品',
    productUrl: 'https://example.com/test-product',
    rightsConfirmed: true,
    stylePreferences: ['反常规'],
    targetAudience: '独立开发者',
    title: `M1 检查项目 ${Date.now()}`,
  };
  const created = await api(
    '/projects',
    {
      body: JSON.stringify(payload),
      headers: { 'Idempotency-Key': idempotencyKey },
      method: 'POST',
    },
    ownerToken,
  );
  check('创建项目 201', created.status === 201 && created.body.code === 'OK');
  const projectId = created.body.data?.id;
  check(
    '创建后进入 INGEST 且 version=1',
    created.body.data?.currentStage === 'INGEST' &&
      created.body.data?.version === 1,
  );

  const replay = await api(
    '/projects',
    {
      body: JSON.stringify(payload),
      headers: { 'Idempotency-Key': idempotencyKey },
      method: 'POST',
    },
    ownerToken,
  );
  check(
    '幂等重放不会重复创建',
    replay.body.data?.id === projectId,
    replay.body.data?.id,
  );

  const conflict = await api(
    '/projects',
    {
      body: JSON.stringify({ ...payload, title: '不同内容' }),
      headers: { 'Idempotency-Key': idempotencyKey },
      method: 'POST',
    },
    ownerToken,
  );
  check(
    '同键不同内容返回 409',
    conflict.status === 409 && conflict.body.code === 'IDEMPOTENCY_CONFLICT',
  );

  const emptyIngestion = await api(
    `/projects/${projectId}/ingestion`,
    {},
    ownerToken,
  );
  check('新项目资料为空态', emptyIngestion.body.data?.status === 'EMPTY');

  const noSourceAnalysis = await api(
    `/projects/${projectId}/understanding/generate`,
    {
      body: JSON.stringify({ scope: 'FULL' }),
      method: 'POST',
    },
    ownerToken,
  );
  check(
    '无有效资料时分析返回 422',
    noSourceAnalysis.status === 422 &&
      noSourceAnalysis.body.code === 'NO_VALID_SOURCE',
  );

  const analyze = await api(
    `/projects/${projectId}/ingestion/analyze-url`,
    {
      body: JSON.stringify({ scenario: 'PARTIAL', url: payload.productUrl }),
      method: 'POST',
    },
    ownerToken,
  );
  check(
    'URL 模拟采集 202',
    analyze.status === 202 && Boolean(analyze.body.data?.jobId),
  );
  const job = await waitJob(analyze.body.data.jobId, ownerToken, 25_000);
  check(
    '采集任务成功',
    job?.status === 'SUCCEEDED',
    `${job?.status}/${job?.progress}`,
  );

  const afterUrl = await api(
    `/projects/${projectId}/ingestion`,
    {},
    ownerToken,
  );
  check(
    '采集后生成来源与部分状态',
    afterUrl.body.data?.sources?.length >= 1 &&
      ['PARTIAL', 'PUBLIC_SUCCESS'].includes(
        afterUrl.body.data?.urlCollectionStatus,
      ),
  );
  const evidence = await api(`/projects/${projectId}/evidence`, {}, ownerToken);
  check('证据已生成', (evidence.body.data?.length ?? 0) >= 1);

  const excluded = await api(
    `/projects/${projectId}/sources/${afterUrl.body.data.sources[0].id}`,
    {
      body: JSON.stringify({
        expectedVersion: afterUrl.body.data.sources[0].version,
        patch: { includedInAnalysis: false },
      }),
      method: 'PATCH',
    },
    ownerToken,
  );
  check(
    '排除来源生效',
    excluded.body.data?.sources?.some((item) => item.status === 'EXCLUDED'),
  );

  const includeAgain = await api(
    `/projects/${projectId}/ingestion`,
    {},
    ownerToken,
  );
  const source = includeAgain.body.data.sources[0];
  await api(
    `/projects/${projectId}/sources/${source.id}`,
    {
      body: JSON.stringify({
        expectedVersion: source.version,
        patch: { includedInAnalysis: true },
      }),
      method: 'PATCH',
    },
    ownerToken,
  );

  const beforeConfirm = await api(
    `/projects/${projectId}/ingestion`,
    {},
    ownerToken,
  );
  const readySource = beforeConfirm.body.data.sources.find(
    (item) => item.includedInAnalysis,
  );
  const confirmation = await api(
    `/projects/${projectId}/ingestion/confirm`,
    {
      body: JSON.stringify({
        expectedVersion: beforeConfirm.body.data.version,
        includedSourceIds: [readySource.id],
      }),
      method: 'POST',
    },
    ownerToken,
  );
  check(
    '确认资料生成快照',
    confirmation.status === 201 && Boolean(confirmation.body.data?.id),
  );
  const snapshotId = confirmation.body.data?.id;

  const generate = await api(
    `/projects/${projectId}/understanding/generate`,
    {
      body: JSON.stringify({ ingestionSnapshotId: snapshotId, scope: 'FULL' }),
      method: 'POST',
    },
    ownerToken,
  );
  check(
    '产品理解任务 202',
    generate.status === 202 && Boolean(generate.body.data?.jobId),
  );
  const duplicateJob = await api(
    `/projects/${projectId}/understanding/generate`,
    {
      body: JSON.stringify({ ingestionSnapshotId: snapshotId, scope: 'FULL' }),
      method: 'POST',
    },
    ownerToken,
  );
  check(
    '活动任务未完成时重复提交返回 409',
    duplicateJob.status === 409 && duplicateJob.body.code === 'CONFLICT',
  );
  const understandingJob = await waitJob(
    generate.body.data.jobId,
    ownerToken,
    30_000,
  );
  check(
    '理解任务成功',
    understandingJob?.status === 'SUCCEEDED',
    understandingJob?.status,
  );

  const revisions = await api(
    `/projects/${projectId}/understanding/revisions`,
    {},
    ownerToken,
  );
  const draft = revisions.body.data?.[0];
  check(
    '生成 DRAFT 修订',
    draft?.status === 'DRAFT' && draft?.revisionNo === 1,
  );
  check(
    '报告包含画像/功能/痛点/价值线索',
    (draft?.personas?.length ?? 0) >= 1 &&
      (draft?.features?.length ?? 0) >= 1 &&
      (draft?.painPoints?.length ?? 0) >= 5 &&
      (draft?.valueAngleSeeds?.length ?? 0) >= 1,
    `p=${draft?.personas?.length} f=${draft?.features?.length} pain=${draft?.painPoints?.length} seed=${draft?.valueAngleSeeds?.length}`,
  );

  const updated = await api(
    `/projects/${projectId}/understanding/revisions/${draft.id}`,
    {
      body: JSON.stringify({
        expectedVersion: draft.version,
        patch: { productSummary: '人工修改后的产品定位（M1 闭环检查）' },
      }),
      method: 'PATCH',
    },
    ownerToken,
  );
  check(
    '编辑草稿成功',
    updated.body.data?.productSummary?.includes('人工修改'),
  );

  const staleEdit = await api(
    `/projects/${projectId}/understanding/revisions/${draft.id}`,
    {
      body: JSON.stringify({
        expectedVersion: 1,
        patch: { category: '冲突测试' },
      }),
      method: 'PATCH',
    },
    ownerToken,
  );
  check(
    '旧版本号编辑返回 409',
    staleEdit.status === 409 && staleEdit.body.code === 'VERSION_CONFLICT',
  );

  const submitReview = await api(
    `/projects/${projectId}/understanding/revisions/${draft.id}/submit-review`,
    {
      body: JSON.stringify({ expectedVersion: updated.body.data.version }),
      method: 'POST',
    },
    ownerToken,
  );
  const projectAfterSubmit = await api(
    `/projects/${projectId}`,
    {},
    ownerToken,
  );
  check(
    '提交审核后项目状态为 WAITING_REVIEW',
    submitReview.status === 200 &&
      projectAfterSubmit.body.data?.status === 'WAITING_REVIEW',
    `${submitReview.status}/${projectAfterSubmit.body.data?.status}`,
  );

  const approve = await api(
    `/projects/${projectId}/understanding/revisions/${draft.id}/approve`,
    {
      body: JSON.stringify({
        acceptHypotheses: true,
        expectedVersion:
          submitReview.body.data?.version ?? updated.body.data.version,
      }),
      method: 'POST',
    },
    ownerToken,
  );
  check(
    '审核通过',
    approve.status === 200 &&
      approve.body.data?.revision?.status === 'APPROVED',
  );
  check(
    '项目阶段进入 ANGLES',
    approve.body.data?.project?.currentStage === 'ANGLES',
  );

  const handoff = await api(
    `/projects/${projectId}/understanding/handoff`,
    {},
    ownerToken,
  );
  check(
    'M2 交接引用可用',
    handoff.body.data?.productUnderstandingRevisionId === draft.id &&
      handoff.body.data?.ingestionSnapshotId === snapshotId,
  );

  const addedAsset = await api(
    `/projects/${projectId}/assets`,
    {
      body: JSON.stringify({
        filename: 'stale-check.png',
        kind: 'image',
        mimeType: 'image/png',
        sizeBytes: 1024,
      }),
      method: 'POST',
    },
    ownerToken,
  );
  check('确认后新增素材成功', addedAsset.status === 201);
  const ingestionAfterChange = await api(
    `/projects/${projectId}/ingestion`,
    {},
    ownerToken,
  );
  check(
    '资料变化后资料状态为 STALE',
    ingestionAfterChange.body.data?.status === 'STALE',
    ingestionAfterChange.body.data?.status,
  );
  const staleRevision = await api(
    `/projects/${projectId}/understanding/revisions/${draft.id}`,
    {},
    ownerToken,
  );
  check(
    '资料变化后已确认报告标记 STALE',
    staleRevision.body.data?.status === 'STALE',
    staleRevision.body.data?.status,
  );
  const staleHandoff = await api(
    `/projects/${projectId}/understanding/handoff`,
    {},
    ownerToken,
  );
  check('资料变化后 M2 交接失效', staleHandoff.body.data === null);

  const staleGeneration = await api(
    `/projects/${projectId}/understanding/generate`,
    {
      method: 'POST',
      body: JSON.stringify({ ingestionSnapshotId: snapshotId, scope: 'FULL' }),
    },
    ownerToken,
  );
  check('过期资料必须重新确认快照后才可分析', staleGeneration.status === 409);
  const freshIngestion = await api(
    `/projects/${projectId}/ingestion`,
    {},
    ownerToken,
  );
  const freshSnapshot = await api(
    `/projects/${projectId}/ingestion/confirm`,
    {
      method: 'POST',
      body: JSON.stringify({
        expectedVersion: freshIngestion.body.data.version,
        includedSourceIds: freshIngestion.body.data.sources
          .filter(
            (source) => source.includedInAnalysis && source.status === 'READY',
          )
          .map((source) => source.id),
      }),
    },
    ownerToken,
  );
  const noPollJob = await api(
    `/projects/${projectId}/understanding/generate`,
    {
      body: JSON.stringify({
        ingestionSnapshotId: freshSnapshot.body.data.id,
        scenario: 'UNDERSTANDING_SUCCESS',
        scope: 'PAIN_POINTS',
      }),
      method: 'POST',
    },
    ownerToken,
  );
  await new Promise((resolve) => setTimeout(resolve, 5200));
  const revisionsAfterNoPoll = await api(
    `/projects/${projectId}/understanding/revisions`,
    {},
    ownerToken,
  );
  check(
    '不轮询任务时读取页面仍会完成任务并生成修订',
    noPollJob.status === 202 &&
      (revisionsAfterNoPoll.body.data?.length ?? 0) >= 2,
    `revs=${revisionsAfterNoPoll.body.data?.length}`,
  );
  const reanalyzed = revisionsAfterNoPoll.body.data?.[0];
  check(
    '重新分析保留人工修改的产品定位',
    reanalyzed?.productSummary?.includes('人工修改'),
    reanalyzed?.productSummary,
  );

  const badAssetDelete = await api(
    `/projects/${projectId}/assets/${addedAsset.body.data?.id}`,
    {
      body: JSON.stringify({ expectedVersion: 99 }),
      method: 'DELETE',
    },
    ownerToken,
  );
  check(
    '删除素材旧版本返回 409',
    badAssetDelete.status === 409 &&
      badAssetDelete.body.code === 'VERSION_CONFLICT',
  );

  let projectBeforeArchive = await api(
    `/projects/${projectId}`,
    {},
    ownerToken,
  );
  for (
    let attempt = 0;
    attempt < 5 && !projectBeforeArchive.body.data;
    attempt += 1
  ) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    projectBeforeArchive = await api(`/projects/${projectId}`, {}, ownerToken);
  }
  check(
    '归档前项目仍可读取',
    Boolean(projectBeforeArchive.body.data),
    `${projectBeforeArchive.status}`,
  );
  const badArchive = await api(
    `/projects/${projectId}/archive`,
    {
      body: JSON.stringify({
        expectedVersion: projectBeforeArchive.body.data.version + 5,
      }),
      method: 'POST',
    },
    ownerToken,
  );
  check(
    '归档旧版本返回 409',
    badArchive.status === 409 && badArchive.body.code === 'VERSION_CONFLICT',
  );
  const archived = await api(
    `/projects/${projectId}/archive`,
    {
      body: JSON.stringify({
        expectedVersion: projectBeforeArchive.body.data.version,
      }),
      method: 'POST',
    },
    ownerToken,
  );
  check('归档成功后返回 archivedAt', Boolean(archived.body.data?.archivedAt));
  await api(
    `/projects/${projectId}/restore`,
    {
      body: JSON.stringify({ expectedVersion: archived.body.data.version }),
      method: 'POST',
    },
    ownerToken,
  );

  const reviewerToken = await login('reviewer');
  const reviewerRead = await api('/projects', {}, reviewerToken);
  const reviewerCreate = await api(
    '/projects',
    {
      body: JSON.stringify({ ...payload, rightsConfirmed: true }),
      method: 'POST',
    },
    reviewerToken,
  );
  check('reviewer 可读', reviewerRead.status === 200);
  check(
    'reviewer 创建被 403',
    reviewerCreate.status === 403 && reviewerCreate.body.code === 'FORBIDDEN',
  );
  const reviewerComment = await api(
    `/projects/${projectId}/understanding/revisions/${draft.id}/comment`,
    {
      body: JSON.stringify({ note: '审核意见测试：请补充痛点证据' }),
      method: 'POST',
    },
    reviewerToken,
  );
  check(
    'reviewer 可提交审核意见',
    reviewerComment.status === 200 &&
      (reviewerComment.body.data?.reviewLog?.length ?? 0) >= 1,
    reviewerComment.status,
  );

  const missing = await api('/projects/not_exists', {}, ownerToken);
  check(
    '不存在项目返回 404',
    missing.status === 404 && missing.body.code === 'PROJECT_NOT_FOUND',
  );

  const duplicateCopy = await api(
    '/projects/project_resume_3d/duplicate',
    {
      body: JSON.stringify({ copyAssetRefs: true }),
      method: 'POST',
    },
    ownerToken,
  );
  const duplicateCopyIngestion = await api(
    `/projects/${duplicateCopy.body.data?.id}/ingestion`,
    {},
    ownerToken,
  );
  const copiedAssetIds = new Set(
    (duplicateCopyIngestion.body.data?.assets ?? []).map((item) => item.id),
  );
  check(
    '复制项目后来源正确关联新素材',
    duplicateCopy.status === 201 &&
      (duplicateCopyIngestion.body.data?.sources ?? []).every(
        (item) => !item.assetId || copiedAssetIds.has(item.assetId),
      ),
  );
  const duplicateNoAssets = await api(
    '/projects/project_resume_3d/duplicate',
    {
      body: JSON.stringify({ copyAssetRefs: false }),
      method: 'POST',
    },
    ownerToken,
  );
  const duplicateNoAssetsIngestion = await api(
    `/projects/${duplicateNoAssets.body.data?.id}/ingestion`,
    {},
    ownerToken,
  );
  check(
    '复制项目可选择不复制素材引用',
    duplicateNoAssets.status === 201 &&
      (duplicateNoAssetsIngestion.body.data?.assets?.length ?? -1) === 0,
  );

  const reset = await api('/demo/reset', { method: 'POST' }, ownerToken);
  check('Demo Reset 恢复四个种子', reset.body.data?.restoredProjects === 4);

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

await main();
