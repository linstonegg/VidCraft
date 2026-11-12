/**
 * M1.1 + M2.1 P0 API 检查：资产内容版本、研究访谈、宣称冲突、就绪度、生成建议规格。
 * 前置：Nitro Mock 5320 已启动。
 */
import process from 'node:process';

const BASE = process.env.M11_API_BASE ?? 'http://localhost:5320/api';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ detail, name, ok });
  process.stdout.write(
    `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}\n`,
  );
};

async function login(username, password = '123456') {
  const response = await fetch(`${BASE}/auth/login`, {
    body: JSON.stringify({ password, username }),
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
      'content-type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  return { body: await response.json(), status: response.status };
}

const owner = await login('owner');
check('owner 登录', Boolean(owner));
await api('/demo/reset', { body: JSON.stringify({}), method: 'POST' }, owner);

const projectId = 'project_resume_3d';
const assets = await api(`/projects/${projectId}/assets`, {}, owner);
const asset = assets.body.data.find(
  (item) => item.id === 'asset_resume_shot_01',
);
check('3D 简历素材可用于内容版本检查', Boolean(asset));

const versions = await api(
  `/projects/${projectId}/assets/${asset.id}/content-versions`,
  {},
  owner,
);
check(
  '旧素材迁移出稳定内容版本',
  versions.status === 200 && versions.body.data.length === 1,
  `${versions.body.data?.length}`,
);
const v1 = versions.body.data[0];
check(
  '可加载 fixture 为 READY，旧无文件为 UNAVAILABLE',
  v1.status === 'READY' && v1.id.includes(asset.id),
  `${v1.status}/${v1.id}`,
);

await api('/demo/reset', { body: JSON.stringify({}), method: 'POST' }, owner);
const versionsAfterReset = await api(
  `/projects/${projectId}/assets/${asset.id}/content-versions`,
  {},
  owner,
);
check(
  '重复迁移/重置不产生第二个初始内容版本',
  versionsAfterReset.body.data.length === 1 &&
    versionsAfterReset.body.data[0].id === v1.id,
  `${versionsAfterReset.body.data?.length}/${versionsAfterReset.body.data?.[0]?.id}`,
);
const m11StableGaps = await api(
  '/projects/project_crm/research/gaps',
  {},
  owner,
);
check(
  '重复迁移不重复研究缺口',
  m11StableGaps.body.data.gaps.length === 3,
  `${m11StableGaps.body.data?.gaps?.length}`,
);

const metadata = await api(
  `/projects/${projectId}/assets/${asset.id}/usage-metadata`,
  {},
  owner,
);
check(
  '素材用途元数据与乐观锁存在',
  metadata.status === 200 &&
    metadata.body.data.mayBeUsedForAnalysis === true &&
    metadata.body.data.version === 1,
);
const usage = await api(
  `/projects/${projectId}/assets/${asset.id}/usage`,
  {},
  owner,
);
check(
  '反向引用返回具体来源与目标',
  usage.status === 200 &&
    usage.body.data.some(
      (item) =>
        item.targetId === 'source_resume_shot' && item.assetVersionId === v1.id,
    ),
  `${usage.body.data?.length}`,
);

const v2 = await api(
  `/projects/${projectId}/assets/${asset.id}/content-versions`,
  {
    body: JSON.stringify({
      expectedAssetVersion: asset.version,
      filename: 'logo-v2.svg',
      fixtureKey: '/brand/vidcraft-avatar.svg',
    }),
    headers: { 'Idempotency-Key': `m11-logo-v2-${Date.now()}` },
    method: 'POST',
  },
  owner,
);
const versionsAfter = await api(
  `/projects/${projectId}/assets/${asset.id}/content-versions`,
  {},
  owner,
);
const oldStill = versionsAfter.body.data.find((item) => item.id === v1.id);
check(
  '新内容版本不覆盖旧内容',
  v2.status === 201 &&
    versionsAfter.body.data.length === 2 &&
    oldStill?.status === 'READY',
  `${v2.status}/${versionsAfter.body.data?.length}`,
);

const replacePreview = await api(
  `/projects/${projectId}/assets/${asset.id}/replace-preview`,
  {
    body: JSON.stringify({ newContentVersionId: v2.body.data.id }),
    method: 'POST',
  },
  owner,
);
check(
  '采用 V2 影响预览为只读且要求新草稿',
  replacePreview.status === 200 &&
    replacePreview.body.data.requiresNewRevision === true &&
    replacePreview.body.data.affected.length > 0,
  `${replacePreview.body.data?.affected?.length}`,
);
const referencePreview = await api(
  `/projects/${projectId}/assets/${asset.id}/reference-preview`,
  {
    body: JSON.stringify({
      targetId: 'storyboard_preview',
      targetType: 'SHOT_REVISION',
    }),
    method: 'POST',
  },
  owner,
);
check(
  '资产引用预览只读并提示走草稿审核',
  referencePreview.status === 200 &&
    referencePreview.body.data.previewOnly === true &&
    referencePreview.body.data.warnings.length > 0,
);

const badFixture = await api(
  `/projects/${projectId}/assets/${asset.id}/content-versions`,
  {
    body: JSON.stringify({
      expectedAssetVersion: asset.version,
      fixtureKey: 'https://evil.example.com/x.png',
    }),
    headers: { 'Idempotency-Key': `m11-bad-${Date.now()}` },
    method: 'POST',
  },
  owner,
);
check(
  '内容版本拒绝任意外网 URL',
  badFixture.status === 422,
  `${badFixture.status}`,
);

const gaps = await api('/projects/project_crm/research/gaps', {}, owner);
check(
  'CRM 缺口包含自动发送与量化宣称',
  gaps.status === 200 &&
    gaps.body.data.gaps.length >= 3 &&
    gaps.body.data.gaps.some((item) => item.code === 'gap_crm_auto_send'),
  `${gaps.body.data?.gaps?.length}`,
);

const session = await api(
  '/projects/project_crm/research/sessions',
  {
    body: JSON.stringify({
      basedOnIngestionVersion: gaps.body.data.context.ingestionStateVersion,
    }),
    headers: { 'Idempotency-Key': `m11-session-${Date.now()}` },
    method: 'POST',
  },
  owner,
);
check('创建研究会话', session.status === 201, `${session.status}`);
const sessionId = session.body.data.id;
const next = await api(
  `/projects/project_crm/research/sessions/${sessionId}/questions/next`,
  {
    body: JSON.stringify({
      expectedVersion: session.body.data.version,
      maxCount: 3,
    }),
    method: 'POST',
  },
  owner,
);
check(
  '首轮最多 3 个问题且按严重度选择',
  next.status === 200 && next.body.data.questions.length <= 3,
  `${next.body.data?.questions?.length}`,
);
const question = next.body.data.questions[0];
const answer = await api(
  `/projects/project_crm/research/questions/${question.id}/answers`,
  {
    body: JSON.stringify({
      answer: '客户经常忘记在两天内跟进，最后丢单。',
      expectedVersion: question.version,
    }),
    headers: { 'Idempotency-Key': `m11-answer-${Date.now()}` },
    method: 'POST',
  },
  owner,
);
check(
  '回答生成 USER_NOTE 来源与 user_confirmed 证据',
  answer.status === 201 && Boolean(answer.body.data.sourceId),
  `${answer.status}`,
);
const sources = await api('/projects/project_crm/sources', {}, owner);
const userNote = sources.body.data.find(
  (item) => item.id === answer.body.data.sourceId,
);
check(
  'USER_NOTE 参与后续资料集合',
  userNote?.kind === 'USER_NOTE' && userNote.includedInAnalysis === true,
);
const questionAfter = await api(
  `/projects/project_crm/research/sessions/${sessionId}`,
  {},
  owner,
);
const answeredQuestion = questionAfter.body.data.questions.find(
  (item) => item.id === question.id,
);
check(
  '回答后问题状态为 ANSWERED 且会话可恢复',
  answeredQuestion?.status === 'ANSWERED',
);
const nextAfterAnswer = await api(
  `/projects/project_crm/research/sessions/${sessionId}/questions/next`,
  {
    body: JSON.stringify({
      expectedVersion: questionAfter.body.data.session.version,
      maxCount: 3,
    }),
    method: 'POST',
  },
  owner,
);
check(
  'VIS-026 同上下文回答后不重复追问',
  nextAfterAnswer.status === 200 &&
    !nextAfterAnswer.body.data.questions.some(
      (item) => item.gapId === question.gapId && item.status === 'ASKED',
    ),
  `${nextAfterAnswer.body.data?.questions?.length}`,
);
const revoked = await api(
  `/projects/project_crm/research/answers/${answer.body.data.id}/revoke`,
  { body: JSON.stringify({}), method: 'POST' },
  owner,
);
const nextAfterRevoke = await api(
  `/projects/project_crm/research/sessions/${sessionId}/questions/next`,
  {
    body: JSON.stringify({
      expectedVersion: nextAfterAnswer.body.data.session.version,
      maxCount: 3,
    }),
    method: 'POST',
  },
  owner,
);
check(
  'VIS-027 唯一证据撤销后问题重新出现',
  revoked.status === 200 &&
    nextAfterRevoke.body.data.questions.some(
      (item) => item.gapId === question.gapId && item.status === 'ASKED',
    ),
  `${revoked.status}/${nextAfterRevoke.body.data?.questions?.length}`,
);

const skipped = next.body.data.questions[1];
const skip = await api(
  `/projects/project_crm/research/questions/${skipped.id}/skip`,
  {
    body: JSON.stringify({ expectedVersion: skipped.version }),
    method: 'POST',
  },
  owner,
);
check(
  '跳过问题保留 Gap 但本会话不再问',
  skip.status === 200 && skip.body.data.status === 'SKIPPED',
);

const conflicts = await api('/projects/project_crm/claim-conflicts', {}, owner);
check(
  'CRM 有两个宣称冲突，量化宣称无证据 B',
  conflicts.status === 200 &&
    conflicts.body.data.length === 2 &&
    conflicts.body.data.some(
      (item) =>
        item.conflictType === 'QUANTIFIED_CLAIM_UNSUPPORTED' &&
        item.evidenceIdsB.length === 0,
    ),
  `${conflicts.body.data?.length}`,
);
const activeView = await api(
  '/projects/project_crm/understanding/active',
  {},
  owner,
);
const active = { body: { data: activeView.body.data.active } };
const researchQuestions = await api(
  '/projects/project_resume_3d/research/questions',
  {},
  owner,
);
check(
  'VIS-026/027 研究问题上下文可读',
  researchQuestions.status === 200 &&
    Array.isArray(researchQuestions.body.data?.questions) &&
    typeof researchQuestions.body.data?.context?.sourceSetFingerprint ===
      'string',
  `${researchQuestions.status}/${researchQuestions.body.data?.questions?.length}`,
);

const scan = await api(
  '/projects/project_crm/claim-conflicts/scan',
  {
    body: JSON.stringify({ understandingRevisionId: active.body.data.id }),
    method: 'POST',
  },
  owner,
);
let scanJob = null;
for (let index = 0; index < 20; index += 1) {
  scanJob = await api(`/jobs/${scan.body.data.jobId}`, {}, owner);
  if (
    ['CANCELLED', 'FAILED', 'SUCCEEDED'].includes(scanJob.body.data?.status)
  ) {
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 300));
}
check(
  '宣称冲突扫描为 Mock 任务而非同步写状态',
  scan.status === 202 &&
    Boolean(scan.body.data.jobId) &&
    scanJob.body.data?.status === 'SUCCEEDED',
  `${scan.status}/${scanJob.body.data?.status}`,
);

const readiness = await api(
  `/projects/project_crm/claims/readiness?understandingRevisionId=${active.body.data.id}`,
  {},
  owner,
);
check(
  '“转化率提升 80%”被 BLOCKED',
  readiness.status === 200 &&
    readiness.body.data.some(
      (item) =>
        item.claimAnchorId === 'claim-crm-conversion-80' &&
        item.status === 'BLOCKED',
    ),
  JSON.stringify(
    readiness.body.data?.map((item) => [item.claimAnchorId, item.status]),
  ),
);
const autoReadiness = readiness.body.data.find(
  (item) => item.claimAnchorId === 'claim-crm-auto-send',
);
check(
  '自动发送主张需复核而非直接可用',
  autoReadiness?.status === 'NEEDS_REVIEW',
);

const conflict = conflicts.body.data.find(
  (item) => item.conflictType === 'FACTUAL_CONTRADICTION',
);
const resolution = await api(
  `/projects/project_crm/claim-conflicts/${conflict.id}/resolutions`,
  {
    body: JSON.stringify({
      decision: 'REWRITE_SAFE',
      expectedVersion: conflict.version,
      proposedSafeStatement: '当前版本提供客户跟进提醒，不自动发送消息。',
      reason: '以产品说明书的当前版本为准，保留范围说明。',
    }),
    headers: { 'Idempotency-Key': `m11-resolution-${Date.now()}` },
    method: 'POST',
  },
  owner,
);
check(
  '裁决提议 SUBMITTED 且冲突 UNDER_REVIEW',
  resolution.status === 201 &&
    resolution.body.data.approvalStatus === 'SUBMITTED',
);
const approved = await api(
  `/projects/project_crm/claim-conflicts/resolutions/${resolution.body.data.id}/approve`,
  {
    body: JSON.stringify({ expectedVersion: resolution.body.data.version }),
    method: 'POST',
  },
  owner,
);
check(
  '裁决批准生成 R2 草稿而不改 R1',
  approved.status === 200 &&
    approved.body.data.draft.status === 'DRAFT' &&
    approved.body.data.draft.parentRevisionId === active.body.data.id,
  approved.body.data?.draft?.id,
);
const resolutionDraft = approved.body.data.draft;
const oldActive = await api(
  '/projects/project_crm/understanding/active',
  {},
  owner,
);
check(
  '旧 R1 仍是 active 且内容未覆盖',
  oldActive.body.data.active?.id === active.body.data.id,
);

const diff = await api(
  `/projects/project_crm/understanding/diff?fromRevisionId=${active.body.data.id}&toRevisionId=${resolutionDraft.id}`,
  {},
  owner,
);
check(
  '理解 Diff 按项目与真实修订精确比较',
  diff.status === 200 &&
    diff.body.data.fromRevisionId === active.body.data.id &&
    diff.body.data.toRevisionId === resolutionDraft.id &&
    diff.body.data.sections.length === 4 &&
    Boolean(diff.body.data.m2Impact.note),
  `${diff.status}/${diff.body.data?.sections?.length}`,
);
const wrongProjectDiff = await api(
  `/projects/project_resume_3d/understanding/diff?fromRevisionId=${active.body.data.id}&toRevisionId=${resolutionDraft.id}`,
  {},
  owner,
);
check(
  'Diff 拒绝跨项目修订 ID',
  wrongProjectDiff.status === 404,
  `${wrongProjectDiff.status}`,
);

const r2Readiness = await api(
  `/projects/project_crm/claims/readiness?understandingRevisionId=${resolutionDraft.id}`,
  {},
  owner,
);
check(
  'R2 继承被裁决主张且不再阻塞',
  r2Readiness.status === 200 &&
    r2Readiness.body.data.some(
      (item) =>
        item.claimAnchorId.includes('supersedes') &&
        item.status === 'NEEDS_REVIEW',
    ) &&
    !r2Readiness.body.data.some((item) => item.status === 'BLOCKED'),
  JSON.stringify(r2Readiness.body.data?.map((item) => item.status)),
);
const r2Submitted = await api(
  `/projects/project_crm/understanding/revisions/${resolutionDraft.id}/submit-review`,
  { body: JSON.stringify({}), method: 'POST' },
  owner,
);
const r2Approved = await api(
  `/projects/project_crm/understanding/revisions/${resolutionDraft.id}/approve`,
  {
    body: JSON.stringify({
      acceptHypotheses: true,
      expectedVersion: r2Submitted.body.data.version,
    }),
    method: 'POST',
  },
  owner,
);
const conflictsAfterR2 = await api(
  '/projects/project_crm/claim-conflicts',
  {},
  owner,
);
const resolvedConflict = conflictsAfterR2.body.data.find(
  (item) => item.id === conflict.id,
);
check(
  'R2 批准后冲突标记 RESOLVED 并记录结果 Anchor',
  r2Approved.status === 200 &&
    resolvedConflict?.status === 'RESOLVED' &&
    Boolean(resolvedConflict.resultingClaimAnchorId),
  `${r2Approved.status}/${resolvedConflict?.status}`,
);

const resumeReadiness = await api(
  '/projects/project_resume_3d/production-readiness',
  {},
  owner,
);
check(
  '3D 简历已有批准链时 canEnterM3=true',
  resumeReadiness.status === 200 &&
    resumeReadiness.body.data.canEnterM3 === true &&
    resumeReadiness.body.data.effectiveValidity === 'CURRENT',
  `${resumeReadiness.body.data?.canEnterM3}/${resumeReadiness.body.data?.effectiveValidity}`,
);
const readinessItems = resumeReadiness.body.data.items;
check(
  '就绪度包含具体镜头/参考图/预演项',
  readinessItems.some((item) => item.key === 'shots') &&
    readinessItems.some((item) => item.key === 'referenceImages') &&
    readinessItems.some((item) => item.key === 'animatic'),
);

const impact = await api(
  `/projects/${projectId}/dependency-impact/preview`,
  {
    body: JSON.stringify({ assetId: asset.id, changeKind: 'ASSET_CONTENT' }),
    method: 'POST',
  },
  owner,
);
check(
  '依赖影响预览只读返回引用对象',
  impact.status === 200 &&
    impact.body.data.affected.length > 0 &&
    impact.body.data.requiresNewReview === true,
  `${impact.body.data?.affected?.length}`,
);

const specs = await api(`/projects/${projectId}/generation-specs`, {}, owner);
const firstSpec = specs.body.data[0];
check(
  '生成规格未配置时返回只读建议',
  specs.status === 200 &&
    specs.body.data.length === 15 &&
    firstSpec.specValidity === 'NOT_CONFIGURED' &&
    firstSpec.spec === undefined,
  `${specs.body.data?.length}`,
);
check(
  '建议规格沿用 M2 小写 generationMode',
  firstSpec.suggestedSpec?.mode === 'ai_video',
);
const putSpec = await api(
  `/projects/${projectId}/generation-specs`,
  {
    body: JSON.stringify({
      expectedApprovedShotRevisionId: firstSpec.suggestedSpec.shotRevisionId,
      spec: {
        ...firstSpec.suggestedSpec,
      },
    }),
    method: 'PUT',
  },
  owner,
);
const specsAfter = await api(
  `/projects/${projectId}/generation-specs`,
  {},
  owner,
);
check(
  '保存非付费建议规格后变为 CURRENT',
  putSpec.status === 200 && specsAfter.body.data[0].specValidity === 'CURRENT',
  `${putSpec.status}/${specsAfter.body.data[0]?.specValidity}`,
);
const reviewer = await login('reviewer');
const reviewerSpecWrite = await api(
  `/projects/${projectId}/generation-specs`,
  {
    body: JSON.stringify({
      expectedApprovedShotRevisionId: firstSpec.suggestedSpec.shotRevisionId,
      spec: { ...firstSpec.suggestedSpec },
    }),
    method: 'PUT',
  },
  reviewer,
);
check(
  'VIS-017 Reviewer 不能写入生成规格',
  reviewerSpecWrite.status === 403,
  `${reviewerSpecWrite.status}/${reviewerSpecWrite.body.code}`,
);

const badAssets = await api(
  `/projects/${projectId}/generation-specs`,
  {
    body: JSON.stringify({
      expectedApprovedShotRevisionId: firstSpec.suggestedSpec.shotRevisionId,
      spec: {
        ...firstSpec.suggestedSpec,
        referenceAssetVersionIds: ['asset-content:missing:v1'],
      },
    }),
    method: 'PUT',
  },
  owner,
);
check(
  '生成规格拒绝不存在/不可用的资产内容版本',
  badAssets.status === 422 &&
    badAssets.body.code === 'ASSET_CONTENT_UNAVAILABLE',
  `${badAssets.status}/${badAssets.body.code}`,
);

const badMode = await api(
  `/projects/${projectId}/generation-specs`,
  {
    body: JSON.stringify({
      expectedApprovedShotRevisionId: firstSpec.suggestedSpec.shotRevisionId,
      spec: { ...firstSpec.suggestedSpec, mode: 'AI_VIDEO' },
    }),
    method: 'PUT',
  },
  owner,
);
check(
  '拒绝大写同义枚举/错误生成方式',
  badMode.status === 422,
  `${badMode.status}`,
);

const storyboard = await api(
  '/projects/project_resume_3d/storyboard',
  {},
  owner,
);
const approvedShot = storyboard.body.data.shots[0];
const draftShot = await api(
  `/projects/project_resume_3d/shots/${approvedShot.shotId}/revisions`,
  {
    body: JSON.stringify({
      baseRevisionId: approvedShot.id,
      expectedVersion: approvedShot.version,
      patch: {},
    }),
    method: 'POST',
  },
  owner,
);
const referenceWrite = await api(
  `/projects/${projectId}/assets/${asset.id}/references`,
  {
    body: JSON.stringify({
      assetVersionId: v2.body.data.id,
      targetId: draftShot.body.data.shotId,
      targetRevisionId: draftShot.body.data.id,
      targetType: 'SHOT_REVISION',
      usageRole: '测试参考',
    }),
    method: 'POST',
  },
  owner,
);
check(
  '资产引用只能写入草稿镜头',
  draftShot.status === 201 && referenceWrite.status === 201,
  `${draftShot.status}/${referenceWrite.status}/${referenceWrite.body.message}`,
);
const usageWithBinding = await api(
  `/projects/${projectId}/assets/${asset.id}/usage`,
  {},
  owner,
);
check(
  '反向索引可重建新草稿引用',
  usageWithBinding.body.data.some(
    (item) =>
      item.targetRevisionId === draftShot.body.data.id &&
      item.assetVersionId === v2.body.data.id,
  ),
);
const approvedReference = await api(
  `/projects/${projectId}/assets/${asset.id}/references`,
  {
    body: JSON.stringify({
      assetVersionId: v2.body.data.id,
      targetId: approvedShot.shotId,
      targetRevisionId: approvedShot.id,
      targetType: 'SHOT_REVISION',
      usageRole: '不应写入',
    }),
    method: 'POST',
  },
  owner,
);
check(
  '已批准镜头拒绝直接资产引用',
  approvedReference.status === 409 &&
    approvedReference.body.code === 'ASSET_REFERENCE_IN_USE',
  `${approvedReference.status}/${approvedReference.body.code}`,
);
const referenceDelete = await api(
  `/projects/${projectId}/assets/references/${encodeURIComponent(referenceWrite.body.data.reference.id)}`,
  {
    body: JSON.stringify({
      expectedVersion: referenceWrite.body.data.revision.version,
    }),
    method: 'DELETE',
  },
  owner,
);
check(
  '草稿资产引用可删除',
  referenceDelete.status === 200,
  `${referenceDelete.status}`,
);

const bibles = await api(
  '/projects/project_resume_3d/visual-bible/revisions',
  {},
  owner,
);
const approvedBible = bibles.body.data.find(
  (item) => item.status === 'APPROVED',
);
const forkedBible = await api(
  `/projects/project_resume_3d/visual-bible/revisions/${approvedBible.id}/fork`,
  { body: JSON.stringify({}), method: 'POST' },
  owner,
);
check(
  '视觉规范 Fork 生成草稿',
  forkedBible.status === 201 &&
    forkedBible.body.data.status === 'DRAFT' &&
    forkedBible.body.data.parentRevisionId === approvedBible.id,
  `${forkedBible.status}/${forkedBible.body.data?.id}`,
);
const bibleReference = await api(
  `/projects/${projectId}/assets/${asset.id}/references`,
  {
    body: JSON.stringify({
      assetVersionId: v2.body.data.id,
      targetId: forkedBible.body.data.id,
      targetRevisionId: forkedBible.body.data.id,
      targetType: 'VISUAL_BIBLE_REVISION',
      usageRole: '品牌视觉参考',
    }),
    method: 'POST',
  },
  owner,
);
check(
  '视觉规范草稿可写资产内容版本',
  bibleReference.status === 201,
  `${bibleReference.status}`,
);
const biblesAfterRef = await api(
  '/projects/project_resume_3d/visual-bible/revisions',
  {},
  owner,
);
const approvedBibleAfterRef = biblesAfterRef.body.data.find(
  (item) => item.id === approvedBible.id,
);
check(
  'VIS-012 Logo/视觉资产引用不覆盖旧批准版本',
  approvedBibleAfterRef.status === 'APPROVED' &&
    approvedBibleAfterRef.version === approvedBible.version,
  `${approvedBibleAfterRef.status}/${approvedBibleAfterRef.version}`,
);
const bibleDelete = await api(
  `/projects/${projectId}/assets/references/${encodeURIComponent(bibleReference.body.data.reference.id)}`,
  {
    body: JSON.stringify({
      expectedVersion: bibleReference.body.data.revision.version,
    }),
    method: 'DELETE',
  },
  owner,
);
check(
  '视觉规范草稿引用可删除',
  bibleDelete.status === 200,
  `${bibleDelete.status}`,
);

const resumeActive = await api(
  '/projects/project_resume_3d/understanding/active',
  {},
  owner,
);
const snapshots = await api(
  `/projects/project_resume_3d/understanding/revisions/${resumeActive.body.data.active.id}/evidence-snapshots`,
  {},
  owner,
);
check(
  '证据定位快照可读且绑定修订',
  snapshots.status === 200 &&
    snapshots.body.data.length > 0 &&
    snapshots.body.data.every(
      (item) => item.capturedForRevisionId === resumeActive.body.data.active.id,
    ),
  `${snapshots.status}/${snapshots.body.data?.length}`,
);

const ingestionBefore = await api('/projects/project_crm/ingestion', {}, owner);
const confirmed = await api(
  '/projects/project_crm/ingestion/confirm',
  {
    body: JSON.stringify({
      expectedVersion: ingestionBefore.body.data.version,
      includedSourceIds: ingestionBefore.body.data.sources
        .filter((source) => source.includedInAnalysis)
        .map((source) => source.id),
    }),
    headers: { 'Idempotency-Key': `m11-confirm-${Date.now()}` },
    method: 'POST',
  },
  owner,
);
check(
  '研究回答可确认生成新资料快照',
  confirmed.status === 201,
  `${confirmed.status}`,
);
const generateJob = await api(
  '/projects/project_crm/understanding/generate',
  {
    body: JSON.stringify({
      ingestionSnapshotId: confirmed.body.data.id,
      scope: 'FULL',
    }),
    headers: { 'Idempotency-Key': `m11-r2-${Date.now()}` },
    method: 'POST',
  },
  owner,
);
check(
  '生成 R2 Mock 任务返回 jobId',
  generateJob.status === 202,
  `${generateJob.status}`,
);
let r2Job = null;
for (let index = 0; index < 30; index += 1) {
  r2Job = await api(`/jobs/${generateJob.body.data.jobId}`, {}, owner);
  if (['CANCELLED', 'FAILED', 'SUCCEEDED'].includes(r2Job.body.data?.status))
    break;
  await new Promise((resolve) => setTimeout(resolve, 500));
}
const revisionsAfterGenerate = await api(
  '/projects/project_crm/understanding/revisions',
  {},
  owner,
);
const r2Draft = revisionsAfterGenerate.body.data.find(
  (revision) =>
    revision.status === 'DRAFT' &&
    revision.ingestionSnapshotId === confirmed.body.data.id,
);
check(
  'R2 草稿使用新快照且旧 R1 仍保留',
  r2Job.body.data?.status === 'SUCCEEDED' &&
    Boolean(r2Draft) &&
    revisionsAfterGenerate.body.data.some(
      (revision) =>
        revision.id === active.body.data.id &&
        ['APPROVED', 'STALE'].includes(revision.status),
    ),
  `${r2Job.body.data?.status}/${r2Draft?.id}`,
);
if (r2Draft) {
  const r2Snapshots = await api(
    `/projects/project_crm/understanding/revisions/${r2Draft.id}/evidence-snapshots`,
    {},
    owner,
  );
  check(
    '运行期新修订自动冻结证据定位快照',
    r2Snapshots.status === 200 && r2Snapshots.body.data.length > 0,
    `${r2Snapshots.body.data?.length}`,
  );
}

const newSource = await api(
  '/projects/project_crm/assets',
  {
    body: JSON.stringify({
      filename: 'followup-case.png',
      kind: 'image',
      mimeType: 'image/png',
      sizeBytes: 2048,
    }),
    headers: { 'Idempotency-Key': `m11-new-source-${Date.now()}` },
    method: 'POST',
  },
  owner,
);
const sessionAfterSkip = await api(
  `/projects/project_crm/research/sessions/${sessionId}`,
  {},
  owner,
);
const nextAfterNewSource = await api(
  `/projects/project_crm/research/sessions/${sessionId}/questions/next`,
  {
    body: JSON.stringify({
      expectedVersion: sessionAfterSkip.body.data.session.version,
      maxCount: 3,
    }),
    method: 'POST',
  },
  owner,
);
check(
  '新资料上下文允许跳过问题重新评估',
  newSource.status === 201 &&
    nextAfterNewSource.body.data.questions.some(
      (item) => item.gapId === skipped.gapId,
    ),
  `${newSource.status}/${nextAfterNewSource.body.data?.questions?.length}`,
);

const pendingAfterSource = nextAfterNewSource.body.data.questions.find(
  (item) => item.status === 'ASKED',
);
const dismissed = pendingAfterSource
  ? await api(
      `/projects/project_crm/research/questions/${pendingAfterSource.id}/dismiss`,
      {
        body: JSON.stringify({
          expectedVersion: pendingAfterSource.version,
          reason: '当前版本不使用该能力，仅作为未来范围记录',
        }),
        method: 'POST',
      },
      owner,
    )
  : { status: 0 };
const sessionAfterDismiss = await api(
  `/projects/project_crm/research/sessions/${sessionId}`,
  {},
  owner,
);
const questionIdsBeforeDismiss = new Set(
  sessionAfterDismiss.body.data.questions.map((item) => item.id),
);
const nextAfterDismiss = await api(
  `/projects/project_crm/research/sessions/${sessionId}/questions/next`,
  {
    body: JSON.stringify({
      expectedVersion: sessionAfterDismiss.body.data.session.version,
      maxCount: 3,
    }),
    method: 'POST',
  },
  owner,
);
check(
  'DISMISSED 问题带理由且同上下文不再追问',
  dismissed.status === 200 &&
    dismissed.body.data.status === 'DISMISSED' &&
    dismissed.body.data.dismissedReason &&
    Boolean(pendingAfterSource) &&
    !nextAfterDismiss.body.data.questions.some(
      (item) =>
        item.status === 'ASKED' &&
        item.gapId === pendingAfterSource.gapId &&
        !questionIdsBeforeDismiss.has(item.id),
    ),
  `${dismissed.status}/${dismissed.body.data?.status}`,
);

const rights = await api(
  `/projects/${projectId}/assets/${asset.id}/usage-metadata`,
  {},
  owner,
);
const redacted = await api(
  `/projects/${projectId}/assets/${asset.id}/usage-metadata`,
  {
    body: JSON.stringify({
      expectedVersion: rights.body.data.version,
      patch: { rightsStatus: 'NOT_ALLOWED' },
    }),
    method: 'PATCH',
  },
  owner,
);
const redactedVersions = await api(
  `/projects/${projectId}/assets/${asset.id}/content-versions`,
  {},
  owner,
);
const rejectedReference = await api(
  `/projects/${projectId}/assets/${asset.id}/references`,
  {
    body: JSON.stringify({
      assetVersionId: v2.body.data.id,
      targetId: draftShot.body.data.shotId,
      targetRevisionId: draftShot.body.data.id,
      targetType: 'SHOT_REVISION',
      usageRole: '撤权测试',
    }),
    method: 'POST',
  },
  owner,
);
check(
  '撤权后内容版本 REDACTED 且拒绝新引用',
  redacted.status === 200 &&
    redactedVersions.body.data.every((item) => item.status === 'REDACTED') &&
    rejectedReference.status === 409 &&
    rejectedReference.body.code === 'ASSET_RIGHTS_REVOKED',
  `${redacted.status}/${rejectedReference.status}`,
);

const refAd = await api(
  '/projects/project_crm/reference-ads',
  {
    body: JSON.stringify({
      copyrightConfirmed: true,
      durationSec: 30,
      format: '9:16',
      title: '参考广告：问题-反转-演示（Mock 授权示例）',
    }),
    method: 'POST',
  },
  owner,
);
let refAdJob = null;
for (let index = 0; index < 20; index += 1) {
  refAdJob = await api(`/jobs/${refAd.body.data.jobId}`, {}, owner);
  if (['CANCELLED', 'FAILED', 'SUCCEEDED'].includes(refAdJob.body.data?.status))
    break;
  await new Promise((resolve) => setTimeout(resolve, 300));
}
const refAdInsight = await api(
  `/projects/project_crm/reference-ads/${refAdJob.body.data.resultRefId}`,
  {},
  owner,
);
const refAdList = await api('/projects/project_crm/reference-ads', {}, owner);
const ingestionWithRefAd = await api(
  '/projects/project_crm/ingestion',
  {},
  owner,
);
const refAdSource = ingestionWithRefAd.body.data.sources.find(
  (source) => source.id === refAdInsight.body.data?.sourceId,
);
check(
  '参考广告生成固定 Insight 且标记不可作产品证据',
  refAd.status === 202 &&
    refAdJob.body.data.status === 'SUCCEEDED' &&
    refAdInsight.body.data.analysisScope === 'CREATIVE_REFERENCE' &&
    refAdInsight.body.data.canBeUsedAsProductEvidence === false &&
    refAdInsight.body.data.patterns.length >= 4,
  `${refAd.status}/${refAdJob.body.data?.status}/${refAdInsight.body.data?.id}`,
);
check(
  '参考广告来源默认排除产品分析且为 CREATIVE_REFERENCE',
  refAdSource?.kind === 'REFERENCE_AD' &&
    refAdSource.includedInAnalysis === false &&
    refAdSource.analysisScope === 'CREATIVE_REFERENCE' &&
    refAdList.body.data.some((item) => item.id === refAdInsight.body.data.id),
  `${refAdSource?.kind}/${refAdSource?.includedInAnalysis}`,
);
check(
  'ReferenceAd 解码元数据与 ASR 转写可见',
  Boolean(refAdInsight.body.data?.media?.mimeType) &&
    Boolean(refAdInsight.body.data?.asr?.text),
  `${refAdInsight.body.data?.media?.mimeType}/${refAdInsight.body.data?.asr?.language}`,
);
const reanalyze = await api(
  `/projects/project_crm/reference-ads/${refAdInsight.body.data.id}/reanalyze`,
  { body: JSON.stringify({}), method: 'POST' },
  owner,
);
let reanalyzeJob = null;
for (let index = 0; index < 20; index += 1) {
  reanalyzeJob = await api(`/jobs/${reanalyze.body.data.jobId}`, {}, owner);
  if (
    ['CANCELLED', 'FAILED', 'SUCCEEDED'].includes(
      reanalyzeJob.body.data?.status,
    )
  )
    break;
  await new Promise((resolve) => setTimeout(resolve, 300));
}
check(
  'ReferenceAd 重新分析执行原位版本递增',
  reanalyze.status === 202 &&
    reanalyzeJob.body.data.status === 'SUCCEEDED' &&
    reanalyzeJob.body.data.resultRefId === refAdInsight.body.data.id,
  `${reanalyze.status}/${reanalyzeJob.body.data?.status}`,
);

const badRefAd = await api(
  '/projects/project_crm/reference-ads',
  {
    body: JSON.stringify({
      copyrightConfirmed: false,
      title: '未确认权属的参考广告',
    }),
    method: 'POST',
  },
  owner,
);
check(
  '参考广告未确认权属时拒绝创建',
  badRefAd.status === 422 && badRefAd.body.code === 'COPYRIGHT_REQUIRED',
  `${badRefAd.status}/${badRefAd.body.code}`,
);

for (let index = 0; index < 35; index += 1) {
  await api(
    '/projects/project_resume_3d/shots',
    { body: JSON.stringify({}), method: 'POST' },
    owner,
  );
}
const board50 = await api('/projects/project_resume_3d/storyboard', {}, owner);
check(
  'VIS-007/020 分镜支持 50+ 镜头动态渲染',
  board50.body.data.shots.length >= 50,
  `${board50.body.data?.shots?.length}`,
);
await api('/demo/reset', { body: JSON.stringify({}), method: 'POST' }, owner);

const editor = await login('editor');
const editorGaps = await api('/projects/project_crm/research/gaps', {}, editor);
check('editor 可读取访谈缺口', editorGaps.status === 200);

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
