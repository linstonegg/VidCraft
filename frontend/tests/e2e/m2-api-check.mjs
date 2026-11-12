/* eslint-disable unicorn/no-await-expression-member */
/**
 * M2 Mock API 闭环检查：切口 → Brief → 三套创意 → 时长/剧本 → 视觉规范 → 15 镜头 → 预演 → M3 handoff。
 * 运行：node tests/e2e/m2-api-check.mjs
 */
import process from 'node:process';

const BASE = process.env.M2_API_BASE ?? 'http://localhost:5320/api';
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
  return (await response.json()).data?.accessToken;
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
  const body = await response.json().catch(() => ({}));
  return { body, status: response.status };
}
async function waitJob(jobId, token) {
  for (let i = 0; i < 80; i += 1) {
    const { body } = await api(`/jobs/${jobId}`, {}, token);
    if (['CANCELLED', 'FAILED', 'SUCCEEDED'].includes(body.data?.status)) {
      return body.data;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return null;
}

const owner = await login('owner');
check('owner 登录', Boolean(owner));
await api(
  '/demo/reset',
  {
    method: 'POST',
    body: JSON.stringify({ m2Seed: 'interactive' }),
  },
  owner,
);

// 1. 切口与守卫
const angles = await api('/projects/project_resume_3d/angles', {}, owner);
check(
  '3D 简历 Seed 有 4 个传播切口',
  angles.status === 200 && angles.body.data?.angleSet?.angles?.length === 4,
);
const crmGuard = await api('/projects/project_crm/angles', {}, owner);
check(
  '未确认产品理解的项目被 /angles 守卫拦截',
  crmGuard.status === 409 && crmGuard.body.code === 'STAGE_GUARD_FAILED',
  `${crmGuard.status}/${crmGuard.body.code}`,
);

const brief = await api(
  '/projects/project_resume_3d/creative-briefs',
  {
    method: 'POST',
    body: JSON.stringify({
      angleSetId: angles.body.data.angleSet.id,
      primaryAngleId: 'angle_resume_unconventional',
      secondaryAngleIds: ['angle_resume_identity'],
    }),
  },
  owner,
);
const approvedBrief = await api(
  `/projects/project_resume_3d/creative-briefs/${brief.body.data.id}/approve`,
  {
    method: 'POST',
    body: JSON.stringify({ expectedVersion: brief.body.data.version }),
  },
  owner,
);
check('确认创意 Brief', approvedBrief.body.data?.status === 'APPROVED');

// 2. 三套创意
const conceptJob = await api(
  '/projects/project_resume_3d/concepts/generate',
  {
    method: 'POST',
    body: JSON.stringify({ briefId: approvedBrief.body.data.id, count: 3 }),
  },
  owner,
);
const duplicateConceptJob = await api(
  '/projects/project_resume_3d/concepts/generate',
  {
    method: 'POST',
    body: JSON.stringify({ briefId: approvedBrief.body.data.id, count: 3 }),
  },
  owner,
);
check(
  '活动创意任务重复提交返回 409',
  duplicateConceptJob.status === 409 &&
    duplicateConceptJob.body.code === 'CONFLICT',
);
await waitJob(conceptJob.body.data.jobId, owner);
const groups = await api(
  '/projects/project_resume_3d/concepts/groups',
  {},
  owner,
);
const group = groups.body.data?.[0];
const groupDetail = await api(
  `/projects/project_resume_3d/concepts/groups/${group.id}`,
  {},
  owner,
);
const concepts = groupDetail.body.data?.concepts ?? [];
check('生成三套概念', concepts.length === 3);
check(
  '三套概念在主角/场景/冲突上不同',
  new Set(
    concepts.map(
      (item) =>
        `${item.story.leadCharacter}|${item.story.mainSetting}|${item.story.centralConflict}`,
    ),
  ).size === 3,
);
const concept = concepts[0];
const patchedConcept = await api(
  `/projects/project_resume_3d/concepts/revisions/${concept.id}`,
  {
    method: 'PATCH',
    body: JSON.stringify({
      expectedVersion: concept.version,
      patch: { title: 'A 方案：简历从纸里跳出来（编辑）' },
    }),
  },
  owner,
);
const staleConceptEdit = await api(
  `/projects/project_resume_3d/concepts/revisions/${concept.id}`,
  {
    method: 'PATCH',
    body: JSON.stringify({
      expectedVersion: concept.version,
      patch: { title: '冲突版本' },
    }),
  },
  owner,
);
check(
  '创意编辑成功',
  patchedConcept.status === 200 &&
    patchedConcept.body.data.title.includes('编辑'),
);
check(
  '旧版本编辑返回 409',
  staleConceptEdit.status === 409 &&
    staleConceptEdit.body.code === 'VERSION_CONFLICT',
);
const submittedConcept = await api(
  `/projects/project_resume_3d/concepts/revisions/${concept.id}/submit-review`,
  {
    method: 'POST',
    body: JSON.stringify({ expectedVersion: patchedConcept.body.data.version }),
  },
  owner,
);
const approvedConcept = await api(
  `/projects/project_resume_3d/concepts/revisions/${concept.id}/approve`,
  {
    method: 'POST',
    body: JSON.stringify({
      expectedVersion: submittedConcept.body.data.version,
    }),
  },
  owner,
);
check('创意审核通过', approvedConcept.body.data?.status === 'APPROVED');

// 3. 时长与剧本
const duration = await api(
  '/projects/project_resume_3d/duration-plans/evaluate',
  {
    method: 'POST',
    body: JSON.stringify({
      conceptRevisionId: concept.id,
      targetDurationMs: 120_000,
    }),
  },
  owner,
);
check(
  '30s 创意对 120s 目标标记可扩展',
  duration.body.data?.status === 'CAN_EXPAND' &&
    duration.body.data.recommendedBeatCount === 7,
);
const keepShortWithoutRisk = await api(
  `/projects/project_resume_3d/duration-plans/${duration.body.data.id}`,
  {
    method: 'PATCH',
    body: JSON.stringify({
      expectedVersion: duration.body.data.version,
      selectedStrategy: 'KEEP_SHORT',
    }),
  },
  owner,
);
check('保留短片未确认风险时返回 422', keepShortWithoutRisk.status === 422);
const strategy = await api(
  `/projects/project_resume_3d/duration-plans/${duration.body.data.id}`,
  {
    method: 'PATCH',
    body: JSON.stringify({
      acceptedRiskNotes: [],
      expectedVersion: duration.body.data.version,
      selectedStrategy: 'NATURAL_STORY_EXPANSION',
    }),
  },
  owner,
);
const scriptJob = await api(
  '/projects/project_resume_3d/scripts/generate',
  {
    method: 'POST',
    body: JSON.stringify({
      conceptRevisionId: concept.id,
      durationPlanId: strategy.body.data.id,
    }),
  },
  owner,
);
await waitJob(scriptJob.body.data.jobId, owner);
const scripts = await api(
  '/projects/project_resume_3d/scripts/revisions',
  {},
  owner,
);
const script = scripts.body.data.latest;
const beatSum = script.beats.reduce((sum, beat) => sum + beat.durationMs, 0);
check(
  '剧本 7 节拍且总时长 120000ms',
  script.beats.length === 7 && beatSum === 120_000,
  `${script.beats.length}/${beatSum}`,
);
const editedBeats = structuredClone(script.beats);
editedBeats[1].voiceover = '人工改写的旁白：改了很多版，还是像一张纸。';
const patchedScript = await api(
  `/projects/project_resume_3d/scripts/revisions/${script.id}`,
  {
    method: 'PATCH',
    body: JSON.stringify({
      expectedVersion: script.version,
      patch: { beats: editedBeats },
    }),
  },
  owner,
);
check(
  '局部修改一个节拍不会丢失其他节拍',
  patchedScript.body.data?.beats?.length === 7 &&
    patchedScript.body.data.beats[1].voiceover.includes('人工改写'),
);
const submittedScript = await api(
  `/projects/project_resume_3d/scripts/revisions/${script.id}/submit-review`,
  {
    method: 'POST',
    body: JSON.stringify({ expectedVersion: patchedScript.body.data.version }),
  },
  owner,
);
const approvedScript = await api(
  `/projects/project_resume_3d/scripts/revisions/${script.id}/approve`,
  {
    method: 'POST',
    body: JSON.stringify({
      expectedVersion: submittedScript.body.data.version,
    }),
  },
  owner,
);
check('剧本审核通过', approvedScript.body.data?.status === 'APPROVED');

// 4. 视觉规范与分镜
const visualJob = await api(
  '/projects/project_resume_3d/visual-bible/generate',
  {
    method: 'POST',
    body: JSON.stringify({ scriptRevisionId: approvedScript.body.data.id }),
  },
  owner,
);
await waitJob(visualJob.body.data.jobId, owner);
const bibles = await api(
  '/projects/project_resume_3d/visual-bible/revisions',
  {},
  owner,
);
const bible = bibles.body.data[0];
const approvedBible = await api(
  `/projects/project_resume_3d/visual-bible/revisions/${bible.id}/approve`,
  { method: 'POST', body: JSON.stringify({ expectedVersion: bible.version }) },
  owner,
);
check('视觉规范确认', approvedBible.body.data?.status === 'APPROVED');

const boardJob = await api(
  '/projects/project_resume_3d/storyboard/generate',
  {
    method: 'POST',
    body: JSON.stringify({
      scriptRevisionId: approvedScript.body.data.id,
      visualBibleVersionId: approvedBible.body.data.id,
    }),
  },
  owner,
);
await waitJob(boardJob.body.data.jobId, owner);
const board = await api('/projects/project_resume_3d/storyboard', {}, owner);
check('生成 15 个镜头', board.body.data.totalCount === 15);
check(
  '分镜净时长 120000ms',
  board.body.data.netDurationMs === 120_000,
  String(board.body.data.netDurationMs),
);
check(
  '镜头归属 7 个故事节拍',
  new Set(board.body.data.shots.map((shot) => shot.storyBeatId)).size === 7,
);
const shot07 = board.body.data.shots[6];
const plan = await api(
  '/projects/project_resume_3d/director/change-plans',
  {
    method: 'POST',
    body: JSON.stringify({
      scope: 'SHOT',
      targetId: shot07.shotId,
      userMessage: '镜头 07 中让纸张先炸开，再让人物出现',
    }),
  },
  owner,
);
check(
  '单镜头反馈生成修改计划',
  plan.status === 201 &&
    plan.body.data.intent === 'MOTION_ACTION' &&
    plan.body.data.operations.length > 0,
);
check(
  '修改计划带 M2.1 影响投影字段',
  Boolean(plan.body.data?.changeCategory) &&
    Array.isArray(plan.body.data?.affectedShotIds) &&
    ['HIGH', 'LOW', 'MEDIUM', 'NONE', 'UNKNOWN'].includes(
      plan.body.data?.estimatedFutureCostImpact,
    ) &&
    Array.isArray(plan.body.data?.suggestedActions),
  `${plan.body.data?.changeCategory}/${plan.body.data?.estimatedFutureCostImpact}`,
);

const applied = await api(
  `/projects/project_resume_3d/director/change-plans/${plan.body.data.id}/apply`,
  {
    method: 'POST',
    body: JSON.stringify({ expectedVersion: plan.body.data.version }),
  },
  owner,
);
check(
  '采用修改计划后动作描述改变',
  applied.status === 200 &&
    applied.body.data.updated?.actionDescription?.includes('先破碎纸张'),
);

const imageJob = await api(
  `/projects/project_resume_3d/shots/${shot07.shotId}/reference-images/generate`,
  { method: 'POST', body: JSON.stringify({ scenario: 'NORMAL' }) },
  owner,
);
await waitJob(imageJob.body.data.jobId, owner);
const images = await api(
  `/projects/project_resume_3d/shots/${shot07.shotId}/reference-images`,
  {},
  owner,
);
check('参考图生成 V2 且旧图保留', images.body.data?.length >= 2);
const shotAfterImage = await api(
  `/projects/project_resume_3d/shots/${shot07.shotId}`,
  {},
  owner,
);
const selectedImage = await api(
  `/projects/project_resume_3d/shots/${shot07.shotId}/reference-images/${images.body.data.at(-1).id}/select`,
  {
    method: 'POST',
    body: JSON.stringify({
      expectedVersion: shotAfterImage.body.data.version,
      revisionId: shotAfterImage.body.data.id,
    }),
  },
  owner,
);
check('可选择新参考图版本', selectedImage.status === 200);

const freshBoardBeforeApprove = await api(
  '/projects/project_resume_3d/storyboard',
  {},
  owner,
);
const blockedBoard = await api(
  `/projects/project_resume_3d/storyboard/revisions/${freshBoardBeforeApprove.body.data.latest.id}/approve`,
  {
    method: 'POST',
    body: JSON.stringify({
      expectedVersion: freshBoardBeforeApprove.body.data.latest.version,
    }),
  },
  owner,
);
check(
  '未确认完镜头时整组确认被阻塞',
  blockedBoard.status === 422 &&
    blockedBoard.body.code === 'INCOMPLETE_STORYBOARD',
);
const freshBoard = await api(
  '/projects/project_resume_3d/storyboard',
  {},
  owner,
);
const batch = await api(
  '/projects/project_resume_3d/shots/batch-approve',
  {
    method: 'POST',
    body: JSON.stringify({
      storyboardRevisionId: freshBoard.body.data.latest.id,
      items: freshBoard.body.data.shots.map((shot) => ({
        expectedVersion: shot.version,
        revisionId: shot.id,
        shotId: shot.shotId,
      })),
    }),
  },
  owner,
);
check('批量确认 15 个镜头', batch.body.data?.approved?.length === 15);
const finalBoard = await api(
  `/projects/project_resume_3d/storyboard/revisions/${freshBoard.body.data.latest.id}/approve`,
  {
    method: 'POST',
    body: JSON.stringify({
      expectedVersion: freshBoard.body.data.latest.version,
    }),
  },
  owner,
);
check('分镜集合批准', finalBoard.body.data?.status === 'APPROVED');

// 5. 预演与 handoff
const animaticJob = await api(
  '/projects/project_resume_3d/animatic/build',
  {
    method: 'POST',
    body: JSON.stringify({ storyboardRevisionId: finalBoard.body.data.id }),
  },
  owner,
);
await waitJob(animaticJob.body.data.jobId, owner);
const animatic = await api('/projects/project_resume_3d/animatic', {}, owner);
const snapshot = animatic.body.data.latest;
const comment = await api(
  `/projects/project_resume_3d/animatic/snapshots/${snapshot.id}/comments`,
  {
    method: 'POST',
    body: JSON.stringify({
      atMs: 65_000,
      shotId: 'project_resume_3d_shot_09',
      text: '镜头 09 节奏可以再快一点',
    }),
  },
  owner,
);
check(
  '预演时间戳评论',
  comment.status === 200 && comment.body.data.comments.length === 1,
);
const approvedAnimatic = await api(
  `/projects/project_resume_3d/animatic/snapshots/${snapshot.id}/approve`,
  {
    method: 'POST',
    body: JSON.stringify({ expectedVersion: comment.body.data.version }),
  },
  owner,
);
check('预演快照确认', approvedAnimatic.body.data?.status === 'APPROVED');
const handoff = await api(
  '/projects/project_resume_3d/animatic/handoff',
  {},
  owner,
);
check(
  'M3 handoff 含 15 个已批准镜头',
  handoff.body.data?.orderedApprovedShotRevisionIds?.length === 15 &&
    handoff.body.data?.approvedAnimaticSnapshotId === snapshot.id,
);
check(
  'M3 handoff 带就绪度与主张可用性',
  handoff.body.data?.canEnterM3 === true &&
    handoff.body.data?.effectiveValidity === 'CURRENT' &&
    Array.isArray(handoff.body.data?.claimReadiness),
  `${handoff.body.data?.canEnterM3}/${handoff.body.data?.effectiveValidity}`,
);

// 6. 权限
const staleAsset = await api(
  '/projects/project_resume_3d/assets',
  {
    method: 'POST',
    body: JSON.stringify({
      filename: 'stale-impact.png',
      kind: 'image',
      mimeType: 'image/png',
      sizeBytes: 1024,
    }),
  },
  owner,
);
const staleImpact = await api(
  '/projects/project_resume_3d/stale-impact',
  {},
  owner,
);
check(
  '资料变化后 stale-impact 可列出受影响产物',
  staleAsset.status === 201 &&
    staleImpact.status === 200 &&
    staleImpact.body.data.total > 0 &&
    staleImpact.body.data.items.some((item) => item.type === 'ANIMATIC'),
  `${staleAsset.status}/${staleImpact.body.data?.total}`,
);

const editor = await login('editor');
const editorApprove = await api(
  `/projects/project_resume_3d/animatic/snapshots/${snapshot.id}/approve`,
  {
    method: 'POST',
    body: JSON.stringify({
      expectedVersion: approvedAnimatic.body.data.version,
    }),
  },
  editor,
);
check(
  'editor 不能代替审核确认预演',
  editorApprove.status === 403 && editorApprove.body.code === 'FORBIDDEN',
);

const boardBeforeOps = await api(
  '/projects/project_resume_3d/storyboard',
  {},
  owner,
);
const firstShot = boardBeforeOps.body.data.shots[0];
const duplicated = await api(
  `/projects/project_resume_3d/shots/${firstShot.shotId}/duplicate`,
  {
    method: 'POST',
    body: JSON.stringify({ expectedVersion: firstShot.version }),
  },
  owner,
);
const boardAfterDuplicate = await api(
  '/projects/project_resume_3d/storyboard',
  {},
  owner,
);
check(
  '复制镜头生成独立 ID 且集合变为 16 镜头',
  duplicated.status === 201 &&
    boardAfterDuplicate.body.data.shots.length === 16 &&
    duplicated.body.data.shot.shotId !== firstShot.shotId,
);
const splitTarget = boardAfterDuplicate.body.data.shots[2];
const split = await api(
  `/projects/project_resume_3d/shots/${splitTarget.shotId}/split`,
  {
    method: 'POST',
    body: JSON.stringify({
      expectedVersion: splitTarget.version,
      splitAtMs: 2000,
    }),
  },
  owner,
);
const boardAfterSplit = await api(
  '/projects/project_resume_3d/storyboard',
  {},
  owner,
);
check(
  '拆分镜头保留原历史并新增前后两段',
  split.status === 201 && boardAfterSplit.body.data.shots.length === 17,
);
const mergeFirst = boardAfterSplit.body.data.shots[0];
const mergeSecond = boardAfterSplit.body.data.shots[1];
const merged = await api(
  '/projects/project_resume_3d/shots/merge',
  {
    method: 'POST',
    body: JSON.stringify({
      expectedVersion: mergeFirst.version,
      shotIds: [mergeFirst.shotId, mergeSecond.shotId],
    }),
  },
  owner,
);
const boardAfterMerge = await api(
  '/projects/project_resume_3d/storyboard',
  {},
  owner,
);
check(
  '合并相邻镜头后集合变为 16 镜头',
  merged.status === 200 && boardAfterMerge.body.data.shots.length === 16,
  `${merged.status}/${merged.body.code}/${boardAfterMerge.body.data.shots.length}`,
);

const reorderShots = boardAfterMerge.body.data.shots;
const sameBeatPair = reorderShots.findIndex(
  (shot, index) =>
    reorderShots[index + 1] &&
    shot.storyBeatId === reorderShots[index + 1].storyBeatId,
);
const oldStoryboardId = boardAfterMerge.body.data.latest.id;
const oldOrder = [...boardAfterMerge.body.data.latest.orderedShotRevisionIds];
let reorder = { body: {}, status: 0 };
if (sameBeatPair !== -1) {
  const orderedIds = reorderShots.map((shot) => shot.shotId);
  [orderedIds[sameBeatPair], orderedIds[sameBeatPair + 1]] = [
    orderedIds[sameBeatPair + 1],
    orderedIds[sameBeatPair],
  ];
  reorder = await api(
    '/projects/project_resume_3d/shots/reorder',
    {
      method: 'POST',
      body: JSON.stringify({
        expectedStoryboardVersion: boardAfterMerge.body.data.latest.version,
        orderedShotIds: orderedIds,
      }),
    },
    owner,
  );
}
const boardAfterReorder = await api(
  '/projects/project_resume_3d/storyboard',
  {},
  owner,
);
const oldStoryboards = await api(
  '/projects/project_resume_3d/storyboard/revisions',
  {},
  owner,
);
check(
  '同 Beat 重排序创建新 SB 草稿且旧 SB 不变',
  sameBeatPair !== -1 &&
    reorder.status === 200 &&
    reorder.body.data.id !== oldStoryboardId &&
    reorder.body.data.status === 'DRAFT' &&
    boardAfterReorder.body.data.latest.id === reorder.body.data.id &&
    JSON.stringify(
      oldStoryboards.body.data.items?.find(
        (item) => item.id === oldStoryboardId,
      )?.orderedShotRevisionIds ?? oldOrder,
    ) === JSON.stringify(oldOrder),
  `${reorder.status}/${reorder.body.data?.id}`,
);

const orderedForBeatCheck = reorderShots.map((shot) => shot.shotId);
const differentBeatIndex = reorderShots.findIndex(
  (shot, index) =>
    reorderShots[index + 1] &&
    shot.storyBeatId !== reorderShots[index + 1].storyBeatId,
);
let beatConflict = { body: { code: '' }, status: 0 };
if (differentBeatIndex !== -1 && reorder.status === 200) {
  [
    orderedForBeatCheck[differentBeatIndex],
    orderedForBeatCheck[differentBeatIndex + 1],
  ] = [
    orderedForBeatCheck[differentBeatIndex + 1],
    orderedForBeatCheck[differentBeatIndex],
  ];
  beatConflict = await api(
    '/projects/project_resume_3d/shots/reorder',
    {
      method: 'POST',
      body: JSON.stringify({
        expectedStoryboardVersion: reorder.body.data.version,
        orderedShotIds: orderedForBeatCheck,
      }),
    },
    owner,
  );
}
check(
  '跨 StoryBeat 排序被拒绝',
  differentBeatIndex !== -1 &&
    beatConflict.status === 422 &&
    beatConflict.body.code === 'STORYBOARD_REORDER_BEAT_CONFLICT',
  `${beatConflict.status}/${beatConflict.body.code}`,
);

const boardForGlobal = await api(
  '/projects/project_resume_3d/storyboard',
  {},
  owner,
);
const globalTarget = boardForGlobal.body.data.shots[6];
const biblesBefore = await api(
  '/projects/project_resume_3d/visual-bible/revisions',
  {},
  owner,
);
const globalPlan = await api(
  '/projects/project_resume_3d/director/change-plans',
  {
    method: 'POST',
    body: JSON.stringify({
      scope: 'SHOT',
      targetId: globalTarget.shotId,
      userMessage: '把主角换成机器人，保持其他动作不变',
    }),
  },
  owner,
);
check(
  '全局角色修改计划识别影响镜头',
  globalPlan.status === 201 &&
    globalPlan.body.data.intent === 'GLOBAL_CHARACTER' &&
    globalPlan.body.data.affectedShotIds.length > 1,
  `${globalPlan.status}/${globalPlan.body.data?.intent}/${globalPlan.body.data?.affectedShotIds?.length}`,
);
const globalApplied = await api(
  `/projects/project_resume_3d/director/change-plans/${globalPlan.body.data.id}/apply`,
  {
    method: 'POST',
    body: JSON.stringify({ expectedVersion: globalPlan.body.data.version }),
  },
  owner,
);
const biblesAfter = await api(
  '/projects/project_resume_3d/visual-bible/revisions',
  {},
  owner,
);
const globalShot = await api(
  `/projects/project_resume_3d/shots/${globalTarget.shotId}`,
  {},
  owner,
);
check(
  '全局角色修改 Fork 视觉规范并派生镜头草稿',
  globalApplied.status === 200 &&
    biblesAfter.body.data.length > biblesBefore.body.data.length &&
    globalShot.body.data.reviewStatus === 'DRAFT',
  `${globalApplied.status}/${biblesAfter.body.data?.length}/${globalShot.body.data?.reviewStatus}`,
);

const conceptCurrent = await api(
  `/projects/project_resume_3d/concepts/revisions/${concept.id}`,
  {},
  owner,
);
const groupBeforeFork = await api(
  `/projects/project_resume_3d/concepts/groups/${concept.conceptGroupId}`,
  {},
  owner,
);
const moodboardFork = await api(
  `/projects/project_resume_3d/concepts/revisions/${concept.id}/fork`,
  {
    body: JSON.stringify({ expectedVersion: conceptCurrent.body.data.version }),
    method: 'POST',
  },
  owner,
);
const moodboardBound = await api(
  `/projects/project_resume_3d/concepts/revisions/${moodboardFork.body.data.id}/moodboard-bindings`,
  {
    body: JSON.stringify({
      bindings: [
        {
          assetContentVersionId: 'asset-content:asset_resume_shot_01:v1',
          assetId: 'asset_resume_shot_01',
          usageRole: 'MOODBOARD',
        },
      ],
      expectedVersion: moodboardFork.body.data.version,
    }),
    method: 'PATCH',
  },
  owner,
);
const groupAfterFork = await api(
  `/projects/project_resume_3d/concepts/groups/${concept.conceptGroupId}`,
  {},
  owner,
);
check(
  'VIS-035 组合/Fork 草稿不改变组级正式选择',
  groupAfterFork.body.data.selectedConceptRevisionId ===
    groupBeforeFork.body.data.selectedConceptRevisionId,
  `${groupBeforeFork.body.data.selectedConceptRevisionId}/${groupAfterFork.body.data.selectedConceptRevisionId}`,
);
check(
  '概念情绪板绑定精确内容版本',
  moodboardBound.status === 200 &&
    moodboardBound.body.data.conceptMoodboardBindings?.[0]
      ?.assetContentVersionId === 'asset-content:asset_resume_shot_01:v1',
  `${moodboardBound.status}/${moodboardBound.body.data?.conceptMoodboardBindings?.length}`,
);

const moodboardAssets = await api(
  '/projects/project_resume_3d/assets',
  {},
  owner,
);
const moodboardAsset = moodboardAssets.body.data.find(
  (item) => item.id === 'asset_resume_shot_01',
);
const moodboardV2 = await api(
  `/projects/project_resume_3d/assets/${moodboardAsset.id}/content-versions`,
  {
    body: JSON.stringify({
      expectedAssetVersion: moodboardAsset.version,
      filename: 'moodboard-v2.svg',
      fixtureKey: '/brand/vidcraft-avatar.svg',
    }),
    headers: { 'Idempotency-Key': `vis-moodboard-v2-${Date.now()}` },
    method: 'POST',
  },
  owner,
);
const moodboardBoundV2 = await api(
  `/projects/project_resume_3d/concepts/revisions/${moodboardFork.body.data.id}/moodboard-bindings`,
  {
    body: JSON.stringify({
      bindings: [
        {
          assetContentVersionId: moodboardV2.body.data.id,
          assetId: moodboardAsset.id,
          usageRole: 'MOODBOARD',
        },
      ],
      expectedVersion: moodboardBound.body.data.version,
    }),
    method: 'PATCH',
  },
  owner,
);
check(
  'VIS-021 情绪板可绑定新内容版本 v2',
  moodboardBoundV2.status === 200 &&
    moodboardBoundV2.body.data.conceptMoodboardBindings?.[0]
      ?.assetContentVersionId === moodboardV2.body.data.id,
  `${moodboardBoundV2.status}/${moodboardBoundV2.body.data?.conceptMoodboardBindings?.length}`,
);
const moodboardRejectedImage = await api(
  `/projects/project_resume_3d/concepts/revisions/${moodboardFork.body.data.id}/moodboard-bindings`,
  {
    body: JSON.stringify({
      bindings: [
        {
          assetContentVersionId: 'image_resume_shot_01_v1',
          assetId: moodboardAsset.id,
          usageRole: 'MOODBOARD',
        },
      ],
      expectedVersion: moodboardBoundV2.body.data.version,
    }),
    method: 'PATCH',
  },
  owner,
);
check(
  'VIS-022 Shot 图片不能直接作为情绪板内容版本',
  moodboardRejectedImage.status === 422,
  `${moodboardRejectedImage.status}/${moodboardRejectedImage.body.code}`,
);

const crossBriefFork = await api(
  `/projects/project_resume_3d/concepts/revisions/${concept.id}/fork`,
  {
    body: JSON.stringify({
      expectedBriefId: 'brief_other',
      expectedVersion: conceptCurrent.body.data.version,
    }),
    method: 'POST',
  },
  owner,
);
check(
  'VIS-023 跨 Brief 组合被拒绝',
  crossBriefFork.status === 422 &&
    crossBriefFork.body.code === 'CROSS_BRIEF_COMPOSITION',
  `${crossBriefFork.status}/${crossBriefFork.body.code}`,
);

const conceptForSecondActive = await api(
  `/projects/project_resume_3d/concepts/revisions/${concept.id}`,
  {},
  owner,
);
const secondFork = await api(
  `/projects/project_resume_3d/concepts/revisions/${concept.id}/fork`,
  {
    body: JSON.stringify({
      expectedVersion: conceptForSecondActive.body.data.version,
    }),
    method: 'POST',
  },
  owner,
);
const secondSubmitted = await api(
  `/projects/project_resume_3d/concepts/revisions/${secondFork.body.data.id}/submit-review`,
  {
    body: JSON.stringify({ expectedVersion: secondFork.body.data.version }),
    method: 'POST',
  },
  owner,
);
await api(
  `/projects/project_resume_3d/concepts/revisions/${secondFork.body.data.id}/approve`,
  {
    body: JSON.stringify({
      expectedVersion: secondSubmitted.body.data.version,
    }),
    method: 'POST',
  },
  owner,
);
const groupsAfterSecondActive = await api(
  '/projects/project_resume_3d/concepts/groups',
  {},
  owner,
);
const groupAfterSecondActive = await api(
  `/projects/project_resume_3d/concepts/groups/${groupsAfterSecondActive.body.data[0].id}`,
  {},
  owner,
);
const activeConcepts = (groupAfterSecondActive.body.data.concepts ?? []).filter(
  (item) => item.status === 'APPROVED',
);
check(
  'VIS-006 同一项目只保留一个 APPROVED 概念',
  activeConcepts.length === 1,
  `${activeConcepts.length}`,
);

const missingImageShot = await api(
  '/projects/project_resume_3d/shots',
  { body: JSON.stringify({}), method: 'POST' },
  owner,
);
const clearedImage = await api(
  `/projects/project_resume_3d/shots/${missingImageShot.body.data.shotId}/revisions/${missingImageShot.body.data.id}`,
  {
    body: JSON.stringify({
      expectedVersion: missingImageShot.body.data.version,
      patch: { activeReferenceImageId: '' },
    }),
    method: 'PATCH',
  },
  owner,
);
const approveWithoutImage = await api(
  `/projects/project_resume_3d/shots/${missingImageShot.body.data.shotId}/revisions/${missingImageShot.body.data.id}/approve`,
  {
    body: JSON.stringify({ expectedVersion: clearedImage.body.data.version }),
    method: 'POST',
  },
  owner,
);
check(
  'VIS-019 缺参考图镜头不能绕过审核',
  approveWithoutImage.status === 422,
  `${approveWithoutImage.status}/${approveWithoutImage.body.code}`,
);

const invalidA = await api(
  '/projects/project_resume_3d/shots',
  { body: JSON.stringify({}), method: 'POST' },
  owner,
);
const invalidB = await api(
  '/projects/project_resume_3d/shots',
  { body: JSON.stringify({}), method: 'POST' },
  owner,
);
await api(
  `/projects/project_resume_3d/shots/${invalidB.body.data.shotId}/revisions/${invalidB.body.data.id}`,
  {
    body: JSON.stringify({
      expectedVersion: invalidB.body.data.version,
      patch: { storyBeatId: invalidA.body.data.storyBeatId },
    }),
    method: 'PATCH',
  },
  owner,
);
await api(
  `/projects/project_resume_3d/shots/${invalidA.body.data.shotId}/revisions/${invalidA.body.data.id}`,
  {
    body: JSON.stringify({
      expectedVersion: invalidA.body.data.version,
      patch: {
        durationMs: 1000,
        storyBeatId: invalidA.body.data.storyBeatId,
        transitionOverlapToNextMs: 5000,
      },
    }),
    method: 'PATCH',
  },
  owner,
);
const invalidBoard = await api(
  '/projects/project_resume_3d/storyboard',
  {},
  owner,
);
const invalidReorder = await api(
  '/projects/project_resume_3d/shots/reorder',
  {
    body: JSON.stringify({
      expectedStoryboardVersion: invalidBoard.body.data.latest.version,
      orderedShotIds: invalidBoard.body.data.shots.map((shot) => shot.shotId),
    }),
    method: 'POST',
  },
  owner,
);
check(
  'VIS-032 非法转场/净时长不能提交排序',
  invalidReorder.status === 422 &&
    invalidReorder.body.code === 'STORYBOARD_REORDER_INVALID_TRANSITION',
  `${invalidReorder.status}/${invalidReorder.body.code}`,
);

const crossProjectFork = await api(
  `/projects/project_crm/concepts/revisions/${concept.id}/fork`,
  {
    body: JSON.stringify({ expectedVersion: conceptCurrent.body.data.version }),
    method: 'POST',
  },
  owner,
);
check(
  'VIS-023 跨项目/跨 Brief 概念不能直接 Fork 合并',
  crossProjectFork.status === 404,
  `${crossProjectFork.status}/${crossProjectFork.body.code}`,
);

await api(
  '/demo/reset',
  {
    method: 'POST',
    body: JSON.stringify({ m2Seed: 'interactive' }),
  },
  owner,
);
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
