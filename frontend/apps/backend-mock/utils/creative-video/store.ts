/* eslint-disable unicorn/no-array-sort, unicorn/no-nested-ternary */
import type {
  Actor,
  Asset,
  CoverageItem,
  DemoSession,
  Evidence,
  Feature,
  IdempotencyEntry,
  Ingestion,
  IngestionSnapshot,
  Job,
  JobEvent,
  JobKind,
  PainPoint,
  Persona,
  Project,
  Source,
  UnderstandingRevision,
  ValueSeed,
} from './domain';

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';

import { createSeedData } from './fixtures';
import {
  CURRENT_SCHEMA_VERSION,
  normalizePersistedMockState,
} from './state-migration';

export class ApiError extends Error {
  public readonly code: string;
  public readonly data?: unknown;
  public readonly status: number;

  constructor(status: number, code: string, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

interface M2State {
  angleSets: Record<string, any[]>;
  animatics: Record<string, any[]>;
  briefs: Record<string, any[]>;
  changePlans: Record<string, any[]>;
  concepts: Record<string, any[]>;
  conceptGroups: Record<string, any[]>;
  durationPlans: Record<string, any[]>;
  images: Record<string, any[]>;
  messages: Record<string, any[]>;
  scripts: Record<string, any[]>;
  seeded: boolean;
  shots: Record<string, any[]>;
  storyboards: Record<string, any[]>;
  visualBibles: Record<string, any[]>;
}

interface M11State {
  answerValidity: Record<string, any>;
  assetContentVersions: Record<string, any[]>;
  assetUsageMetadata: Record<string, any[]>;
  claimAnchors: Record<string, any[]>;
  claimConflicts: Record<string, any[]>;
  conflictResolutions: Record<string, any[]>;
  evidenceSnapshots: Record<string, any[]>;
  researchAnswers: Record<string, any[]>;
  researchGaps: Record<string, any[]>;
  referenceAdInsights: Record<string, any[]>;
  researchQuestions: Record<string, any[]>;
  researchSessions: Record<string, any[]>;
  seeded: boolean;
}

interface M21State {
  generationSpecs: Record<string, any[]>;
  seeded: boolean;
}

interface State {
  evidence: Record<string, Evidence[]>;
  idempotency: Record<string, IdempotencyEntry>;
  ingestions: Record<string, Ingestion>;
  jobs: Record<string, Job>;
  m11?: M11State;
  m2?: M2State;
  m21?: M21State;
  projects: Project[];
  revisions: Record<string, UnderstandingRevision[]>;
  revisionComments?: Record<
    string,
    Array<{ at: string; by: string; note: string }>
  >;
  sequence: number;
  snapshots: IngestionSnapshot[];
}

let state: State = emptyState();

// 本地演示仓储；不包含上传文件内容或真实账号凭据。
const stateFile = resolve(
  process.env.VIDCRAFT_MOCK_STATE_FILE ?? '.data/vidcraft-m1.json',
);

export function restoreState() {
  if (!existsSync(stateFile)) return;
  const saved = JSON.parse(readFileSync(stateFile, 'utf8'));
  state = normalizePersistedMockState(saved).state;
  if (!state.m2?.seeded) {
    seedM2(state);
  }
  if (!state.m11?.seeded) {
    seedM11();
  }
  if (!state.m21?.seeded) {
    seedM21();
  }
  completeLegacySnapshots(state, false);
}
export function persistState() {
  mkdirSync(dirname(stateFile), { recursive: true });
  const temporary = `${stateFile}.tmp`;
  writeFileSync(
    temporary,
    JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, state }),
    'utf8',
  );
  renameSync(temporary, stateFile);
}

function emptyState(): State {
  const seed = createSeedData();
  const initial: State = {
    evidence: seed.evidence,
    idempotency: {},
    ingestions: seed.ingestions,
    jobs: {},
    projects: seed.projects,
    revisions: seed.revisions,
    sequence: 0,
    snapshots: seed.snapshots,
  };
  completeLegacySnapshots(initial);
  seedM2(initial);
  return initial;
}

function completeLegacySnapshots(target: State, trustedSeed = true) {
  for (const snapshot of target.snapshots) {
    if (snapshot.completeness) continue;
    const ingestion = target.ingestions[snapshot.projectId];
    const matching = (ingestion?.sources ?? []).filter(
      (source) =>
        snapshot.sourceIds.includes(source.id) &&
        snapshot.sourceVersions[source.id] === source.version,
    );
    snapshot.sourceCopies = structuredClone(matching);
    snapshot.assetCopies = structuredClone(
      (ingestion?.assets ?? []).filter((asset) =>
        matching.some((source) => source.assetId === asset.id),
      ),
    );
    snapshot.evidenceCopies = structuredClone(
      (target.evidence[snapshot.projectId] ?? []).filter((evidence) =>
        matching.some((source) => source.id === evidence.sourceId),
      ),
    );
    snapshot.completeness =
      trustedSeed && matching.length === snapshot.sourceIds.length
        ? 'COMPLETE'
        : 'LEGACY_PARTIAL';
  }
}

export function resetAll(options: { m2Seed?: string } = {}) {
  state = emptyState();
  if (options.m2Seed !== 'interactive') {
    seedM2Full();
  }
  seedM11();
  seedM21();
  return { resetAt: new Date().toISOString() };
}

const iso = () => new Date().toISOString();

function nextId(prefix: string) {
  state.sequence += 1;
  return `${prefix}_${Date.now().toString(36)}_${state.sequence}`;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function ensureIngestion(projectId: string): Ingestion {
  if (!state.ingestions[projectId]) {
    state.ingestions[projectId] = {
      assets: [],
      coverage: [],
      projectId,
      sources: [],
      status: 'EMPTY',
      urlCollectionStatus: 'NOT_STARTED',
      version: 1,
    };
  }
  return state.ingestions[projectId] as Ingestion;
}

function projectEvidence(projectId: string): Evidence[] {
  state.evidence[projectId] ??= [];
  return state.evidence[projectId] as Evidence[];
}

function projectRevisions(projectId: string): UnderstandingRevision[] {
  if (!state.revisions[projectId]) {
    state.revisions[projectId] = [];
  }
  return state.revisions[projectId] as UnderstandingRevision[];
}

function getProjectOrThrow(
  id: string,
  { includeDeleted = false } = {},
): Project {
  const project = state.projects.find((item) => item.id === id);
  if (!project || (!includeDeleted && project.deletedAt)) {
    throw new ApiError(404, 'PROJECT_NOT_FOUND', '项目不存在或已被移除');
  }
  return project;
}

function touchIngestion(projectId: string, patch: Partial<Ingestion> = {}) {
  const ingestion = ensureIngestion(projectId);
  Object.assign(ingestion, patch);
  ingestion.coverage = computeCoverage(projectId).coverage;
  ingestion.version += 1;
  const project = state.projects.find((item) => item.id === projectId);
  if (project) {
    project.updatedAt = iso();
  }
  if (
    ingestion.lastConfirmedSnapshotId &&
    ingestion.status !== 'CONFIRMED' &&
    ingestion.status !== 'STALE'
  ) {
    ingestion.status = 'STALE';
  }
  return ingestion;
}

/**
 * 资料集合发生变化（新增/删除/排除/替换来源或素材）时：
 * 1. 已有确认快照的资料标记 STALE；
 * 2. 已确认的理解修订标记 STALE，M2 交接门禁自动失效；
 * 3. 不静默沿用旧报告。
 */
function markMaterialChanged(projectId: string) {
  const ingestion = ensureIngestion(projectId);
  if (!ingestion.lastConfirmedSnapshotId) {
    return;
  }
  const timestamp = iso();
  ingestion.status = 'STALE';
  for (const revision of projectRevisions(projectId)) {
    if (revision.status === 'APPROVED') {
      revision.status = 'STALE';
      revision.updatedAt = timestamp;
      revision.version += 1;
    }
  }
  markM2Stale(projectId);
  const project = state.projects.find((item) => item.id === projectId);
  if (project) {
    project.updatedAt = timestamp;
  }
}

/** 任何读取项目状态时顺带推进任务，避免用户离开页面后任务永远停在 RUNNING */
function advanceProjectJobs(projectId: string) {
  for (const job of Object.values(state.jobs)) {
    if (
      job.projectId === projectId &&
      !['CANCELLED', 'FAILED', 'SUCCEEDED'].includes(job.status)
    ) {
      advanceJob(job);
    }
  }
}

export function getEvidenceList(
  projectId: string,
  filters: { level?: string; sourceId?: string } = {},
) {
  getProjectOrThrow(projectId);
  return projectEvidence(projectId).filter((item) => {
    if (filters.level && item.level !== filters.level) {
      return false;
    }
    if (filters.sourceId && item.sourceId !== filters.sourceId) {
      return false;
    }
    return true;
  });
}

/** 覆盖度是 Mock 启发式规则：按资料类型、证据等级推导，不代表真实分析结果 */
export function computeCoverage(projectId: string): {
  coverage: CoverageItem[];
} {
  const ingestion = ensureIngestion(projectId);
  const evidence = projectEvidence(projectId);
  const readySources = ingestion.sources.filter(
    (item) => item.status === 'READY' && item.includedInAnalysis,
  );
  const verified = evidence.filter((item) => item.level === 'verified');
  const hasShot = ingestion.sources.some(
    (item) =>
      item.status === 'READY' &&
      (item.kind === 'SCREENSHOT' || item.kind === 'SCREEN_RECORDING'),
  );
  const hasBrand = ingestion.sources.some(
    (item) => item.status === 'READY' && item.kind === 'BRAND_ASSET',
  );
  const demoActive =
    ingestion.demoSession?.status === 'ACTIVE' ||
    ingestion.demoSession?.status === 'EXPIRED';

  const item = (
    code: string,
    label: string,
    status: CoverageItem['status'],
    explanation: string,
    ids: string[] = [],
  ): CoverageItem => ({ code, evidenceIds: ids, explanation, label, status });

  const coverageStatus = (
    confirmed: boolean,
    verify: boolean,
  ): CoverageItem['status'] => {
    if (confirmed) {
      return 'CONFIRMED';
    }
    return verify ? 'TO_VERIFY' : 'MISSING';
  };

  return {
    coverage: [
      item(
        'positioning',
        '产品定位',
        readySources.length > 0 ? 'CONFIRMED' : 'MISSING',
        readySources.length > 0
          ? '已从来源摘要确认产品定位'
          : '至少补充一个有效来源',
        verified.slice(0, 1).map((evidenceItem) => evidenceItem.id),
      ),
      item(
        'features',
        '核心功能',
        coverageStatus(verified.length >= 2, verified.length > 0),
        verified.length >= 2 ? '已有两条以上功能证据' : '补功能页、演示或文档',
        verified.slice(0, 3).map((evidenceItem) => evidenceItem.id),
      ),
      item(
        'audience',
        '目标用户',
        evidence.some((entry) => entry.level === 'hypothesis')
          ? 'TO_VERIFY'
          : 'MISSING',
        '目标用户目前来自 AI 推测，需要客户确认',
      ),
      item(
        'real-ui',
        '真实界面',
        hasShot ? 'CONFIRMED' : 'MISSING',
        hasShot ? '已有截图或录屏' : '上传截图或录屏',
      ),
      item(
        'brand',
        '品牌资料',
        hasBrand ? 'CONFIRMED' : 'MISSING',
        hasBrand ? '已有品牌素材' : '补充 Logo 与品牌色',
      ),
      item(
        'pain-evidence',
        '用户痛点证据',
        coverageStatus(
          evidence.some(
            (entry) =>
              entry.level === 'verified' && entry.title.includes('痛点'),
          ),
          evidence.length > 0,
        ),
        '目前缺少用户访谈或真实反馈',
      ),
      item(
        'prohibited',
        '产品宣传禁区',
        demoActive || readySources.length > 0 ? 'TO_VERIFY' : 'MISSING',
        '宣传禁区需要在理解报告中人工确认',
      ),
    ],
  };
}

export function getProjectList(query: Record<string, string | undefined>) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 12, 1), 100);
  const keyword = (query.keyword ?? '').trim().toLowerCase();
  const includeDeleted = query.includeDeleted === 'true';

  let items = state.projects.filter((project) => {
    if (query.scope === 'mine' && project.ownerId !== query.ownerId)
      return false;
    if (query.scope === 'archived' && !project.archivedAt) return false;
    if (query.scope === 'recent' && (project.archivedAt || project.deletedAt))
      return false;
    if (!includeDeleted && project.deletedAt) {
      return false;
    }
    if (query.status && project.status !== query.status) {
      return false;
    }
    if (query.stage && project.currentStage !== query.stage) {
      return false;
    }
    if (query.platform) {
      const platforms = project.platforms ?? [project.platform];
      if (!platforms.includes(query.platform as Project['platform'])) {
        return false;
      }
    }
    if (keyword) {
      const haystack = [
        project.title,
        project.productName,
        project.productUrl,
        project.description,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(keyword)) {
        return false;
      }
    }
    return true;
  });

  switch (query.sort) {
    case 'created': {
      items = items.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
      break;
    }
    case 'name': {
      items = items.toSorted((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
      break;
    }
    default: {
      items = items.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    items: items
      .slice(start, start + pageSize)
      .map((item) => projectView(item)),
    page,
    pageSize,
    total,
  };
}

function projectView(project: Project) {
  const asset = ensureIngestion(project.id).assets.find(
    (item) => item.id === project.coverAssetId,
  );
  return {
    ...clone(project),
    coverPreviewUrl: asset?.previewUrl?.startsWith('/demo-assets/')
      ? asset.previewUrl
      : undefined,
  };
}

export function getProject(id: string) {
  const project = getProjectOrThrow(id);
  advanceProjectJobs(id);
  return projectView(project);
}

function normalizePlatforms(input: string[]) {
  const platforms = (
    input.length > 0 ? input : ['other']
  ) as Project['platform'][];
  return { platform: platforms[0] as Project['platform'], platforms };
}

export function createProject(payload: Record<string, any>, actor: Actor) {
  const title = String(payload.title ?? '').trim();
  if (!title) {
    throw new ApiError(400, 'VALIDATION_ERROR', '项目名称不能为空');
  }
  if (title.length > 100) {
    throw new ApiError(400, 'VALIDATION_ERROR', '项目名称不能超过 100 个字符');
  }
  if (!payload.rightsConfirmed) {
    throw new ApiError(400, 'VALIDATION_ERROR', '请先确认资料使用权声明');
  }
  const { platform, platforms } = normalizePlatforms(
    (payload.platforms as string[]) ?? [],
  );
  const timestamp = iso();
  const project: Project = {
    aspectRatio: payload.aspectRatio ?? '9:16',
    createdAt: timestamp,
    currentStage: 'INGEST',
    description: payload.description ?? '',
    durationSec: Number(payload.durationSec) || 30,
    id: nextId('project'),
    language: payload.language ?? 'zh-CN',
    lastVisitedStage: 'INGEST',
    market: payload.market ?? 'CN',
    marketingObjective: payload.marketingObjective ?? 'signup',
    negativeGuidance: payload.negativeGuidance,
    ownerId: actor.id,
    platform,
    platforms,
    productName: payload.productName,
    productUrl: payload.productUrl,
    status: 'DRAFT',
    stylePreferences: payload.stylePreferences ?? [],
    targetAudience: payload.targetAudience,
    title,
    updatedAt: timestamp,
    version: 1,
  };
  state.projects.unshift(project);
  ensureIngestion(project.id);
  return clone(project);
}

export function updateProject(id: string, payload: Record<string, any>) {
  const project = getProjectOrThrow(id);
  if (
    payload.expectedVersion !== undefined &&
    payload.expectedVersion !== project.version
  ) {
    throw new ApiError(
      409,
      'VERSION_CONFLICT',
      '项目已被其他操作更新，请刷新后重试',
      {
        currentVersion: project.version,
        expectedVersion: payload.expectedVersion,
        resourceId: project.id,
        resourceType: 'PROJECT',
      },
    );
  }
  const patch = (payload.patch ?? {}) as Record<string, any>;
  if (project.archivedAt)
    throw new ApiError(409, 'CONFLICT', '项目已归档，请先恢复项目');
  if (patch.coverAssetId !== undefined) {
    const asset = ensureIngestion(id).assets.find(
      (item) =>
        item.id === patch.coverAssetId && ['image', 'logo'].includes(item.kind),
    );
    if (patch.coverAssetId && !asset)
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        '请选择本项目的图片素材作为封面',
      );
    project.coverAssetId = patch.coverAssetId || undefined;
  }
  if (patch.title !== undefined) {
    const title = String(patch.title).trim();
    if (!title || title.length > 100) {
      throw new ApiError(400, 'VALIDATION_ERROR', '项目名称需为 1～100 个字符');
    }
    project.title = title;
  }
  const allowed = [
    'aspectRatio',
    'description',
    'durationSec',
    'language',
    'market',
    'marketingObjective',
    'negativeGuidance',
    'productName',
    'productUrl',
    'stylePreferences',
    'targetAudience',
  ] as const;
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      (project as any)[key] = patch[key];
    }
  }
  if (Array.isArray(patch.platforms) && patch.platforms.length > 0) {
    const { platform, platforms } = normalizePlatforms(patch.platforms);
    project.platform = platform;
    project.platforms = platforms;
  }
  project.version += 1;
  project.updatedAt = iso();
  return clone(project);
}

export function duplicateProject(
  id: string,
  actor: Actor,
  payload: Record<string, any> = {},
) {
  const project = getProjectOrThrow(id);
  if (
    payload.expectedVersion !== undefined &&
    payload.expectedVersion !== project.version
  ) {
    throw new ApiError(
      409,
      'VERSION_CONFLICT',
      '项目已被其他操作更新，请刷新后重试',
      {
        currentVersion: project.version,
        expectedVersion: payload.expectedVersion,
        resourceId: project.id,
        resourceType: 'PROJECT',
      },
    );
  }
  const copyAssetRefs = payload.copyAssetRefs !== false;
  const timestamp = iso();
  const copy: Project = {
    ...clone(project),
    archivedAt: undefined,
    createdAt: timestamp,
    currentStage: 'INGEST',
    deletedAt: undefined,
    id: nextId('project'),
    lastVisitedStage: 'INGEST',
    ownerId: actor.id,
    status: 'DRAFT',
    title: `${project.title}（副本）`,
    updatedAt: timestamp,
    version: 1,
  };
  state.projects.unshift(copy);
  const originalIngestion = ensureIngestion(project.id);

  const sourceIdMap = new Map<string, string>();
  originalIngestion.sources.forEach((item, index) => {
    sourceIdMap.set(item.id, `${copy.id}_source_${index + 1}`);
  });
  const assetIdMap = new Map<string, string>();
  originalIngestion.assets.forEach((item, index) => {
    assetIdMap.set(item.id, `${copy.id}_asset_${index + 1}`);
  });

  const copiedAssets = copyAssetRefs
    ? originalIngestion.assets.map((item, index) => ({
        ...clone(item),
        createdAt: timestamp,
        id: `${copy.id}_asset_${index + 1}`,
        projectId: copy.id,
        sourceId: item.sourceId ? sourceIdMap.get(item.sourceId) : undefined,
        updatedAt: timestamp,
        version: 1,
      }))
    : [];

  state.ingestions[copy.id] = {
    assets: copiedAssets,
    coverage: [],
    projectId: copy.id,
    sources: originalIngestion.sources.map((item, index) => ({
      ...clone(item),
      assetId:
        copyAssetRefs && item.assetId
          ? assetIdMap.get(item.assetId)
          : undefined,
      createdAt: timestamp,
      evidenceIds: [],
      id: `${copy.id}_source_${index + 1}`,
      projectId: copy.id,
      updatedAt: timestamp,
      version: 1,
    })),
    status: originalIngestion.sources.length > 0 ? 'READY_TO_CONFIRM' : 'EMPTY',
    urlCollectionStatus: originalIngestion.urlCollectionStatus,
    version: 1,
  };
  const copiedIngestion = state.ingestions[copy.id];
  if (copiedIngestion) {
    copiedIngestion.coverage = computeCoverage(copy.id).coverage;
  }
  return clone(copy);
}

function setArchived(
  id: string,
  archived: boolean,
  payload: Record<string, any> = {},
) {
  const project = getProjectOrThrow(id);
  if (
    payload.expectedVersion !== undefined &&
    payload.expectedVersion !== project.version
  ) {
    throw new ApiError(
      409,
      'VERSION_CONFLICT',
      '项目已被其他操作更新，请刷新后重试',
      {
        currentVersion: project.version,
        expectedVersion: payload.expectedVersion,
        resourceId: project.id,
        resourceType: 'PROJECT',
      },
    );
  }
  if (archived) {
    project.archivedAt = iso();
    project.status = 'ARCHIVED';
  } else {
    delete project.archivedAt;
    project.status = 'IN_PROGRESS';
  }
  project.updatedAt = iso();
  project.version += 1;
  return clone(project);
}

export function archiveProject(id: string, payload: Record<string, any> = {}) {
  return setArchived(id, true, payload);
}

export function restoreProject(id: string, payload: Record<string, any> = {}) {
  return setArchived(id, false, payload);
}

export function deleteProject(id: string, payload: Record<string, any> = {}) {
  const project = getProjectOrThrow(id);
  if (
    payload.expectedVersion !== undefined &&
    payload.expectedVersion !== project.version
  ) {
    throw new ApiError(
      409,
      'VERSION_CONFLICT',
      '项目已被其他操作更新，请刷新后重试',
      {
        currentVersion: project.version,
        expectedVersion: payload.expectedVersion,
        resourceId: project.id,
        resourceType: 'PROJECT',
      },
    );
  }
  project.deletedAt = iso();
  project.updatedAt = iso();
  project.version += 1;
  return { deletedAt: project.deletedAt, id: project.id };
}

export function undeleteProject(id: string, payload: Record<string, any> = {}) {
  const project = getProjectOrThrow(id, { includeDeleted: true });
  if (
    payload.expectedVersion !== undefined &&
    payload.expectedVersion !== project.version
  ) {
    throw new ApiError(
      409,
      'VERSION_CONFLICT',
      '项目已被其他操作更新，请刷新后重试',
      {
        currentVersion: project.version,
        expectedVersion: payload.expectedVersion,
        resourceId: project.id,
        resourceType: 'PROJECT',
      },
    );
  }
  delete project.deletedAt;
  project.updatedAt = iso();
  project.version += 1;
  return clone(project);
}

export function getIngestion(projectId: string) {
  getProjectOrThrow(projectId);
  advanceProjectJobs(projectId);
  const ingestion = ensureIngestion(projectId);
  if (
    ingestion.demoSession?.status === 'ACTIVE' &&
    Date.parse(ingestion.demoSession.expiresAt) <= Date.now()
  )
    ingestion.demoSession.status = 'EXPIRED';
  ingestion.coverage = computeCoverage(projectId).coverage;
  const result = clone(ingestion);
  if (
    result.demoSession &&
    ['EXPIRED', 'REVOKED'].includes(result.demoSession.status)
  ) {
    for (const source of result.sources.filter(
      (item) => item.kind === 'DEMO_SESSION',
    ))
      source.summary = `${source.summary ?? ''}（对应演示会话已${result.demoSession.status === 'EXPIRED' ? '过期' : '撤销'}，证据仅作历史记录）`;
  }
  return result;
}

export function getSnapshots(projectId: string) {
  getProjectOrThrow(projectId);
  advanceProjectJobs(projectId);
  return clone(
    state.snapshots
      .filter((item) => item.projectId === projectId)
      .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export function updateSource(
  projectId: string,
  sourceId: string,
  payload: Record<string, any>,
) {
  const ingestion = ensureIngestion(projectId);
  const source = ingestion.sources.find((item) => item.id === sourceId);
  if (!source) {
    throw new ApiError(404, 'NOT_FOUND', '资料来源不存在');
  }
  if (
    payload.expectedVersion !== undefined &&
    payload.expectedVersion !== source.version
  ) {
    throw new ApiError(
      409,
      'VERSION_CONFLICT',
      '资料来源已变化，请刷新后重试',
      {
        currentVersion: source.version,
        expectedVersion: payload.expectedVersion,
        resourceId: source.id,
        resourceType: 'SOURCE',
      },
    );
  }
  const patch = payload.patch ?? {};
  if (patch.includedInAnalysis !== undefined) {
    source.includedInAnalysis = Boolean(patch.includedInAnalysis);
    source.status = source.includedInAnalysis ? 'READY' : 'EXCLUDED';
  }
  if (patch.title !== undefined) {
    source.title = String(patch.title);
  }
  if (patch.summary !== undefined) {
    source.summary = String(patch.summary);
  }
  source.version += 1;
  source.updatedAt = iso();
  touchIngestion(projectId);
  markMaterialChanged(projectId);
  return clone(ensureIngestion(projectId));
}

export function createAsset(projectId: string, payload: Record<string, any>) {
  getProjectOrThrow(projectId);
  const allowedExtensions: Record<string, RegExp> = {
    image: /\.(png|jpe?g|webp)$/i,
    logo: /\.(png|jpe?g|webp)$/i,
    video: /\.(mp4|mov|webm)$/i,
    document: /\.(pdf|docx|txt|md|pptx)$/i,
  };
  let limit = 20;
  if (payload.kind === 'video') {
    limit = 500;
  } else if (payload.kind === 'document') {
    limit = 50;
  }
  if (
    !allowedExtensions[payload.kind]?.test(String(payload.filename ?? '')) ||
    !Number.isFinite(payload.sizeBytes) ||
    payload.sizeBytes <= 0 ||
    payload.sizeBytes > limit * 1024 * 1024
  ) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      '文件类型或大小不符合要求，请重新选择文件',
    );
  }
  const ingestion = ensureIngestion(projectId);
  if (ingestion.assets.length >= 100) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      '单个项目最多 100 个素材（演示限制）',
    );
  }
  if (payload.scenario === 'UPLOAD_FAILED') {
    throw new ApiError(500, 'MOCK_PROCESSING_FAILED', '模拟上传失败，请重试', {
      retryable: true,
    });
  }
  const timestamp = iso();
  const id = nextId('asset');
  const kind = payload.kind ?? 'other';
  const sourceKindMap: Record<string, Source['kind']> = {
    document: 'DOCUMENT',
    image: 'SCREENSHOT',
    logo: 'BRAND_ASSET',
    other: 'USER_NOTE',
    video: 'SCREEN_RECORDING',
  };
  const sourceId = nextId('source');
  const newSource: Source = {
    assetId: id,
    createdAt: timestamp,
    evidenceIds: [],
    id: sourceId,
    includedInAnalysis: true,
    kind: sourceKindMap[kind] ?? 'USER_NOTE',
    mock: true,
    projectId,
    status: 'READY',
    summary: `已接收 ${payload.filename}，内容解析为模拟摘要（未做真实 OCR / STT / 文档解析）`,
    title: payload.filename,
    updatedAt: timestamp,
    version: 1,
  };
  const newAsset: Asset = {
    createdAt: timestamp,
    filename: payload.filename,
    id,
    kind,
    mimeType: payload.mimeType,
    mockOnly: true,
    previewUrl: undefined,
    projectId,
    purpose: payload.purpose,
    sizeBytes: Number(payload.sizeBytes) || 0,
    sourceId,
    uploadStatus: 'SUCCEEDED',
    updatedAt: timestamp,
    version: 1,
  };
  ingestion.assets.push(newAsset);
  ingestion.sources.push(newSource);
  touchIngestion(projectId);
  markMaterialChanged(projectId);
  return clone(newAsset);
}

export function updateAsset(
  projectId: string,
  assetId: string,
  payload: Record<string, any>,
) {
  const ingestion = ensureIngestion(projectId);
  const asset = ingestion.assets.find((item) => item.id === assetId);
  if (!asset) {
    throw new ApiError(404, 'ASSET_NOT_FOUND', '素材不存在，请重新选择');
  }
  if (
    payload.expectedVersion !== undefined &&
    payload.expectedVersion !== asset.version
  ) {
    throw new ApiError(409, 'VERSION_CONFLICT', '素材已变化，请刷新后重试', {
      currentVersion: asset.version,
      expectedVersion: payload.expectedVersion,
      resourceId: asset.id,
      resourceType: 'ASSET',
    });
  }
  const patch = payload.patch ?? {};
  if (patch.filename !== undefined) {
    asset.filename = String(patch.filename);
  }
  if (patch.kind !== undefined) {
    const formats: Record<string, RegExp> = {
      image: /\.(png|jpe?g|webp)$/i,
      logo: /\.(png|jpe?g|webp)$/i,
      video: /\.(mp4|mov|webm)$/i,
      document: /\.(pdf|docx|txt|md|pptx)$/i,
    };
    if (!formats[patch.kind]?.test(asset.filename))
      throw new ApiError(400, 'VALIDATION_ERROR', '该文件格式不能用于所选分类');
    asset.kind = patch.kind;
    const source = ingestion.sources.find((item) => item.id === asset.sourceId);
    if (source) {
      source.kind =
        (
          {
            image: 'SCREENSHOT',
            logo: 'BRAND_ASSET',
            video: 'SCREEN_RECORDING',
            document: 'DOCUMENT',
          } as Record<string, Source['kind']>
        )[patch.kind] ?? source.kind;
      source.version += 1;
    }
  }
  if (patch.purpose !== undefined) {
    asset.purpose = String(patch.purpose);
  }
  asset.version += 1;
  asset.updatedAt = iso();
  touchIngestion(projectId);
  markMaterialChanged(projectId);
  return clone(asset);
}

export function deleteAsset(
  projectId: string,
  assetId: string,
  payload: Record<string, any> = {},
) {
  const ingestion = ensureIngestion(projectId);
  const index = ingestion.assets.findIndex((item) => item.id === assetId);
  if (index === -1) {
    throw new ApiError(404, 'ASSET_NOT_FOUND', '素材不存在，请刷新后重试');
  }
  const target = ingestion.assets[index];
  if (
    payload.expectedVersion !== undefined &&
    target &&
    payload.expectedVersion !== target.version
  ) {
    throw new ApiError(409, 'VERSION_CONFLICT', '素材已变化，请刷新后重试', {
      currentVersion: target.version,
      expectedVersion: payload.expectedVersion,
      resourceId: target.id,
      resourceType: 'ASSET',
    });
  }
  const [removed] = ingestion.assets.splice(index, 1);
  const project = getProjectOrThrow(projectId);
  if (project.coverAssetId === assetId) {
    project.coverAssetId = undefined;
    project.version += 1;
  }
  if (removed?.sourceId) {
    ingestion.sources = ingestion.sources.filter(
      (item) => item.id !== removed.sourceId,
    );
  }
  touchIngestion(projectId);
  markMaterialChanged(projectId);
  return { deletedId: assetId };
}

export function createDemoSession(
  projectId: string,
  payload: Record<string, any>,
) {
  getProjectOrThrow(projectId);
  ensureIngestion(projectId);
  const scenario = payload.scenario ?? 'AUTH_SUCCESS';
  if (scenario === 'AUTH_SUCCESS') {
    const session: DemoSession = {
      actorLabel: 'demo_viewer',
      createdAt: iso(),
      demoUrl: payload.demoUrl ?? 'https://example.com/demo',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      id: nextId('demo_session'),
      mock: true,
      projectId,
      readOnly: true,
      scopedDomains: ['example.com'],
      status: 'ACTIVE',
    };
    touchIngestion(projectId, { demoSession: session });
    return clone(session);
  }
  const failures: Record<string, DemoSession['status']> = {
    ACCESS_DENIED: 'ACCESS_DENIED',
    MFA_REQUIRED: 'MFA_REQUIRED',
    NO_DEMO_DATA: 'NO_DEMO_DATA',
    SESSION_EXPIRED: 'EXPIRED',
  };
  const status = failures[scenario] ?? 'ACCESS_DENIED';
  const session: DemoSession = {
    actorLabel: 'demo_viewer',
    createdAt: iso(),
    demoUrl: payload.demoUrl,
    expiresAt: iso(),
    id: nextId('demo_session'),
    mock: true,
    projectId,
    readOnly: true,
    scopedDomains: ['example.com'],
    status,
  };
  touchIngestion(projectId, { demoSession: session });
  return clone(session);
}

export function revokeDemoSession(projectId: string) {
  const ingestion = ensureIngestion(projectId);
  if (!ingestion.demoSession) {
    throw new ApiError(404, 'NOT_FOUND', '当前项目没有演示授权会话');
  }
  ingestion.demoSession.status = 'REVOKED';
  ingestion.demoSession.revokedAt = iso();
  touchIngestion(projectId);
  return clone(ingestion.demoSession);
}

export function confirmIngestion(
  projectId: string,
  payload: Record<string, any>,
  actor: Actor,
) {
  const ingestion = ensureIngestion(projectId);
  if (
    payload.expectedVersion !== undefined &&
    payload.expectedVersion !== ingestion.version
  ) {
    throw new ApiError(409, 'VERSION_CONFLICT', '资料已变化，请刷新后重试', {
      currentVersion: ingestion.version,
      expectedVersion: payload.expectedVersion,
      resourceId: projectId,
      resourceType: 'INGESTION',
    });
  }
  const included = (payload.includedSourceIds as string[] | undefined) ?? [];
  const readySources = ingestion.sources.filter(
    (item) => item.status === 'READY' && item.includedInAnalysis,
  );
  const includedSources = readySources.filter((item) =>
    included.includes(item.id),
  );
  if (includedSources.length === 0 && readySources.length > 0) {
    // 未显式传入时默认使用全部有效来源
    includedSources.push(...readySources);
  }
  if (includedSources.length === 0) {
    throw new ApiError(
      422,
      'NO_VALID_SOURCE',
      '至少需要一份有效资料才能开始分析',
    );
  }
  const timestamp = iso();
  const snapshot: IngestionSnapshot = {
    sourceCopies: clone(includedSources),
    assetCopies: clone(
      ingestion.assets.filter((asset) =>
        includedSources.some((source) => source.assetId === asset.id),
      ),
    ),
    evidenceCopies: clone(
      projectEvidence(projectId).filter((evidence) =>
        includedSources.some((source) => source.id === evidence.sourceId),
      ),
    ),
    completeness: 'COMPLETE',
    confirmedAt: timestamp,
    confirmedBy: actor.id,
    coverage: computeCoverage(projectId).coverage,
    createdAt: timestamp,
    id: nextId('snapshot'),
    projectId,
    sourceIds: includedSources.map((item) => item.id),
    sourceVersions: Object.fromEntries(
      includedSources.map((item) => [item.id, item.version]),
    ),
    updatedAt: timestamp,
    version: 1,
  };
  state.snapshots.push(snapshot);
  ingestion.lastConfirmedSnapshotId = snapshot.id;
  ingestion.sources = ingestion.sources.map((item) => ({
    ...item,
    includedInAnalysis: includedSources.some(
      (sourceItem) => sourceItem.id === item.id,
    ),
  }));
  ingestion.status = 'CONFIRMED';
  ingestion.version += 1;
  touchIngestion(projectId);
  ingestion.status = 'CONFIRMED';

  return clone(snapshot);
}

export function startUrlAnalysis(
  projectId: string,
  payload: Record<string, any>,
  actor: Actor,
) {
  const project = getProjectOrThrow(projectId);
  const url = String(payload.url ?? '').trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      '请输入以 http(s):// 开头的有效网址',
    );
  }
  const scenario = String(payload.scenario ?? 'PUBLIC_SUCCESS');
  const ingestion = ensureIngestion(projectId);
  const job = createJob(projectId, 'COLLECT_URL', scenario);
  ingestion.urlCollectionStatus = 'FETCHING';
  ingestion.urlJobId = job.id;
  ingestion.status = 'COLLECTING';
  touchIngestion(projectId);
  project.lastVisitedStage = 'INGEST';
  void actor;
  return { jobId: job.id };
}

export function startUnderstanding(
  projectId: string,
  payload: Record<string, any>,
) {
  getProjectOrThrow(projectId);
  const scenario = String(payload.scenario ?? 'UNDERSTANDING_SUCCESS');
  const scope = String(payload.scope ?? 'FULL');
  const ingestion = ensureIngestion(projectId);
  if (!ingestion.lastConfirmedSnapshotId) {
    throw new ApiError(
      422,
      'NO_VALID_SOURCE',
      '请先确认资料快照，再开始产品理解',
    );
  }
  if (
    ingestion.sources.filter(
      (item) => item.includedInAnalysis && item.status === 'READY',
    ).length === 0
  ) {
    throw new ApiError(422, 'NO_VALID_SOURCE', '当前没有参与分析的有效资料');
  }
  if (
    ingestion.status === 'STALE' ||
    (payload.ingestionSnapshotId &&
      payload.ingestionSnapshotId !== ingestion.lastConfirmedSnapshotId)
  ) {
    throw new ApiError(
      409,
      'VERSION_CONFLICT',
      '资料已变更，请重新确认最新资料快照',
    );
  }
  // 先推进已有任务，避免“离开页面后任务停在 RUNNING”导致误判
  advanceProjectJobs(projectId);
  const activeJob = Object.values(state.jobs).find(
    (job) =>
      job.projectId === projectId &&
      job.kind === 'UNDERSTANDING' &&
      ['CREATED', 'QUEUED', 'RUNNING'].includes(job.status),
  );
  if (activeJob) {
    throw new ApiError(
      409,
      'CONFLICT',
      '已有正在进行的产品理解任务，请等待完成或先取消',
      { jobId: activeJob.id },
    );
  }
  const job = createJob(projectId, 'UNDERSTANDING', `${scenario}:${scope}`);
  job.ingestionSnapshotId = ingestion.lastConfirmedSnapshotId;
  const snapshot = state.snapshots.find(
    (item) => item.id === job.ingestionSnapshotId,
  );
  job.evidenceSnapshot = clone(
    snapshot?.evidenceCopies ??
      projectEvidence(projectId).filter((item) =>
        snapshot?.sourceIds.includes(item.sourceId),
      ),
  );
  state.jobs[job.id] = job;
  return { jobId: job.id };
}

function jobPlan(kind: JobKind, scenario: string) {
  const slow = scenario.includes('SLOW');
  const m2Plans: Partial<
    Record<
      JobKind,
      {
        durationMs: number;
        stages: Array<{ at: number; code: string; label: string }>;
      }
    >
  > = {
    ANALYZE_REFERENCE_AD: {
      durationMs: 1800,
      stages: [
        { at: 0, code: 'read_reference', label: '读取参考广告素材' },
        { at: 700, code: 'extract_patterns', label: '提取抽象创意模式' },
        { at: 1400, code: 'write_insight', label: '写入参考洞察' },
      ],
    },
    BUILD_ANIMATIC: {
      durationMs: 2400,
      stages: [
        { at: 0, code: 'validate_shots', label: '校验镜头与审核状态' },
        { at: 700, code: 'build_timeline', label: '计算净时长与镜头映射' },
        { at: 1600, code: 'freeze_snapshot', label: '冻结预演快照' },
      ],
    },
    DISCOVER_ANGLES: {
      durationMs: 2800,
      stages: [
        { at: 0, code: 'read_understanding', label: '读取已确认产品理解' },
        { at: 800, code: 'extract_value', label: '提取传播价值与证据' },
        { at: 1700, code: 'rank_angles', label: '生成并排序候选切口' },
        { at: 2400, code: 'attach_risks', label: '绑定风险与缺失素材' },
      ],
    },
    SCAN_CLAIMS: {
      durationMs: 2200,
      stages: [
        { at: 0, code: 'read_claims', label: '读取 ClaimAnchor' },
        { at: 900, code: 'scan_conflicts', label: '扫描证据冲突' },
        { at: 1700, code: 'write_findings', label: '写入 Mock 冲突' },
      ],
    },
    EVALUATE_DURATION: {
      durationMs: 1600,
      stages: [{ at: 0, code: 'evaluate', label: '评估创意自然容量' }],
    },
    GENERATE_CONCEPTS: {
      durationMs: 3400,
      stages: [
        { at: 0, code: 'read_brief', label: '读取创意 Brief' },
        { at: 900, code: 'draft_concepts', label: '生成三套故事结构' },
        { at: 2200, code: 'check_diversity', label: '检查方案差异化' },
        { at: 2900, code: 'attach_risks', label: '补充风险与素材建议' },
      ],
    },
    GENERATE_REFERENCE_IMAGE: {
      durationMs: 2400,
      stages: [
        { at: 0, code: 'read_bible', label: '读取视觉规范' },
        { at: 900, code: 'compose_image', label: '组合画面与角色' },
        { at: 1800, code: 'save_version', label: '保存图片新版本' },
      ],
    },
    GENERATE_SCRIPT: {
      durationMs: 3000,
      stages: [
        { at: 0, code: 'read_concept', label: '读取已确认创意' },
        { at: 800, code: 'plan_duration', label: '规划目标时长与节拍' },
        { at: 1900, code: 'write_beats', label: '撰写故事节拍' },
        { at: 2600, code: 'verify_duration', label: '校验总时长' },
      ],
    },
    GENERATE_STORYBOARD: {
      durationMs: 3800,
      stages: [
        { at: 0, code: 'read_script', label: '读取已确认剧本' },
        { at: 900, code: 'map_beats', label: '映射节拍到镜头' },
        { at: 2000, code: 'draft_shots', label: '生成镜头描述' },
        { at: 3000, code: 'bind_images', label: '绑定参考图与视觉规范' },
      ],
    },
    GENERATE_VISUAL_BIBLE: {
      durationMs: 2200,
      stages: [
        { at: 0, code: 'read_script', label: '读取剧本角色与场景' },
        { at: 800, code: 'define_look', label: '生成角色与场景规范' },
        { at: 1700, code: 'lock_brand', label: '补齐品牌与字幕约束' },
      ],
    },
    PLAN_CREATIVE_CHANGE: {
      durationMs: 1400,
      stages: [
        { at: 0, code: 'classify', label: '识别修改意图' },
        { at: 600, code: 'impact', label: '计算影响范围' },
        { at: 1100, code: 'propose', label: '生成变更计划' },
      ],
    },
  };
  const m2Plan = m2Plans[kind];
  if (m2Plan) {
    return {
      ...m2Plan,
      durationMs: slow ? m2Plan.durationMs * 3 : m2Plan.durationMs,
      fail: scenario.includes('FAIL'),
      failCode: 'MOCK_JOB_FAILED',
      failMessage: '模拟创意任务失败，已保留旧版本，可重试',
    };
  }
  if (kind === 'COLLECT_URL') {
    return {
      durationMs: slow ? 12_000 : 3200,
      fail: scenario === 'FETCH_FAILED',
      failCode: 'MOCK_PROCESSING_FAILED',
      failMessage: '模拟采集失败：目标网站暂时无法访问',
      stages: [
        { at: 0, code: 'discover_home', label: '识别网站首页' },
        { at: 900, code: 'extract_features', label: '提取公开功能描述' },
        { at: 1900, code: 'check_login', label: '检查登录门槛' },
        { at: 2800, code: 'build_evidence', label: '整理来源证据' },
      ],
    };
  }
  return {
    durationMs: slow ? 15_000 : 4200,
    fail: scenario.includes('FAILED'),
    failCode: 'MOCK_PROCESSING_FAILED',
    failMessage: '模拟产品理解任务失败，可重试',
    stages: [
      { at: 0, code: 'load_snapshot', label: '读取资料快照' },
      { at: 900, code: 'read_sources', label: '阅读来源与证据' },
      { at: 2200, code: 'draft_report', label: '生成理解草稿' },
      { at: 3400, code: 'attach_evidence', label: '绑定证据等级' },
    ],
  };
}

function createJob(
  projectId: string,
  kind: JobKind,
  scenario: string,
  payload?: Record<string, any>,
) {
  const plan = jobPlan(kind, scenario);
  const timestamp = iso();
  const job: Job = {
    applied: false,
    createdAt: timestamp,
    durationMs: plan.durationMs,
    events: [],
    id: nextId('job'),
    kind,
    payload,
    projectId,
    scenario,
    status: 'CREATED',
    updatedAt: timestamp,
    version: 1,
  };
  state.jobs[job.id] = job;
  return clone(job);
}

function publicJob(job: Job): Job {
  const { applied: _applied, ...rest } = job;
  return clone(rest as Job);
}

export function getJob(jobId: string) {
  const job = state.jobs[jobId];
  if (!job) {
    throw new ApiError(404, 'NOT_FOUND', '任务不存在或已过期');
  }
  advanceJob(job);
  return publicJob(job);
}

function advanceJob(job: Job) {
  if (['CANCELLED', 'FAILED', 'SUCCEEDED'].includes(job.status)) {
    return;
  }
  const plan = jobPlan(job.kind, job.scenario ?? '');
  const elapsed = Date.now() - new Date(job.createdAt).getTime();
  const progress = Math.min(100, Math.floor((elapsed / job.durationMs) * 100));
  const events: JobEvent[] = plan.stages.map((stage) => {
    const stageTime = (stage.at / job.durationMs) * 100;
    let status: JobEvent['status'] = 'PENDING';
    if (progress >= stageTime + 12) {
      status = 'SUCCEEDED';
    } else if (progress >= stageTime) {
      status = 'RUNNING';
    }
    return {
      at: new Date(new Date(job.createdAt).getTime() + stage.at).toISOString(),
      code: stage.code,
      label: stage.label,
      status,
    };
  });
  const failedNow = plan.fail && progress >= 55;
  job.events = events;
  job.progress = failedNow ? 55 : Math.min(progress, 99);
  job.updatedAt = iso();
  if (failedNow) {
    job.status = 'FAILED';
    job.errorCode = plan.failCode;
    job.errorMessage = plan.failMessage;
    if (job.kind === 'COLLECT_URL') {
      const ingestion = ensureIngestion(job.projectId);
      ingestion.urlCollectionStatus = 'FETCH_FAILED';
      ingestion.status = 'READY_TO_CONFIRM';
      touchIngestion(job.projectId);
    }
    return;
  }
  if (elapsed >= job.durationMs) {
    job.status = 'SUCCEEDED';
    job.progress = 100;
    job.events = events.map((item) => ({
      ...item,
      status: 'SUCCEEDED' as const,
    }));
    if (!job.applied) {
      applyJobResult(job);
      job.applied = true;
    }
  } else if (elapsed < 250) {
    job.status = 'QUEUED';
  } else {
    job.status = 'RUNNING';
  }
}

function addSourceEvidence(
  projectId: string,
  sourceId: string,
  entries: Array<{ excerpt: string; level: Evidence['level']; title: string }>,
) {
  const list = projectEvidence(projectId);
  const ids: string[] = [];
  for (const entry of entries) {
    const id = nextId('evidence');
    list.push({
      addedBy: 'mock_agent',
      excerpt: entry.excerpt,
      id,
      level: entry.level,
      projectId,
      sourceId,
      title: entry.title,
    });
    ids.push(id);
  }
  return ids;
}

function applyJobResult(job: Job) {
  if (job.kind === 'COLLECT_URL') {
    applyUrlResult(job);
    return;
  }
  if (job.kind === 'UNDERSTANDING') {
    applyUnderstandingResult(job);
    return;
  }
  if (job.kind === 'ANALYZE_REFERENCE_AD') {
    const insight = createReferenceAdInsight(job.projectId, job.payload ?? {});
    job.resultRefId = insight.id;
    return;
  }
  if (job.kind === 'SCAN_CLAIMS') {
    const conflicts = scanClaimConflicts(
      job.projectId,
      job.payload?.understandingRevisionId,
    );
    job.resultRefId = conflicts[0]?.id;
    return;
  }
  applyM2Job(job);
}

function applyUrlResult(job: Job) {
  const project = getProjectOrThrow(job.projectId);
  const scenario = (job.scenario ?? 'PUBLIC_SUCCESS').split(':')[0] as string;
  const ingestion = ensureIngestion(job.projectId);
  const timestamp = iso();
  const existing = ingestion.sources.find((item) => item.kind === 'PUBLIC_WEB');
  const sourceId = existing?.id ?? nextId('source');
  const url = project.productUrl ?? '';
  const known = knownUrlCopy(project.id);
  const baseCopy = known ?? {
    summary:
      '模拟读取了公开页面标题与简介，但未真实访问该站点；具体功能与用户证据需要补充资料确认。',
    title: '公开页面（模拟结果）',
  };
  const statusMap: Record<
    string,
    { message: string; sourceStatus: Source['status'] }
  > = {
    FETCH_FAILED: {
      message: '模拟采集失败：目标网站暂时无法访问',
      sourceStatus: 'FAILED',
    },
    LOGIN_REQUIRED: {
      message: '公开页面不足以确认登录后的功能',
      sourceStatus: 'READY',
    },
    PARTIAL: {
      message: '仅采集到部分公开页面，缺失功能详情',
      sourceStatus: 'READY',
    },
    PUBLIC_SUCCESS: {
      message: '模拟采集完成：公开页面摘要与证据已生成',
      sourceStatus: 'READY',
    },
  };
  const mapped = statusMap[scenario] ?? {
    message: '模拟采集完成：公开页面摘要与证据已生成',
    sourceStatus: 'READY' as Source['status'],
  };
  const source: Source = existing ?? {
    createdAt: timestamp,
    evidenceIds: [],
    id: sourceId,
    includedInAnalysis: true,
    kind: 'PUBLIC_WEB',
    mock: true,
    projectId: project.id,
    status: 'READY',
    title: baseCopy.title,
    updatedAt: timestamp,
    version: 1,
  };
  source.status = mapped.sourceStatus;
  source.summary = `${baseCopy.summary}（${mapped.message}）`;
  source.referenceUrl = url;
  source.updatedAt = timestamp;
  if (!existing) {
    ingestion.sources.push(source);
  }
  if (source.status === 'READY') {
    const entries =
      scenario === 'LOGIN_REQUIRED'
        ? [
            {
              excerpt:
                '公开页面只提供产品定位与少量功能描述，登录后能力无法确认。',
              level: 'hypothesis' as const,
              title: '公开页面信息有限',
            },
          ]
        : [
            {
              excerpt: `${url} 的公开页面标题与简介（模拟摘要）。`,
              level: 'verified' as const,
              title: '公开页面摘要（模拟）',
            },
            {
              excerpt: '登录后的功能与真实用户反馈尚未通过资料确认。',
              level: 'hypothesis' as const,
              title: '待验证事项',
            },
          ];
    const ids = addSourceEvidence(project.id, source.id, entries);
    source.evidenceIds = [...new Set([...source.evidenceIds, ...ids])];
  }
  const statusByScenario: Record<string, Ingestion['urlCollectionStatus']> = {
    FETCH_FAILED: 'FETCH_FAILED',
    LOGIN_REQUIRED: 'LOGIN_REQUIRED',
    PARTIAL: 'PARTIAL',
    PUBLIC_SUCCESS: 'PUBLIC_SUCCESS',
  };
  ingestion.urlCollectionStatus =
    statusByScenario[scenario] ?? 'PUBLIC_SUCCESS';
  touchIngestion(project.id);
  ingestion.status = ingestion.lastConfirmedSnapshotId
    ? 'STALE'
    : 'READY_TO_CONFIRM';
  project.lastVisitedStage = 'INGEST';
  job.resultRefId = source.id;
}

function knownUrlCopy(
  projectId: string,
): null | { summary: string; title: string } {
  const map: Record<string, { summary: string; title: string }> = {
    project_crm: {
      summary:
        '公开官网提供产品定位与 2 个功能模块；登录后的自动化与数据能力无法通过公开页面确认。',
      title: '官网公开页面（模拟）',
    },
    project_knowledge_base: {
      summary: '公开官网展示了知识整理与自然语言搜索能力。',
      title: '官网首页与功能页（模拟）',
    },
    project_resume_3d: {
      summary: '公开官网确认 3D 展示、作品墙与分享链接能力。',
      title: '官网首页与功能页（模拟）',
    },
    project_video_agent: {
      summary: 'VidCraft 官网说明从产品网址到创意、分镜与成片的定位。',
      title: 'VidCraft 官网（模拟）',
    },
  };
  return map[projectId] ?? null;
}

function captureEvidenceSnapshots(revision: UnderstandingRevision) {
  const target = m11State();
  const list = target.evidenceSnapshots[revision.projectId] ?? [];
  const snapshot = state.snapshots.find(
    (item) => item.id === revision.ingestionSnapshotId,
  );
  const evidenceIds = new Set<string>(revision.usedEvidenceIds);
  for (const section of [
    revision.features,
    revision.personas,
    revision.painPoints,
    revision.valueAngleSeeds,
  ]) {
    for (const item of section ?? []) {
      for (const id of item.sourceEvidenceIds ?? []) evidenceIds.add(id);
    }
  }
  for (const evidenceId of evidenceIds) {
    if (
      list.some(
        (item) =>
          item.capturedForRevisionId === revision.id &&
          item.evidenceId === evidenceId,
      )
    ) {
      continue;
    }
    const evidence = (state.evidence[revision.projectId] ?? []).find(
      (item) => item.id === evidenceId,
    );
    if (!evidence) continue;
    const sourceVersion = snapshot?.sourceVersions?.[evidence.sourceId];
    list.push({
      capturedAt: iso(),
      capturedForRevisionId: revision.id,
      evidenceId,
      id: nextId('evidence-locator'),
      ingestionSnapshotId: revision.ingestionSnapshotId,
      locator: {
        pageNo: evidence.pageNo,
        screenshotAssetId: evidence.screenshotAssetId,
        timeEndSec: evidence.timeEndSec,
        timeStartSec: evidence.timeStartSec,
      },
      projectId: revision.projectId,
      sourceId: evidence.sourceId,
      ...(sourceVersion === undefined
        ? {
            recoverability: 'LEGACY_EVIDENCE_UNRESOLVED',
            unresolvedReason: '新建修订时无法证明来源版本',
          }
        : {
            evidenceLevelAtCapture: evidence.level,
            excerptSnapshot: evidence.excerpt,
            recoverability: 'CAPTURED',
            sourceVersion,
          }),
    });
  }
  target.evidenceSnapshots[revision.projectId] = list;
}

function applyUnderstandingResult(job: Job) {
  const project = getProjectOrThrow(job.projectId);
  const ingestion = ensureIngestion(project.id);
  const scope = ((job.scenario ?? '').split(':')[1] ?? 'FULL') as string;
  const revisions = projectRevisions(project.id);
  const base = revisions.toSorted((a, b) => b.revisionNo - a.revisionNo)[0];
  const evidence = job.evidenceSnapshot ?? projectEvidence(project.id);
  const template = buildReportTemplate(project, evidence, base ?? null, scope);
  const timestamp = iso();
  const revision: UnderstandingRevision = {
    ...template,
    createdAt: timestamp,
    id: nextId('revision'),
    ingestionSnapshotId:
      job.ingestionSnapshotId ?? ingestion.lastConfirmedSnapshotId ?? '',
    parentRevisionId: base?.id,
    projectId: project.id,
    revisionNo: (base?.revisionNo ?? 0) + 1,
    status: 'DRAFT',
    updatedAt: timestamp,
    version: 1,
  };
  revisions.push(revision);
  captureEvidenceSnapshots(revision);
  ensureClaimAnchors(revision);
  project.currentStage = 'UNDERSTANDING';
  project.lastVisitedStage = 'UNDERSTANDING';
  project.status = 'IN_PROGRESS';
  project.updatedAt = timestamp;
  job.resultRefId = revision.id;
}

function buildReportTemplate(
  project: Project,
  evidence: Evidence[],
  base: null | UnderstandingRevision,
  scope: string,
): Omit<
  UnderstandingRevision,
  | 'createdAt'
  | 'id'
  | 'ingestionSnapshotId'
  | 'parentRevisionId'
  | 'projectId'
  | 'revisionNo'
  | 'status'
  | 'updatedAt'
  | 'version'
> {
  const evidenceIds = evidence.map((item) => item.id);
  const featureEvidence =
    evidence.find((item) => item.level === 'verified') ?? evidence[0];
  const preset = presetReport(project.id);

  const features: Feature[] = base?.features ??
    preset?.features ?? [
      {
        description: `${project.productName ?? project.title} 的公开介绍（模拟摘要）`,
        evidenceLevel: featureEvidence ? 'verified' : 'hypothesis',
        id: nextId('feature'),
        outcome: '帮助目标用户完成核心任务',
        reviewStatus: 'pending',
        sourceEvidenceIds: featureEvidence ? [featureEvidence.id] : [],
        title: '核心产品能力',
        usableInMarketing: Boolean(featureEvidence),
      },
      {
        description: '来自输入资料的待验证能力，需要客户确认后才可用于宣传。',
        evidenceLevel: 'hypothesis',
        id: nextId('feature'),
        outcome: '可能提升使用体验',
        reviewStatus: 'pending',
        sourceEvidenceIds: [],
        title: '待确认的差异化能力',
        usableInMarketing: false,
      },
    ];
  const personas: Persona[] = base?.personas ??
    preset?.personas ?? [
      {
        currentApproach: '使用通用工具或人工流程',
        evidenceLevel: 'hypothesis',
        id: nextId('persona'),
        jobsToBeDone: ['完成当前工作中的关键任务', '减少重复操作'],
        mainFrictions: ['缺少针对性工具', '流程分散'],
        name: '目标用户（待确认）',
        purchaseMotivation: '提升效率与专业形象',
        reviewStatus: 'pending',
        role: '产品目标用户',
        sourceEvidenceIds: [],
      },
      {
        currentApproach: '沿用旧习惯，靠人工补救',
        evidenceLevel: 'hypothesis',
        id: nextId('persona'),
        jobsToBeDone: ['在有限时间内交付结果', '避免反复返工'],
        mainFrictions: ['学习成本高', '结果不稳定'],
        name: '次要用户（待确认）',
        purchaseMotivation: '降低试错成本',
        reviewStatus: 'pending',
        role: '协作者 / 决策者',
        sourceEvidenceIds: [],
      },
    ];
  const painTemplates = [
    ['日常工作中', '现有流程重复且低效，时间被大量占用', ['烦躁']],
    ['需要交付结果时', '信息分散，关键内容难以快速找到', ['焦虑']],
    ['与团队协作时', '沟通记录不统一，容易遗漏重要事项', ['无力']],
    ['刚接触新工具时', '学习成本高，不知道从哪一步开始', ['畏难']],
    ['复盘结果时', '没有可靠数据，难以判断是否真的改善', ['不确定']],
  ] as const;
  const pains: PainPoint[] =
    preset?.painPoints ??
    painTemplates.map(([scenario, painPoint, emotions], index) => ({
      currentApproach: index % 2 === 0 ? '人工处理' : '通用工具临时替代',
      emotions: [...emotions],
      evidenceLevel: 'hypothesis',
      id: nextId('pain'),
      linkedFeatureIds: features.slice(0, 1).map((item) => item.id),
      painPoint,
      personaIds: personas.slice(0, 1).map((item) => item.id),
      reviewStatus: 'pending',
      scenario,
      sourceEvidenceIds: [],
    }));
  const values: ValueSeed[] = preset?.valueAngleSeeds ?? [
    {
      audienceReaction: '产生好奇，想了解产品是否真的能解决',
      category: 'novelty',
      evidenceLevel: 'hypothesis',
      id: nextId('seed'),
      relatedFeatureIds: features.map((item) => item.id),
      relatedPainPointIds: pains.map((item) => item.id),
      title: `${project.productName ?? project.title} 的新旧方式对比`,
    },
  ];

  const shouldRefreshPains = scope === 'PAIN_POINTS' || scope === 'FULL';
  const shouldRefreshValues = scope === 'VALUE_ANGLES' || scope === 'FULL';

  const painCandidates = preset?.painPoints ?? renamePains(pains, base);
  const valueCandidates = preset?.valueAngleSeeds ?? renameValues(values, base);

  return {
    approvedAt: undefined,
    approvedBy: undefined,
    brandGuidelines: base?.brandGuidelines ??
      preset?.brandGuidelines ?? ['沿用产品官网主色与语气', '避免夸大效果'],
    category: base?.category ?? preset?.category ?? '待确认',
    competitorAlternatives: base?.competitorAlternatives ??
      preset?.competitorAlternatives ?? ['传统做法', '通用工具'],
    features,
    missingInformation: base?.missingInformation ??
      preset?.missingInformation ?? ['缺少真实用户访谈', '缺少投放效果数据'],
    painPoints: shouldRefreshPains
      ? mergePains(
          base?.painPoints ?? [],
          painCandidates,
          base?.revisionNo ?? 0,
        )
      : (base?.painPoints ?? pains),
    personas,
    productSummary:
      base?.productSummary ??
      preset?.productSummary ??
      `${project.productName ?? project.title} 帮助目标用户更高效地完成核心任务（模拟理解摘要）。`,
    prohibitedClaims: base?.prohibitedClaims ??
      preset?.prohibitedClaims ?? ['保证效果或收益', '宣称未经验证的能力'],
    reviewerNotes: undefined,
    riskNotes: base?.riskNotes ??
      preset?.riskNotes ?? ['部分结论来自 AI 推测，需要人工确认'],
    usedEvidenceIds: evidenceIds,
    valueAngleSeeds: shouldRefreshValues
      ? mergeValues(
          base?.valueAngleSeeds ?? [],
          valueCandidates,
          base?.revisionNo ?? 0,
        )
      : (base?.valueAngleSeeds ?? values),
    whyThisAngle:
      base?.whyThisAngle ??
      preset?.whyThisAngle ??
      '当前资料只支持产品定位与少量能力，创意切口仍需在 M2 结合更多证据验证。',
  };
}

function normalizeCandidateText(text: string) {
  return text
    .replaceAll('（重新分析版本）', '')
    .replaceAll('（新视角）', '')
    .trim();
}

function mergePains(
  baseList: PainPoint[],
  generated: PainPoint[],
  revisionNo: number,
): PainPoint[] {
  if (baseList.length === 0) {
    return generated;
  }
  // 保留全部人工编辑结果，只追加新的候选，绝不静默覆盖用户改过的痛点
  const texts = new Set(
    baseList.map((item) => normalizeCandidateText(item.painPoint)),
  );
  const additions = generated
    .filter((item) => !texts.has(normalizeCandidateText(item.painPoint)))
    .map((item, index) => ({
      ...item,
      id: `${item.id}_r${revisionNo + 1}_${index}`,
    }));
  return [...baseList, ...additions];
}

function mergeValues(
  baseList: ValueSeed[],
  generated: ValueSeed[],
  revisionNo: number,
): ValueSeed[] {
  if (baseList.length === 0) {
    return generated;
  }
  const titles = new Set(
    baseList.map((item) => normalizeCandidateText(item.title)),
  );
  const additions = generated
    .filter((item) => !titles.has(normalizeCandidateText(item.title)))
    .map((item, index) => ({
      ...item,
      id: `${item.id}_r${revisionNo + 1}_${index}`,
    }));
  return [...baseList, ...additions];
}

function renamePains(
  list: PainPoint[],
  base: null | UnderstandingRevision,
): PainPoint[] {
  if (!base) {
    return list;
  }
  return list.map((item, index) => ({
    ...item,
    id: `${item.id}_r${base.revisionNo + 1}_${index}`,
    painPoint: `${item.painPoint}（重新分析版本）`,
  }));
}

function renameValues(
  list: ValueSeed[],
  base: null | UnderstandingRevision,
): ValueSeed[] {
  if (!base) {
    return list;
  }
  return list.map((item, index) => ({
    ...item,
    id: `${item.id}_r${base.revisionNo + 1}_${index}`,
    title: `${item.title}（新视角）`,
  }));
}

interface PresetReport {
  brandGuidelines: string[];
  category: string;
  competitorAlternatives: string[];
  features: Feature[];
  missingInformation: string[];
  painPoints: PainPoint[];
  personas: Persona[];
  productSummary: string;
  prohibitedClaims: string[];
  riskNotes: string[];
  valueAngleSeeds: ValueSeed[];
  whyThisAngle: string;
}

/** CRM 与 VidCraft 的固定理解种子（与附录 A 对齐） */
function presetReport(projectId: string): null | PresetReport {
  if (projectId === 'project_crm') {
    const f1: Feature = {
      description: '客户信息集中管理，跟进记录和阶段可视化。',
      evidenceLevel: 'verified',
      id: 'feature_crm_pipeline',
      outcome: '减少客户信息分散与交接遗漏',
      reviewStatus: 'pending',
      sourceEvidenceIds: ['evidence_crm_web_01'],
      title: '客户与跟进管理',
      usableInMarketing: true,
    };
    const f2: Feature = {
      description: '官网提到销售漏斗与提醒能力，具体行为需演示环境确认。',
      evidenceLevel: 'hypothesis',
      id: 'feature_crm_reminder',
      outcome: '可能减少跟进遗漏',
      reviewStatus: 'pending',
      sourceEvidenceIds: ['evidence_crm_web_02'],
      title: '跟进提醒与销售漏斗（待验证）',
      usableInMarketing: false,
    };
    const p1: Persona = {
      currentApproach: 'Excel + 聊天工具人工记录',
      evidenceLevel: 'hypothesis',
      id: 'persona_crm_manager',
      jobsToBeDone: ['掌握团队跟进进度', '避免客户流失'],
      mainFrictions: ['信息不透明', '交接靠口头'],
      name: '中小企业销售负责人',
      purchaseMotivation: '提升转化率与团队透明度',
      reviewStatus: 'pending',
      role: '销售管理者',
      sourceEvidenceIds: [],
    };
    const p2: Persona = {
      currentApproach: '手机备忘录与聊天记录',
      evidenceLevel: 'hypothesis',
      id: 'persona_crm_rep',
      jobsToBeDone: ['记住每个客户的下次跟进', '快速查看历史沟通'],
      mainFrictions: ['漏跟进', '重复沟通'],
      name: '一线销售',
      purchaseMotivation: '减少失误、提升成单效率',
      reviewStatus: 'pending',
      role: '销售代表',
      sourceEvidenceIds: [],
    };
    const pains: PainPoint[] = [
      {
        currentApproach: '靠记忆与日历',
        emotions: ['担心'],
        evidenceLevel: 'hypothesis',
        id: 'pain_crm_01',
        linkedFeatureIds: [f2.id],
        painPoint: '忘记跟进，客户被竞争对手抢走',
        personaIds: [p2.id],
        reviewStatus: 'pending',
        scenario: '同时跟进多个客户时',
        sourceEvidenceIds: [],
      },
      {
        currentApproach: '聊天记录翻找',
        emotions: ['烦躁'],
        evidenceLevel: 'hypothesis',
        id: 'pain_crm_02',
        linkedFeatureIds: [f1.id],
        painPoint: '重复询问客户已经说过的问题',
        personaIds: [p2.id],
        reviewStatus: 'pending',
        scenario: '换人跟进时',
        sourceEvidenceIds: [],
      },
      {
        currentApproach: '口头交接',
        emotions: ['无力'],
        evidenceLevel: 'hypothesis',
        id: 'pain_crm_03',
        linkedFeatureIds: [f1.id],
        painPoint: '客户交接信息丢失',
        personaIds: [p1.id],
        reviewStatus: 'pending',
        scenario: '销售离职或轮岗时',
        sourceEvidenceIds: [],
      },
      {
        currentApproach: '人工统计',
        emotions: ['焦虑'],
        evidenceLevel: 'hypothesis',
        id: 'pain_crm_04',
        linkedFeatureIds: [f2.id],
        painPoint: '销售进度不透明，无法及时干预',
        personaIds: [p1.id],
        reviewStatus: 'pending',
        scenario: '月末复盘时',
        sourceEvidenceIds: [],
      },
      {
        currentApproach: '事后复盘',
        emotions: ['懊恼'],
        evidenceLevel: 'hypothesis',
        id: 'pain_crm_05',
        linkedFeatureIds: [],
        painPoint: '机会损失后才发现问题',
        personaIds: [p1.id],
        reviewStatus: 'pending',
        scenario: '季度复盘中',
        sourceEvidenceIds: [],
      },
    ];
    return {
      brandGuidelines: ['主色：商务蓝', '语气：务实、可信'],
      category: '企业 SaaS / 销售管理',
      competitorAlternatives: ['Excel', '通用项目管理工具', '其他 CRM'],
      features: [f1, f2],
      missingInformation: ['登录后功能需演示授权确认', '缺少真实客户案例'],
      painPoints: pains,
      personas: [p1, p2],
      productSummary:
        '面向销售团队的客户信息与跟进管理工具（公开资料），登录后能力待验证。',
      prohibitedClaims: ['宣称提升固定比例的转化率', '宣称自动完成销售决策'],
      riskNotes: ['自动化能力来自公开描述，未经演示确认'],
      valueAngleSeeds: [
        {
          audienceReaction: '被说中：原来客户就是这样悄悄流失的',
          category: 'pain',
          evidenceLevel: 'hypothesis',
          id: 'seed_crm_01',
          oldApproach: '靠记忆和零散记录跟进',
          newApproach: '统一的客户信息与跟进视图',
          relatedFeatureIds: [f1.id],
          relatedPainPointIds: ['pain_crm_01'],
          title: '一个漏掉的回访，丢掉一个客户',
        },
        {
          audienceReaction: '意识到管理盲区',
          category: 'transformation',
          evidenceLevel: 'hypothesis',
          id: 'seed_crm_02',
          oldApproach: '月底才知道结果',
          newApproach: '过程透明、提前预警',
          relatedFeatureIds: [f2.id],
          relatedPainPointIds: ['pain_crm_04'],
          title: '从“结果复盘”到“过程可干预”',
        },
      ],
      whyThisAngle:
        '公开资料能确认客户信息管理，提醒与漏斗仍需演示环境；因此先用“漏跟进”这一高频场景建立共鸣。',
    };
  }

  if (projectId === 'project_video_agent') {
    const f1: Feature = {
      description:
        '输入产品网址与资料，生成创意方向、脚本与分镜（Mock 演示）。',
      evidenceLevel: 'verified',
      id: 'feature_va_workflow',
      outcome: '让不懂推广的产品团队也能产出营销视频',
      reviewStatus: 'pending',
      sourceEvidenceIds: ['evidence_va_01'],
      title: '从产品资料到创意与分镜',
      usableInMarketing: true,
    };
    const f2: Feature = {
      description: '录屏中展示了从网址到创意草案的模拟流程。',
      evidenceLevel: 'verified',
      id: 'feature_va_demo',
      outcome: '降低脚本与分镜的启动成本',
      reviewStatus: 'pending',
      sourceEvidenceIds: ['evidence_va_02'],
      title: '可视化工作流',
      usableInMarketing: true,
    };
    const p1: Persona = {
      currentApproach: '自己写文案、找模板',
      evidenceLevel: 'hypothesis',
      id: 'persona_va_dev',
      jobsToBeDone: ['把产品讲清楚', '持续产出可发布的短视频'],
      mainFrictions: ['不会策划', '缺少审美与时间'],
      name: '独立开发者',
      purchaseMotivation: '让产品被更多人看到',
      reviewStatus: 'pending',
      role: '独立开发者 / 小团队',
      sourceEvidenceIds: [],
    };
    const pains: PainPoint[] = [
      {
        currentApproach: '硬写卖点',
        emotions: ['挫败'],
        evidenceLevel: 'hypothesis',
        id: 'pain_va_01',
        linkedFeatureIds: [f1.id],
        painPoint: '做出产品却讲不清价值',
        personaIds: [p1.id],
        reviewStatus: 'pending',
        scenario: '准备发布推广时',
        sourceEvidenceIds: [],
      },
      {
        currentApproach: '套用模板',
        emotions: ['焦虑'],
        evidenceLevel: 'hypothesis',
        id: 'pain_va_02',
        linkedFeatureIds: [f2.id],
        painPoint: '不会写脚本、不会做分镜',
        personaIds: [p1.id],
        reviewStatus: 'pending',
        scenario: '第一次做营销视频时',
        sourceEvidenceIds: [],
      },
      {
        currentApproach: '外包',
        emotions: ['心疼'],
        evidenceLevel: 'hypothesis',
        id: 'pain_va_03',
        linkedFeatureIds: [],
        painPoint: '外包成本高、修改来回沟通',
        personaIds: [p1.id],
        reviewStatus: 'pending',
        scenario: '预算有限的早期团队',
        sourceEvidenceIds: [],
      },
      {
        currentApproach: '反复改稿',
        emotions: ['烦躁'],
        evidenceLevel: 'hypothesis',
        id: 'pain_va_04',
        linkedFeatureIds: [f1.id],
        painPoint: '改一版就要重新理解需求',
        personaIds: [p1.id],
        reviewStatus: 'pending',
        scenario: '视频需要多次迭代时',
        sourceEvidenceIds: [],
      },
      {
        currentApproach: '凭感觉',
        emotions: ['不确定'],
        evidenceLevel: 'hypothesis',
        id: 'pain_va_05',
        linkedFeatureIds: [],
        painPoint: '不知道视频有没有传播力',
        personaIds: [p1.id],
        reviewStatus: 'pending',
        scenario: '上线前判断内容时',
        sourceEvidenceIds: [],
      },
    ];
    return {
      brandGuidelines: ['主色：紫色', '语气：克制、专业、有想象力'],
      category: 'AI 创意工具 / 内容生产',
      competitorAlternatives: [
        '自己写脚本',
        '外包视频团队',
        '通用 AI 视频工具',
      ],
      features: [f1, f2],
      missingInformation: ['真实生成质量尚未验证', '缺少投放效果数据'],
      painPoints: pains,
      personas: [p1],
      productSummary:
        '从产品网址与资料出发，帮助团队发现传播切口并生成营销视频的 AI 创意工具（Mock 演示）。',
      prohibitedClaims: ['宣称保证播放量或转化', '宣称已实现真实视频生成能力'],
      riskNotes: ['M1 只验证产品理解，不验证视频生成质量'],
      valueAngleSeeds: [
        {
          audienceReaction: '有共鸣：我的产品也是这样被埋没的',
          category: 'pain',
          evidenceLevel: 'hypothesis',
          id: 'seed_va_01',
          oldApproach: '做好网站却不知道怎么推广',
          newApproach: '先找到传播切口，再生成创意与分镜',
          relatedFeatureIds: [f1.id],
          relatedPainPointIds: ['pain_va_01'],
          title: '做了一个很厉害的网站，却不知道怎么让别人点开',
        },
        {
          audienceReaction: '好奇 AI 能理解到什么程度',
          category: 'curiosity',
          evidenceLevel: 'hypothesis',
          id: 'seed_va_02',
          oldApproach: '套模板写卖点',
          newApproach: '从资料中提取真实价值线索',
          relatedFeatureIds: [f1.id, f2.id],
          relatedPainPointIds: ['pain_va_02'],
          title: '让 AI 先读懂产品，再写创意',
        },
      ],
      whyThisAngle:
        'VidCraft 自身的核心矛盾是“会做产品但不会讲价值”，这与目标用户处境一致，适合作为元叙事切口。',
    };
  }

  return null;
}

function revisionIsStale(revision: UnderstandingRevision) {
  const ingestion = ensureIngestion(revision.projectId);
  return (
    ingestion.status === 'STALE' ||
    revision.ingestionSnapshotId !== ingestion.lastConfirmedSnapshotId
  );
}

// STALE 为读取时的有效性投影；已审核原始内容、签名与版本不被资料变更覆盖。
function revisionView(revision: UnderstandingRevision): UnderstandingRevision {
  const result = clone(revision);
  if (state.revisionComments?.[revision.id]?.length)
    result.reviewLog = [
      ...(result.reviewLog ?? []),
      ...(state.revisionComments?.[revision.id] ?? []),
    ];
  if (result.status === 'APPROVED' && revisionIsStale(revision))
    result.status = 'STALE';
  return result;
}

export function listRevisions(projectId: string) {
  getProjectOrThrow(projectId);
  advanceProjectJobs(projectId);
  return clone(
    projectRevisions(projectId)
      .toSorted((a, b) => b.revisionNo - a.revisionNo)
      .map((item) => revisionView(item)),
  );
}

function diffEntitySection(
  key: string,
  label: string,
  before: any[],
  after: any[],
  fields: string[],
  labelField: string,
) {
  const items: any[] = [];
  const byId = new Map<string, { after?: any; before?: any }>();
  for (const item of before ?? []) byId.set(item.id, { before: item });
  for (const item of after ?? []) {
    byId.set(item.id, { ...byId.get(item.id), after: item });
  }
  for (const [id, pair] of byId) {
    if (!pair.before) {
      items.push({
        change: 'ADDED',
        fields: fields.map((field) => ({
          after: pair.after?.[field],
          before: undefined,
          field,
        })),
        id,
        label: pair.after?.[labelField] ?? id,
      });
      continue;
    }
    if (!pair.after) {
      items.push({
        change: 'REMOVED',
        fields: fields.map((field) => ({
          after: undefined,
          before: pair.before?.[field],
          field,
        })),
        id,
        label: pair.before?.[labelField] ?? id,
      });
      continue;
    }
    const changes = fields
      .filter(
        (field) =>
          JSON.stringify(pair.before?.[field]) !==
          JSON.stringify(pair.after?.[field]),
      )
      .map((field) => ({
        after: pair.after?.[field],
        before: pair.before?.[field],
        field,
      }));
    if (changes.length > 0) {
      items.push({
        change: 'CHANGED',
        fields: changes,
        id,
        label: pair.after?.[labelField] ?? id,
      });
    }
  }
  return { items, key, label };
}

export function getUnderstandingDiff(
  projectId: string,
  fromRevisionId: string,
  toRevisionId: string,
) {
  const revisions = projectRevisions(projectId);
  const from = revisions.find((item) => item.id === fromRevisionId);
  const to = revisions.find((item) => item.id === toRevisionId);
  if (!from || !to) {
    throw new ApiError(404, 'NOT_FOUND', '对比修订不属于当前项目');
  }
  const sections = [
    diffEntitySection(
      'features',
      '产品功能',
      from.features,
      to.features,
      [
        'title',
        'description',
        'outcome',
        'usableInMarketing',
        'evidenceLevel',
        'reviewStatus',
        'sourceEvidenceIds',
      ],
      'title',
    ),
    diffEntitySection(
      'personas',
      '用户画像',
      from.personas,
      to.personas,
      [
        'name',
        'role',
        'currentApproach',
        'jobsToBeDone',
        'mainFrictions',
        'purchaseMotivation',
        'evidenceLevel',
        'reviewStatus',
        'sourceEvidenceIds',
      ],
      'name',
    ),
    diffEntitySection(
      'painPoints',
      '痛点',
      from.painPoints,
      to.painPoints,
      [
        'painPoint',
        'scenario',
        'emotions',
        'currentApproach',
        'costOfProblem',
        'evidenceLevel',
        'reviewStatus',
        'sourceEvidenceIds',
      ],
      'painPoint',
    ),
    diffEntitySection(
      'valueAngleSeeds',
      '价值角度',
      from.valueAngleSeeds,
      to.valueAngleSeeds,
      [
        'title',
        'category',
        'audienceReaction',
        'evidenceLevel',
        'oldApproach',
        'newApproach',
      ],
      'title',
    ),
  ];
  const beforeProhibited = new Set(from.prohibitedClaims);
  const afterProhibited = new Set(to.prohibitedClaims);
  const prohibitedClaims = {
    added: [...afterProhibited].filter((item) => !beforeProhibited.has(item)),
    removed: [...beforeProhibited].filter((item) => !afterProhibited.has(item)),
  };
  const beforeEvidence = new Set(from.usedEvidenceIds);
  const afterEvidence = new Set(to.usedEvidenceIds);
  const evidence = {
    added: [...afterEvidence].filter((item) => !beforeEvidence.has(item)),
    removed: [...beforeEvidence].filter((item) => !afterEvidence.has(item)),
  };
  return {
    evidence,
    fromRevisionId: from.id,
    fromRevisionNo: from.revisionNo,
    m2Impact: {
      note: 'Diff 只读；不会自动覆盖已批准创意、剧本、分镜或预演。进入 M2 修改需走原 ChangePlan/PATCH 流程。',
      staleStageNames:
        from.id === to.id
          ? []
          : ['创意方案', '剧本', '分镜', '预演'].filter(
              (stage) => stage.length > 0,
            ),
    },
    prohibitedClaims,
    sections,
    summary: {
      added: sections.reduce(
        (total, section) =>
          total +
          section.items.filter((item) => item.change === 'ADDED').length,
        0,
      ),
      changed: sections.reduce(
        (total, section) =>
          total +
          section.items.filter((item) => item.change === 'CHANGED').length,
        0,
      ),
      removed: sections.reduce(
        (total, section) =>
          total +
          section.items.filter((item) => item.change === 'REMOVED').length,
        0,
      ),
    },
    toRevisionId: to.id,
    toRevisionNo: to.revisionNo,
  };
}

export function getRevision(projectId: string, revisionId: string) {
  const revision = projectRevisions(projectId).find(
    (item) => item.id === revisionId,
  );
  if (!revision) {
    throw new ApiError(404, 'NOT_FOUND', '理解报告版本不存在');
  }
  return revisionView(revision);
}

export function getActiveUnderstanding(projectId: string) {
  getProjectOrThrow(projectId);
  advanceProjectJobs(projectId);
  const revisions = projectRevisions(projectId).toSorted(
    (a, b) => b.revisionNo - a.revisionNo,
  );
  const approved = revisions.find(
    (item) => item.status === 'APPROVED' && !revisionIsStale(item),
  );
  const draft = revisions.find((item) => item.status !== 'APPROVED');
  return {
    active: approved ? clone(approved) : null,
    latest: revisions[0] ? revisionView(revisions[0]) : null,
    draft: draft ? clone(draft) : null,
  };
}

export function updateRevision(
  projectId: string,
  revisionId: string,
  payload: Record<string, any>,
) {
  const revision = projectRevisions(projectId).find(
    (item) => item.id === revisionId,
  );
  if (!revision) {
    throw new ApiError(404, 'NOT_FOUND', '理解报告版本不存在');
  }
  if (revision.status === 'APPROVED') {
    throw new ApiError(
      409,
      'VERSION_CONFLICT',
      '已确认版本不可直接修改，请派生新草稿',
      {
        currentVersion: revision.version,
        expectedVersion: payload.expectedVersion,
        resourceId: revision.id,
        resourceType: 'UNDERSTANDING_REVISION',
      },
    );
  }
  if (
    payload.expectedVersion !== undefined &&
    payload.expectedVersion !== revision.version
  ) {
    throw new ApiError(
      409,
      'VERSION_CONFLICT',
      '报告已被其他操作更新，请刷新并合并修改',
      {
        currentVersion: revision.version,
        expectedVersion: payload.expectedVersion,
        resourceId: revision.id,
        resourceType: 'UNDERSTANDING_REVISION',
      },
    );
  }
  const patch = payload.patch ?? {};
  for (const key of [
    'features',
    'personas',
    'painPoints',
    'valueAngleSeeds',
  ] as const) {
    if (!patch[key]) continue;
    if (!Array.isArray(patch[key]))
      throw new ApiError(400, 'VALIDATION_ERROR', '报告条目格式无效');
    for (const item of patch[key]) {
      const previous = revision[key].find((entry) => entry.id === item.id);
      if (
        item.evidenceLevel === 'verified' &&
        previous?.evidenceLevel !== 'verified'
      ) {
        const supported = projectEvidence(projectId).some(
          (evidence) =>
            evidence.level === 'verified' &&
            item.sourceEvidenceIds?.includes(evidence.id),
        );
        if (!supported)
          throw new ApiError(
            422,
            'UNSUPPORTED_CLAIM',
            '缺少已验证证据，不能将推测升级为已验证；请保留推测或标为用户确认',
          );
      }
    }
  }
  for (const key of [
    'features',
    'personas',
    'painPoints',
    'valueAngleSeeds',
  ] as const) {
    if (!Array.isArray(patch[key])) continue;
    for (const removed of revision[key].filter(
      (entry) =>
        !patch[key].some((item: { id: string }) => item.id === entry.id),
    )) {
      revision.deletionHistory ??= [];
      revision.deletionHistory.push({
        id: nextId('deletion'),
        collection: key,
        content: clone(removed),
        at: iso(),
        by: payload.actorId ?? 'demo_user',
      });
      revision.reviewLog ??= [];
      revision.reviewLog.push({
        at: iso(),
        by: payload.actorId ?? 'demo_user',
        note: `移除候选条目：${removed.id}，原内容已保留，可恢复`,
      });
    }
  }
  for (const key of ['features', 'personas', 'painPoints'] as const) {
    if (!Array.isArray(patch[key])) continue;
    for (const entry of patch[key]) {
      if (revision[key].some((item) => item.id === entry.id)) continue;
      if (
        revision.deletionHistory?.some(
          (record) =>
            record.collection === key && record.content.id === entry.id,
        )
      ) {
        revision.reviewLog ??= [];
        revision.reviewLog.push({
          at: iso(),
          by: payload.actorId ?? 'demo_user',
          note: `恢复候选条目：${entry.id}`,
        });
        continue;
      }
      const title = String(
        entry.title ?? entry.name ?? entry.painPoint ?? '用户补充',
      );
      const sourceId = nextId('user_source');
      const evidenceId = nextId('user_evidence');
      ensureIngestion(projectId).sources.push({
        id: sourceId,
        projectId,
        kind: 'USER_NOTE',
        title: `用户提供：${title}`,
        summary: String(entry.description ?? entry.scenario ?? title),
        status: 'READY',
        includedInAnalysis: false,
        mock: true,
        evidenceIds: [evidenceId],
        createdAt: iso(),
        updatedAt: iso(),
        version: 1,
      });
      projectEvidence(projectId).push({
        id: evidenceId,
        projectId,
        sourceId,
        addedBy: 'user',
        level: 'user_confirmed',
        title,
        excerpt: '用户提供的信息，未经外部资料独立验证。',
      });
      entry.evidenceLevel = 'user_confirmed';
      entry.sourceEvidenceIds = [evidenceId];
      revision.usedEvidenceIds.push(evidenceId);
    }
  }
  if (Array.isArray(patch.features)) {
    for (const feature of patch.features) {
      const original = revision.features.find((item) => item.id === feature.id);
      if (
        feature.evidenceLevel === 'unsupported' &&
        original?.evidenceLevel !== 'unsupported'
      ) {
        revision.reviewLog ??= [];
        revision.reviewLog.push({
          at: iso(),
          by: payload.actorId ?? 'demo_user',
          note: `标记不支持：${feature.title}；${feature.editorNote || '产品不支持此能力'}`,
        });
      }
    }
  }
  const allowed = [
    'brandGuidelines',
    'category',
    'competitorAlternatives',
    'features',
    'missingInformation',
    'painPoints',
    'personas',
    'productSummary',
    'prohibitedClaims',
    'riskNotes',
    'valueAngleSeeds',
    'whyThisAngle',
  ] as const;
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      (revision as any)[key] = patch[key];
    }
  }
  revision.version += 1;
  revision.updatedAt = iso();
  return clone(revision);
}

export function forkRevision(projectId: string, revisionId: string) {
  const revision = projectRevisions(projectId).find(
    (item) => item.id === revisionId,
  );
  if (!revision) {
    throw new ApiError(404, 'NOT_FOUND', '理解报告版本不存在');
  }
  const timestamp = iso();
  const fork: UnderstandingRevision = {
    ...clone(revision),
    approvedAt: undefined,
    approvedBy: undefined,
    createdAt: timestamp,
    id: nextId('revision'),
    parentRevisionId: revision.id,
    revisionNo:
      Math.max(...projectRevisions(projectId).map((item) => item.revisionNo)) +
      1,
    reviewerNotes: undefined,
    status: 'DRAFT',
    updatedAt: timestamp,
    version: 1,
  };
  projectRevisions(projectId).push(fork);
  captureEvidenceSnapshots(fork);
  ensureClaimAnchors(fork);
  return clone(fork);
}

export function approveRevision(
  projectId: string,
  revisionId: string,
  payload: Record<string, any>,
  actor: Actor,
) {
  const project = getProjectOrThrow(projectId);
  const revision = projectRevisions(projectId).find(
    (item) => item.id === revisionId,
  );
  if (!revision) {
    throw new ApiError(404, 'NOT_FOUND', '理解报告版本不存在');
  }
  if (revision.version !== payload.expectedVersion) {
    throw new ApiError(
      409,
      'VERSION_CONFLICT',
      '报告已被其他操作更新，请刷新后重试',
      {
        currentVersion: revision.version,
        expectedVersion: payload.expectedVersion,
        resourceId: revision.id,
        resourceType: 'UNDERSTANDING_REVISION',
      },
    );
  }
  if (
    !['DRAFT', 'WAITING_REVIEW'].includes(revision.status) ||
    ensureIngestion(projectId).status === 'STALE' ||
    revision.ingestionSnapshotId !==
      ensureIngestion(projectId).lastConfirmedSnapshotId
  ) {
    throw new ApiError(
      409,
      'UNDERSTANDING_NOT_READY',
      '报告已确认、已过期或已驳回，请基于最新资料派生草稿并重新审核',
    );
  }
  if (!revision.features.some((item) => item.usableInMarketing)) {
    throw new ApiError(
      422,
      'UNDERSTANDING_NOT_READY',
      '至少需要 1 个可用于宣传的功能',
    );
  }
  if (revision.personas.length === 0) {
    throw new ApiError(422, 'UNDERSTANDING_NOT_READY', '至少需要 1 类目标用户');
  }
  const unsupportedInUse = revision.features.filter(
    (item) => item.evidenceLevel === 'unsupported' && item.usableInMarketing,
  );
  if (unsupportedInUse.length > 0) {
    throw new ApiError(
      422,
      'UNSUPPORTED_CLAIM',
      '存在标记为“不可作为确定性主张”的功能仍被用于宣传',
    );
  }
  const blockedClaims = listClaimReadiness(projectId, revision.id).filter(
    (item) => item.status === 'BLOCKED',
  );
  if (blockedClaims.length > 0) {
    throw new ApiError(
      422,
      'CONFLICT_UNRESOLVED',
      '仍有被阻塞的宣传主张，不能批准新的理解报告',
      { blockedClaimIds: blockedClaims.map((item) => item.claimAnchorId) },
    );
  }
  const hasHypothesis = [
    ...revision.painPoints,
    ...revision.valueAngleSeeds,
  ].some((item) => item.evidenceLevel === 'hypothesis');
  if (hasHypothesis && !payload.acceptHypotheses) {
    throw new ApiError(
      422,
      'UNDERSTANDING_NOT_READY',
      '请确认知悉报告中仍存在 AI 推测内容',
    );
  }
  const timestamp = iso();
  revision.status = 'APPROVED';
  revision.approvedAt = timestamp;
  revision.approvedBy = actor.id;
  revision.reviewerNotes = payload.reviewerNote;
  revision.version += 1;
  revision.updatedAt = timestamp;
  project.currentStage = 'ANGLES';
  project.lastVisitedStage = 'ANGLES';
  project.status = 'IN_PROGRESS';
  project.updatedAt = timestamp;
  project.version += 1;
  for (const resolution of m11State().conflictResolutions[projectId] ?? []) {
    if (
      resolution.approvalStatus === 'APPROVED' &&
      resolution.proposedUnderstandingRevisionId === revision.id
    ) {
      const conflict = (m11State().claimConflicts[projectId] ?? []).find(
        (item) => item.id === resolution.conflictId,
      );
      if (conflict) {
        const anchor = (m11State().claimAnchors[projectId] ?? []).find(
          (item) =>
            item.sourceRevisionId === revision.id &&
            item.supersedesClaimAnchorId === conflict.claimId,
        );
        conflict.status = 'RESOLVED';
        conflict.resultingClaimAnchorId = anchor?.id;
        conflict.updatedAt = timestamp;
        conflict.version += 1;
      }
    }
  }
  persistState();
  return {
    project: clone(project),
    revision: clone(revision),
  };
}

export function rejectRevision(
  projectId: string,
  revisionId: string,
  payload: Record<string, any>,
) {
  const revision = projectRevisions(projectId).find(
    (item) => item.id === revisionId,
  );
  if (!revision) {
    throw new ApiError(404, 'NOT_FOUND', '理解报告版本不存在');
  }
  if (revision.status === 'APPROVED')
    throw new ApiError(
      409,
      'VERSION_CONFLICT',
      '已确认版本不可修改，请派生新草稿',
    );
  revision.status = 'REJECTED';
  revision.reviewerNotes = payload.reason;
  revision.version += 1;
  revision.updatedAt = iso();
  const project = getProjectOrThrow(projectId);
  project.currentStage = 'UNDERSTANDING';
  project.status = 'IN_PROGRESS';
  project.updatedAt = iso();
  project.version += 1;
  return { project: clone(project), revision: clone(revision) };
}

export function addRevisionComment(
  projectId: string,
  revisionId: string,
  payload: Record<string, any>,
  actor: Actor,
) {
  const revision = projectRevisions(projectId).find(
    (item) => item.id === revisionId,
  );
  if (!revision) {
    throw new ApiError(404, 'NOT_FOUND', '理解报告版本不存在');
  }
  if (
    payload.expectedVersion !== undefined &&
    payload.expectedVersion !== revision.version
  ) {
    throw new ApiError(
      409,
      'VERSION_CONFLICT',
      '报告已被其他操作更新，请刷新后重试',
      {
        currentVersion: revision.version,
        expectedVersion: payload.expectedVersion,
        resourceId: revision.id,
        resourceType: 'UNDERSTANDING_REVISION',
      },
    );
  }
  const note = String(payload.note ?? '').trim();
  if (!note) {
    throw new ApiError(400, 'VALIDATION_ERROR', '审核意见不能为空');
  }
  if (revision.status === 'APPROVED') {
    state.revisionComments ??= {};
    state.revisionComments[revision.id] ??= [];
    (state.revisionComments[revision.id] ??= []).push({
      at: iso(),
      by: actor.id,
      note,
    });
    return revisionView(revision);
  }
  revision.reviewLog ??= [];
  revision.reviewLog.push({ at: iso(), by: actor.id, note });
  revision.reviewerNotes = note;
  revision.version += 1;
  revision.updatedAt = iso();
  return clone(revision);
}

export function submitRevision(
  projectId: string,
  revisionId: string,
  payload: Record<string, any>,
) {
  const revision = projectRevisions(projectId).find(
    (item) => item.id === revisionId,
  );
  if (!revision) {
    throw new ApiError(404, 'NOT_FOUND', '理解报告版本不存在');
  }
  if (revision.status === 'APPROVED')
    throw new ApiError(
      409,
      'VERSION_CONFLICT',
      '已确认版本不可修改，请派生新草稿',
    );
  if (
    payload.expectedVersion !== undefined &&
    payload.expectedVersion !== revision.version
  ) {
    throw new ApiError(
      409,
      'VERSION_CONFLICT',
      '报告已被其他操作更新，请刷新后重试',
    );
  }
  revision.status = 'WAITING_REVIEW';
  revision.reviewerNotes = payload.comment;
  revision.version += 1;
  revision.updatedAt = iso();
  const project = getProjectOrThrow(projectId);
  project.status = 'WAITING_REVIEW';
  project.updatedAt = iso();
  project.version += 1;
  return clone(revision);
}

export function getHandoff(projectId: string) {
  const project = getProjectOrThrow(projectId);
  advanceProjectJobs(projectId);
  const approved = projectRevisions(projectId)
    .filter((item) => item.status === 'APPROVED' && !revisionIsStale(item))
    .toSorted((a, b) => b.revisionNo - a.revisionNo)[0];
  if (!approved) {
    return null;
  }
  return {
    approvedAt: approved.approvedAt,
    approvedBy: approved.approvedBy,
    aspectRatio: project.aspectRatio,
    prohibitedClaims: approved.prohibitedClaims,
    features: approved.features,
    painPoints: approved.painPoints,
    brandGuidelines: approved.brandGuidelines,
    evidenceIds: approved.usedEvidenceIds,
    ingestionSnapshotId: approved.ingestionSnapshotId,
    language: project.language,
    primaryPlatform: project.platform,
    productUnderstandingRevisionId: approved.id,
    productUnderstandingVersion: approved.version,
    projectId: project.id,
    selectedValueSeeds: approved.valueAngleSeeds.map((item) => item.id),
    targetDurationSec: project.durationSec,
  };
}

export function cancelJob(jobId: string) {
  const job = state.jobs[jobId];
  if (!job) {
    throw new ApiError(404, 'NOT_FOUND', '任务不存在');
  }
  if (['CANCELLED', 'FAILED', 'SUCCEEDED'].includes(job.status)) {
    throw new ApiError(409, 'CONFLICT', '任务已结束，无法取消');
  }
  job.status = 'CANCELLED';
  job.updatedAt = iso();
  return publicJob(job);
}

export function listProjectJobs(projectId: string) {
  getProjectOrThrow(projectId);
  advanceProjectJobs(projectId);
  return clone(
    Object.values(state.jobs)
      .filter((item) => item.projectId === projectId)
      .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20)
      .map((item) => publicJob(item)),
  );
}

export function findIdempotency(username: string, key: string) {
  return state.idempotency[`${username}:${key}`] ?? null;
}

export function saveIdempotency(
  username: string,
  key: string,
  entry: IdempotencyEntry,
) {
  state.idempotency[`${username}:${key}`] = entry;
}

export function exploreDemo(projectId: string) {
  getProjectOrThrow(projectId);
  const ingestion = ensureIngestion(projectId);
  const session = ingestion.demoSession;
  if (
    !session ||
    session.status !== 'ACTIVE' ||
    Date.parse(session.expiresAt ?? '') <= Date.now()
  ) {
    throw new ApiError(403, 'FORBIDDEN', '模拟会话不可用或已过期，请重新授权');
  }
  let source = ingestion.sources.find(
    (item) => item.referenceUrl === `mock-session:${session.id}`,
  );
  if (!source) {
    const sourceId = nextId('source');
    const evidenceId = nextId('evidence');
    source = {
      id: sourceId,
      projectId,
      kind: 'DEMO_SESSION',
      title: '模拟演示探索：仪表盘与功能列表',
      referenceUrl: `mock-session:${session.id}`,
      status: 'READY',
      includedInAnalysis: true,
      mock: true,
      evidenceIds: [evidenceId],
      summary: '仅模拟页面结构，具体产品能力仍需用户确认',
      createdAt: iso(),
      updatedAt: iso(),
      version: 1,
    };
    ingestion.sources.push(source);
    projectEvidence(projectId).push({
      id: evidenceId,
      projectId,
      sourceId,
      title: '演示功能结构（模拟）',
      excerpt:
        '登录页 → 仪表盘 → 信息列表 / 详情 / 跟进记录；未真实访问产品，不证明真实能力。',
      level: 'hypothesis',
      addedBy: 'mock_agent',
    });
    touchIngestion(projectId);
    markMaterialChanged(projectId);
  }
  return {
    sourceId: source.id,
    evidenceIds: source.evidenceIds,
    nodes: [
      {
        label: '模拟登录页',
        summary: '固定示例：只读演示身份，不输入密码。',
        children: [
          {
            label: '模拟仪表盘',
            summary: '固定示例：概览卡与导航，不代表真实产品能力。',
            children: [
              {
                label: '信息列表（待验证）',
                summary: '固定示例：列表展示、搜索与分页，具体字段需客户确认。',
              },
              {
                label: '详情与跟进记录（待验证）',
                summary:
                  '固定示例：查看记录与时间线，仅模拟读取，不修改或导出数据。',
              },
            ],
          },
        ],
      },
    ],
  };
}

// ============================================================================
// M2：传播切口 / 创意 / 剧本 / 分镜 / 预演
// 说明：M2 状态与 M1 保存在同一 Nitro 内存仓储中，统一 Demo Reset。
// ============================================================================

function emptyM2(): M2State {
  return {
    angleSets: {},
    animatics: {},
    briefs: {},
    changePlans: {},
    concepts: {},
    conceptGroups: {},
    durationPlans: {},
    images: {},
    messages: {},
    scripts: {},
    seeded: false,
    shots: {},
    storyboards: {},
    visualBibles: {},
  };
}

function m2State(): M2State {
  state.m2 ??= emptyM2();
  return state.m2;
}

function m2List(bucket: keyof M2State, projectId: string): any[] {
  const container = m2State()[bucket] as Record<string, any[]>;
  container[projectId] ??= [];
  return container[projectId] as any[];
}

function m2Clone<T>(value: T): T {
  return structuredClone(value);
}

function m2Now() {
  return iso();
}

function m2ApprovedUnderstanding(projectId: string): UnderstandingRevision {
  const revision = projectRevisions(projectId)
    .filter((item) => item.status === 'APPROVED')
    .toSorted((a, b) => b.revisionNo - a.revisionNo)[0];
  if (!revision) {
    throw new ApiError(
      409,
      'STAGE_GUARD_FAILED',
      '请先确认产品理解报告，再进入创意策划',
      { target: '/understanding' },
    );
  }
  return revision;
}

function m2Touch(projectId: string, stage?: string) {
  const project = getProjectOrThrow(projectId);
  if (stage) {
    project.currentStage = stage as Project['currentStage'];
    project.lastVisitedStage = stage as Project['lastVisitedStage'];
  }
  project.updatedAt = m2Now();
  project.version += 1;
  return project;
}

function m2AssertVersion(entity: any, expectedVersion: number | undefined) {
  if (expectedVersion !== undefined && expectedVersion !== entity.version) {
    throw new ApiError(
      409,
      'VERSION_CONFLICT',
      '对象已被其他操作更新，请刷新后重试',
      {
        currentVersion: entity.version,
        expectedVersion,
        resourceId: entity.id,
      },
    );
  }
}

function m2InvalidateFrom(projectId: string, from: string) {
  const m2 = m2State();
  const timestamp = m2Now();
  const stale = (list: any[]) => {
    for (const item of list) {
      if (item.status && item.status !== 'STALE') {
        item.status = 'STALE';
        item.updatedAt = timestamp;
        item.version = (item.version ?? 1) + 1;
      }
    }
  };
  switch (from) {
    case 'ANGLES': {
      stale(m2.scripts[projectId] ?? []);
      stale(m2.storyboards[projectId] ?? []);
      stale(m2.animatics[projectId] ?? []);

      break;
    }
    case 'SCRIPT': {
      stale(m2.storyboards[projectId] ?? []);
      stale(m2.animatics[projectId] ?? []);

      break;
    }
    case 'STORYBOARD':
    case 'VISUAL_BIBLE': {
      stale(m2.animatics[projectId] ?? []);

      break;
    }
    // No default
  }
}

/** M1 资料/理解变化时，所有 M2 对象进入待复核；不删除历史。 */
function markM2Stale(projectId: string) {
  const m2 = m2State();
  const timestamp = m2Now();
  const buckets = [
    m2.angleSets[projectId],
    m2.briefs[projectId],
    m2.concepts[projectId],
    m2.scripts[projectId],
    m2.visualBibles[projectId],
    m2.storyboards[projectId],
    m2.animatics[projectId],
  ];
  for (const list of buckets) {
    for (const item of list ?? []) {
      if (item.status && item.status !== 'STALE') {
        item.status = 'STALE';
        item.updatedAt = timestamp;
        item.version = (item.version ?? 1) + 1;
      }
    }
  }
}

const ANGLE_LIBRARY: Record<
  string,
  { audience: string; dimension: string; label: string }
> = {
  ASPIRATION: {
    audience: '我也想拥有这样的表达',
    dimension: '价值',
    label: '梦想愿景',
  },
  BEFORE_AFTER: {
    audience: '变化原来可以这么大',
    dimension: '价值',
    label: '前后反差',
  },
  BENEFIT: { audience: '能省下这些麻烦', dimension: '价值', label: '效率收益' },
  HUMOR: { audience: '有点好笑，想分享', dimension: '表达', label: '幽默娱乐' },
  IDENTITY: {
    audience: '这就是我想呈现的形象',
    dimension: '价值',
    label: '身份表达',
  },
  LIVE_WOW: {
    audience: '这个效果值得看一眼',
    dimension: '视觉',
    label: '现场惊艳',
  },
  MYSTERY: {
    audience: '接下来会发生什么？',
    dimension: '表达',
    label: '悬念揭秘',
  },
  PAIN_EMPATHY: {
    audience: '这不就是我吗',
    dimension: '价值',
    label: '真实痛点',
  },
  PROOF: { audience: '看起来是真的有效', dimension: '证明', label: '信任证明' },
  UNCONVENTIONAL: {
    audience: '原来还能这样',
    dimension: '价值',
    label: '反常规',
  },
};

function angleScore(seed: number) {
  const clamp = (value: number) => Math.min(5, Math.max(2, value));
  return {
    clarity: clamp(3 + (seed % 3)),
    novelty: clamp(3 + ((seed + 1) % 3)),
    relevance: clamp(3 + ((seed + 2) % 2)),
    trustworthiness: clamp(3 + ((seed + 3) % 2)),
    visualPotential: clamp(3 + ((seed + 4) % 3)),
  };
}

function resumeAngles(revision: UnderstandingRevision): any[] {
  const evidence = revision.usedEvidenceIds.slice(0, 3);
  const featureId = revision.features[0]?.id;
  const personaId = revision.personas[0]?.id;
  const painId = revision.painPoints[0]?.id;
  return [
    {
      assumptions: ['观众能理解 PDF 与 3D 网页简历的对比'],
      audienceReaction: '原来简历还能这样？',
      estimatedProductionComplexity: 'HIGH',
      evidenceIds: evidence,
      evidenceLevel: evidence.length > 0 ? 'verified' : 'hypothesis',
      expressionTags: ['VISUAL_METAPHOR', '3D_CARTOON', 'REVERSAL'],
      id: 'angle_resume_unconventional',
      missingAssets: [],
      newApproach: '可交互、会动的 3D 网页个人形象',
      oldApproach: '静态 PDF / Word 简历',
      oneLiner: 'PDF 简历 → 会动、可交互的 3D 网页个人形象',
      openingHook: '面试官翻开一份普通 PDF，纸面突然立体展开',
      primaryCode: 'UNCONVENTIONAL',
      prohibitedClaimsHit: [],
      rationale: '这是产品最反常规、最容易在第一眼制造认知反差的真实能力。',
      relatedFeatureIds: featureId ? [featureId] : [],
      relatedPainPointIds: painId ? [painId] : [],
      score: {
        clarity: 4,
        novelty: 5,
        relevance: 4,
        trustworthiness: 4,
        visualPotential: 5,
      },
      secondaryCodes: ['LIVE_WOW'],
      targetPersonaIds: personaId ? [personaId] : [],
      title: '简历从纸里跳出来',
      whyItMatters: '求职者需要一种比静态文件更能展示个人风格的表达方式。',
    },
    {
      assumptions: ['个人品牌表达是目标用户的真实需求'],
      audienceReaction: '这就是我想呈现的专业形象',
      estimatedProductionComplexity: 'MEDIUM',
      evidenceIds: evidence,
      evidenceLevel: evidence.length > 0 ? 'verified' : 'hypothesis',
      expressionTags: ['IDENTITY', 'MOTION_GRAPHICS'],
      id: 'angle_resume_identity',
      missingAssets: [],
      newApproach: '把经历、作品和个性装进一个可分享的数字空间',
      oldApproach: '用同一套模板投递所有岗位',
      oneLiner: '把自己装进一条链接，让个人表达被真正看见',
      openingHook: '“我把自己装进了一个网址。”',
      primaryCode: 'IDENTITY',
      prohibitedClaimsHit: [],
      rationale: '从“展示工具”上升到“个人数字身份”，适合社媒传播。',
      relatedFeatureIds: featureId ? [featureId] : [],
      relatedPainPointIds: painId ? [painId] : [],
      score: {
        clarity: 4,
        novelty: 4,
        relevance: 4,
        trustworthiness: 4,
        visualPotential: 4,
      },
      secondaryCodes: ['ASPIRATION'],
      targetPersonaIds: personaId ? [personaId] : [],
      title: '把自己装进一条链接',
      whyItMatters: '目标用户希望被记住，而不只是被筛选。',
    },
    {
      assumptions: ['真实网页交互可被录制/截图呈现'],
      audienceReaction: '这个效果想点进去看看',
      estimatedProductionComplexity: 'MEDIUM',
      evidenceIds: evidence,
      evidenceLevel: evidence.length > 0 ? 'verified' : 'hypothesis',
      expressionTags: ['LIVE_WOW', 'SCREEN_RECORDING'],
      id: 'angle_resume_live_wow',
      missingAssets: ['真实产品录屏'],
      newApproach: '直接展示网页中的 3D 形象、项目卡片与交互',
      oldApproach: '只看文字与排版',
      oneLiner: '眼见为实：一份能在浏览器里“站起来”的简历',
      openingHook: '鼠标移动，屏幕里的个人形象跟着转身',
      primaryCode: 'LIVE_WOW',
      prohibitedClaimsHit: [],
      rationale: '用真实产品界面证明形式成立，降低“概念炫技”的疑虑。',
      relatedFeatureIds: featureId ? [featureId] : [],
      relatedPainPointIds: painId ? [painId] : [],
      score: {
        clarity: 5,
        novelty: 4,
        relevance: 4,
        trustworthiness: 5,
        visualPotential: 5,
      },
      secondaryCodes: ['PROOF'],
      targetPersonaIds: personaId ? [personaId] : [],
      title: '现场看着简历立体展开',
      whyItMatters: '招聘者/客户更愿意相信亲眼看到的交互效果。',
    },
    {
      assumptions: ['求职者确实经历过简历被淹没的场景'],
      audienceReaction: '这不就是投简历的我',
      estimatedProductionComplexity: 'LOW',
      evidenceIds: evidence.slice(0, 1),
      evidenceLevel: 'hypothesis',
      expressionTags: ['PAIN_EMPATHY', 'HUMOR'],
      id: 'angle_resume_pain_empathy',
      missingAssets: [],
      newApproach: '用夸张的简历山表现“被看见”的困难',
      oldApproach: '海投、等待、没有反馈',
      oneLiner: '在一千份看起来一样的简历里，怎么让人记住你？',
      openingHook: '成堆 PDF 从门口倒进来，把面试官淹没',
      primaryCode: 'PAIN_EMPATHY',
      prohibitedClaimsHit: [],
      rationale: '痛点共鸣适合短视频开场，但需要避免暗示“保证录用”。',
      relatedFeatureIds: featureId ? [featureId] : [],
      relatedPainPointIds: painId ? [painId] : [],
      score: {
        clarity: 4,
        novelty: 3,
        relevance: 5,
        trustworthiness: 3,
        visualPotential: 4,
      },
      secondaryCodes: ['HUMOR'],
      targetPersonaIds: personaId ? [personaId] : [],
      title: '一千份一样的简历',
      whyItMatters: '把“被看见”的焦虑变成可视化的冲突。',
    },
  ];
}

function generatedAngles(
  project: Project,
  revision: UnderstandingRevision,
): any[] {
  if (project.id === 'project_resume_3d') {
    return resumeAngles(revision);
  }
  const seeds = revision.valueAngleSeeds ?? [];
  const pains = revision.painPoints ?? [];
  const evidence = revision.usedEvidenceIds ?? [];
  const personaId = revision.personas?.[0]?.id;
  const featureId = revision.features?.[0]?.id;
  const primaryPersona = personaId ? [personaId] : [];
  const primaryFeature = featureId ? [featureId] : [];
  const result: any[] = [];
  const codes = ['UNCONVENTIONAL', 'PAIN_EMPATHY', 'BEFORE_AFTER', 'IDENTITY'];
  const count = Math.min(4, Math.max(3, seeds.length));
  for (let index = 0; index < count; index += 1) {
    const seed = seeds[index];
    const pain = pains[index];
    const code = codes[index] ?? 'UNCONVENTIONAL';
    const library = ANGLE_LIBRARY[code] ?? ANGLE_LIBRARY.UNCONVENTIONAL;
    result.push({
      assumptions: seed
        ? ['价值线索来自 Mock 辅助分析，需人工确认']
        : ['尚未获得充分证据'],
      audienceReaction: seed?.audienceReaction ?? library.audience,
      estimatedProductionComplexity: index === 0 ? 'MEDIUM' : 'LOW',
      evidenceIds: seed?.sourceEvidenceIds ?? evidence.slice(0, 2),
      evidenceLevel:
        (seed?.sourceEvidenceIds?.length ?? 0) > 0 ? 'verified' : 'hypothesis',
      expressionTags: ['VISUAL_METAPHOR'],
      id: nextId('angle'),
      missingAssets: [],
      newApproach: seed?.title ?? project.productName ?? project.title,
      oldApproach: pain?.painPoint ?? '传统做法',
      oneLiner:
        seed?.title ??
        `${project.productName ?? project.title} 让${pain?.painPoint ?? '旧流程'}出现新的可能`,
      openingHook: pain?.painPoint
        ? `当${pain.painPoint}发生时，画面突然转向产品`
        : `${project.productName ?? project.title} 的第一眼反差`,
      primaryCode: code,
      prohibitedClaimsHit: [],
      rationale: `基于 M1 已确认的${library.label}方向与产品证据整理（Mock 启发式）。`,
      relatedFeatureIds: primaryFeature,
      relatedPainPointIds: pain ? [pain.id] : [],
      score: angleScore(index + 2),
      secondaryCodes: index === 0 ? ['LIVE_WOW'] : [],
      targetPersonaIds: primaryPersona,
      title: seed?.title ?? `${library.label}方向 ${index + 1}`,
      whyItMatters:
        pain?.painPoint ?? '目标用户需要一个更直观的方式理解产品价值。',
    });
  }
  return result;
}

function seedM2(target: State) {
  const m2 = emptyM2();
  m2.seeded = true;
  target.m2 = m2;
  const project = target.projects.find(
    (item) => item.id === 'project_resume_3d',
  );
  const revision = (target.revisions.project_resume_3d ?? []).find(
    (item) => item.status === 'APPROVED',
  );
  if (!project || !revision) {
    return;
  }
  const timestamp = '2026-11-09T02:00:00.000Z';
  const angles = resumeAngles(revision);
  m2.angleSets[project.id] = [
    {
      angles,
      createdAt: timestamp,
      id: 'angleset_resume_001',
      projectId: project.id,
      revisionNo: 1,
      status: 'DRAFT',
      understandingRevisionId: revision.id,
      updatedAt: timestamp,
      version: 1,
    },
  ];
}

export function getAnglesState(projectId: string) {
  getProjectOrThrow(projectId);
  advanceProjectJobs(projectId);
  const revision = m2ApprovedUnderstanding(projectId);
  const sets = (m2State().angleSets[projectId] ?? [])
    .filter((item: any) => item.status !== 'STALE')
    .toSorted((a: any, b: any) => b.revisionNo - a.revisionNo);
  const set = sets[0] ?? null;
  const briefs = (m2State().briefs[projectId] ?? []).toSorted(
    (a: any, b: any) => b.version - a.version,
  );
  const draft = briefs.find((item: any) => item.status === 'DRAFT') ?? null;
  const activeBrief =
    briefs.find((item: any) => item.status === 'APPROVED') ?? null;
  let briefView = null;
  if (draft) {
    briefView = m2Clone(draft);
  } else if (activeBrief) {
    briefView = m2Clone(activeBrief);
  }
  return {
    activeBrief: activeBrief ? m2Clone(activeBrief) : null,
    angleSet: set ? m2Clone(set) : null,
    brief: briefView,
    sets: sets.map((item: any) => m2Clone(item)),
    understanding: {
      id: revision.id,
      revisionNo: revision.revisionNo,
      version: revision.version,
      usedEvidenceIds: revision.usedEvidenceIds,
    },
  };
}

export function startAngleGeneration(
  projectId: string,
  payload: Record<string, any>,
) {
  const revision = m2ApprovedUnderstanding(projectId);
  advanceProjectJobs(projectId);
  const active = Object.values(state.jobs).find(
    (job) =>
      job.projectId === projectId &&
      job.kind === 'DISCOVER_ANGLES' &&
      ['CREATED', 'QUEUED', 'RUNNING'].includes(job.status),
  );
  if (active) {
    throw new ApiError(409, 'CONFLICT', '已有传播切口任务正在运行', {
      jobId: active.id,
    });
  }
  const job = createJob(
    projectId,
    'DISCOVER_ANGLES',
    String(payload.scenario ?? 'NORMAL'),
    {
      understandingRevisionId: String(
        payload.understandingRevisionId ?? revision.id,
      ),
    },
  );
  return { jobId: job.id };
}

function applyAngleJob(job: Job) {
  const project = getProjectOrThrow(job.projectId);
  const revision = m2ApprovedUnderstanding(job.projectId);
  const sets = m2List('angleSets', job.projectId);
  const scenario = job.scenario ?? 'NORMAL';
  let angles = generatedAngles(project, revision);
  let weak = false;
  if (scenario === 'NO_STRONG_ANGLE') {
    weak = true;
    angles = angles.slice(0, 2).map((angle: any, index: number) => ({
      ...angle,
      assumptions: ['资料不足，当前切口仅为泛化假设'],
      evidenceLevel: 'hypothesis',
      title: `待验证方向 ${index + 1}：${angle.title}`,
    }));
  }
  const revisionNo =
    Math.max(0, ...sets.map((item: any) => item.revisionNo)) + 1;
  const timestamp = m2Now();
  const set = {
    angles,
    createdAt: timestamp,
    id: nextId('angleset'),
    projectId: project.id,
    revisionNo,
    status: 'DRAFT',
    understandingRevisionId: revision.id,
    updatedAt: timestamp,
    version: 1,
    weak,
  };
  sets.unshift(set);
  m2Touch(project.id, 'ANGLES');
  job.resultRefId = set.id;
}

export function patchAngleSet(
  projectId: string,
  setId: string,
  payload: Record<string, any>,
) {
  const set = (m2State().angleSets[projectId] ?? []).find(
    (item: any) => item.id === setId,
  );
  if (!set) {
    throw new ApiError(404, 'NOT_FOUND', '切口集合不存在');
  }
  m2AssertVersion(set, payload.expectedVersion);
  const patch = payload.patch ?? {};
  if (Array.isArray(patch.angles)) {
    set.angles = patch.angles;
  }
  if (patch.notes !== undefined) {
    set.notes = String(patch.notes);
  }
  set.status = 'DRAFT';
  set.version += 1;
  set.updatedAt = m2Now();
  return m2Clone(set);
}

export function setAngleSetReferenceInsight(
  projectId: string,
  setId: string,
  payload: Record<string, any>,
) {
  const set = (m2State().angleSets[projectId] ?? []).find(
    (item: any) => item.id === setId,
  );
  if (!set) throw new ApiError(404, 'NOT_FOUND', '切口集合不存在');
  m2AssertVersion(set, payload.expectedVersion);
  const insightId = String(payload.insightId ?? '');
  if (insightId) {
    const exists = (m11State().referenceAdInsights[projectId] ?? []).some(
      (item: any) => item.id === insightId,
    );
    if (!exists) {
      throw new ApiError(404, 'NOT_FOUND', '参考广告洞察不存在');
    }
  }
  set.referenceAdInsightId = insightId || undefined;
  set.version += 1;
  set.updatedAt = m2Now();
  persistState();
  return m2Clone(set);
}

export function forkAngleSet(
  projectId: string,
  setId: string,
  payload: Record<string, any>,
) {
  const sets = m2List('angleSets', projectId);
  const source = sets.find((item: any) => item.id === setId);
  if (!source) {
    throw new ApiError(404, 'NOT_FOUND', '切口集合不存在');
  }
  m2AssertVersion(source, payload.expectedVersion);
  const timestamp = m2Now();
  const copy = {
    ...m2Clone(source),
    createdAt: timestamp,
    id: nextId('angleset'),
    parentRevisionId: source.id,
    revisionNo: Math.max(...sets.map((item: any) => item.revisionNo)) + 1,
    status: 'DRAFT',
    updatedAt: timestamp,
    version: 1,
  };
  sets.unshift(copy);
  return m2Clone(copy);
}

export function createCreativeBrief(
  projectId: string,
  payload: Record<string, any>,
) {
  const revision = m2ApprovedUnderstanding(projectId);
  const set = (m2State().angleSets[projectId] ?? []).find(
    (item: any) => item.id === payload.angleSetId,
  );
  if (!set) {
    throw new ApiError(404, 'NOT_FOUND', '切口集合不存在');
  }
  const primary = set.angles.find(
    (item: any) => item.id === payload.primaryAngleId,
  );
  if (!primary) {
    throw new ApiError(400, 'INVALID_INPUT', '请选择有效的主切口');
  }
  const secondary = (payload.secondaryAngleIds ?? []) as string[];
  if (secondary.length > 2) {
    throw new ApiError(400, 'INVALID_INPUT', '辅切口最多选择 2 个');
  }
  if (new Set([primary.id, ...secondary]).size !== secondary.length + 1) {
    throw new ApiError(400, 'INVALID_INPUT', '主切口与辅切口不能重复');
  }
  if ((primary.prohibitedClaimsHit ?? []).length > 0) {
    throw new ApiError(
      422,
      'UNSUPPORTED_CLAIM',
      '主切口包含未证实宣传主张，请先修正',
      { angleId: primary.id },
    );
  }
  const timestamp = m2Now();
  const brief = {
    angleSetId: set.id,
    createdAt: timestamp,
    excludedAngleCodes: payload.excludedAngleCodes ?? [],
    extraInstructions: String(payload.extraInstructions ?? ''),
    id: nextId('brief'),
    marketingGoal: String(
      payload.marketingGoal ?? getProjectOrThrow(projectId).marketingObjective,
    ),
    primaryAngleId: primary.id,
    prohibitedClaims: revision.prohibitedClaims ?? [],
    referenceAdInsightId: set.referenceAdInsightId,
    projectId,
    riskAcknowledgements: payload.riskAcknowledgements ?? [],
    secondaryAngleIds: secondary,
    status: 'DRAFT',
    targetPersonaIds: primary.targetPersonaIds ?? [],
    understandingRevisionId: revision.id,
    updatedAt: timestamp,
    version: 1,
  };
  m2List('briefs', projectId).unshift(brief);
  return m2Clone(brief);
}

export function approveCreativeBrief(
  projectId: string,
  briefId: string,
  payload: Record<string, any>,
  actor: Actor,
) {
  const brief = (m2State().briefs[projectId] ?? []).find(
    (item: any) => item.id === briefId,
  );
  if (!brief) {
    throw new ApiError(404, 'NOT_FOUND', '创意 Brief 不存在');
  }
  m2AssertVersion(brief, payload.expectedVersion);
  if (brief.status !== 'DRAFT') {
    throw new ApiError(409, 'STAGE_GUARD_FAILED', '当前 Brief 不是草稿状态');
  }
  const timestamp = m2Now();
  brief.status = 'APPROVED';
  brief.approvedAt = timestamp;
  brief.approvedBy = actor.id;
  brief.version += 1;
  brief.updatedAt = timestamp;
  for (const item of m2State().briefs[projectId] ?? []) {
    if (item.id !== brief.id && item.status === 'APPROVED') {
      item.status = 'STALE';
    }
  }
  m2Touch(projectId, 'ANGLES');
  m2InvalidateFrom(projectId, 'ANGLES');
  return m2Clone(brief);
}

export function getActiveCreativeBrief(projectId: string) {
  getProjectOrThrow(projectId);
  return (
    (m2State().briefs[projectId] ?? []).find(
      (item: any) => item.status === 'APPROVED',
    ) ?? null
  );
}

function m2ApprovedBrief(projectId: string) {
  const brief = (m2State().briefs[projectId] ?? []).find(
    (item: any) => item.status === 'APPROVED',
  );
  if (!brief) {
    throw new ApiError(
      409,
      'STAGE_GUARD_FAILED',
      '请先确认创意 Brief（主切口与创意边界）',
      { target: '/angles' },
    );
  }
  return brief;
}

function m2ApprovedConcept(projectId: string) {
  const concept = (m2State().concepts[projectId] ?? [])
    .filter((item: any) => item.status === 'APPROVED')
    .toSorted((a: any, b: any) => b.revisionNo - a.revisionNo)[0];
  if (!concept) {
    throw new ApiError(
      409,
      'STAGE_GUARD_FAILED',
      '请先确认一套创意方案，再进入剧本',
      { target: '/concepts' },
    );
  }
  return concept;
}

function resumeConceptStories() {
  return [
    {
      callToAction: '打开链接，体验会动的 3D 网页简历',
      centralConflict: '静态简历无法让求职者的个性被看见',
      climax: '纸张完全展开，人物站在由项目卡片组成的数字空间里',
      emotionalTone: '惊奇 → 兴奋 → 认同',
      escalation: '面试官翻页越快，简历越显得千篇一律',
      leadCharacter: '求职者小周（刚毕业的设计师）',
      mainSetting: '面试房间与纸面延展出的 3D 空间',
      openingHookText: '简历还能活过来？',
      openingVisualHook: '一份普通 PDF 被翻开，纸面像门一样立起',
      productReveal: '主角把自己的 3D 网页简历链接发给面试官',
      setup: '小周反复修改 PDF 排版，却总觉得作品集无法被看见',
      storyStructure: '反差视觉 + 单一主角成长',
      title: '简历从纸里跳出来',
      twist: '不是换模板，而是把简历变成一个可以走进去的空间',
    },
    {
      callToAction: '用一条链接，让人记住你',
      centralConflict: '招聘者每天面对上千份看起来一样的简历',
      climax: '招聘者在 3D 个人主页里第一次记住候选人',
      emotionalTone: '窒息 → 好奇 → 释然',
      escalation: '简历山不断增高，招聘者被纸张淹没',
      leadCharacter: '招聘者林姐（每天筛 300 份简历）',
      mainSetting: '堆满纸张的招聘办公室',
      openingHookText: '一千份简历，九百九十九份长得一样',
      openingVisualHook: '纸张像雪崩一样从门口涌进办公室',
      productReveal: '一份网页简历在纸堆中亮起，作品和项目可以点开',
      setup: '林姐快速翻页，却记不住任何一个人的特点',
      storyStructure: '痛点共鸣 + 反转视角',
      title: '一千份一样的简历',
      twist: '真正稀缺的不是简历，而是让人记住的表达方式',
    },
    {
      callToAction: '把你的经历，装进一个网址',
      centralConflict: '创作者想表达自己，却被格式限制',
      climax: '数字人转身，身后的作品与经历依次点亮',
      emotionalTone: '好奇 → 沉浸 → 向往',
      escalation: '她尝试把经历塞进一页纸，却不断溢出边界',
      leadCharacter: '独立创作者阿岚',
      mainSetting: '夜晚的卧室工作室与发光的数字空间',
      openingHookText: '我把自己装进了一个网址',
      openingVisualHook: '电脑屏幕里伸出一条由文字组成的光带',
      productReveal: '观众看到可交互的个人主页、作品与 3D 形象',
      setup: '阿岚把作品、技能和经历拆散在不同文件里',
      storyStructure: '身份表达 + 悬念揭示',
      title: '把自己装进一条链接',
      twist: '链接不是文件，而是一个可以被参观的个人空间',
    },
  ];
}

function genericConceptStories(project: Project, brief: any) {
  const name = project.productName ?? project.title;
  const angleTitle =
    (m2State().angleSets[project.id] ?? [])
      .flatMap((set: any) => set.angles ?? [])
      .find((angle: any) => angle.id === brief.primaryAngleId)?.title ??
    `${name} 的传播价值`;
  return [
    {
      callToAction: `关注 ${name}，了解这个新的开始`,
      centralConflict: `旧方式让${project.targetAudience ?? '目标用户'}反复付出额外成本`,
      climax: `${name} 在一个具体场景里自然解决问题`,
      emotionalTone: '真实 → 紧张 → 轻松',
      escalation: '问题从一个小麻烦升级为一次真实损失风险',
      leadCharacter: '一位具体的目标用户',
      mainSetting: '日常办公与生活场景',
      openingHookText: `如果${angleTitle}发生在你身上？`,
      openingVisualHook: '一个熟悉的日常动作被放大成视觉冲突',
      productReveal: `主角用 ${name} 完成关键一步`,
      setup: '主角正在重复旧流程，问题逐渐显现',
      storyStructure: '问题 - 升级 - 解决',
      title: `${name}：把麻烦变成一步`,
      twist: '真正改变的不是工具，而是处理问题的方式',
    },
    {
      callToAction: `体验 ${name} 的新方式`,
      centralConflict: '团队协作中信息分散，导致关键动作被遗漏',
      climax: '所有线索在同一块画布上被重新连接',
      emotionalTone: '混乱 → 专注 → 掌控',
      escalation: '多个角色同时处理同一件事，却互相不知道进度',
      leadCharacter: '团队里最忙的协调者',
      mainSetting: '多屏幕协作空间',
      openingHookText: '所有人都在忙，但没人知道下一步',
      openingVisualHook: '不同颜色的信息碎片飞向同一张桌子',
      productReveal: `${name} 让关键信息与下一步行动可见`,
      setup: '会议结束，任务散落在聊天、表格和便签里',
      storyStructure: '群像冲突 + 信息翻转',
      title: '当所有人都以为别人在做',
      twist: '问题不是不努力，而是没有共享同一个事实',
    },
    {
      callToAction: `把 ${name} 加入你的下一步`,
      centralConflict: '目标用户想要改变，但不知道从哪开始',
      climax: '第一次成功体验带来可见的进展',
      emotionalTone: '犹豫 → 惊喜 → 期待',
      escalation: '尝试多种工具后仍然停留在准备阶段',
      leadCharacter: '第一次尝试新方式的用户',
      mainSetting: '从空白屏幕到完成第一个结果',
      openingHookText: '从“我也想”到“我做到了”，中间差什么？',
      openingVisualHook: '空白画布上出现第一条清晰的路径',
      productReveal: `${name} 把第一步变得足够简单`,
      setup: '主角收藏了很多教程，却始终没有开始',
      storyStructure: '轻悬念 + 结果前后对比',
      title: '从收藏夹到第一次完成',
      twist: '行动门槛被降低后，改变才真正发生',
    },
  ];
}

export function startConceptGeneration(
  projectId: string,
  payload: Record<string, any>,
) {
  const brief = m2ApprovedBrief(projectId);
  advanceProjectJobs(projectId);
  const active = Object.values(state.jobs).find(
    (job) =>
      job.projectId === projectId &&
      job.kind === 'GENERATE_CONCEPTS' &&
      ['CREATED', 'QUEUED', 'RUNNING'].includes(job.status),
  );
  if (active) {
    throw new ApiError(409, 'CONFLICT', '已有创意生成任务正在运行', {
      jobId: active.id,
    });
  }
  const job = createJob(
    projectId,
    'GENERATE_CONCEPTS',
    String(payload.scenario ?? 'NORMAL'),
    {
      briefId: String(payload.briefId ?? brief.id),
      count: Number(payload.count ?? 3),
    },
  );
  return { jobId: job.id };
}

function applyConceptJob(job: Job) {
  const project = getProjectOrThrow(job.projectId);
  const brief = (m2State().briefs[job.projectId] ?? []).find(
    (item: any) => item.id === job.payload?.briefId,
  );
  if (!brief || brief.status !== 'APPROVED') {
    throw new ApiError(409, 'STAGE_GUARD_FAILED', '创意 Brief 已失效');
  }
  const groups = m2List('conceptGroups', job.projectId);
  const concepts = m2List('concepts', job.projectId);
  const timestamp = m2Now();
  const group = {
    briefId: brief.id,
    conceptRevisionIds: [] as string[],
    createdAt: timestamp,
    favoriteConceptRevisionIds: [],
    generationJobId: job.id,
    homogeneous: (job.scenario ?? '') === 'HOMOGENEOUS_CONCEPTS',
    id: nextId('conceptgroup'),
    projectId: project.id,
    status: 'READY',
    updatedAt: timestamp,
    version: 1,
  };
  const stories =
    project.id === 'project_resume_3d'
      ? resumeConceptStories()
      : genericConceptStories(project, brief);
  const primaryAngle = (m2State().angleSets[project.id] ?? [])
    .flatMap((set: any) => set.angles ?? [])
    .find((angle: any) => angle.id === brief.primaryAngleId);
  stories.slice(0, 3).forEach((story, index) => {
    const concept = {
      approvedAt: undefined,
      approvedBy: undefined,
      briefId: brief.id,
      claimEvidenceIds: primaryAngle?.evidenceIds ?? [],
      complexity: index === 0 ? 'MEDIUM' : 'LOW',
      conceptGroupId: group.id,
      createdAt: timestamp,
      id: nextId('concept'),
      logline: `${story.leadCharacter}在一个具体场景里，因为${project.productName ?? project.title}做出了不同的选择。`,
      maximumUsefulDurationSec: 120,
      minimumViableDurationSec: 30,
      missingAssets: [],
      moodboardAssetIds: [],
      musicMood: index === 2 ? '轻快、有节奏' : '紧张后释放',
      parentRevisionId: undefined,
      primaryAngleId: brief.primaryAngleId,
      projectId: project.id,
      recommendedAspectRatio: project.aspectRatio,
      revisionNo: 1,
      reviewerNotes: undefined,
      riskNotes: ['人物与情节为 Mock 虚构，产品能力需以 M1 证据为准'],
      secondaryAngleIds: brief.secondaryAngleIds ?? [],
      status: 'DRAFT',
      story,
      suggestedDurationSec: 30,
      targetPersonaIds: brief.targetPersonaIds ?? [],
      title: story.title,
      updatedAt: timestamp,
      version: 1,
      visualStyles: ['3D 卡通', '动态字卡', '纸张拼贴'].slice(0, index + 1),
    };
    concepts.unshift(concept);
    group.conceptRevisionIds.push(concept.id);
  });
  group.selectedConceptRevisionId = group.conceptRevisionIds[0];
  groups.unshift(group);
  m2Touch(project.id, 'ANGLES');
  job.resultRefId = group.id;
}

export function listConceptGroups(projectId: string) {
  getProjectOrThrow(projectId);
  return m2Clone(m2State().conceptGroups[projectId] ?? []);
}

export function getConceptGroup(projectId: string, groupId: string) {
  getProjectOrThrow(projectId);
  const group = (m2State().conceptGroups[projectId] ?? []).find(
    (item: any) => item.id === groupId,
  );
  if (!group) {
    throw new ApiError(404, 'NOT_FOUND', '创意组不存在');
  }
  const concepts = (m2State().concepts[projectId] ?? []).filter((item: any) =>
    group.conceptRevisionIds.includes(item.id),
  );
  return { concepts: m2Clone(concepts), group: m2Clone(group) };
}

export function getConcept(projectId: string, revisionId: string) {
  const concept = (m2State().concepts[projectId] ?? []).find(
    (item: any) => item.id === revisionId,
  );
  if (!concept) {
    throw new ApiError(404, 'NOT_FOUND', '创意方案不存在');
  }
  return m2Clone(concept);
}

export function patchConcept(
  projectId: string,
  revisionId: string,
  payload: Record<string, any>,
) {
  const concept = (m2State().concepts[projectId] ?? []).find(
    (item: any) => item.id === revisionId,
  );
  if (!concept) {
    throw new ApiError(404, 'NOT_FOUND', '创意方案不存在');
  }
  m2AssertVersion(concept, payload.expectedVersion);
  if (concept.status === 'APPROVED') {
    throw new ApiError(
      409,
      'STAGE_GUARD_FAILED',
      '已批准方案不可直接修改，请派生新草稿',
    );
  }
  const patch = payload.patch ?? {};
  for (const key of ['title', 'logline']) {
    if (patch[key] !== undefined) {
      concept[key] = String(patch[key]);
    }
  }
  if (patch.story && typeof patch.story === 'object') {
    concept.story = { ...concept.story, ...patch.story };
  }
  for (const key of [
    'visualStyles',
    'riskNotes',
    'missingAssets',
    'claimEvidenceIds',
  ]) {
    if (Array.isArray(patch[key])) {
      concept[key] = patch[key];
    }
  }
  for (const key of [
    'maximumUsefulDurationSec',
    'minimumViableDurationSec',
    'suggestedDurationSec',
  ]) {
    if (typeof patch[key] === 'number') {
      concept[key] = patch[key];
    }
  }
  if (Array.isArray(patch.compositionProvenance)) {
    concept.compositionProvenance = patch.compositionProvenance;
  }
  concept.status = 'DRAFT';
  concept.version += 1;
  concept.updatedAt = m2Now();
  return m2Clone(concept);
}

export function forkConcept(
  projectId: string,
  revisionId: string,
  payload: Record<string, any>,
) {
  const concept = (m2State().concepts[projectId] ?? []).find(
    (item: any) => item.id === revisionId,
  );
  if (!concept) {
    throw new ApiError(404, 'NOT_FOUND', '创意方案不存在');
  }
  m2AssertVersion(concept, payload.expectedVersion);
  if (payload.expectedBriefId && payload.expectedBriefId !== concept.briefId) {
    throw new ApiError(
      422,
      'CROSS_BRIEF_COMPOSITION',
      '跨 Brief 不能直接组合，请先重新确认上游 Brief',
    );
  }
  const timestamp = m2Now();
  const copy = {
    ...m2Clone(concept),
    approvedAt: undefined,
    approvedBy: undefined,
    createdAt: timestamp,
    id: nextId('concept'),
    parentRevisionId: concept.id,
    revisionNo: concept.revisionNo + 1,
    reviewerNotes: undefined,
    status: 'DRAFT',
    updatedAt: timestamp,
    version: 1,
  };
  m2List('concepts', projectId).unshift(copy);
  const group = (m2State().conceptGroups[projectId] ?? []).find(
    (item: any) => item.id === concept.conceptGroupId,
  );
  if (group) {
    group.conceptRevisionIds.push(copy.id);
    group.version += 1;
  }
  return m2Clone(copy);
}

export function patchConceptMoodboard(
  projectId: string,
  revisionId: string,
  payload: Record<string, any>,
) {
  const concept = (m2State().concepts[projectId] ?? []).find(
    (item: any) => item.id === revisionId,
  );
  if (!concept) {
    throw new ApiError(404, 'NOT_FOUND', '创意方案不存在');
  }
  if (concept.status !== 'DRAFT') {
    throw new ApiError(409, 'STAGE_GUARD_FAILED', '只有创意草稿可修改情绪板');
  }
  m2AssertVersion(concept, payload.expectedVersion);
  const bindings = (payload.bindings ?? []) as Array<{
    assetContentVersionId: string;
    assetId: string;
    usageRole: 'CHARACTER_IDEA' | 'MOODBOARD' | 'SCENE_IDEA';
  }>;
  const seen = new Set<string>();
  const normalized = [];
  for (const binding of bindings) {
    if (seen.has(binding.assetContentVersionId)) continue;
    const version = (m11State().assetContentVersions[projectId] ?? []).find(
      (item: any) =>
        item.id === binding.assetContentVersionId &&
        item.assetId === binding.assetId,
    );
    if (!version || version.status !== 'READY') {
      throw new ApiError(
        422,
        'ASSET_CONTENT_UNAVAILABLE',
        '情绪板内容版本不可用',
      );
    }
    const asset = (state.ingestions[projectId]?.assets ?? []).find(
      (item: any) => item.id === binding.assetId,
    );
    if (!asset) {
      throw new ApiError(404, 'NOT_FOUND', '情绪板素材不属于当前项目');
    }
    const rights = (m11State().assetUsageMetadata[projectId] ?? []).find(
      (item: any) => item.assetId === binding.assetId,
    );
    if (
      rights?.rightsStatus !== 'DECLARED' ||
      rights?.mayBeUsedForAnalysis === false
    ) {
      throw new ApiError(409, 'ASSET_RIGHTS_REVOKED', '素材无权用于创意分析');
    }
    seen.add(binding.assetContentVersionId);
    normalized.push({
      assetContentVersionId: binding.assetContentVersionId,
      assetId: binding.assetId,
      usageRole: binding.usageRole,
    });
  }
  concept.conceptMoodboardBindings = normalized;
  concept.moodboardAssetIds = [
    ...new Set(normalized.map((item) => item.assetId)),
  ];
  concept.version += 1;
  concept.updatedAt = m2Now();
  persistState();
  return m2Clone(concept);
}

export function submitConceptReview(
  projectId: string,
  revisionId: string,
  payload: Record<string, any>,
) {
  const concept = getConcept(projectId, revisionId);
  m2AssertVersion(concept, payload.expectedVersion);
  if (concept.status !== 'DRAFT') {
    throw new ApiError(409, 'STAGE_GUARD_FAILED', '只有草稿可以提交审核');
  }
  const target = (m2State().concepts[projectId] ?? []).find(
    (item: any) => item.id === revisionId,
  );
  target.status = 'WAITING_REVIEW';
  target.version += 1;
  target.updatedAt = m2Now();
  return m2Clone(target);
}

export function approveConcept(
  projectId: string,
  revisionId: string,
  payload: Record<string, any>,
  actor: Actor,
) {
  const concept = (m2State().concepts[projectId] ?? []).find(
    (item: any) => item.id === revisionId,
  );
  if (!concept) {
    throw new ApiError(404, 'NOT_FOUND', '创意方案不存在');
  }
  m2AssertVersion(concept, payload.expectedVersion);
  if (concept.status !== 'WAITING_REVIEW') {
    throw new ApiError(409, 'STAGE_GUARD_FAILED', '请先提交方案审核');
  }
  const timestamp = m2Now();
  for (const item of m2State().concepts[projectId] ?? []) {
    if (item.id !== concept.id && item.status === 'APPROVED') {
      item.status = 'STALE';
    }
  }
  concept.status = 'APPROVED';
  concept.approvedAt = timestamp;
  concept.approvedBy = actor.id;
  concept.version += 1;
  concept.updatedAt = timestamp;
  const group = (m2State().conceptGroups[projectId] ?? []).find(
    (item: any) => item.id === concept.conceptGroupId,
  );
  if (group) {
    group.selectedConceptRevisionId = concept.id;
    group.version += 1;
  }
  m2Touch(projectId, 'SCRIPT');
  m2InvalidateFrom(projectId, 'ANGLES');
  return m2Clone(concept);
}

export function rejectConcept(
  projectId: string,
  revisionId: string,
  payload: Record<string, any>,
) {
  const concept = (m2State().concepts[projectId] ?? []).find(
    (item: any) => item.id === revisionId,
  );
  if (!concept) {
    throw new ApiError(404, 'NOT_FOUND', '创意方案不存在');
  }
  m2AssertVersion(concept, payload.expectedVersion);
  concept.status = 'REJECTED';
  concept.reviewerNotes = String(payload.reason ?? '需要修改');
  concept.version += 1;
  concept.updatedAt = m2Now();
  return m2Clone(concept);
}

export function selectConcept(
  projectId: string,
  groupId: string,
  payload: Record<string, any>,
) {
  const group = (m2State().conceptGroups[projectId] ?? []).find(
    (item: any) => item.id === groupId,
  );
  if (!group) {
    throw new ApiError(404, 'NOT_FOUND', '创意组不存在');
  }
  m2AssertVersion(group, payload.expectedVersion);
  if (!group.conceptRevisionIds.includes(payload.revisionId)) {
    throw new ApiError(400, 'INVALID_INPUT', '方案不属于该创意组');
  }
  group.selectedConceptRevisionId = payload.revisionId;
  group.version += 1;
  group.updatedAt = m2Now();
  return m2Clone(group);
}

export function favoriteConcept(
  projectId: string,
  groupId: string,
  payload: Record<string, any>,
) {
  const group = (m2State().conceptGroups[projectId] ?? []).find(
    (item: any) => item.id === groupId,
  );
  if (!group) {
    throw new ApiError(404, 'NOT_FOUND', '创意组不存在');
  }
  const favorite = Boolean(payload.favorite);
  const list: string[] = group.favoriteConceptRevisionIds ?? [];
  group.favoriteConceptRevisionIds = favorite
    ? [...new Set([...list, String(payload.revisionId)])]
    : list.filter((id) => id !== payload.revisionId);
  group.version += 1;
  return m2Clone(group);
}

export function getActiveConcept(projectId: string) {
  getProjectOrThrow(projectId);
  const concept = (m2State().concepts[projectId] ?? [])
    .filter((item: any) => item.status === 'APPROVED')
    .toSorted((a: any, b: any) => b.revisionNo - a.revisionNo)[0];
  return concept ? m2Clone(concept) : null;
}

export function evaluateDurationPlan(
  projectId: string,
  payload: Record<string, any>,
) {
  const project = getProjectOrThrow(projectId);
  const concept = (m2State().concepts[projectId] ?? []).find(
    (item: any) => item.id === payload.conceptRevisionId,
  );
  if (!concept || concept.status !== 'APPROVED') {
    throw new ApiError(
      409,
      'STAGE_GUARD_FAILED',
      '请先确认创意方案，再评估时长',
      { target: '/concepts' },
    );
  }
  const targetDurationMs = Number(
    payload.targetDurationMs ?? project.durationSec * 1000,
  );
  if (targetDurationMs < 15_000 || targetDurationMs > 180_000) {
    throw new ApiError(422, 'INVALID_DURATION', '目标时长需在 15～180 秒之间');
  }
  const naturalDurationMs = concept.suggestedDurationSec * 1000;
  const ratio = targetDurationMs / naturalDurationMs;
  let status = 'SUFFICIENT';
  if (ratio > 6) {
    status = 'NOT_RECOMMENDED';
  } else if (ratio > 4) {
    status = 'NEEDS_NEW_CHAPTERS';
  } else if (ratio > 1.2) {
    status = 'CAN_EXPAND';
  }
  const plans = m2List('durationPlans', projectId);
  let recommendedBeatCount = 4;
  if (targetDurationMs >= 120_000) {
    recommendedBeatCount = 7;
  } else if (targetDurationMs >= 60_000) {
    recommendedBeatCount = 6;
  }
  const plan = {
    acceptedRiskNotes: [],
    conceptRevisionId: concept.id,
    createdAt: m2Now(),
    id: nextId('duration'),
    naturalDurationMs,
    projectId,
    rationale:
      status === 'SUFFICIENT'
        ? '当前创意容量与目标时长匹配，可直接生成剧本。'
        : `当前故事更适合约 ${Math.round(naturalDurationMs / 1000)} 秒；直接拉长到 ${Math.round(targetDurationMs / 1000)} 秒需要新增有意义的节拍，而不是放慢或重复。`,
    recommendedBeatCount,
    riskNotes:
      status === 'SUFFICIENT'
        ? []
        : ['拉长后需检查叙事重复', '补充情节不得虚构产品效果'],
    selectedStrategy: undefined,
    status,
    targetDurationMs,
    updatedAt: m2Now(),
    version: 1,
  };
  plans.unshift(plan);
  return m2Clone(plan);
}

export function getDurationPlans(projectId: string) {
  getProjectOrThrow(projectId);
  return m2Clone(m2State().durationPlans[projectId] ?? []);
}

export function patchDurationPlan(
  projectId: string,
  planId: string,
  payload: Record<string, any>,
) {
  const plan = (m2State().durationPlans[projectId] ?? []).find(
    (item: any) => item.id === planId,
  );
  if (!plan) {
    throw new ApiError(404, 'NOT_FOUND', '时长计划不存在');
  }
  m2AssertVersion(plan, payload.expectedVersion);
  if (payload.selectedStrategy !== undefined) {
    plan.selectedStrategy = payload.selectedStrategy;
  }
  if (Array.isArray(payload.acceptedRiskNotes)) {
    plan.acceptedRiskNotes = payload.acceptedRiskNotes;
  }
  if (
    plan.selectedStrategy === 'KEEP_SHORT' &&
    plan.acceptedRiskNotes.length === 0
  ) {
    throw new ApiError(
      422,
      'INVALID_DURATION',
      '保留短片需要明确接受“与项目目标时长不一致”的风险',
    );
  }
  plan.version += 1;
  plan.updatedAt = m2Now();
  return m2Clone(plan);
}

export function startScriptGeneration(
  projectId: string,
  payload: Record<string, any>,
) {
  const concept = m2ApprovedConcept(projectId);
  const plan = (m2State().durationPlans[projectId] ?? []).find(
    (item: any) => item.id === payload.durationPlanId,
  );
  if (!plan) {
    throw new ApiError(409, 'STAGE_GUARD_FAILED', '请先评估目标时长');
  }
  if (plan.status !== 'SUFFICIENT' && !plan.selectedStrategy) {
    throw new ApiError(422, 'INVALID_DURATION', '请先选择 A/B/C 时长策略');
  }
  advanceProjectJobs(projectId);
  const active = Object.values(state.jobs).find(
    (job) =>
      job.projectId === projectId &&
      job.kind === 'GENERATE_SCRIPT' &&
      ['CREATED', 'QUEUED', 'RUNNING'].includes(job.status),
  );
  if (active) {
    throw new ApiError(409, 'CONFLICT', '已有剧本生成任务正在运行', {
      jobId: active.id,
    });
  }
  const job = createJob(
    projectId,
    'GENERATE_SCRIPT',
    String(payload.scenario ?? 'NORMAL'),
    {
      conceptRevisionId: concept.id,
      durationPlanId: plan.id,
      strategy: plan.selectedStrategy ?? 'NATURAL_STORY_EXPANSION',
    },
  );
  return { jobId: job.id };
}

const RESUME_SCRIPT_BEATS = [
  {
    conflictOrChange: '面试官被海量相似简历淹没',
    durationMs: 10_000,
    emotionalIntensity: 4,
    narrativeRole: 'HOOK',
    newInformation: '用视觉反差建立“简历太多、记不住人”的问题',
    plot: '面试官被一堆相似 PDF 简历包围，几乎看不清任何人的特点。',
    productPlacement: '无（问题呈现）',
    title: '简历山',
    visualIntent: '夸张纸张山、快速翻页、压迫感构图',
    voiceover: '每一份简历，看起来都很像。',
  },
  {
    conflictOrChange: '反复调整格式仍无法展示个人特色',
    durationMs: 20_000,
    emotionalIntensity: 3,
    narrativeRole: 'CONFLICT',
    newInformation: '建立求职者共鸣：问题不在能力，而在表达方式',
    plot: '求职者小周反复修改排版、字体和照片，却始终觉得无法展示真正的自己。',
    productPlacement: '无（人物困境）',
    title: '怎么改都一样',
    visualIntent: '深夜屏幕、不断撤销重排、细节特写',
    voiceover: '改了很多版，还是像一张纸。',
  },
  {
    conflictOrChange: '提出“简历为什么只能是平面文件”的认知问题',
    durationMs: 20_000,
    emotionalIntensity: 3,
    narrativeRole: 'TURN',
    newInformation: '从“优化旧形式”转向“换一种形式表达”',
    plot: '小周望向屏幕，画面里的文档边缘出现一道细小的空间裂缝。',
    productPlacement: '3D 网页简历入口首次出现',
    title: '为什么只能是纸？',
    visualIntent: '平面文件出现纵深、光影变化、镜头推近裂缝',
    voiceover: '如果简历不只是一张纸呢？',
  },
  {
    conflictOrChange: '文件裂开，人物进入 3D 数字空间',
    durationMs: 25_000,
    emotionalIntensity: 5,
    narrativeRole: 'REVEAL',
    newInformation: '产品核心体验第一次完整出现',
    plot: '纸张碎裂成发光粒子，小周的 3D 形象从纸面跃出，站在由作品卡片组成的空间中。',
    productPlacement: '3D 形象与网页空间成为产品核心展示',
    title: '简历活过来',
    visualIntent: '纸张爆裂、粒子转场、3D 角色登场、视觉高潮',
    voiceover: '现在，它可以站起来，走到你面前。',
  },
  {
    conflictOrChange: '展示 3D 空间如何组织项目、技能与经历',
    durationMs: 20_000,
    emotionalIntensity: 4,
    narrativeRole: 'VALUE',
    newInformation: '从“炫酷”落到“能表达什么”',
    plot: '项目卡片围绕数字形象展开，技能标签与经历按时间点亮，小周的空间逐渐完整。',
    productPlacement: '作品、技能、经历围绕数字形象组织',
    title: '把经历展开',
    visualIntent: '环绕镜头、卡片旋转、信息层次清晰',
    voiceover: '项目、技能、经历，终于有了同一个空间。',
  },
  {
    conflictOrChange: '用真实网页交互证明形式成立',
    durationMs: 15_000,
    emotionalIntensity: 3,
    narrativeRole: 'PROOF',
    newInformation: '真实产品界面与可交互细节',
    plot: '镜头回到真实浏览器，招聘者点击项目卡片、拖动视角，看到网页简历的真实交互。',
    productPlacement: '真实产品截图/录屏与交互',
    title: '真的可以点开',
    visualIntent: '真实界面特写、鼠标交互、合成文字说明',
    voiceover: '不是概念图，是一个可以打开的空间。',
  },
  {
    conflictOrChange: '品牌与链接自然收束，引导行动',
    durationMs: 10_000,
    emotionalIntensity: 3,
    narrativeRole: 'CTA',
    newInformation: '行动方式：分享一条链接',
    plot: '小周把链接发给面试官，画面收束为品牌和网址。',
    productPlacement: 'Logo、URL、分享按钮',
    title: '把链接发出去',
    visualIntent: '链接飞出、品牌收束、留白',
    voiceover: '把你的经历，装进一条链接。',
  },
];

function buildScriptBeats(
  project: Project,
  targetDurationMs: number,
  strategy: string,
) {
  if (project.id === 'project_resume_3d' && targetDurationMs >= 120_000) {
    return RESUME_SCRIPT_BEATS.map((beat, index) => ({
      audioMood: index === 3 ? '上扬、惊叹' : '紧张、克制',
      characterMotivation: index < 3 ? '希望被看见' : '展示真实能力',
      dialogue: '',
      durationMs: beat.durationMs,
      emotionalIntensity: beat.emotionalIntensity,
      evidenceIds: [] as string[],
      id: `beat_resume_${String(index + 1).padStart(2, '0')}`,
      narrativeRole: beat.narrativeRole,
      newInformation: beat.newInformation,
      onScreenText: '',
      order: index + 1,
      plot: beat.plot,
      productPlacement: beat.productPlacement,
      reviewStatus: 'pending',
      relatedFeatureIds: [] as string[],
      relatedPainPointIds: [] as string[],
      riskNotes: [] as string[],
      title: beat.title,
      transitionToNext: '硬切/轻微推近',
      visualIntent: beat.visualIntent,
      voiceover: beat.voiceover,
    }));
  }
  let count = 7;
  if (targetDurationMs <= 30_000) {
    count = 4;
  } else if (targetDurationMs <= 60_000) {
    count = 6;
  }
  let weights = [1, 1.6, 1.6, 2, 1.6, 1.4, 1];
  if (count === 4) {
    weights = [1, 1, 1, 1];
  } else if (count === 6) {
    weights = [1, 1.2, 1.2, 1.4, 1.4, 1];
  }
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let allocated = 0;
  let roles = ['HOOK', 'SETUP', 'CONFLICT', 'TURN', 'REVEAL', 'VALUE', 'CTA'];
  if (count === 4) {
    roles = ['HOOK', 'CONFLICT', 'REVEAL', 'CTA'];
  } else if (count === 6) {
    roles = ['HOOK', 'SETUP', 'CONFLICT', 'TURN', 'VALUE', 'CTA'];
  }
  return weights.map((weight, index) => {
    const isLast = index === weights.length - 1;
    const durationMs = isLast
      ? targetDurationMs - allocated
      : Math.round((targetDurationMs * weight) / totalWeight / 1000) * 1000;
    allocated += durationMs;
    const chapter =
      strategy === 'MULTI_CHAPTER'
        ? `章节 ${Math.floor(index / 3) + 1} · `
        : '';
    return {
      audioMood: index === 0 ? '悬念' : '推进',
      characterMotivation: '解决当前问题',
      dialogue: '',
      durationMs,
      emotionalIntensity: Math.min(5, 3 + (index % 3)),
      evidenceIds: [] as string[],
      id: `beat_${project.id}_${index + 1}`,
      narrativeRole: roles[index],
      newInformation: `第 ${index + 1} 段带来新的情节或信息，避免重复卖点`,
      onScreenText: '',
      order: index + 1,
      plot: `${project.productName ?? project.title} 的故事第 ${index + 1} 步：${roles[index]}`,
      productPlacement: index >= count - 2 ? '产品自然出现' : '无',
      reviewStatus: 'pending',
      relatedFeatureIds: [] as string[],
      relatedPainPointIds: [] as string[],
      riskNotes: [] as string[],
      title: `${chapter}${roles[index]} 节拍`,
      transitionToNext: '硬切',
      visualIntent: '符合当前情绪与平台的构图',
      voiceover:
        index === 0
          ? `如果${project.productName ?? project.title}换一种方式出现？`
          : '',
    };
  });
}

function applyScriptJob(job: Job) {
  const project = getProjectOrThrow(job.projectId);
  const concept = (m2State().concepts[job.projectId] ?? []).find(
    (item: any) => item.id === job.payload?.conceptRevisionId,
  );
  const plan = (m2State().durationPlans[job.projectId] ?? []).find(
    (item: any) => item.id === job.payload?.durationPlanId,
  );
  if (!concept || !plan) {
    throw new ApiError(409, 'STAGE_GUARD_FAILED', '上游创意或时长计划已失效');
  }
  const strategy = String(job.payload?.strategy ?? 'NATURAL_STORY_EXPANSION');
  const targetDurationMs =
    strategy === 'KEEP_SHORT' ? plan.naturalDurationMs : plan.targetDurationMs;
  const scripts = m2List('scripts', job.projectId);
  const timestamp = m2Now();
  const script = {
    approvedAt: undefined,
    approvedBy: undefined,
    beats: buildScriptBeats(project, targetDurationMs, strategy),
    conceptRevisionId: concept.id,
    createdAt: timestamp,
    durationPlanId: plan.id,
    id: nextId('script'),
    narrationPrinciples: ['旁白短句、口语化', '不虚构产品效果'],
    parentRevisionId: scripts[0]?.id,
    prohibitedClaims: concept.riskNotes ?? [],
    projectId: project.id,
    revisionNo: (scripts[0]?.revisionNo ?? 0) + 1,
    riskNotes: ['人物与情节为 Mock 虚构'],
    status: 'DRAFT',
    synopsis: concept.logline,
    targetDurationMs,
    title: `${concept.title} · 剧本`,
    updatedAt: timestamp,
    version: 1,
    visualPrinciples: ['视觉反差优先', '产品出现自然'],
  };
  scripts.unshift(script);
  m2Touch(project.id, 'SCRIPT');
  job.resultRefId = script.id;
}

export function listScripts(projectId: string) {
  getProjectOrThrow(projectId);
  advanceProjectJobs(projectId);
  return m2Clone(m2State().scripts[projectId] ?? []);
}

export function getScript(projectId: string, revisionId: string) {
  const script = (m2State().scripts[projectId] ?? []).find(
    (item: any) => item.id === revisionId,
  );
  if (!script) {
    throw new ApiError(404, 'NOT_FOUND', '剧本版本不存在');
  }
  return m2Clone(script);
}

export function patchScript(
  projectId: string,
  revisionId: string,
  payload: Record<string, any>,
) {
  const script = (m2State().scripts[projectId] ?? []).find(
    (item: any) => item.id === revisionId,
  );
  if (!script) {
    throw new ApiError(404, 'NOT_FOUND', '剧本版本不存在');
  }
  m2AssertVersion(script, payload.expectedVersion);
  if (script.status === 'APPROVED') {
    throw new ApiError(
      409,
      'STAGE_GUARD_FAILED',
      '已批准剧本不可直接修改，请派生新草稿',
    );
  }
  const patch = payload.patch ?? {};
  if (Array.isArray(patch.beats)) {
    const beats = patch.beats as any[];
    if (beats.length === 0) {
      throw new ApiError(422, 'INVALID_DURATION', '剧本至少需要一个故事节拍');
    }
    const invalid = beats.find(
      (beat) => !Number.isInteger(beat.durationMs) || beat.durationMs <= 0,
    );
    if (invalid) {
      throw new ApiError(422, 'INVALID_DURATION', '节拍时长必须为正整数毫秒');
    }
    script.beats = beats.map((beat, index) => ({ ...beat, order: index + 1 }));
  }
  for (const key of ['title', 'synopsis']) {
    if (patch[key] !== undefined) {
      script[key] = String(patch[key]);
    }
  }
  script.status = 'DRAFT';
  script.version += 1;
  script.updatedAt = m2Now();
  m2InvalidateFrom(projectId, 'SCRIPT');
  return m2Clone(script);
}

export function forkScript(
  projectId: string,
  revisionId: string,
  payload: Record<string, any>,
) {
  const scripts = m2List('scripts', projectId);
  const script = scripts.find((item: any) => item.id === revisionId);
  if (!script) {
    throw new ApiError(404, 'NOT_FOUND', '剧本版本不存在');
  }
  m2AssertVersion(script, payload.expectedVersion);
  const timestamp = m2Now();
  const copy = {
    ...m2Clone(script),
    approvedAt: undefined,
    approvedBy: undefined,
    createdAt: timestamp,
    id: nextId('script'),
    parentRevisionId: script.id,
    revisionNo: script.revisionNo + 1,
    status: 'DRAFT',
    updatedAt: timestamp,
    version: 1,
  };
  scripts.unshift(copy);
  return m2Clone(copy);
}

export function submitScriptReview(
  projectId: string,
  revisionId: string,
  payload: Record<string, any>,
) {
  const script = getScript(projectId, revisionId);
  m2AssertVersion(script, payload.expectedVersion);
  if (script.status !== 'DRAFT') {
    throw new ApiError(409, 'STAGE_GUARD_FAILED', '只有草稿可以提交审核');
  }
  const target = (m2State().scripts[projectId] ?? []).find(
    (item: any) => item.id === revisionId,
  );
  target.status = 'WAITING_REVIEW';
  target.version += 1;
  target.updatedAt = m2Now();
  return m2Clone(target);
}

export function approveScript(
  projectId: string,
  revisionId: string,
  payload: Record<string, any>,
  actor: Actor,
) {
  const script = (m2State().scripts[projectId] ?? []).find(
    (item: any) => item.id === revisionId,
  );
  if (!script) {
    throw new ApiError(404, 'NOT_FOUND', '剧本版本不存在');
  }
  m2AssertVersion(script, payload.expectedVersion);
  if (script.status !== 'WAITING_REVIEW') {
    throw new ApiError(409, 'STAGE_GUARD_FAILED', '请先提交剧本审核');
  }
  const timestamp = m2Now();
  for (const item of m2State().scripts[projectId] ?? []) {
    if (item.id !== script.id && item.status === 'APPROVED') {
      item.status = 'STALE';
    }
  }
  script.status = 'APPROVED';
  script.approvedAt = timestamp;
  script.approvedBy = actor.id;
  script.version += 1;
  script.updatedAt = timestamp;
  const project = getProjectOrThrow(projectId);
  project.durationSec = Math.round(script.targetDurationMs / 1000);
  m2Touch(projectId, 'SCRIPT');
  m2InvalidateFrom(projectId, 'SCRIPT');
  return m2Clone(script);
}

export function rejectScript(
  projectId: string,
  revisionId: string,
  payload: Record<string, any>,
) {
  const script = (m2State().scripts[projectId] ?? []).find(
    (item: any) => item.id === revisionId,
  );
  if (!script) {
    throw new ApiError(404, 'NOT_FOUND', '剧本版本不存在');
  }
  m2AssertVersion(script, payload.expectedVersion);
  script.status = 'REJECTED';
  script.reviewerNotes = String(payload.reason ?? '需要修改');
  script.version += 1;
  script.updatedAt = m2Now();
  return m2Clone(script);
}

export function getActiveScript(projectId: string) {
  getProjectOrThrow(projectId);
  const script = (m2State().scripts[projectId] ?? [])
    .filter((item: any) => item.status === 'APPROVED')
    .toSorted((a: any, b: any) => b.revisionNo - a.revisionNo)[0];
  return script ? m2Clone(script) : null;
}

export function getScriptsState(projectId: string) {
  getProjectOrThrow(projectId);
  advanceProjectJobs(projectId);
  const scripts = m2Clone(m2State().scripts[projectId] ?? []);
  const active = getActiveScript(projectId);
  const latest = scripts[0] ?? null;
  const plans = m2Clone(m2State().durationPlans[projectId] ?? []);
  return {
    active,
    concept: getActiveConcept(projectId),
    durationPlans: plans,
    latest,
    scripts,
  };
}

function m2ApprovedScript(projectId: string) {
  const script = getActiveScript(projectId);
  if (!script) {
    throw new ApiError(
      409,
      'STAGE_GUARD_FAILED',
      '请先确认剧本，再生成视觉规范与分镜',
      { target: '/script' },
    );
  }
  return script;
}

export function startVisualBibleGeneration(
  projectId: string,
  payload: Record<string, any>,
) {
  const script = m2ApprovedScript(projectId);
  advanceProjectJobs(projectId);
  const job = createJob(
    projectId,
    'GENERATE_VISUAL_BIBLE',
    String(payload.scenario ?? 'NORMAL'),
    { scriptRevisionId: script.id },
  );
  return { jobId: job.id };
}

function applyVisualBibleJob(job: Job) {
  const project = getProjectOrThrow(job.projectId);
  const script = m2ApprovedScript(job.projectId);
  const list = m2List('visualBibles', job.projectId);
  const timestamp = m2Now();
  const revision = {
    aspectRatio: project.aspectRatio,
    brandColors: ['#6D5AE6', '#F6C445', '#171321'],
    brandLogoAssetIds: [],
    characters: [
      {
        clothing: '深色简洁上衣，带一点未来感',
        id: `character_${project.id}_hero`,
        imageAssetIds: [],
        look: '年轻创作者，干净利落，表情有感染力',
        mustRemainConsistent: ['发型', '服装主色', '面部特征'],
        name: '主角',
        personality: '好奇、坚持、有点不服输',
      },
    ],
    createdAt: timestamp,
    id: nextId('visualbible'),
    musicAndSfxGuidance: '前段悬念，转折后上扬；纸张、键盘、提示音使用拟音',
    narrationGuidance: '短句、口语化、克制，不承诺效果',
    parentRevisionId: list[0]?.id,
    projectId: project.id,
    revisionNo: (list[0]?.revisionNo ?? 0) + 1,
    scenes: [
      {
        id: `scene_${project.id}_office`,
        keyObjects: ['简历', '显示器', '桌面'],
        lighting: '冷白办公灯，局部暖光',
        mood: '压迫 → 释放',
        name: '办公 / 面试空间',
        referenceAssetIds: [],
      },
      {
        id: `scene_${project.id}_digital`,
        keyObjects: ['项目卡片', '发光粒子', '品牌色空间'],
        lighting: '霓虹边缘光，深色背景',
        mood: '惊奇、未来感',
        name: '数字空间',
        referenceAssetIds: [],
      },
    ],
    scriptRevisionId: script.id,
    status: 'DRAFT',
    subtitleSafeAreaPercent: 12,
    targetFps: 24,
    typographyGuidance: '无衬线中文字体，字幕不超过两行',
    updatedAt: timestamp,
    version: 1,
    visualLanguageTags: ['3D 卡通', '动态字卡', '纸张拼贴'],
  };
  list.unshift(revision);
  m2Touch(project.id, 'STORYBOARD');
  job.resultRefId = revision.id;
}

export function listVisualBibles(projectId: string) {
  getProjectOrThrow(projectId);
  return m2Clone(m2State().visualBibles[projectId] ?? []);
}

export function getActiveVisualBible(projectId: string) {
  getProjectOrThrow(projectId);
  const list = (m2State().visualBibles[projectId] ?? [])
    .filter((item: any) => item.status === 'APPROVED')
    .toSorted((a: any, b: any) => b.revisionNo - a.revisionNo);
  return list[0] ? m2Clone(list[0]) : null;
}

export function forkVisualBible(projectId: string, revisionId: string) {
  const bibles = m2State().visualBibles[projectId] ?? [];
  const bible = bibles.find((item: any) => item.id === revisionId);
  if (!bible) throw new ApiError(404, 'NOT_FOUND', '视觉规范不存在');
  const timestamp = m2Now();
  const fork = {
    ...m2Clone(bible),
    approvedAt: undefined,
    approvedBy: undefined,
    createdAt: timestamp,
    id: nextId('visualbible'),
    parentRevisionId: bible.id,
    revisionNo:
      Math.max(...bibles.map((item: any) => item.revisionNo ?? 1)) + 1,
    status: 'DRAFT',
    updatedAt: timestamp,
    version: 1,
  };
  m2List('visualBibles', projectId).unshift(fork);
  persistState();
  return m2Clone(fork);
}

export function patchVisualBible(
  projectId: string,
  revisionId: string,
  payload: Record<string, any>,
) {
  const bible = (m2State().visualBibles[projectId] ?? []).find(
    (item: any) => item.id === revisionId,
  );
  if (!bible) {
    throw new ApiError(404, 'NOT_FOUND', '视觉规范不存在');
  }
  m2AssertVersion(bible, payload.expectedVersion);
  if (bible.status === 'APPROVED') {
    throw new ApiError(409, 'STAGE_GUARD_FAILED', '已批准视觉规范不可直接修改');
  }
  const patch = payload.patch ?? {};
  for (const key of [
    'brandColors',
    'brandLogoAssetIds',
    'characters',
    'musicAndSfxGuidance',
    'narrationGuidance',
    'scenes',
    'subtitleSafeAreaPercent',
    'targetFps',
    'typographyGuidance',
    'visualLanguageTags',
  ]) {
    if (patch[key] !== undefined) {
      bible[key] = patch[key];
    }
  }
  bible.status = 'DRAFT';
  bible.version += 1;
  bible.updatedAt = m2Now();
  const storyboards = m2State().storyboards[projectId] ?? [];
  for (const storyboard of storyboards) {
    if (storyboard.status && storyboard.status !== 'STALE') {
      storyboard.status = 'STALE';
      storyboard.version += 1;
    }
  }
  const shots = m2State().shots[projectId] ?? [];
  const characterIds = new Set(
    (bible.characters ?? []).map((character: any) => character.id),
  );
  for (const shot of shots) {
    if (
      (shot.characterIds ?? []).some((id: string) => characterIds.has(id)) &&
      shot.reviewStatus !== 'APPROVED'
    ) {
      shot.reviewStatus = 'NEEDS_CHANGES';
      shot.version += 1;
    }
  }
  m2InvalidateFrom(projectId, 'VISUAL_BIBLE');
  return m2Clone(bible);
}

export function approveVisualBible(
  projectId: string,
  revisionId: string,
  payload: Record<string, any>,
  actor: Actor,
) {
  const bible = (m2State().visualBibles[projectId] ?? []).find(
    (item: any) => item.id === revisionId,
  );
  if (!bible) {
    throw new ApiError(404, 'NOT_FOUND', '视觉规范不存在');
  }
  m2AssertVersion(bible, payload.expectedVersion);
  bible.status = 'APPROVED';
  bible.updatedAt = m2Now();
  bible.version += 1;
  bible.approvedBy = actor.id;
  return m2Clone(bible);
}

const RESUME_SHOT_DURATIONS = [
  6000, 4000, 10_000, 10_000, 10_000, 10_000, 8000, 7000, 10_000, 8000, 7000,
  5000, 10_000, 5000, 10_000,
];

const RESUME_SHOT_TEMPLATES = [
  [
    '简历山压向桌面',
    '面试官桌面，成堆 PDF 简历从画面边缘压过来',
    '纸张缓慢滑落，最上面一份简历特写',
    '俯拍特写 → 缓慢推近',
    '每一天，都有新的简历。',
    '简历山',
    ['纸张摩擦'],
  ],
  [
    '面试官被淹没',
    '面试官坐在纸堆中，只露出头顶',
    '夸张表情，伸手拨开纸张',
    '低角度广角，轻微手持',
    '但每一份，看起来都很像。',
    '每一份都很像',
    ['纸张坍塌', '叹气'],
  ],
  [
    '求职者反复修改排版',
    '深夜卧室，小周反复调整 PDF 排版',
    '改字号、删照片、撤销，动作越来越快',
    '中景 → 屏幕特写',
    '排版改了十几次，还是不对。',
    '第 13 版',
    ['键盘', '鼠标点击'],
  ],
  [
    '简历在海量 PDF 中消失',
    '招聘系统列表快速滚动，简历缩成一个小点',
    '画面拉远，简历被淹没',
    '高速滚动 → 拉远',
    '然后，就没有然后了。',
    '石沉大海',
    ['滚动音'],
  ],
  [
    '望向显示屏产生想法',
    '小周盯着屏幕，屏幕反光映在脸上',
    '眼神从疲惫变为聚焦',
    '面部特写，缓慢推近',
    '如果简历不只是纸呢？',
    '换个方式？',
    ['呼吸声'],
  ],
  [
    '平面文件出现空间裂缝',
    'PDF 页面出现一道发光裂缝，边缘向内塌陷',
    '手指触碰裂缝，光溢出',
    '微距 → 主观镜头',
    '她伸手碰了碰那道裂缝。',
    '裂缝',
    ['玻璃裂开'],
  ],
  [
    '纸张碎裂，3D 人物跃出',
    'PDF 炸成粒子，3D 人物从纸面跃出',
    '纸张先炸开，人物随后出现，落地',
    '慢动作 → 环绕',
    '现在，它可以站起来了。',
    '简历活过来',
    ['爆裂', '粒子'],
  ],
  [
    '人物进入彩色数字世界',
    '人物站在由紫色与金色光带构成的空间',
    '回头看向镜头，空间向四周展开',
    '跟拍 → 环绕',
    '这里，可以装下更多。',
    '进入 3D 空间',
    ['上升音效'],
  ],
  [
    '3D 网页空间展开',
    '项目卡片、技能标签、经历时间线围绕人物展开',
    '人物抬手，卡片依次点亮',
    '大远景 → 中景',
    '项目、技能、经历，都在同一个空间。',
    '个人数字空间',
    ['卡片翻转'],
  ],
  [
    '项目卡片围绕角色旋转',
    '镜头绕人物旋转，项目卡片像行星一样排布',
    '人物指向其中一张卡片，卡片放大',
    '环绕镜头',
    '每一个项目，都能被看见。',
    '作品被看见',
    ['Whoosh'],
  ],
  [
    '技能标签与数字人互动',
    '标签从人物身边飞出，组合成技能图谱',
    '人物接住一个标签，微笑',
    '中景 → 特写',
    '擅长什么，一眼就知道。',
    '技能图谱',
    ['轻快提示音'],
  ],
  [
    '作品成果进一步呈现',
    '作品细节铺满画面，形成拼贴',
    '拼贴收拢成一张完整网页',
    '快速剪辑 → 定格',
    '这不是一份文件，是一个作品空间。',
    '作品空间',
    ['拼贴音'],
  ],
  [
    '真实产品官网与作品界面',
    '浏览器中打开真实 3D 网页简历',
    '鼠标点击、拖动视角，页面真实响应',
    '屏幕录制特写',
    '真的可以点开。',
    '真实可交互',
    ['点击'],
  ],
  [
    '真实网页交互细节',
    '项目详情、人物旋转、分享按钮',
    '点击分享，链接生成',
    '微距交互特写',
    '也可以把这条链接发出去。',
    '分享链接',
    ['复制成功'],
  ],
  [
    '用户分享链接，品牌收束',
    '面试官在手机里打开链接，画面收束为 Logo 与网址',
    '品牌出现，留白',
    '中景 → 品牌定格',
    '把你的经历，装进一条链接。',
    'VidCraft · 立即体验',
    ['收束音'],
  ],
];

function beatIdAtTime(script: any, startMs: number) {
  let cursor = 0;
  for (const beat of script.beats ?? []) {
    if (startMs < cursor + beat.durationMs) {
      return beat.id;
    }
    cursor += beat.durationMs;
  }
  return script.beats?.[script.beats.length - 1]?.id ?? '';
}

function shotImageUrl(projectId: string, index: number) {
  if (projectId === 'project_resume_3d') {
    return `/demo/m2/resume-3d/shot-${String(index + 1).padStart(2, '0')}.svg`;
  }
  return `/demo/m2/shared/shot-${String((index % 15) + 1).padStart(2, '0')}.svg`;
}

export function startStoryboardGeneration(
  projectId: string,
  payload: Record<string, any>,
) {
  const script = m2ApprovedScript(projectId);
  const bible = (m2State().visualBibles[projectId] ?? []).find(
    (item: any) => item.id === payload.visualBibleVersionId,
  );
  if (!bible) {
    throw new ApiError(409, 'STAGE_GUARD_FAILED', '请先生成视觉规范');
  }
  advanceProjectJobs(projectId);
  const active = Object.values(state.jobs).find(
    (job) =>
      job.projectId === projectId &&
      job.kind === 'GENERATE_STORYBOARD' &&
      ['CREATED', 'QUEUED', 'RUNNING'].includes(job.status),
  );
  if (active) {
    throw new ApiError(409, 'CONFLICT', '已有分镜生成任务正在运行', {
      jobId: active.id,
    });
  }
  const job = createJob(
    projectId,
    'GENERATE_STORYBOARD',
    String(payload.scenario ?? 'NORMAL'),
    { scriptRevisionId: script.id, visualBibleVersionId: bible.id },
  );
  return { jobId: job.id };
}

function applyStoryboardJob(job: Job) {
  const project = getProjectOrThrow(job.projectId);
  const script = (m2State().scripts[job.projectId] ?? []).find(
    (item: any) => item.id === job.payload?.scriptRevisionId,
  );
  const bible = (m2State().visualBibles[job.projectId] ?? []).find(
    (item: any) => item.id === job.payload?.visualBibleVersionId,
  );
  if (!script || !bible) {
    throw new ApiError(409, 'STAGE_GUARD_FAILED', '剧本或视觉规范已失效');
  }
  const storyboards = m2List('storyboards', job.projectId);
  const shots = m2List('shots', job.projectId);
  const images = m2List('images', job.projectId);
  const timestamp = m2Now();
  const revisionNo = (storyboards[0]?.revisionNo ?? 0) + 1;
  const storyboardId = nextId('storyboard');
  let count = 6;
  if (project.id === 'project_resume_3d') {
    count = 15;
  } else if (script.beats.length >= 7) {
    count = 8;
  }
  const totalTarget = script.targetDurationMs;
  const baseDurations =
    project.id === 'project_resume_3d'
      ? RESUME_SHOT_DURATIONS
      : Array.from(
          { length: count },
          (_, index) =>
            Math.floor(totalTarget / count / 1000) * 1000 +
            (index === 0
              ? totalTarget -
                Math.floor(totalTarget / count / 1000) * 1000 * count
              : 0),
        );
  let cursor = 0;
  const ordered: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const durationMs = baseDurations[index] ?? 5000;
    const template =
      RESUME_SHOT_TEMPLATES[index % RESUME_SHOT_TEMPLATES.length] ?? [];
    const [
      title = '镜头',
      scene = '',
      action = '',
      camera = '',
      narration = '',
      onScreen = '',
      sfx = [],
    ] = template;
    const shotId = `${project.id}_shot_${String(index + 1).padStart(2, '0')}`;
    const revisionId = `${shotId}_r${revisionNo}`;
    const imageId = `image_${shotId}_v1`;
    const image = {
      aspectRatio: project.aspectRatio,
      height: 1280,
      id: imageId,
      mimeType: 'image/svg+xml',
      mockUrl: shotImageUrl(project.id, index),
      promptSnapshot: `${title}；${bible.visualLanguageTags?.join('、') ?? ''}`,
      shotId,
      sourceType: 'mock_generated',
      status: 'READY',
      versionNo: 1,
      visualBibleVersionId: bible.id,
      width: 720,
    };
    images.push(image);
    const shot = {
      actionDescription: action,
      activeReferenceImageId: imageId,
      aiPrompt: image.promptSnapshot,
      approvedAt: undefined,
      approvedBy: undefined,
      cameraPlan: camera,
      characterIds: [bible.characters?.[0]?.id ?? ''],
      createdAt: timestamp,
      dialogue: '',
      durationMs,
      evidenceIds: [],
      generationMode: index < 3 ? 'ai_video' : 'image_animation',
      id: revisionId,
      musicCue: index === 3 ? '情绪上扬' : '克制推进',
      narration,
      narrativePurpose:
        script.beats.find(
          (beat: any) => beat.id === beatIdAtTime(script, cursor),
        )?.narrativeRole ?? 'OTHER',
      negativePrompt: '不要出现真实客户隐私、不要生成未证实数据',
      onScreenText: [onScreen],
      order: index + 1,
      parentRevisionId: undefined,
      productPlacement: index >= 9 ? '产品界面/品牌自然露出' : '无',
      projectId: project.id,
      referenceImageVersionIds: [imageId],
      reviewStatus: 'DRAFT',
      revisionNo,
      riskNotes: project.id === 'project_crm' ? ['不得虚构丢单率下降数据'] : [],
      sceneDescription: scene,
      sceneIds: [bible.scenes?.[index % 2]?.id ?? ''],
      scriptRevisionId: script.id,
      sfx,
      shotId,
      storyBeatId: beatIdAtTime(script, cursor),
      subtitles: [narration],
      title,
      transitionIn: '硬切',
      transitionOut: '硬切',
      transitionOverlapToNextMs: 0,
      updatedAt: timestamp,
      version: 1,
      visualBibleVersionId: bible.id,
      visualStyle: bible.visualLanguageTags?.[index % 2] ?? '3D 卡通',
    };
    shots.push(shot);
    ordered.push(revisionId);
    cursor += durationMs;
  }
  const storyboard = {
    approvedAt: undefined,
    approvedBy: undefined,
    createdAt: timestamp,
    id: storyboardId,
    orderedShotRevisionIds: ordered,
    parentRevisionId: storyboards[0]?.id,
    projectId: project.id,
    revisionNo,
    scriptRevisionId: script.id,
    status: 'DRAFT',
    totalDurationMs: cursor,
    updatedAt: timestamp,
    version: 1,
    visualBibleVersionId: bible.id,
  };
  storyboards.unshift(storyboard);
  m2Touch(project.id, 'STORYBOARD');
  job.resultRefId = storyboard.id;
}

export function getStoryboardState(projectId: string) {
  getProjectOrThrow(projectId);
  advanceProjectJobs(projectId);
  const storyboards = m2Clone(m2State().storyboards[projectId] ?? []);
  const latest = storyboards[0] ?? null;
  const allStoryboardShots = m2State().shots[projectId] ?? [];
  const shots = m2Clone(
    latest
      ? latest.orderedShotRevisionIds
          .map((id: string) =>
            allStoryboardShots.find((item: any) => item.id === id),
          )
          .filter(Boolean)
      : [],
  );
  const images = m2Clone(m2State().images[projectId] ?? []);
  const script = getActiveScript(projectId);
  const visualBible =
    getActiveVisualBible(projectId) ??
    m2Clone((m2State().visualBibles[projectId] ?? [])[0] ?? null);
  const approved = shots.filter(
    (shot: any) => shot.reviewStatus === 'APPROVED',
  );
  let cursor = 0;
  for (const shot of shots) {
    const overlap = shot.transitionOverlapToNextMs ?? 0;
    cursor += shot.durationMs - overlap;
  }
  return {
    approvedCount: approved.length,
    images,
    issues: buildStoryboardIssues(script, shots, cursor),
    latest,
    netDurationMs: cursor,
    script,
    shots,
    storyboards,
    totalCount: shots.length,
    visualBible,
  };
}

function buildStoryboardIssues(
  script: any,
  shots: any[],
  netDurationMs: number,
) {
  const issues: Array<{ code: string; message: string; shotId?: string }> = [];
  if (!script) {
    issues.push({ code: 'NO_SCRIPT', message: '没有已确认剧本' });
  }
  for (const shot of shots) {
    if (!shot.activeReferenceImageId) {
      issues.push({
        code: 'MISSING_IMAGE',
        message: `镜头 ${shot.order} 缺少参考图`,
        shotId: shot.shotId,
      });
    }
    if (shot.reviewStatus !== 'APPROVED') {
      issues.push({
        code: 'SHOT_NOT_APPROVED',
        message: `镜头 ${shot.order} 尚未确认`,
        shotId: shot.shotId,
      });
    }
  }
  if (script && Math.abs(netDurationMs - script.targetDurationMs) > 2000) {
    issues.push({
      code: 'DURATION_MISMATCH',
      message: `分镜净时长 ${Math.round(netDurationMs / 1000)}s 与目标 ${Math.round(script.targetDurationMs / 1000)}s 相差超过 2s`,
    });
  }
  return issues;
}

export function getShots(projectId: string, storyboardRevisionId?: string) {
  getProjectOrThrow(projectId);
  const storyboard = storyboardRevisionId
    ? (m2State().storyboards[projectId] ?? []).find(
        (item: any) => item.id === storyboardRevisionId,
      )
    : (m2State().storyboards[projectId] ?? [])[0];
  if (!storyboard) {
    return [];
  }
  const allShots = m2State().shots[projectId] ?? [];
  return m2Clone(
    storyboard.orderedShotRevisionIds
      .map((id: string) => allShots.find((item: any) => item.id === id))
      .filter(Boolean),
  );
}

export function getShot(projectId: string, shotId: string) {
  const shots = (m2State().shots[projectId] ?? []).filter(
    (item: any) => item.shotId === shotId,
  );
  if (shots.length === 0) {
    throw new ApiError(404, 'NOT_FOUND', '镜头不存在');
  }
  const latest = shots.toSorted(
    (a: any, b: any) => b.revisionNo - a.revisionNo,
  )[0];
  return m2Clone(latest);
}

export function getShotRevisions(projectId: string, shotId: string) {
  return m2Clone(
    (m2State().shots[projectId] ?? [])
      .filter((item: any) => item.shotId === shotId)
      .toSorted((a: any, b: any) => b.revisionNo - a.revisionNo),
  );
}

export function patchShot(
  projectId: string,
  shotId: string,
  revisionId: string,
  payload: Record<string, any>,
) {
  const shot = (m2State().shots[projectId] ?? []).find(
    (item: any) => item.id === revisionId && item.shotId === shotId,
  );
  if (!shot) {
    throw new ApiError(404, 'NOT_FOUND', '镜头版本不存在');
  }
  m2AssertVersion(shot, payload.expectedVersion);
  if (shot.reviewStatus === 'APPROVED') {
    throw new ApiError(
      409,
      'STAGE_GUARD_FAILED',
      '已确认镜头不可直接修改，请先派生新草稿',
    );
  }
  const patch = payload.patch ?? {};
  const allowed = [
    'actionDescription',
    'aiPrompt',
    'cameraPlan',
    'characterIds',
    'dialogue',
    'durationMs',
    'evidenceIds',
    'generationMode',
    'musicCue',
    'narration',
    'negativePrompt',
    'onScreenText',
    'productPlacement',
    'riskNotes',
    'sceneDescription',
    'sceneIds',
    'sfx',
    'subtitles',
    'title',
    'transitionIn',
    'transitionOut',
    'transitionOverlapToNextMs',
    'visualStyle',
  ];
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      shot[key] = patch[key];
    }
  }
  if (!Number.isInteger(shot.durationMs) || shot.durationMs <= 0) {
    throw new ApiError(422, 'INVALID_DURATION', '镜头时长必须为正整数毫秒');
  }
  shot.reviewStatus = 'DRAFT';
  shot.version += 1;
  shot.updatedAt = m2Now();
  const storyboard = (m2State().storyboards[projectId] ?? [])[0];
  if (storyboard?.orderedShotRevisionIds.includes(shot.id)) {
    const shots = getShots(projectId, storyboard.id);
    storyboard.totalDurationMs = shots.reduce(
      (sum: number, item: any) =>
        sum + item.durationMs - (item.transitionOverlapToNextMs ?? 0),
      0,
    );
    storyboard.status = 'DRAFT';
    storyboard.version += 1;
  }
  m2InvalidateFrom(projectId, 'STORYBOARD');
  return m2Clone(shot);
}

export function createShotRevision(
  projectId: string,
  shotId: string,
  payload: Record<string, any>,
) {
  const base = (m2State().shots[projectId] ?? []).find(
    (item: any) => item.id === payload.baseRevisionId && item.shotId === shotId,
  );
  if (!base) {
    throw new ApiError(404, 'NOT_FOUND', '基础镜头版本不存在');
  }
  m2AssertVersion(base, payload.expectedVersion);
  const timestamp = m2Now();
  const revision = {
    ...m2Clone(base),
    ...payload.patch,
    approvedAt: undefined,
    approvedBy: undefined,
    createdAt: timestamp,
    id: nextId('shotrevision'),
    parentRevisionId: base.id,
    reviewStatus: 'DRAFT',
    revisionNo: base.revisionNo + 1,
    updatedAt: timestamp,
    version: 1,
  };
  m2List('shots', projectId).push(revision);
  const storyboard = (m2State().storyboards[projectId] ?? [])[0];
  if (storyboard) {
    storyboard.orderedShotRevisionIds = storyboard.orderedShotRevisionIds.map(
      (id: string) => (id === base.id ? revision.id : id),
    );
    storyboard.status = 'DRAFT';
    storyboard.version += 1;
  }
  m2InvalidateFrom(projectId, 'STORYBOARD');
  return m2Clone(revision);
}

function shotApprovalIssue(projectId: string, shot: any) {
  if (!shot) return '镜头不存在';
  if (shot.reviewStatus === 'APPROVED') return null;
  if (!shot.activeReferenceImageId) return '缺少已选参考图';
  if (!Number.isInteger(shot.durationMs) || shot.durationMs <= 0)
    return '时长无效';
  if (!shot.narration && !shot.dialogue) return '缺少旁白或台词';
  const script = getActiveScript(projectId);
  if (!script || script.id !== shot.scriptRevisionId) return '上游剧本已失效';
  return null;
}

export function approveShot(
  projectId: string,
  shotId: string,
  revisionId: string,
  payload: Record<string, any>,
  actor: Actor,
) {
  const shot = (m2State().shots[projectId] ?? []).find(
    (item: any) => item.id === revisionId && item.shotId === shotId,
  );
  if (!shot) {
    throw new ApiError(404, 'NOT_FOUND', '镜头版本不存在');
  }
  m2AssertVersion(shot, payload.expectedVersion);
  const issue = shotApprovalIssue(projectId, shot);
  if (issue) {
    throw new ApiError(422, 'INCOMPLETE_STORYBOARD', issue, { shotId });
  }
  shot.reviewStatus = 'APPROVED';
  shot.approvedAt = m2Now();
  shot.approvedBy = actor.id;
  shot.version += 1;
  shot.updatedAt = m2Now();
  m2InvalidateFrom(projectId, 'STORYBOARD');
  return m2Clone(shot);
}

export function rejectShot(
  projectId: string,
  shotId: string,
  revisionId: string,
  payload: Record<string, any>,
) {
  const shot = (m2State().shots[projectId] ?? []).find(
    (item: any) => item.id === revisionId && item.shotId === shotId,
  );
  if (!shot) {
    throw new ApiError(404, 'NOT_FOUND', '镜头版本不存在');
  }
  m2AssertVersion(shot, payload.expectedVersion);
  shot.reviewStatus = 'NEEDS_CHANGES';
  shot.riskNotes = [
    ...(shot.riskNotes ?? []),
    String(payload.reason ?? '需要修改'),
  ];
  shot.version += 1;
  shot.updatedAt = m2Now();
  return m2Clone(shot);
}

export function batchApproveShots(
  projectId: string,
  payload: Record<string, any>,
  actor: Actor,
) {
  const items = (payload.items ?? []) as Array<{
    expectedVersion: number;
    revisionId: string;
    shotId: string;
  }>;
  if (items.length === 0) {
    throw new ApiError(400, 'INVALID_INPUT', '没有需要确认的镜头');
  }
  const blocked: Array<{ message: string; shotId: string }> = [];
  const resolved: any[] = [];
  for (const item of items) {
    const shot = (m2State().shots[projectId] ?? []).find(
      (candidate: any) =>
        candidate.id === item.revisionId && candidate.shotId === item.shotId,
    );
    if (!shot) {
      blocked.push({ message: '镜头版本不存在', shotId: item.shotId });
      continue;
    }
    if (shot.version !== item.expectedVersion) {
      blocked.push({ message: '镜头版本已变化', shotId: item.shotId });
      continue;
    }
    const issue = shotApprovalIssue(projectId, shot);
    if (issue) {
      blocked.push({ message: issue, shotId: item.shotId });
      continue;
    }
    resolved.push(shot);
  }
  if (blocked.length > 0) {
    throw new ApiError(
      422,
      'INCOMPLETE_STORYBOARD',
      `有 ${blocked.length} 个镜头未通过确认条件`,
      { blocked },
    );
  }
  const timestamp = m2Now();
  for (const shot of resolved) {
    shot.reviewStatus = 'APPROVED';
    shot.approvedAt = timestamp;
    shot.approvedBy = actor.id;
    shot.version += 1;
    shot.updatedAt = timestamp;
  }
  m2InvalidateFrom(projectId, 'STORYBOARD');
  return { approved: resolved.map((shot) => m2Clone(shot)) };
}

export function reorderShots(projectId: string, payload: Record<string, any>) {
  const storyboard = (m2State().storyboards[projectId] ?? [])[0];
  if (!storyboard) {
    throw new ApiError(404, 'NOT_FOUND', '分镜版本不存在');
  }
  m2AssertVersion(storyboard, payload.expectedStoryboardVersion);
  const ordered = (payload.orderedShotIds ?? []) as string[];
  const shots = m2State().shots[projectId] ?? [];
  const currentRevisions = storyboard.orderedShotRevisionIds
    .map((id: string) => shots.find((item: any) => item.id === id))
    .filter(Boolean);
  if (
    ordered.length !== currentRevisions.length ||
    new Set(ordered).size !== ordered.length
  ) {
    throw new ApiError(
      422,
      'INVALID_INPUT',
      '排序集合必须与原镜头集合完全一致',
    );
  }
  const byShotId = new Map<string, any>();
  for (const shot of currentRevisions) byShotId.set(shot.shotId, shot);
  const desired = ordered.map((shotId) => {
    const shot = byShotId.get(shotId);
    if (!shot) {
      throw new ApiError(422, 'INVALID_INPUT', `镜头 ${shotId} 不属于当前分镜`);
    }
    return shot;
  });
  for (const [index, shot] of desired.entries()) {
    const original = currentRevisions[index];
    if (original && shot.storyBeatId !== original.storyBeatId) {
      throw new ApiError(
        422,
        'STORYBOARD_REORDER_BEAT_CONFLICT',
        '本期只允许在同一故事节拍内调整顺序；跨 Beat 请先修改剧本',
      );
    }
  }
  for (let index = 0; index < desired.length - 1; index += 1) {
    const current = desired[index];
    const next = desired[index + 1];
    const overlap = current.transitionOverlapToNextMs ?? 0;
    if (overlap > current.durationMs || overlap > next.durationMs) {
      throw new ApiError(
        422,
        'STORYBOARD_REORDER_INVALID_TRANSITION',
        `镜头 ${current.order} 与下一镜的转场重叠不合法`,
      );
    }
  }
  const unchanged = desired.every((shot, index) => shot.order === index + 1);
  if (unchanged) {
    return m2Clone(storyboard);
  }
  const timestamp = m2Now();
  const nextRevisionIds = desired.map((shot, index) => {
    if (shot.order === index + 1) return shot.id;
    const revisionId = nextId('shotrevision');
    const cloneShot = {
      ...m2Clone(shot),
      approvedAt: undefined,
      approvedBy: undefined,
      createdAt: timestamp,
      id: revisionId,
      order: index + 1,
      parentRevisionId: shot.id,
      reviewStatus: 'DRAFT',
      revisionNo: (shot.revisionNo ?? 1) + 1,
      updatedAt: timestamp,
      version: 1,
    };
    shots.push(cloneShot);
    return revisionId;
  });
  const newStoryboard = {
    ...m2Clone(storyboard),
    approvedAt: undefined,
    approvedBy: undefined,
    createdAt: timestamp,
    id: nextId('storyboard'),
    orderedShotRevisionIds: nextRevisionIds,
    parentRevisionId: storyboard.id,
    revisionNo: (storyboard.revisionNo ?? 1) + 1,
    status: 'DRAFT',
    updatedAt: timestamp,
    version: 1,
  };
  m2List('storyboards', projectId).unshift(newStoryboard);
  m2InvalidateFrom(projectId, 'STORYBOARD');
  return m2Clone(newStoryboard);
}

export function addShot(projectId: string, _payload: Record<string, any>) {
  const storyboard = (m2State().storyboards[projectId] ?? [])[0];
  if (!storyboard) {
    throw new ApiError(404, 'NOT_FOUND', '分镜版本不存在');
  }
  const timestamp = m2Now();
  const count = (m2State().shots[projectId] ?? []).length;
  const shotId = `${projectId}_shot_${String(count + 1).padStart(2, '0')}`;
  const revisionId = `${shotId}_r1`;
  const imageId = `image_${shotId}_v1`;
  const bible =
    getActiveVisualBible(projectId) ??
    (m2State().visualBibles[projectId] ?? [])[0];
  m2List('images', projectId).push({
    aspectRatio: getProjectOrThrow(projectId).aspectRatio,
    height: 1280,
    id: imageId,
    mimeType: 'image/svg+xml',
    mockUrl: shotImageUrl(projectId, count % 15),
    promptSnapshot: '新增镜头示意图',
    shotId,
    sourceType: 'mock_generated',
    status: 'READY',
    versionNo: 1,
    visualBibleVersionId: bible?.id ?? '',
    width: 720,
  });
  const shot = {
    actionDescription: '新增镜头的动作描述（待编辑）',
    activeReferenceImageId: imageId,
    aiPrompt: '',
    cameraPlan: '中景，固定机位',
    characterIds: [],
    createdAt: timestamp,
    dialogue: '',
    durationMs: 5000,
    evidenceIds: [],
    generationMode: 'image_animation',
    id: revisionId,
    musicCue: '',
    narration: '新增镜头旁白（待编辑）',
    narrativePurpose: 'OTHER',
    negativePrompt: '',
    onScreenText: [],
    order: storyboard.orderedShotRevisionIds.length + 1,
    projectId,
    referenceImageVersionIds: [imageId],
    reviewStatus: 'DRAFT',
    revisionNo: 1,
    riskNotes: [],
    sceneDescription: '新增场景（待编辑）',
    sceneIds: [],
    scriptRevisionId: storyboard.scriptRevisionId,
    sfx: [],
    shotId,
    storyBeatId: getActiveScript(projectId)?.beats?.[0]?.id ?? '',
    subtitles: [],
    title: '新增镜头',
    transitionIn: '硬切',
    transitionOut: '硬切',
    transitionOverlapToNextMs: 0,
    updatedAt: timestamp,
    version: 1,
    visualBibleVersionId: bible?.id ?? '',
    visualStyle: '3D 卡通',
  };
  m2List('shots', projectId).push(shot);
  storyboard.orderedShotRevisionIds.push(revisionId);
  storyboard.status = 'DRAFT';
  storyboard.version += 1;
  return m2Clone(shot);
}

export function deleteShot(projectId: string, shotId: string) {
  const storyboard = (m2State().storyboards[projectId] ?? [])[0];
  if (!storyboard) {
    throw new ApiError(404, 'NOT_FOUND', '分镜版本不存在');
  }
  const target = (m2State().shots[projectId] ?? []).find(
    (item: any) =>
      item.shotId === shotId &&
      storyboard.orderedShotRevisionIds.includes(item.id),
  );
  if (!target) {
    throw new ApiError(404, 'NOT_FOUND', '镜头不存在');
  }
  storyboard.orderedShotRevisionIds = storyboard.orderedShotRevisionIds.filter(
    (id: string) => id !== target.id,
  );
  storyboard.status = 'DRAFT';
  storyboard.version += 1;
  storyboard.updatedAt = m2Now();
  m2InvalidateFrom(projectId, 'STORYBOARD');
  return { deletedShotId: shotId };
}

export function startReferenceImageGeneration(
  projectId: string,
  shotId: string,
  payload: Record<string, any>,
) {
  const shot = getShot(projectId, shotId);
  advanceProjectJobs(projectId);
  const job = createJob(
    projectId,
    'GENERATE_REFERENCE_IMAGE',
    String(payload.scenario ?? 'NORMAL'),
    { revisionId: shot.id, shotId },
  );
  return { jobId: job.id };
}

function applyReferenceImageJob(job: Job) {
  const project = getProjectOrThrow(job.projectId);
  const shot = (m2State().shots[job.projectId] ?? []).find(
    (item: any) => item.id === job.payload?.revisionId,
  );
  if (!shot) {
    throw new ApiError(404, 'NOT_FOUND', '镜头版本不存在');
  }
  const images = m2State().images[job.projectId] ?? [];
  const versions = images.filter((item: any) => item.shotId === shot.shotId);
  const versionNo =
    Math.max(0, ...versions.map((item: any) => item.versionNo)) + 1;
  const index = Number(String(shot.shotId).split('_').pop() ?? 1) - 1;
  const image = {
    aspectRatio: project.aspectRatio,
    height: 1280,
    id: nextId('image'),
    mimeType: 'image/svg+xml',
    mockUrl: `${shotImageUrl(project.id, Math.max(0, index))}?v=${versionNo}`,
    promptSnapshot: `根据镜头 ${shot.order} 重新构图（Mock 候选）`,
    shotId: shot.shotId,
    sourceType: 'mock_generated',
    status: 'READY',
    versionNo,
    visualBibleVersionId: shot.visualBibleVersionId,
    width: 720,
  };
  images.push(image);
  shot.referenceImageVersionIds = [
    ...(shot.referenceImageVersionIds ?? []),
    image.id,
  ];
  shot.version += 1;
  shot.updatedAt = m2Now();
  job.resultRefId = image.id;
}

export function selectReferenceImage(
  projectId: string,
  shotId: string,
  imageId: string,
  payload: Record<string, any>,
) {
  const shot = (m2State().shots[projectId] ?? []).find(
    (item: any) => item.id === payload.revisionId && item.shotId === shotId,
  );
  if (!shot) {
    throw new ApiError(404, 'NOT_FOUND', '镜头版本不存在');
  }
  m2AssertVersion(shot, payload.expectedVersion);
  if (!shot.referenceImageVersionIds.includes(imageId)) {
    throw new ApiError(400, 'INVALID_INPUT', '图片不属于该镜头');
  }
  if (shot.reviewStatus === 'APPROVED') {
    const timestamp = m2Now();
    const revision = {
      ...m2Clone(shot),
      activeReferenceImageId: imageId,
      approvedAt: undefined,
      approvedBy: undefined,
      createdAt: timestamp,
      id: nextId('shotrevision'),
      parentRevisionId: shot.id,
      reviewStatus: 'DRAFT',
      revisionNo: shot.revisionNo + 1,
      updatedAt: timestamp,
      version: 1,
    };
    m2List('shots', projectId).push(revision);
    const storyboard = (m2State().storyboards[projectId] ?? [])[0];
    if (storyboard) {
      storyboard.orderedShotRevisionIds = storyboard.orderedShotRevisionIds.map(
        (id: string) => (id === shot.id ? revision.id : id),
      );
      storyboard.status = 'DRAFT';
      storyboard.version += 1;
    }
    m2InvalidateFrom(projectId, 'STORYBOARD');
    return m2Clone(revision);
  }
  shot.activeReferenceImageId = imageId;
  shot.reviewStatus = 'DRAFT';
  shot.version += 1;
  shot.updatedAt = m2Now();
  m2InvalidateFrom(projectId, 'STORYBOARD');
  return m2Clone(shot);
}

export function approveStoryboard(
  projectId: string,
  revisionId: string,
  payload: Record<string, any>,
  actor: Actor,
) {
  const storyboard = (m2State().storyboards[projectId] ?? []).find(
    (item: any) => item.id === revisionId,
  );
  if (!storyboard) {
    throw new ApiError(404, 'NOT_FOUND', '分镜版本不存在');
  }
  m2AssertVersion(storyboard, payload.expectedVersion);
  const shots = getShots(projectId, storyboard.id);
  const blocked = shots
    .filter((shot: any) => shot.reviewStatus !== 'APPROVED')
    .map((shot: any) => ({
      message: '镜头尚未确认',
      shotId: shot.shotId,
    }));
  if (blocked.length > 0) {
    throw new ApiError(
      422,
      'INCOMPLETE_STORYBOARD',
      `还有 ${blocked.length} 个镜头未确认`,
      { blocked },
    );
  }
  const total = shots.reduce(
    (sum: number, shot: any) =>
      sum + shot.durationMs - (shot.transitionOverlapToNextMs ?? 0),
    0,
  );
  const script = getActiveScript(projectId);
  if (script && Math.abs(total - script.targetDurationMs) > 2000) {
    throw new ApiError(
      422,
      'INVALID_DURATION',
      `分镜净时长与剧本目标相差超过 2 秒`,
      { netDurationMs: total, targetDurationMs: script.targetDurationMs },
    );
  }
  storyboard.status = 'APPROVED';
  storyboard.totalDurationMs = total;
  storyboard.approvedAt = m2Now();
  storyboard.approvedBy = actor.id;
  storyboard.version += 1;
  storyboard.updatedAt = m2Now();
  m2Touch(projectId, 'ANIMATIC');
  return m2Clone(storyboard);
}

export function startAnimaticBuild(
  projectId: string,
  payload: Record<string, any>,
) {
  const storyboards = m2State().storyboards[projectId] ?? [];
  const storyboard =
    storyboards.find((item: any) => item.id === payload.storyboardRevisionId) ??
    storyboards[0];
  if (!storyboard || storyboard.status !== 'APPROVED') {
    throw new ApiError(
      409,
      'STAGE_GUARD_FAILED',
      '请先确认整套分镜，再生成预演',
      { target: '/storyboard' },
    );
  }
  const shots = getShots(projectId, storyboard.id);
  const blocked = shots
    .filter((shot: any) => shot.reviewStatus !== 'APPROVED')
    .map((shot: any) => ({
      message: '镜头尚未确认',
      shotId: shot.shotId,
    }));
  if (blocked.length > 0) {
    throw new ApiError(
      422,
      'INCOMPLETE_STORYBOARD',
      `还有 ${blocked.length} 个镜头未确认`,
      { blocked },
    );
  }
  advanceProjectJobs(projectId);
  const job = createJob(
    projectId,
    'BUILD_ANIMATIC',
    String(payload.scenario ?? 'NORMAL'),
    {
      storyboardRevisionId: storyboard.id,
      visualBibleVersionId: storyboard.visualBibleVersionId,
    },
  );
  return { jobId: job.id };
}

function applyAnimaticJob(job: Job) {
  const project = getProjectOrThrow(job.projectId);
  const storyboard = (m2State().storyboards[job.projectId] ?? []).find(
    (item: any) => item.id === job.payload?.storyboardRevisionId,
  );
  if (!storyboard) {
    throw new ApiError(409, 'STAGE_GUARD_FAILED', '分镜版本已失效');
  }
  const shots = getShots(job.projectId, storyboard.id);
  const snapshots = m2List('animatics', job.projectId);
  const timestamp = m2Now();
  const selected = shots
    .map((shot: any) => shot.activeReferenceImageId)
    .filter(Boolean);
  const total = shots.reduce(
    (sum: number, shot: any) =>
      sum + shot.durationMs - (shot.transitionOverlapToNextMs ?? 0),
    0,
  );
  const snapshot = {
    approvedAt: undefined,
    approvedBy: undefined,
    comments: [],
    createdAt: timestamp,
    id: nextId('animatic'),
    orderedShotRevisionIds: storyboard.orderedShotRevisionIds,
    projectId: project.id,
    scriptRevisionId: storyboard.scriptRevisionId,
    selectedReferenceImageVersionIds: selected,
    status: 'DRAFT',
    storyboardRevisionId: storyboard.id,
    totalDurationMs: total,
    updatedAt: timestamp,
    version: 1,
    visualBibleVersionId: storyboard.visualBibleVersionId,
  };
  snapshots.unshift(snapshot);
  m2Touch(project.id, 'ANIMATIC');
  job.resultRefId = snapshot.id;
}

export function getAnimaticState(projectId: string) {
  getProjectOrThrow(projectId);
  advanceProjectJobs(projectId);
  const snapshots = m2Clone(m2State().animatics[projectId] ?? []);
  const latest = snapshots[0] ?? null;
  const active =
    snapshots.find((item: any) => item.status === 'APPROVED') ?? null;
  const storyboard =
    (m2State().storyboards[projectId] ?? []).find(
      (item: any) => item.id === latest?.storyboardRevisionId,
    ) ?? (m2State().storyboards[projectId] ?? [])[0];
  const allShots = m2State().shots[projectId] ?? [];
  let shots: any[] = [];
  if (latest) {
    shots = m2Clone(
      latest.orderedShotRevisionIds
        .map((id: string) => allShots.find((item: any) => item.id === id))
        .filter(Boolean),
    );
  } else if (storyboard) {
    shots = getShots(projectId, storyboard.id);
  }
  const images = m2Clone(m2State().images[projectId] ?? []);
  return {
    active: active ? m2Clone(active) : null,
    images,
    latest: latest ? m2Clone(latest) : null,
    shots,
    snapshots,
    storyboard: storyboard ? m2Clone(storyboard) : null,
  };
}

export function commentAnimatic(
  projectId: string,
  snapshotId: string,
  payload: Record<string, any>,
  actor: Actor,
) {
  const snapshot = (m2State().animatics[projectId] ?? []).find(
    (item: any) => item.id === snapshotId,
  );
  if (!snapshot) {
    throw new ApiError(404, 'NOT_FOUND', '预演快照不存在');
  }
  if (snapshot.status === 'APPROVED') {
    throw new ApiError(409, 'STAGE_GUARD_FAILED', '已确认预演不可追加反馈');
  }
  const text = String(payload.text ?? '').trim();
  if (!text) {
    throw new ApiError(400, 'INVALID_INPUT', '反馈内容不能为空');
  }
  snapshot.comments ??= [];
  snapshot.comments.push({
    atMs: Number(payload.atMs ?? 0),
    authorId: actor.id,
    createdAt: m2Now(),
    id: nextId('comment'),
    shotId: String(payload.shotId ?? ''),
    text,
  });
  snapshot.version += 1;
  snapshot.updatedAt = m2Now();
  return m2Clone(snapshot);
}

export function approveAnimatic(
  projectId: string,
  snapshotId: string,
  payload: Record<string, any>,
  actor: Actor,
) {
  const snapshot = (m2State().animatics[projectId] ?? []).find(
    (item: any) => item.id === snapshotId,
  );
  if (!snapshot) {
    throw new ApiError(404, 'NOT_FOUND', '预演快照不存在');
  }
  m2AssertVersion(snapshot, payload.expectedVersion);
  if (snapshot.status === 'STALE') {
    throw new ApiError(409, 'UPSTREAM_STALE', '预演已过期，请重新生成');
  }
  const timestamp = m2Now();
  for (const item of m2State().animatics[projectId] ?? []) {
    if (item.id !== snapshot.id && item.status === 'APPROVED') {
      item.status = 'STALE';
    }
  }
  snapshot.status = 'APPROVED';
  snapshot.approvedAt = timestamp;
  snapshot.approvedBy = actor.id;
  snapshot.version += 1;
  snapshot.updatedAt = timestamp;
  m2Touch(projectId, 'GENERATE');
  return m2Clone(snapshot);
}

export function rejectAnimatic(
  projectId: string,
  snapshotId: string,
  payload: Record<string, any>,
) {
  const snapshot = (m2State().animatics[projectId] ?? []).find(
    (item: any) => item.id === snapshotId,
  );
  if (!snapshot) {
    throw new ApiError(404, 'NOT_FOUND', '预演快照不存在');
  }
  m2AssertVersion(snapshot, payload.expectedVersion);
  snapshot.status = 'STALE';
  snapshot.reviewerNotes = String(payload.reason ?? '需要修改');
  snapshot.version += 1;
  snapshot.updatedAt = m2Now();
  return m2Clone(snapshot);
}

export function getM2Handoff(projectId: string) {
  getProjectOrThrow(projectId);
  const snapshot = (m2State().animatics[projectId] ?? [])
    .filter((item: any) => item.status === 'APPROVED')
    .toSorted((a: any, b: any) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!snapshot) {
    return null;
  }
  const storyboard = (m2State().storyboards[projectId] ?? []).find(
    (item: any) => item.id === snapshot.storyboardRevisionId,
  );
  const script = (m2State().scripts[projectId] ?? []).find(
    (item: any) => item.id === snapshot.scriptRevisionId,
  );
  const bible = (m2State().visualBibles[projectId] ?? []).find(
    (item: any) => item.id === snapshot.visualBibleVersionId,
  );
  const brief = (m2State().briefs[projectId] ?? []).find(
    (item: any) => item.status === 'APPROVED',
  );
  const concept = (m2State().concepts[projectId] ?? []).find(
    (item: any) => item.status === 'APPROVED',
  );
  if (!storyboard || !script || !bible || !brief || !concept) {
    return null;
  }
  const project = getProjectOrThrow(projectId);
  const shots = getShots(projectId, storyboard.id);
  const readiness = getProductionReadiness(projectId);
  const understandingRevisionId = brief.understandingRevisionId;
  return {
    canEnterM3: readiness.canEnterM3,
    claimReadiness: understandingRevisionId
      ? listClaimReadiness(projectId, understandingRevisionId)
      : [],
    effectiveValidity: readiness.effectiveValidity,
    generationSpecs: getGenerationSpecs(projectId),
    m3BlockingItems: readiness.items.filter(
      (item) => item.status === 'BLOCKED',
    ),
    productionReadiness: readiness,
    approvedAnimaticSnapshotId: snapshot.id,
    approvedConceptRevisionId: concept.id,
    approvedCreativeBriefId: brief.id,
    approvedScriptRevisionId: script.id,
    approvedStoryboardRevisionId: storyboard.id,
    approvedVisualBibleVersionId: bible.id,
    aspectRatio: project.aspectRatio,
    language: project.language,
    mockOnly: true,
    orderedApprovedShotRevisionIds: shots.map((shot: any) => shot.id),
    platform: project.platform,
    projectId,
    targetDurationMs: snapshot.totalDurationMs,
    timelineVersion: snapshot.version,
    understandingRevisionId: brief.understandingRevisionId,
  };
}

export function getStaleImpact(projectId: string) {
  getProjectOrThrow(projectId);
  advanceProjectJobs(projectId);
  const m2 = m2State();
  const allUnderstanding = projectRevisions(projectId).toSorted(
    (a, b) => b.revisionNo - a.revisionNo,
  );
  const staleUnderstanding = allUnderstanding.some(
    (item) => item.status === 'STALE',
  );
  const understanding = allUnderstanding[0] ?? null;
  const items: Array<{
    id: string;
    link: string;
    reason: string;
    stage: string;
    title: string;
    type: string;
    updatedAt?: string;
    version?: number;
  }> = [];
  const add = (
    type: string,
    stage: string,
    link: string,
    list: any[],
    label: (item: any) => string,
  ) => {
    for (const item of list ?? []) {
      if (item.status === 'STALE' || item.reviewStatus === 'STALE') {
        items.push({
          id: item.id,
          link,
          reason: staleUnderstanding
            ? 'M1 资料或产品理解已变化，该产物需要重新复核'
            : '上游版本已变化，需复核后再用于 M3',
          stage,
          title: label(item),
          type,
          updatedAt: item.updatedAt,
          version: item.version,
        });
      }
    }
  };
  add(
    'ANGLE_SET',
    '创意方向',
    `/studio/${projectId}/angles`,
    m2.angleSets[projectId] ?? [],
    (item) => `切口候选集 R${item.revisionNo}`,
  );
  add(
    'BRIEF',
    '创意方向',
    `/studio/${projectId}/angles`,
    m2.briefs[projectId] ?? [],
    () => '创意 Brief',
  );
  add(
    'CONCEPT',
    '创意故事',
    `/studio/${projectId}/concepts`,
    m2.concepts[projectId] ?? [],
    (item) => `创意 ${item.title}`,
  );
  add(
    'SCRIPT',
    '剧本',
    `/studio/${projectId}/script`,
    m2.scripts[projectId] ?? [],
    (item) => `剧本 R${item.revisionNo}`,
  );
  add(
    'VISUAL_BIBLE',
    '视觉规范',
    `/studio/${projectId}/storyboard`,
    m2.visualBibles[projectId] ?? [],
    (item) => `视觉规范 R${item.revisionNo}`,
  );
  add(
    'STORYBOARD',
    '分镜',
    `/studio/${projectId}/storyboard`,
    m2.storyboards[projectId] ?? [],
    (item) => `分镜 R${item.revisionNo}`,
  );
  add(
    'ANIMATIC',
    '预演',
    `/studio/${projectId}/animatic`,
    m2.animatics[projectId] ?? [],
    (item) => `预演快照 ${item.id}`,
  );
  const shotLinks = m2.shots[projectId] ?? [];
  for (const shot of shotLinks) {
    if (
      shot.reviewStatus === 'STALE' ||
      shot.reviewStatus === 'NEEDS_CHANGES'
    ) {
      items.push({
        id: shot.id,
        link: `/studio/${projectId}/storyboard`,
        reason: '全局角色/场景或上游剧本变化，镜头需复核',
        stage: '分镜',
        title: `镜头 ${shot.order} · ${shot.title}`,
        type: 'SHOT',
        updatedAt: shot.updatedAt,
        version: shot.version,
      });
    }
  }
  return {
    items,
    projectId,
    summary:
      items.length > 0
        ? `${items.length} 个 M2 产物需要复核；旧已批准版本仍可只读查看，但不能再作为 M3 最新输入。`
        : '当前没有需要复核的 M2 产物。',
    total: items.length,
    understanding: understanding
      ? {
          id: understanding.id,
          revisionNo: understanding.revisionNo,
          status: understanding.status,
        }
      : null,
  };
}

export function listDirectorMessages(
  projectId: string,
  scope?: string,
  targetId?: string,
) {
  getProjectOrThrow(projectId);
  return m2Clone(
    (m2State().messages[projectId] ?? []).filter(
      (item: any) =>
        (!scope || item.scope === scope) &&
        (!targetId || item.targetId === targetId),
    ),
  );
}

function classifyIntent(message: string): string {
  if (/机器人|换人|角色/.test(message)) return 'GLOBAL_CHARACTER';
  if (/秒|时长|快一点|慢一点/.test(message)) return 'TIMELINE';
  if (/炸|碎|先.*再|动作|出现/.test(message)) return 'MOTION_ACTION';
  if (/广告|宣传|生硬|旁白|台词/.test(message)) return 'SCRIPT_TEXT';
  if (/运镜|镜头|推|拉/.test(message)) return 'CAMERA_MOTION';
  if (/竖屏|横屏|画幅/.test(message)) return 'ASPECT_RATIO';
  if (/搞笑|幽默|反转/.test(message)) return 'STORY_DIRECTION';
  return 'OTHER';
}

export function createDirectionPlan(
  projectId: string,
  payload: Record<string, any>,
  _actor: Actor,
) {
  getProjectOrThrow(projectId);
  const scope = String(payload.scope ?? 'SHOT') as any;
  const targetId = String(payload.targetId ?? '');
  const userMessage = String(payload.userMessage ?? '');
  const intent = classifyIntent(userMessage);
  const operations: any[] = [];
  const impactedShotIds: string[] = [];
  let durationDeltaMs = 0;
  let shot: any = null;
  switch (scope) {
    case 'BEAT': {
      const script = getActiveScript(projectId);
      const beat = script?.beats?.find((item: any) => item.id === targetId);
      if (beat) {
        operations.push({
          after: `${beat.plot}（增加一个反转）`,
          before: beat.plot,
          fieldPath: 'plot',
          operation: 'replace',
        });
      }

      break;
    }
    case 'CONCEPT': {
      const concept = getConcept(projectId, targetId);
      operations.push({
        after: concept.logline.replaceAll('。', '，并留下一个反转。'),
        before: concept.logline,
        fieldPath: 'logline',
        operation: 'replace',
      });

      break;
    }
    case 'SHOT': {
      shot = getShot(projectId, targetId);
      impactedShotIds.push(shot.shotId);
      switch (intent) {
        case 'GLOBAL_CHARACTER': {
          const bible =
            getActiveVisualBible(projectId) ??
            (m2State().visualBibles[projectId] ?? [])[0];
          const character = bible?.characters?.[0];
          if (character) {
            operations.push({
              after: `${character.look}（机器人化改造，待确认）`,
              before: character.look,
              fieldPath: `characters.${character.id}.look`,
              operation: 'replace',
            });
          }
          const shots = getShots(projectId);
          for (const item of shots) {
            if ((item.characterIds ?? []).includes(character?.id)) {
              impactedShotIds.push(item.shotId);
            }
          }

          break;
        }
        case 'MOTION_ACTION': {
          operations.push({
            after: `${shot.actionDescription}；按用户要求调整先后动作：先破碎纸张，再出现人物`,
            before: shot.actionDescription,
            fieldPath: 'actionDescription',
            operation: 'replace',
          });
          const shots = getShots(projectId);
          const currentIndex = shots.findIndex(
            (item: any) => item.shotId === shot.shotId,
          );
          if (shots[currentIndex + 1]) {
            impactedShotIds.push(shots[currentIndex + 1].shotId);
          }

          break;
        }
        case 'SCRIPT_TEXT': {
          operations.push({
            after: `${shot.narration}（更克制的表达）`,
            before: shot.narration,
            fieldPath: 'narration',
            operation: 'replace',
          });

          break;
        }
        case 'TIMELINE': {
          const match = userMessage.match(/(\d+)\s*秒/);
          durationDeltaMs = match ? Number(match[1]) * 1000 : 5000;
          operations.push({
            after: shot.durationMs + durationDeltaMs,
            before: shot.durationMs,
            fieldPath: 'durationMs',
            operation: 'replace',
          });

          break;
        }
        default: {
          operations.push({
            after: `${shot.title}（按反馈调整）`,
            before: shot.title,
            fieldPath: 'title',
            operation: 'replace',
          });
        }
      }

      break;
    }
    // No default
  }
  const timestamp = m2Now();
  let invalidatedStageNames = ['预演'];
  if (intent === 'GLOBAL_CHARACTER') {
    invalidatedStageNames = ['分镜', '预演'];
  } else if (scope === 'CONCEPT') {
    invalidatedStageNames = ['剧本', '分镜', '预演'];
  }
  const messageScope = scope === 'VISUAL_BIBLE' ? 'VISUAL_BIBLE' : scope;
  let messageStage = 'STORYBOARD';
  if (scope === 'BEAT') {
    messageStage = 'SCRIPT';
  } else if (scope === 'CONCEPT') {
    messageStage = 'ANGLES';
  }
  const activeBible =
    getActiveVisualBible(projectId) ??
    (m2State().visualBibles[projectId] ?? [])[0];
  const activeAnimatic = (m2State().animatics[projectId] ?? []).find(
    (item: any) => item.status === 'APPROVED',
  );
  const globalCharacter = activeBible?.characters?.[0];
  const changeCategory =
    intent === 'GLOBAL_CHARACTER'
      ? 'CHARACTER_GLOBAL'
      : scope === 'CONCEPT'
        ? 'CREATIVE_DIRECTION'
        : scope === 'VISUAL_BIBLE'
          ? 'LOCAL_VISUAL'
          : intent === 'SCRIPT_TEXT'
            ? 'LOCAL_TEXT'
            : 'LOCAL_VISUAL';
  const suggestedActions =
    intent === 'GLOBAL_CHARACTER'
      ? ['REGENERATE_IMAGE', 'REVIEW_ONLY']
      : intent === 'SCRIPT_TEXT'
        ? ['EDIT_PROMPT', 'REVIEW_ONLY']
        : ['REVIEW_ONLY'];
  const estimatedFutureCostImpact =
    intent === 'GLOBAL_CHARACTER'
      ? 'HIGH'
      : ['MOTION_ACTION', 'REFERENCE_IMAGE'].includes(intent)
        ? 'MEDIUM'
        : 'LOW';
  const plan = {
    affectedAssetIds:
      intent === 'GLOBAL_CHARACTER'
        ? (globalCharacter?.imageAssetIds ?? [])
        : [],
    affectedReviewSnapshotIds: activeAnimatic ? [activeAnimatic.id] : [],
    affectedShotIds: impactedShotIds,
    changeCategory,
    createdAt: timestamp,
    durationDeltaMs,
    estimatedFutureCostImpact,
    id: nextId('changeplan'),
    impactedShotIds,
    intent,
    invalidatedStageNames,
    mockReasoningSummary: `Mock 规则识别为 ${intent}；按${scope}范围生成变更计划，不调用真实模型。`,
    operations,
    projectId,
    risks:
      intent === 'GLOBAL_CHARACTER'
        ? ['角色设定变化可能影响多个镜头', 'M3 未来可能需要重新生成相关镜头']
        : ['修改前请确认不影响已批准版本'],
    scope,
    staleReasons: invalidatedStageNames,
    state: 'PROPOSED',
    suggestedActions,
    targetId,
    updatedAt: timestamp,
    userMessage,
    version: 1,
  };
  m2List('changePlans', projectId).unshift(plan);
  const messages = m2List('messages', projectId);
  messages.push(
    {
      content: userMessage,
      createdAt: timestamp,
      id: nextId('message'),
      mocked: true,
      projectId,
      role: 'user',
      scope: messageScope,
      stage: messageStage,
      targetId,
    },
    {
      changePlanId: plan.id,
      content: plan.mockReasoningSummary,
      createdAt: timestamp,
      id: nextId('message'),
      mocked: true,
      projectId,
      role: 'assistant',
      scope: messageScope,
      stage: messageStage,
      targetId,
    },
  );
  return m2Clone(plan);
}

export function getDirectionPlan(projectId: string, planId: string) {
  const plan = (m2State().changePlans[projectId] ?? []).find(
    (item: any) => item.id === planId,
  );
  if (!plan) {
    throw new ApiError(404, 'NOT_FOUND', '变更计划不存在');
  }
  return m2Clone(plan);
}

export function applyDirectionPlan(
  projectId: string,
  planId: string,
  _payload: Record<string, any>,
  _actor: Actor,
) {
  const plan = (m2State().changePlans[projectId] ?? []).find(
    (item: any) => item.id === planId,
  );
  if (!plan) {
    throw new ApiError(404, 'NOT_FOUND', '变更计划不存在');
  }
  if (plan.state !== 'PROPOSED') {
    throw new ApiError(409, 'STAGE_GUARD_FAILED', '变更计划已处理');
  }
  let updated: any = null;
  switch (plan.scope) {
    case 'BEAT': {
      const script = getActiveScript(projectId);
      if (script) {
        const beats = m2Clone(script.beats).map((beat: any) => {
          if (beat.id !== plan.targetId) return beat;
          const copy = { ...beat };
          for (const operation of plan.operations) {
            copy.plot = operation.after;
          }
          return copy;
        });
        updated = patchScript(projectId, script.id, {
          expectedVersion: script.version,
          patch: { beats },
        });
      }

      break;
    }
    case 'CONCEPT': {
      const concept = getConcept(projectId, plan.targetId);
      updated = patchConcept(projectId, concept.id, {
        expectedVersion: concept.version,
        patch: { logline: plan.operations[0]?.after ?? concept.logline },
      });

      break;
    }
    case 'SHOT': {
      const shot = getShot(projectId, plan.targetId);
      if (plan.intent === 'GLOBAL_CHARACTER') {
        const bible =
          getActiveVisualBible(projectId) ??
          (m2State().visualBibles[projectId] ?? [])[0];
        const character = bible?.characters?.[0];
        if (bible && character) {
          const fork = forkVisualBible(projectId, bible.id);
          patchVisualBible(projectId, fork.id, {
            expectedVersion: fork.version,
            patch: {
              characters: bible.characters.map((item: any) =>
                item.id === character.id
                  ? { ...item, look: `${item.look}（机器人化，待复核）` }
                  : item,
              ),
            },
          });
          const affected = getShots(projectId).filter((item: any) =>
            (item.characterIds ?? []).includes(character.id),
          );
          for (const item of affected) {
            const latest = getShot(projectId, item.shotId);
            if (latest.reviewStatus !== 'DRAFT') {
              createShotRevision(projectId, latest.shotId, {
                baseRevisionId: latest.id,
                expectedVersion: latest.version,
                patch: {},
              });
            }
          }
          updated = getShot(projectId, shot.shotId);
        }
        break;
      }
      updated =
        shot.reviewStatus === 'APPROVED'
          ? createShotRevision(projectId, shot.shotId, {
              baseRevisionId: shot.id,
              expectedVersion: shot.version,
              patch: Object.fromEntries(
                plan.operations.map((operation: any) => [
                  operation.fieldPath,
                  operation.after,
                ]),
              ),
            })
          : patchShot(projectId, shot.shotId, shot.id, {
              expectedVersion: shot.version,
              patch: Object.fromEntries(
                plan.operations.map((operation: any) => [
                  operation.fieldPath,
                  operation.after,
                ]),
              ),
            });

      break;
    }
    case 'VISUAL_BIBLE': {
      const bible =
        getActiveVisualBible(projectId) ??
        (m2State().visualBibles[projectId] ?? [])[0];
      if (bible) {
        const characters = m2Clone(bible.characters).map((character: any) => ({
          ...character,
          look:
            plan.operations.find((operation: any) =>
              operation.fieldPath.includes(character.id),
            )?.after ?? character.look,
        }));
        updated = patchVisualBible(projectId, bible.id, {
          expectedVersion: bible.version,
          patch: { characters },
        });
      }

      break;
    }
    // No default
  }
  plan.state = 'APPLIED';
  plan.version += 1;
  plan.updatedAt = m2Now();
  m2InvalidateFrom(projectId, 'STORYBOARD');
  return { plan: m2Clone(plan), updated };
}

export function discardDirectionPlan(
  projectId: string,
  planId: string,
  payload: Record<string, any>,
) {
  const plan = (m2State().changePlans[projectId] ?? []).find(
    (item: any) => item.id === planId,
  );
  if (!plan) {
    throw new ApiError(404, 'NOT_FOUND', '变更计划不存在');
  }
  m2AssertVersion(plan, payload.expectedVersion);
  plan.state = 'DISCARDED';
  plan.version += 1;
  plan.updatedAt = m2Now();
  return m2Clone(plan);
}

function applyM2Job(job: Job) {
  switch (job.kind) {
    case 'BUILD_ANIMATIC': {
      applyAnimaticJob(job);
      break;
    }
    case 'DISCOVER_ANGLES': {
      applyAngleJob(job);
      break;
    }
    case 'GENERATE_CONCEPTS': {
      applyConceptJob(job);
      break;
    }
    case 'GENERATE_REFERENCE_IMAGE': {
      applyReferenceImageJob(job);
      break;
    }
    case 'GENERATE_SCRIPT': {
      applyScriptJob(job);
      break;
    }
    case 'GENERATE_STORYBOARD': {
      applyStoryboardJob(job);
      break;
    }
    case 'GENERATE_VISUAL_BIBLE': {
      applyVisualBibleJob(job);
      break;
    }
    default: {
      throw new ApiError(
        500,
        'STAGE_GUARD_FAILED',
        `未实现的 M2 任务：${job.kind}`,
      );
    }
  }
}

function cloneShotImages(
  projectId: string,
  source: any,
  newShotId: string,
  newRevisionId: string,
) {
  const all = m2State().images[projectId] ?? [];
  const sourceImages = all.filter((image: any) =>
    (source.referenceImageVersionIds ?? []).includes(image.id),
  );
  const idMap = new Map<string, string>();
  const cloned = sourceImages.map((image: any, index: number) => {
    const id = `${newRevisionId}_image_v${index + 1}`;
    idMap.set(image.id, id);
    return {
      ...m2Clone(image),
      id,
      shotId: newShotId,
      versionNo: index + 1,
    };
  });
  all.push(...cloned);
  return {
    activeReferenceImageId: source.activeReferenceImageId
      ? idMap.get(source.activeReferenceImageId)
      : cloned[0]?.id,
    referenceImageVersionIds: cloned.map((image: any) => image.id),
  };
}

function replaceStoryboardOrder(
  storyboard: any,
  orderedIds: string[],
  shots: any[],
) {
  storyboard.orderedShotRevisionIds = orderedIds;
  orderedIds.forEach((id: string, index: number) => {
    const shot = shots.find((item: any) => item.id === id);
    if (shot) shot.order = index + 1;
  });
  storyboard.status = 'DRAFT';
  storyboard.version += 1;
  storyboard.updatedAt = m2Now();
  m2InvalidateFrom(storyboard.projectId, 'STORYBOARD');
}

export function duplicateShot(
  projectId: string,
  shotId: string,
  payload: Record<string, any>,
) {
  const storyboard = (m2State().storyboards[projectId] ?? [])[0];
  const source = getShot(projectId, shotId);
  if (!storyboard) {
    throw new ApiError(404, 'NOT_FOUND', '分镜版本不存在');
  }
  m2AssertVersion(source, payload.expectedVersion);
  const shots = m2List('shots', projectId);
  const timestamp = m2Now();
  const newShotId = `${shotId}_copy_${Date.now().toString(36)}`;
  const newRevisionId = `${newShotId}_r1`;
  const images = cloneShotImages(projectId, source, newShotId, newRevisionId);
  const copy = {
    ...m2Clone(source),
    activeReferenceImageId: images.activeReferenceImageId,
    approvedAt: undefined,
    approvedBy: undefined,
    createdAt: timestamp,
    id: newRevisionId,
    order: source.order + 1,
    parentRevisionId: source.id,
    referenceImageVersionIds: images.referenceImageVersionIds,
    reviewStatus: 'DRAFT',
    revisionNo: 1,
    shotId: newShotId,
    title: `${source.title}（副本）`,
    updatedAt: timestamp,
    version: 1,
  };
  shots.push(copy);
  const sourceIndex = storyboard.orderedShotRevisionIds.indexOf(source.id);
  const ordered = [...storyboard.orderedShotRevisionIds];
  ordered.splice(sourceIndex + 1, 0, newRevisionId);
  replaceStoryboardOrder(storyboard, ordered, shots);
  return { shot: m2Clone(copy), storyboard: m2Clone(storyboard) };
}

export function splitShot(
  projectId: string,
  shotId: string,
  payload: Record<string, any>,
) {
  const storyboard = (m2State().storyboards[projectId] ?? [])[0];
  const source = getShot(projectId, shotId);
  if (!storyboard) {
    throw new ApiError(404, 'NOT_FOUND', '分镜版本不存在');
  }
  m2AssertVersion(source, payload.expectedVersion);
  const splitAtMs = Number(
    payload.splitAtMs ?? Math.round(source.durationMs / 2),
  );
  if (splitAtMs <= 0 || splitAtMs >= source.durationMs) {
    throw new ApiError(422, 'INVALID_DURATION', '拆分点必须在镜头时长内部');
  }
  const shots = m2List('shots', projectId);
  const timestamp = m2Now();
  const firstRevisionId = nextId('shotrevision');
  const firstImages = cloneShotImages(
    projectId,
    source,
    `${shotId}_a_${Date.now().toString(36)}`,
    firstRevisionId,
  );
  const first = {
    ...m2Clone(source),
    activeReferenceImageId: firstImages.activeReferenceImageId,
    approvedAt: undefined,
    approvedBy: undefined,
    createdAt: timestamp,
    durationMs: splitAtMs,
    id: firstRevisionId,
    parentRevisionId: source.id,
    referenceImageVersionIds: firstImages.referenceImageVersionIds,
    reviewStatus: 'DRAFT',
    revisionNo: source.revisionNo + 1,
    title: `${source.title}（前段）`,
    updatedAt: timestamp,
    version: 1,
  };
  const secondShotId = `${shotId}_b_${Date.now().toString(36)}`;
  const secondRevisionId = `${secondShotId}_r1`;
  const secondImages = cloneShotImages(
    projectId,
    source,
    secondShotId,
    secondRevisionId,
  );
  const second = {
    ...m2Clone(source),
    activeReferenceImageId: secondImages.activeReferenceImageId,
    approvedAt: undefined,
    approvedBy: undefined,
    createdAt: timestamp,
    durationMs: source.durationMs - splitAtMs,
    id: secondRevisionId,
    order: source.order + 1,
    parentRevisionId: source.id,
    referenceImageVersionIds: secondImages.referenceImageVersionIds,
    reviewStatus: 'DRAFT',
    revisionNo: 1,
    shotId: secondShotId,
    title: `${source.title}（后段）`,
    updatedAt: timestamp,
    version: 1,
  };
  shots.push(first, second);
  const sourceIndex = storyboard.orderedShotRevisionIds.indexOf(source.id);
  const ordered = [...storyboard.orderedShotRevisionIds];
  ordered.splice(sourceIndex, 1, firstRevisionId, secondRevisionId);
  replaceStoryboardOrder(storyboard, ordered, shots);
  return {
    shots: [m2Clone(first), m2Clone(second)],
    storyboard: m2Clone(storyboard),
  };
}

export function mergeShots(projectId: string, payload: Record<string, any>) {
  const storyboard = (m2State().storyboards[projectId] ?? [])[0];
  if (!storyboard) {
    throw new ApiError(404, 'NOT_FOUND', '分镜版本不存在');
  }
  const shotIds = (payload.shotIds ?? []) as string[];
  if (shotIds.length !== 2) {
    throw new ApiError(400, 'INVALID_INPUT', '合并需要恰好两个镜头');
  }
  const allShots = m2List('shots', projectId);
  const revisionForShot = (shotId: string) => {
    const orderedId = storyboard.orderedShotRevisionIds.find((id: string) =>
      allShots.some((shot: any) => shot.id === id && shot.shotId === shotId),
    );
    return allShots.find((shot: any) => shot.id === orderedId);
  };
  const first = revisionForShot(shotIds[0] ?? '');
  const second = revisionForShot(shotIds[1] ?? '');
  if (!first || !second) {
    throw new ApiError(404, 'NOT_FOUND', '镜头版本不存在');
  }
  const firstIndex = storyboard.orderedShotRevisionIds.indexOf(first.id);
  const secondIndex = storyboard.orderedShotRevisionIds.indexOf(second.id);
  if (
    firstIndex === -1 ||
    secondIndex === -1 ||
    Math.abs(firstIndex - secondIndex) !== 1
  ) {
    throw new ApiError(400, 'INVALID_INPUT', '只能合并相邻镜头');
  }
  m2AssertVersion(first, payload.expectedVersion);
  const shots = m2List('shots', projectId);
  const timestamp = m2Now();
  const mergedRevisionId = nextId('shotrevision');
  const merged = {
    ...m2Clone(first),
    activeReferenceImageId: first.activeReferenceImageId,
    approvedAt: undefined,
    approvedBy: undefined,
    createdAt: timestamp,
    durationMs: first.durationMs + second.durationMs,
    id: mergedRevisionId,
    order: Math.min(first.order, second.order),
    parentRevisionId: first.id,
    reviewStatus: 'DRAFT',
    revisionNo: first.revisionNo + 1,
    title: `${first.title} + ${second.title}`,
    updatedAt: timestamp,
    version: 1,
  };
  shots.push(merged);
  const ordered = storyboard.orderedShotRevisionIds.filter(
    (id: string) => id !== first.id && id !== second.id,
  );
  ordered.splice(Math.min(firstIndex, secondIndex), 0, mergedRevisionId);
  replaceStoryboardOrder(storyboard, ordered, shots);
  return { shot: m2Clone(merged), storyboard: m2Clone(storyboard) };
}

const SEED_OWNER: Actor = {
  id: 'demo_owner',
  roles: ['owner'],
  username: 'owner',
};

function seedApprovedUnderstanding(project: Project) {
  const revisions = projectRevisions(project.id);
  const approved = revisions.find((item) => item.status === 'APPROVED');
  if (approved) {
    return approved;
  }
  const evidence = projectEvidence(project.id);
  const ingestion = ensureIngestion(project.id);
  if (!ingestion.lastConfirmedSnapshotId) {
    const timestamp = iso();
    const snapshotId = `snapshot_seed_${project.id}_01`;
    state.snapshots.push({
      completeness: 'COMPLETE',
      confirmedAt: timestamp,
      confirmedBy: SEED_OWNER.id,
      coverage: clone(ingestion.coverage),
      createdAt: timestamp,
      id: snapshotId,
      projectId: project.id,
      sourceIds: ingestion.sources.map((source) => source.id),
      sourceVersions: Object.fromEntries(
        ingestion.sources.map((source) => [source.id, source.version]),
      ),
      updatedAt: timestamp,
      version: 1,
    });
    ingestion.lastConfirmedSnapshotId = snapshotId;
    ingestion.status = 'CONFIRMED';
    ingestion.version += 1;
  }
  const base = revisions[0];
  const template = base
    ? clone(base)
    : buildReportTemplate(project, evidence, null, 'FULL');
  const timestamp = iso();
  const revision: UnderstandingRevision = {
    ...template,
    approvedAt: timestamp,
    approvedBy: SEED_OWNER.id,
    createdAt: base?.createdAt ?? timestamp,
    id: nextId('revision'),
    ingestionSnapshotId:
      ensureIngestion(project.id).lastConfirmedSnapshotId ?? '',
    parentRevisionId: base?.id,
    projectId: project.id,
    revisionNo: (base?.revisionNo ?? 0) + 1,
    status: 'APPROVED',
    updatedAt: timestamp,
    version: 1,
  };
  revisions.push(revision);
  return revision;
}

function seedFakeJob(
  projectId: string,
  kind: JobKind,
  payload: Record<string, any>,
): Job {
  return {
    applied: true,
    createdAt: iso(),
    durationMs: 1,
    events: [],
    id: nextId('job'),
    kind,
    payload,
    projectId,
    scenario: 'NORMAL',
    status: 'SUCCEEDED',
    updatedAt: iso(),
    version: 1,
  } as Job;
}

function seedFullProject(project: Project) {
  if ((m2State().animatics[project.id] ?? []).length > 0) {
    return;
  }
  const understanding = seedApprovedUnderstanding(project);
  let angleSet = (m2State().angleSets[project.id] ?? [])[0];
  if (!angleSet) {
    const timestamp = iso();
    angleSet = {
      angles: generatedAngles(project, understanding),
      createdAt: timestamp,
      id: nextId('angleset'),
      projectId: project.id,
      revisionNo: 1,
      status: 'DRAFT',
      understandingRevisionId: understanding.id,
      updatedAt: timestamp,
      version: 1,
    };
    m2List('angleSets', project.id).unshift(angleSet);
  }
  const brief = createCreativeBrief(project.id, {
    angleSetId: angleSet.id,
    primaryAngleId: angleSet.angles[0]?.id,
    secondaryAngleIds: angleSet.angles[1] ? [angleSet.angles[1].id] : [],
  });
  const approvedBrief = approveCreativeBrief(
    project.id,
    brief.id,
    { expectedVersion: brief.version },
    SEED_OWNER,
  );

  applyConceptJob(
    seedFakeJob(project.id, 'GENERATE_CONCEPTS', {
      briefId: approvedBrief.id,
    }),
  );
  const group = (m2State().conceptGroups[project.id] ?? [])[0];
  const conceptId = group?.conceptRevisionIds[0];
  if (!group || !conceptId) {
    return;
  }
  let concept = (m2State().concepts[project.id] ?? []).find(
    (item: any) => item.id === conceptId,
  );
  const submitted = submitConceptReview(project.id, concept.id, {
    expectedVersion: concept.version,
  });
  concept = approveConcept(
    project.id,
    concept.id,
    { expectedVersion: submitted.version },
    SEED_OWNER,
  );

  let plan = evaluateDurationPlan(project.id, {
    conceptRevisionId: concept.id,
    targetDurationMs: project.durationSec * 1000,
  });
  if (plan.status !== 'SUFFICIENT') {
    const strategy =
      plan.status === 'NOT_RECOMMENDED'
        ? 'KEEP_SHORT'
        : 'NATURAL_STORY_EXPANSION';
    plan = patchDurationPlan(project.id, plan.id, {
      acceptedRiskNotes:
        strategy === 'KEEP_SHORT' ? ['M2 Seed 使用创意自然容量，保留短片'] : [],
      expectedVersion: plan.version,
      selectedStrategy: strategy,
    });
  }
  applyScriptJob(
    seedFakeJob(project.id, 'GENERATE_SCRIPT', {
      conceptRevisionId: concept.id,
      durationPlanId: plan.id,
      strategy: plan.selectedStrategy ?? 'NATURAL_STORY_EXPANSION',
    }),
  );
  const script = (m2State().scripts[project.id] ?? [])[0];
  const submittedScript = submitScriptReview(project.id, script.id, {
    expectedVersion: script.version,
  });
  const approvedScript = approveScript(
    project.id,
    script.id,
    { expectedVersion: submittedScript.version },
    SEED_OWNER,
  );

  applyVisualBibleJob(
    seedFakeJob(project.id, 'GENERATE_VISUAL_BIBLE', {
      scriptRevisionId: approvedScript.id,
    }),
  );
  const bible = (m2State().visualBibles[project.id] ?? [])[0];
  const approvedBible = approveVisualBible(
    project.id,
    bible.id,
    { expectedVersion: bible.version },
    SEED_OWNER,
  );

  applyStoryboardJob(
    seedFakeJob(project.id, 'GENERATE_STORYBOARD', {
      scriptRevisionId: approvedScript.id,
      visualBibleVersionId: approvedBible.id,
    }),
  );
  const storyboard = (m2State().storyboards[project.id] ?? [])[0];
  const shots = getShots(project.id, storyboard.id);
  batchApproveShots(
    project.id,
    {
      items: shots.map((shot: any) => ({
        expectedVersion: shot.version,
        revisionId: shot.id,
        shotId: shot.shotId,
      })),
      storyboardRevisionId: storyboard.id,
    },
    SEED_OWNER,
  );
  const freshBoard = (m2State().storyboards[project.id] ?? [])[0];
  const approvedBoard = approveStoryboard(
    project.id,
    freshBoard.id,
    { expectedVersion: freshBoard.version },
    SEED_OWNER,
  );

  applyAnimaticJob(
    seedFakeJob(project.id, 'BUILD_ANIMATIC', {
      storyboardRevisionId: approvedBoard.id,
      visualBibleVersionId: approvedBible.id,
    }),
  );
  const animatic = (m2State().animatics[project.id] ?? [])[0];
  approveAnimatic(
    project.id,
    animatic.id,
    { expectedVersion: animatic.version },
    SEED_OWNER,
  );
  if (project.id === 'project_resume_3d') {
    // M1 回归依赖 resume 保持 ANGLES；M2 已预置完整产物，页面可继续使用
    m2Touch(project.id, 'ANGLES');
  }
}

function seedM2Full() {
  for (const project of state.projects) {
    seedFullProject(project);
  }
  const resume = state.projects.find(
    (project) => project.id === 'project_resume_3d',
  );
  if (resume) {
    resume.currentStage = 'ANGLES';
    resume.lastVisitedStage = 'ANGLES';
    resume.updatedAt = iso();
    resume.version += 1;
  }
}

seedM2Full();

function m11State(): M11State {
  if (!state.m11) {
    seedM11();
  }
  state.m11.referenceAdInsights ??= {};
  return state.m11 as M11State;
}

function m21State(): M21State {
  if (!state.m21) {
    seedM21();
  }
  return state.m21 as M21State;
}

function sourceFingerprint(projectId: string) {
  const ingestion = state.ingestions[projectId];
  return (ingestion?.sources ?? [])
    .filter((source) => source.includedInAnalysis)
    .map((source) => `${source.id}:${source.version}`)
    .sort()
    .join('|');
}

function latestApprovedRevision(projectId: string) {
  return projectRevisions(projectId)
    .toSorted((a, b) => b.revisionNo - a.revisionNo)
    .find((revision) => revision.status === 'APPROVED');
}

function contentVersionId(assetId: string, revisionNo: number) {
  return `asset-content:${assetId}:v${revisionNo}`;
}

function seedM11() {
  const target: M11State = {
    answerValidity: {},
    assetContentVersions: {},
    assetUsageMetadata: {},
    claimAnchors: {},
    claimConflicts: {},
    conflictResolutions: {},
    evidenceSnapshots: {},
    researchAnswers: {},
    researchGaps: {},
    referenceAdInsights: {},
    researchQuestions: {},
    researchSessions: {},
    seeded: true,
  };
  const timestamp = iso();
  for (const project of state.projects) {
    const ingestion = state.ingestions[project.id];
    target.assetContentVersions[project.id] = [];
    target.assetUsageMetadata[project.id] = [];
    for (const asset of ingestion?.assets ?? []) {
      const ready = Boolean(asset.previewUrl);
      target.assetContentVersions[project.id] ??= [];
      (target.assetContentVersions[project.id] ?? []).push({
        assetId: asset.id,
        contentHash: `mock-${asset.id}-v1`,
        contentRevisionNo: 1,
        createdAt: asset.createdAt,
        createdBy: 'seed',
        id: contentVersionId(asset.id, 1),
        mimeType: asset.mimeType,
        originalFilename: asset.filename,
        projectId: project.id,
        sizeBytes: asset.sizeBytes,
        status: ready ? 'READY' : 'UNAVAILABLE',
        storageRef: asset.previewUrl,
      });
      target.assetUsageMetadata[project.id].push({
        assetId: asset.id,
        containsSensitiveData: asset.kind === 'video',
        createdAt: asset.createdAt,
        id: `asset-usage-meta:${asset.id}`,
        mayBeShownInFinalVideo: ready,
        mayBeUsedForAnalysis: true,
        notes: ready ? 'Seed 演示素材' : '旧记录只有元数据，实际字节不可恢复',
        projectId: project.id,
        purposes: [
          asset.kind === 'logo'
            ? 'BRAND_LOGO'
            : asset.kind === 'image'
              ? 'PRODUCT_UI'
              : asset.kind === 'document'
                ? 'EVIDENCE_DOCUMENT'
                : 'OTHER',
        ],
        rightsStatus: 'DECLARED',
        updatedAt: asset.updatedAt,
        version: 1,
      });
    }
    const brand = (ingestion?.assets ?? []).find(
      (asset) => asset.kind === 'logo' && asset.previewUrl,
    );
    if (brand) {
      target.assetContentVersions[project.id] ??= [];
      (target.assetContentVersions[project.id] ?? []).push({
        assetId: brand.id,
        contentHash: `mock-${brand.id}-v2`,
        contentRevisionNo: 2,
        createdAt: timestamp,
        createdBy: 'seed',
        id: contentVersionId(brand.id, 2),
        mimeType: brand.mimeType,
        originalFilename: 'vidcraft-logo-v2.svg',
        projectId: project.id,
        replacesVersionId: contentVersionId(brand.id, 1),
        sizeBytes: brand.sizeBytes + 64,
        status: 'READY',
        storageRef: '/brand/vidcraft-avatar.svg',
      });
    }

    target.researchGaps[project.id] = [];
    target.researchSessions[project.id] = [];
    target.researchQuestions[project.id] = [];
    target.researchAnswers[project.id] = [];
    target.claimAnchors[project.id] = [];
    target.claimConflicts[project.id] = [];
    target.conflictResolutions[project.id] = [];
    target.evidenceSnapshots[project.id] = [];
  }

  const gapSeeds: Record<string, Array<Record<string, any>>> = {
    project_crm: [
      {
        code: 'gap_crm_followup_pain',
        impact: '影响脚本痛点和镜头 02/03 的真实性',
        question: '客户跟进时最容易在哪个环节遗漏？',
        severity: 'IMPORTANT',
        title: '缺少客户跟进痛点的一手描述',
      },
      {
        code: 'gap_crm_auto_send',
        impact: '“自动发送回访”是高风险功能主张，影响 CRM 全链路',
        question: '当前版本是否真的会自动发送客户回访？',
        severity: 'BLOCKING_CLAIM',
        title: '自动发送能力与官网表述冲突',
      },
      {
        code: 'gap_crm_conversion',
        impact: '“转化率提升 80%”没有数据来源',
        question: '是否有可公开的转化率实测数据？',
        severity: 'BLOCKING_CLAIM',
        title: '量化转化宣称缺少证据',
      },
    ],
    project_knowledge_base: [
      {
        code: 'gap_kb_pain',
        impact: '影响知识库脚本的痛点选择',
        question: '用户最常因为找不到哪类资料而受挫？',
        severity: 'IMPORTANT',
        title: '缺少真实用户痛点证据',
      },
      {
        code: 'gap_kb_retention',
        impact: '影响“长期使用”主张',
        question: '有没有留存或使用频率数据？',
        severity: 'OPTIONAL',
        title: '缺少留存数据',
      },
    ],
    project_resume_3d: [
      {
        code: 'gap_resume_outcome',
        impact: '影响“提升面试通过率”这类结果表达',
        question: '是否有求职者使用后的真实结果反馈？',
        severity: 'IMPORTANT',
        title: '缺少结果类证据',
      },
    ],
    project_video_agent: [
      {
        code: 'gap_va_proof',
        impact: '影响 VidCraft 自身宣传片的社会证明',
        question: '是否有可公开的早期用户案例？',
        severity: 'IMPORTANT',
        title: '缺少客户案例',
      },
    ],
  };
  for (const [projectId, seeds] of Object.entries(gapSeeds)) {
    for (const seed of seeds) {
      target.researchGaps[projectId]?.push({
        code: seed.code,
        coverageCode: seed.code,
        createdAt: timestamp,
        id: `research-gap:${seed.code}`,
        impactDescription: seed.impact,
        projectId,
        question: seed.question,
        severity: seed.severity,
        state: 'OPEN',
        title: seed.title,
        updatedAt: timestamp,
        version: 1,
        whyItMatters: seed.impact,
      });
    }
  }

  for (const project of state.projects) {
    const revision = latestApprovedRevision(project.id);
    if (!revision) continue;
    const snapshot = state.snapshots.find(
      (item) => item.id === revision.ingestionSnapshotId,
    );
    const evidenceIds = new Set<string>();
    for (const list of [
      revision.features,
      revision.personas,
      revision.painPoints,
    ]) {
      for (const item of list ?? []) {
        for (const id of item.sourceEvidenceIds ?? []) evidenceIds.add(id);
      }
    }
    for (const evidenceId of evidenceIds) {
      const evidence = (state.evidence[project.id] ?? []).find(
        (item) => item.id === evidenceId,
      );
      if (!evidence) continue;
      const sourceVersion = snapshot?.sourceVersions?.[evidence.sourceId];
      const evidenceList = target.evidenceSnapshots[project.id] ?? [];
      target.evidenceSnapshots[project.id] = evidenceList;
      evidenceList.push({
        capturedAt: revision.approvedAt ?? revision.updatedAt,
        capturedForRevisionId: revision.id,
        evidenceId: evidence.id,
        id: `evidence-locator:${revision.id}:${evidence.id}`,
        ingestionSnapshotId: revision.ingestionSnapshotId,
        locator: {
          pageNo: evidence.pageNo,
          screenshotAssetId: evidence.screenshotAssetId,
          timeEndSec: evidence.timeEndSec,
          timeStartSec: evidence.timeStartSec,
        },
        projectId: project.id,
        sourceId: evidence.sourceId,
        ...(sourceVersion === undefined
          ? {
              recoverability: 'LEGACY_EVIDENCE_UNRESOLVED',
              unresolvedReason: '旧 Mock 快照没有记录来源版本',
            }
          : {
              evidenceLevelAtCapture: evidence.level,
              excerptSnapshot: evidence.excerpt,
              recoverability: 'CAPTURED',
              sourceVersion,
            }),
      });
    }
  }

  const crmRevision = latestApprovedRevision('project_crm');
  if (crmRevision) {
    const feature =
      crmRevision.features.find((item) => item.usableInMarketing) ??
      crmRevision.features[0];
    const autoAnchor = {
      createdAt: timestamp,
      entityId: feature?.id,
      fieldPath: 'features[].description',
      id: 'claim-crm-auto-send',
      origin: 'FEATURE',
      projectId: 'project_crm',
      sourceEvidenceIds: ['evidence_crm_web_01'],
      sourceRevisionId: crmRevision.id,
      statementSnapshot: '自动发送客户回访',
    };
    const conversionAnchor = {
      createdAt: timestamp,
      fieldPath: 'marketing.conversion',
      id: 'claim-crm-conversion-80',
      origin: 'FREE_TEXT',
      projectId: 'project_crm',
      sourceEvidenceIds: [],
      sourceRevisionId: crmRevision.id,
      statementSnapshot: '使用后转化率提升 80%',
    };
    target.claimAnchors.project_crm ??= [];
    target.claimAnchors.project_crm.push(autoAnchor, conversionAnchor);
    target.claimConflicts.project_crm ??= [];
    target.claimConflicts.project_crm.push(
      {
        affectedMarketingClaimIds: [autoAnchor.id],
        claimId: autoAnchor.id,
        conflictType: 'FACTUAL_CONTRADICTION',
        createdAt: timestamp,
        detectedFromSnapshotId: crmRevision.ingestionSnapshotId,
        evidenceIdsA: ['evidence_crm_web_01'],
        evidenceIdsB: ['evidence_crm_web_02'],
        explanation:
          '官网示例文案提到“自动发送客户回访”，但公开页面无法确认登录后的自动化能力；产品说明只确认跟进提醒。',
        id: 'conflict-crm-auto-send',
        mocked: true,
        projectId: 'project_crm',
        relatedFeatureIds: feature ? [feature.id] : [],
        severity: 'HIGH',
        statementA: '自动发送客户回访',
        statementB: '当前版本仅提供跟进提醒',
        status: 'OPEN',
        title: '自动发送回访能力存在版本范围冲突',
        updatedAt: timestamp,
        version: 1,
      },
      {
        affectedMarketingClaimIds: [conversionAnchor.id],
        claimId: conversionAnchor.id,
        conflictType: 'QUANTIFIED_CLAIM_UNSUPPORTED',
        createdAt: timestamp,
        detectedFromSnapshotId: crmRevision.ingestionSnapshotId,
        evidenceIdsA: [],
        evidenceIdsB: [],
        explanation:
          '“转化率提升 80%”没有任何统计来源或可核验数据；不能把用户点击确认当作真实结果。',
        id: 'conflict-crm-conversion-80',
        mocked: true,
        projectId: 'project_crm',
        relatedFeatureIds: feature ? [feature.id] : [],
        severity: 'HIGH',
        status: 'OPEN',
        title: '量化转化宣称缺少证据',
        updatedAt: timestamp,
        version: 1,
      },
    );
  }

  for (const project of state.projects) {
    target.claimAnchors[project.id] ??= [];
    const anchorList = target.claimAnchors[project.id] ?? [];
    target.claimAnchors[project.id] = anchorList;
    for (const revision of projectRevisions(project.id)) {
      if (revision.status !== 'APPROVED') continue;
      for (const anchor of buildClaimAnchors(revision)) {
        if (!anchorList.some((item: any) => item.id === anchor.id)) {
          anchorList.push(anchor);
        }
      }
    }
  }
  state.m11 = target;
  persistState();
}

function seedM21() {
  state.m21 = { generationSpecs: {}, seeded: true };
  persistState();
}

function buildClaimAnchors(revision: UnderstandingRevision) {
  const createdAt = revision.approvedAt ?? revision.updatedAt;
  const anchors: any[] = [];
  for (const feature of revision.features ?? []) {
    if (!feature.usableInMarketing) continue;
    anchors.push({
      createdAt,
      entityId: feature.id,
      fieldPath: `features.${feature.id}.description`,
      id: `claim:${revision.id}:feature:${feature.id}`,
      origin: 'FEATURE',
      projectId: revision.projectId,
      sourceEvidenceIds: feature.sourceEvidenceIds ?? [],
      sourceRevisionId: revision.id,
      statementSnapshot: `${feature.title}：${feature.description}`,
    });
  }
  for (const pain of revision.painPoints ?? []) {
    anchors.push({
      createdAt,
      entityId: pain.id,
      fieldPath: `painPoints.${pain.id}.painPoint`,
      id: `claim:${revision.id}:pain:${pain.id}`,
      origin: 'PAIN_POINT',
      projectId: revision.projectId,
      sourceEvidenceIds: pain.sourceEvidenceIds ?? [],
      sourceRevisionId: revision.id,
      statementSnapshot: pain.painPoint,
    });
  }
  return anchors;
}

function ensureClaimAnchors(revision: UnderstandingRevision) {
  const list = m11State().claimAnchors[revision.projectId] ?? [];
  for (const anchor of buildClaimAnchors(revision)) {
    if (!list.some((item) => item.id === anchor.id)) list.push(anchor);
  }
  m11State().claimAnchors[revision.projectId] = list;
  return list.filter((item) => item.sourceRevisionId === revision.id);
}

function scanClaimConflicts(projectId: string, revisionId?: string) {
  const revision =
    (revisionId
      ? projectRevisions(projectId).find((item) => item.id === revisionId)
      : latestApprovedRevision(projectId)) ??
    projectRevisions(projectId).toSorted(
      (a, b) => b.revisionNo - a.revisionNo,
    )[0];
  if (!revision) return [];
  ensureClaimAnchors(revision);
  const anchors = (m11State().claimAnchors[projectId] ?? []).filter(
    (item) => item.sourceRevisionId === revision.id,
  );
  const conflicts = m11State().claimConflicts[projectId] ?? [];
  for (const anchor of anchors) {
    if ((anchor.sourceEvidenceIds ?? []).length > 0) continue;
    if (!/(\d+%|提升|第一|最大|最低|唯一)/.test(anchor.statementSnapshot)) {
      continue;
    }
    if (conflicts.some((item) => item.claimId === anchor.id)) continue;
    const timestamp = iso();
    conflicts.push({
      affectedMarketingClaimIds: [anchor.id],
      claimId: anchor.id,
      conflictType: 'QUANTIFIED_CLAIM_UNSUPPORTED',
      createdAt: timestamp,
      detectedFromSnapshotId: revision.ingestionSnapshotId,
      evidenceIdsA: [],
      evidenceIdsB: [],
      explanation:
        '扫描发现无可核验证据的高风险量化/绝对化表达；需要补充证据或安全改写。',
      id: nextId('conflict'),
      mocked: true,
      projectId,
      relatedFeatureIds: anchor.entityId ? [anchor.entityId] : [],
      severity: 'HIGH',
      status: 'OPEN',
      title: '高风险宣称缺少证据',
      updatedAt: timestamp,
      version: 1,
    });
  }
  m11State().claimConflicts[projectId] = conflicts;
  persistState();
  return conflicts;
}

export function listReferenceAdInsights(projectId: string) {
  getProjectOrThrow(projectId);
  return clone(m11State().referenceAdInsights[projectId] ?? []);
}

export function createReferenceAdInsight(
  projectId: string,
  payload: Record<string, any>,
) {
  getProjectOrThrow(projectId);
  if (payload.copyrightConfirmed !== true) {
    throw new ApiError(
      422,
      'COPYRIGHT_REQUIRED',
      '必须确认参考广告为自制或已获授权，仅用于创意灵感',
    );
  }
  const ingestion = ensureIngestion(projectId);
  const timestamp = iso();
  const title = String(payload.title ?? '参考广告（Mock）');
  const existingInsight = payload.reanalyzeOf
    ? (m11State().referenceAdInsights[projectId] ?? []).find(
        (item: any) => item.id === payload.reanalyzeOf,
      )
    : null;
  const sourceId = existingInsight?.sourceId ?? nextId('source_refad');
  const assetId =
    existingInsight?.assetId ?? payload.assetId ?? nextId('asset_refad');
  if (!payload.assetId && !existingInsight) {
    ingestion.assets ??= [];
    ingestion.assets.push({
      createdAt: timestamp,
      filename: String(payload.fileName ?? `${title}.mp4`),
      id: assetId,
      kind: 'video',
      mimeType: String(payload.mimeType ?? 'video/mp4'),
      mockOnly: true,
      previewUrl: payload.thumbnailDataUrl
        ? String(payload.thumbnailDataUrl)
        : undefined,
      projectId,
      purpose: 'REFERENCE_AD',
      sizeBytes: Number(payload.fileSize ?? 0),
      sourceId,
      uploadStatus: 'SUCCEEDED',
      updatedAt: timestamp,
      version: 1,
    });
  }
  if (!existingInsight) {
    ingestion.sources.push({
      analysisScope: 'CREATIVE_REFERENCE',
      assetId,
      createdAt: timestamp,
      evidenceIds: [],
      id: sourceId,
      includedInAnalysis: false,
      kind: 'REFERENCE_AD',
      mock: true,
      projectId,
      status: 'READY',
      summary: '仅用于抽象创意语言参考，不进入产品事实与证据链。',
      title,
      updatedAt: timestamp,
      version: 1,
    });
  }
  ingestion.version += 1;
  const insight = {
    abstractLanguage: [
      '先制造问题张力，再给产品解法',
      '用真实操作特写替代功能口播',
      '结尾只保留一个行动指令',
    ],
    analysisScope: 'CREATIVE_REFERENCE',
    analysisStatus: 'READY',
    assetId,
    canBeUsedAsProductEvidence: false,
    copyright: {
      declaredAt: timestamp,
      declaredByUser: true,
      note: 'Mock 自制/明确授权示例，不含真实第三方广告素材',
    },
    createdAt: existingInsight?.createdAt ?? timestamp,
    doNotCopy: [
      '不得复制原广告的镜头、脚本、角色或配乐',
      '不得把广告中的功能/成绩/品牌文字写入产品 features',
    ],
    durationSec: Number(payload.durationSec ?? 30),
    format: String(payload.format ?? '9:16'),
    id: existingInsight?.id ?? nextId('referencead'),
    media: {
      height: Number(payload.height ?? 0),
      mimeType: String(payload.mimeType ?? 'video/mp4'),
      previewDataUrl: payload.thumbnailDataUrl,
      storageRef: payload.contentDataUrl,
      width: Number(payload.width ?? 0),
    },
    asr: {
      language: 'zh-CN',
      text: String(
        payload.asrText ??
          '（Mock ASR）前 3 秒先制造问题，随后用演示和一句行动指令收束。',
      ),
    },
    patterns: [
      {
        key: 'hook',
        label: '开场钩子',
        value: '前 3 秒先给冲突/问题，不先介绍产品',
      },
      {
        key: 'narrative',
        label: '叙事结构',
        value: '问题 → 反转 → 演示 → 单句 CTA',
      },
      {
        key: 'pacing',
        label: '节奏',
        value: '4 段式快切，节拍点切镜',
      },
      {
        key: 'visual',
        label: '视觉语言',
        value: '高对比色块 + 屏幕录制特写',
      },
      {
        key: 'audio',
        label: '声音',
        value: '旁白克制，靠环境音与节奏推进',
      },
      {
        key: 'cta',
        label: '行动指令',
        value: '结尾只保留一个明确动作',
      },
    ],
    projectId,
    sourceId,
    summary:
      '固定 Mock 洞察：仅抽象出钩子、结构与节奏，不包含可复用的具体镜头或文案。',
    title,
    updatedAt: timestamp,
    version: (existingInsight?.version ?? 0) + 1,
  };
  const list = m11State().referenceAdInsights[projectId] ?? [];
  if (existingInsight) {
    Object.assign(existingInsight, insight);
  } else {
    list.unshift(insight);
  }
  m11State().referenceAdInsights[projectId] = list;
  persistState();
  return clone(insight);
}

export function startReferenceAdAnalysis(
  projectId: string,
  payload: Record<string, any>,
) {
  getProjectOrThrow(projectId);
  if (payload.copyrightConfirmed !== true) {
    throw new ApiError(
      422,
      'COPYRIGHT_REQUIRED',
      '必须确认参考广告为自制或已获授权，仅用于创意灵感',
    );
  }
  const job = createJob(projectId, 'ANALYZE_REFERENCE_AD', 'NORMAL', payload);
  return { jobId: job.id };
}

export function startReferenceAdReanalysis(
  projectId: string,
  insightId: string,
) {
  const existing = (m11State().referenceAdInsights[projectId] ?? []).find(
    (item: any) => item.id === insightId,
  );
  if (!existing) throw new ApiError(404, 'NOT_FOUND', '参考广告洞察不存在');
  const job = createJob(projectId, 'ANALYZE_REFERENCE_AD', 'NORMAL', {
    assetId: existing.assetId,
    copyrightConfirmed: true,
    durationSec: existing.durationSec,
    format: existing.format,
    reanalyzeOf: existing.id,
    title: existing.title,
  });
  return { jobId: job.id };
}

export function getReferenceAdInsight(projectId: string, insightId: string) {
  getProjectOrThrow(projectId);
  const insight = (m11State().referenceAdInsights[projectId] ?? []).find(
    (item) => item.id === insightId,
  );
  if (!insight) throw new ApiError(404, 'NOT_FOUND', '参考广告洞察不存在');
  return clone(insight);
}

export function listAssetContentVersions(projectId: string, assetId: string) {
  getProjectOrThrow(projectId);
  const asset = (state.ingestions[projectId]?.assets ?? []).find(
    (item) => item.id === assetId,
  );
  if (!asset) throw new ApiError(404, 'ASSET_NOT_FOUND', '素材不存在');
  return (
    m11State().assetContentVersions[projectId]?.filter(
      (item) => item.assetId === assetId,
    ) ?? []
  );
}

export function getAssetIdentity(projectId: string, assetId: string) {
  const asset = (state.ingestions[projectId]?.assets ?? []).find(
    (item) => item.id === assetId,
  );
  if (!asset) throw new ApiError(404, 'ASSET_NOT_FOUND', '素材不存在');
  const contentVersions = listAssetContentVersions(projectId, assetId);
  const active = contentVersions.findLast((item) => item.status === 'READY');
  return {
    activeContentVersionId: active?.id,
    asset,
    contentVersions,
  };
}

export function createAssetContentVersion(
  projectId: string,
  assetId: string,
  payload: Record<string, any>,
) {
  const asset = (state.ingestions[projectId]?.assets ?? []).find(
    (item) => item.id === assetId,
  );
  if (!asset) throw new ApiError(404, 'ASSET_NOT_FOUND', '素材不存在');
  if (Number(payload.expectedAssetVersion) !== asset.version) {
    throw new ApiError(409, 'VERSION_CONFLICT', '素材元数据版本已变化', {
      currentVersion: asset.version,
    });
  }
  const fixtureKey = String(payload.fixtureKey ?? '');
  if (fixtureKey && !/^\/(brand|demo-assets|demo)\//.test(fixtureKey)) {
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      'fixtureKey 必须指向演示静态资源',
    );
  }
  const versions = m11State().assetContentVersions[projectId] ?? [];
  const revisionNo =
    Math.max(
      0,
      ...versions
        .filter((item) => item.assetId === assetId)
        .map((item) => item.contentRevisionNo),
    ) + 1;
  const version = {
    assetId,
    contentHash: `mock-${assetId}-v${revisionNo}`,
    contentRevisionNo: revisionNo,
    createdAt: iso(),
    createdBy: 'mock_owner',
    id: contentVersionId(assetId, revisionNo),
    mimeType: String(payload.mimeType ?? asset.mimeType),
    originalFilename: String(payload.filename ?? asset.filename),
    projectId,
    replacesVersionId: payload.replacesVersionId,
    sizeBytes: Number(payload.sizeBytes ?? asset.sizeBytes),
    status: 'READY',
    storageRef: fixtureKey || asset.previewUrl,
  };
  versions.push(version);
  m11State().assetContentVersions[projectId] = versions;
  persistState();
  return version;
}

export function getAssetUsageMetadata(projectId: string, assetId: string) {
  getProjectOrThrow(projectId);
  const metadata = (m11State().assetUsageMetadata[projectId] ?? []).find(
    (item) => item.assetId === assetId,
  );
  if (!metadata) throw new ApiError(404, 'ASSET_NOT_FOUND', '素材用途不存在');
  return metadata;
}

export function patchAssetUsageMetadata(
  projectId: string,
  assetId: string,
  payload: Record<string, any>,
) {
  const metadata = getAssetUsageMetadata(projectId, assetId);
  if (Number(payload.expectedVersion) !== metadata.version) {
    throw new ApiError(409, 'VERSION_CONFLICT', '素材用途版本已变化', {
      currentVersion: metadata.version,
    });
  }
  Object.assign(metadata, payload.patch ?? {});
  if (metadata.rightsStatus === 'NOT_ALLOWED') {
    metadata.mayBeShownInFinalVideo = false;
    metadata.mayBeUsedForAnalysis = false;
    for (const version of m11State().assetContentVersions[projectId] ?? []) {
      if (version.assetId === assetId) {
        version.status = 'REDACTED';
        version.storageRef = undefined;
        version.contentHash = undefined;
      }
    }
  }
  metadata.updatedAt = iso();
  metadata.version += 1;
  persistState();
  return metadata;
}

export function listAssetUsage(projectId: string, assetId: string) {
  getProjectOrThrow(projectId);
  if (
    !(state.ingestions[projectId]?.assets ?? []).some((a) => a.id === assetId)
  ) {
    throw new ApiError(404, 'ASSET_NOT_FOUND', '素材不存在');
  }
  const contentVersions = m11State().assetContentVersions[projectId] ?? [];
  const version = contentVersions.find((item) => item.assetId === assetId);
  const items: any[] = [];
  for (const source of state.ingestions[projectId]?.sources ?? []) {
    if (source.assetId === assetId) {
      items.push({
        assetId,
        assetVersionId: version?.id,
        id: `usage-source:${source.id}`,
        isActiveCandidate: true,
        isInApprovedSnapshot: state.snapshots.some(
          (snapshot) =>
            snapshot.projectId === projectId &&
            snapshot.sourceIds.includes(source.id),
        ),
        projectId,
        targetId: source.id,
        targetType: 'PRODUCT_SOURCE',
        usageRole: '资料来源',
      });
    }
  }
  for (const bible of state.m2?.visualBibles[projectId] ?? []) {
    const referenced =
      (bible.brandLogoAssetIds ?? []).includes(assetId) ||
      (bible.characters ?? []).some((character: any) =>
        (character.imageAssetIds ?? []).includes(assetId),
      ) ||
      (bible.scenes ?? []).some((scene: any) =>
        (scene.referenceAssetIds ?? []).includes(assetId),
      );
    if (referenced) {
      items.push({
        assetId,
        assetVersionId: version?.id,
        id: `usage-bible:${bible.id}`,
        isActiveCandidate: bible.status === 'APPROVED',
        isInApprovedSnapshot: bible.status === 'APPROVED',
        projectId,
        targetId: bible.id,
        targetRevisionId: bible.id,
        targetType: 'VISUAL_BIBLE_REVISION',
        usageRole: '视觉规范引用',
      });
    }
    for (const binding of bible.assetContentBindings ?? []) {
      if (binding.assetId === assetId) {
        items.push({
          assetId,
          assetVersionId: binding.assetVersionId,
          id: `usage-bible-binding:${bible.id}:${binding.assetVersionId}`,
          isActiveCandidate: bible.status !== 'STALE',
          isInApprovedSnapshot: bible.status === 'APPROVED',
          projectId,
          targetId: bible.id,
          targetRevisionId: bible.id,
          targetType: 'VISUAL_BIBLE_REVISION',
          usageRole: binding.usageRole,
        });
      }
    }
  }
  for (const shot of state.m2?.shots[projectId] ?? []) {
    for (const binding of shot.assetContentBindings ?? []) {
      if (binding.assetId === assetId) {
        items.push({
          assetId,
          assetVersionId: binding.assetVersionId,
          id: `usage-shot-binding:${shot.id}:${binding.assetVersionId}`,
          isActiveCandidate: shot.reviewStatus !== 'STALE',
          isInApprovedSnapshot: shot.reviewStatus === 'APPROVED',
          projectId,
          targetId: shot.shotId,
          targetRevisionId: shot.id,
          targetType: 'SHOT_REVISION',
          usageRole: binding.usageRole,
        });
      }
    }
  }
  for (const concept of state.m2?.concepts[projectId] ?? []) {
    if ((concept.moodboardAssetIds ?? []).includes(assetId)) {
      items.push({
        assetId,
        assetVersionId: version?.id,
        id: `usage-concept:${concept.id}`,
        isActiveCandidate: concept.status !== 'REJECTED',
        isInApprovedSnapshot: concept.status === 'APPROVED',
        projectId,
        targetId: concept.id,
        targetRevisionId: concept.id,
        targetType: 'CREATIVE_CONCEPT_REVISION',
        usageRole: '情绪板',
      });
    }
  }
  return items;
}

function assertAssetVersion(
  projectId: string,
  assetId: string,
  assetVersionId: string,
) {
  const version = (m11State().assetContentVersions[projectId] ?? []).find(
    (item) => item.id === assetVersionId && item.assetId === assetId,
  );
  if (!version) {
    throw new ApiError(
      422,
      'ASSET_CONTENT_UNAVAILABLE',
      '内容版本不属于该素材',
    );
  }
  if (version.status !== 'READY') {
    throw new ApiError(422, 'ASSET_CONTENT_UNAVAILABLE', '内容版本不可用');
  }
  return version;
}

export function writeAssetReference(
  projectId: string,
  assetId: string,
  payload: Record<string, any>,
) {
  getProjectOrThrow(projectId);
  const asset = (state.ingestions[projectId]?.assets ?? []).find(
    (item) => item.id === assetId,
  );
  if (!asset) throw new ApiError(404, 'ASSET_NOT_FOUND', '素材不存在');
  const rights = (m11State().assetUsageMetadata[projectId] ?? []).find(
    (item) => item.assetId === assetId,
  );
  if (
    rights?.rightsStatus !== 'DECLARED' ||
    rights?.mayBeShownInFinalVideo === false
  ) {
    throw new ApiError(
      409,
      'ASSET_RIGHTS_REVOKED',
      '素材授权已撤销，不能写入新引用',
    );
  }
  const version = assertAssetVersion(
    projectId,
    assetId,
    String(payload.assetVersionId ?? ''),
  );
  const targetType = String(payload.targetType ?? '');
  const targetRevisionId = String(
    payload.targetRevisionId ?? payload.targetId ?? '',
  );
  const binding = {
    assetId,
    assetVersionId: version.id,
    targetEntityId: payload.targetId,
    usageRole: String(payload.usageRole ?? '视觉参考'),
  };
  let target: any;
  if (targetType === 'SHOT_REVISION') {
    target = (m2State().shots[projectId] ?? []).find(
      (item: any) => item.id === targetRevisionId,
    );
    if (!target) throw new ApiError(404, 'NOT_FOUND', '镜头修订不存在');
    if (target.reviewStatus === 'APPROVED') {
      throw new ApiError(
        409,
        'ASSET_REFERENCE_IN_USE',
        '已批准镜头不能直接加引用，请先派生新草稿',
      );
    }
    target.assetContentBindings = [
      ...(target.assetContentBindings ?? []),
      binding,
    ];
    target.version += 1;
    target.updatedAt = m2Now();
  } else if (targetType === 'VISUAL_BIBLE_REVISION') {
    target = (m2State().visualBibles[projectId] ?? []).find(
      (item: any) => item.id === targetRevisionId,
    );
    if (!target) throw new ApiError(404, 'NOT_FOUND', '视觉规范不存在');
    if (target.status === 'APPROVED') {
      throw new ApiError(
        409,
        'ASSET_REFERENCE_IN_USE',
        '已批准视觉规范不能直接加引用，请先派生新草稿',
      );
    }
    target.assetContentBindings = [
      ...(target.assetContentBindings ?? []),
      binding,
    ];
    target.version += 1;
    target.updatedAt = m2Now();
  } else {
    throw new ApiError(422, 'VALIDATION_ERROR', '该目标类型不支持草稿资产引用');
  }
  persistState();
  return {
    reference: {
      assetId,
      assetVersionId: version.id,
      id: `asset-usage~${targetType}~${target.id}~${version.id}`,
      isActiveCandidate: true,
      isInApprovedSnapshot: false,
      projectId,
      targetId: target.id,
      targetRevisionId: target.id,
      targetType,
      usageRole: binding.usageRole,
    },
    revision: { id: target.id, version: target.version },
    targetLabel: targetType === 'SHOT_REVISION' ? '镜头' : '视觉规范',
  };
}

export function deleteAssetReference(
  projectId: string,
  referenceId: string,
  payload: Record<string, any>,
) {
  const parts = decodeURIComponent(referenceId).split('~');
  if (parts[0] !== 'asset-usage' || parts.length !== 4) {
    throw new ApiError(404, 'NOT_FOUND', '资产引用不存在');
  }
  const [, targetType = '', targetRevisionId = '', assetVersionId = ''] = parts;
  const target =
    targetType === 'SHOT_REVISION'
      ? (m2State().shots[projectId] ?? []).find(
          (item: any) => item.id === targetRevisionId,
        )
      : (m2State().visualBibles[projectId] ?? []).find(
          (item: any) => item.id === targetRevisionId,
        );
  if (!target) throw new ApiError(404, 'NOT_FOUND', '目标修订不存在');
  if (target.reviewStatus === 'APPROVED' || target.status === 'APPROVED') {
    throw new ApiError(409, 'ASSET_REFERENCE_IN_USE', '已批准修订不能删除引用');
  }
  if (Number(payload.expectedVersion) !== target.version) {
    throw new ApiError(409, 'VERSION_CONFLICT', '目标修订版本已变化');
  }
  target.assetContentBindings = (target.assetContentBindings ?? []).filter(
    (item: any) => item.assetVersionId !== assetVersionId,
  );
  target.version += 1;
  target.updatedAt = m2Now();
  persistState();
  return { deletedReferenceId: referenceId };
}

export function previewAssetReplacement(
  projectId: string,
  assetId: string,
  payload: Record<string, any>,
) {
  const versions = listAssetContentVersions(projectId, assetId);
  const target = versions.find(
    (item) => item.id === payload.newContentVersionId,
  );
  if (!target) {
    throw new ApiError(404, 'ASSET_NOT_FOUND', '目标内容版本不存在');
  }
  const usage = listAssetUsage(projectId, assetId);
  return {
    affected: usage,
    assetId,
    newContentVersionId: target.id,
    requiresNewRevision: usage.some((item) => item.isInApprovedSnapshot),
    summary:
      usage.length > 0
        ? `${usage.length} 个对象引用该素材；采用新内容需新草稿与审核，不会自动替换旧批准版。`
        : '当前没有引用；仍需要新草稿/审核后才能成为正式视觉规范。',
  };
}

export function previewAssetReference(
  projectId: string,
  assetId: string,
  payload: Record<string, any>,
) {
  getProjectOrThrow(projectId);
  const usage = listAssetUsage(projectId, assetId);
  const targetType = String(payload.targetType ?? '');
  return {
    allowed: true,
    assetId,
    existingUsage: usage,
    previewOnly: true,
    targetId: payload.targetId,
    targetType,
    warnings: [
      '预览不会创建引用；正式引用必须提交到新的 VisualBible/Shot 草稿并走原 M2 审核。',
    ],
  };
}

export function listEvidenceSnapshots(projectId: string, revisionId: string) {
  getProjectOrThrow(projectId);
  const revision = projectRevisions(projectId).find(
    (item) => item.id === revisionId,
  );
  if (!revision) throw new ApiError(404, 'NOT_FOUND', '理解修订不存在');
  return (m11State().evidenceSnapshots[projectId] ?? []).filter(
    (item) => item.capturedForRevisionId === revisionId,
  );
}

export function listResearchGaps(projectId: string) {
  const project = getProjectOrThrow(projectId);
  const ingestion = state.ingestions[projectId];
  const gaps = m11State().researchGaps[projectId] ?? [];
  return {
    context: {
      ingestionSnapshotId: ingestion?.lastConfirmedSnapshotId,
      ingestionStateVersion: ingestion?.version ?? 0,
      sourceSetFingerprint: sourceFingerprint(projectId),
    },
    gaps,
    projectId: project.id,
  };
}

export function listResearchQuestions(projectId: string) {
  getProjectOrThrow(projectId);
  return {
    answers: m11State().researchAnswers[projectId] ?? [],
    context: {
      sourceSetFingerprint: sourceFingerprint(projectId),
    },
    questions: m11State().researchQuestions[projectId] ?? [],
  };
}

export function createResearchSession(
  projectId: string,
  payload: Record<string, any>,
) {
  getProjectOrThrow(projectId);
  const ingestion = state.ingestions[projectId];
  const basedOn = Number(payload.basedOnIngestionVersion ?? 0);
  if (basedOn && basedOn !== ingestion?.version) {
    throw new ApiError(409, 'RESEARCH_STALE_VERSION', '资料上下文已变化', {
      currentVersion: ingestion?.version,
    });
  }
  const sessions = m11State().researchSessions[projectId] ?? [];
  const active = sessions.find((item) => item.status === 'ACTIVE');
  if (active) return active;
  const timestamp = iso();
  const session = {
    basedOnIngestionVersion: ingestion?.version ?? 0,
    createdAt: timestamp,
    id: nextId('researchsession'),
    projectId,
    questionIds: [],
    status: 'ACTIVE',
    updatedAt: timestamp,
    version: 1,
  };
  sessions.push(session);
  m11State().researchSessions[projectId] = sessions;
  persistState();
  return session;
}

export function getResearchSessionView(projectId: string, sessionId: string) {
  const sessions = m11State().researchSessions[projectId] ?? [];
  const session = sessions.find((item) => item.id === sessionId);
  if (!session) throw new ApiError(404, 'NOT_FOUND', '研究会话不存在');
  const questions = (m11State().researchQuestions[projectId] ?? []).filter(
    (item) => item.sessionId === sessionId,
  );
  const answers = (m11State().researchAnswers[projectId] ?? []).filter((item) =>
    questions.some((question) => question.id === item.questionId),
  );
  const validity = questions.map((question) => {
    const answer = answers.find((item) => item.questionId === question.id);
    return {
      answerValidity: answer?.validity,
      gapId: question.gapId,
      questionId: question.id,
      sessionId,
      status: question.status,
    };
  });
  return {
    answers,
    gaps: m11State().researchGaps[projectId] ?? [],
    questions,
    session,
    validity,
  };
}

export function nextResearchQuestions(
  projectId: string,
  sessionId: string,
  payload: Record<string, any>,
) {
  const view = getResearchSessionView(projectId, sessionId);
  if (Number(payload.expectedVersion) !== view.session.version) {
    throw new ApiError(409, 'VERSION_CONFLICT', '研究会话版本已变化', {
      currentVersion: view.session.version,
    });
  }
  const maxCount = Math.max(1, Math.min(3, Number(payload.maxCount ?? 3)));
  const currentFingerprint = sourceFingerprint(projectId);
  const dismissedGapIds = new Set(
    view.questions
      .filter(
        (question) =>
          ['DISMISSED', 'SKIPPED'].includes(question.status) &&
          (question.contextFingerprint ?? currentFingerprint) ===
            currentFingerprint,
      )
      .map((question) => question.gapId),
  );
  const candidates = (m11State().researchGaps[projectId] ?? [])
    .filter((gap) => !dismissedGapIds.has(gap.id))
    .filter((gap) => gap.state !== 'RESOLVED')
    .map((gap) => {
      const latest = view.questions
        .filter((question) => question.gapId === gap.id)
        .toSorted((a, b) =>
          String(b.updatedAt).localeCompare(String(a.updatedAt)),
        )[0];
      const answer = latest
        ? view.answers.find((item) => item.id === latest.answerId)
        : undefined;
      const contextChanged =
        Boolean(latest?.contextFingerprint) &&
        latest?.contextFingerprint !== currentFingerprint;
      const needsReconfirmation =
        contextChanged ||
        ['CONTRADICTED', 'REVOKED', 'STALE'].includes(answer?.validity) ||
        gap.state === 'STALE';
      const suppressed =
        !contextChanged &&
        latest &&
        [
          'ANSWER_DRAFT',
          'ANSWERED',
          'DISMISSED',
          'INCORPORATED',
          'SKIPPED',
        ].includes(latest.status) &&
        !needsReconfirmation;
      if (suppressed) return null;
      const blockingPolicy =
        latest?.rules?.blockingPolicy ??
        (gap.severity === 'BLOCKING_CLAIM' ? 'BLOCK_APPROVAL' : 'WARN');
      const severityScore =
        gap.severity === 'BLOCKING_CLAIM'
          ? 300
          : gap.severity === 'IMPORTANT'
            ? 200
            : 100;
      const blockingScore =
        blockingPolicy === 'BLOCK_APPROVAL'
          ? 30
          : blockingPolicy === 'WARN'
            ? 15
            : 0;
      return {
        gap,
        needsReconfirmation,
        priorityScore:
          severityScore + blockingScore + (needsReconfirmation ? 20 : 0),
      };
    })
    .filter(Boolean)
    .toSorted((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, maxCount);
  const timestamp = iso();
  const questions = m11State().researchQuestions[projectId] ?? [];
  for (const candidate of candidates) {
    const gap = candidate.gap;
    const existing = questions.find(
      (question) =>
        question.gapId === gap.id && question.sessionId === sessionId,
    );
    if (existing && !candidate.needsReconfirmation) continue;
    if (existing && candidate.needsReconfirmation) {
      existing.status = 'STALE';
      existing.updatedAt = timestamp;
    }
    questions.push({
      contextFingerprint: currentFingerprint,
      createdAt: timestamp,
      gapId: gap.id,
      id: nextId('researchquestion'),
      options: [],
      projectId,
      question: gap.question,
      rules: {
        applicableContextFingerprint: currentFingerprint,
        blockingPolicy:
          gap.severity === 'BLOCKING_CLAIM' ? 'BLOCK_APPROVAL' : 'WARN',
        priority:
          gap.severity === 'BLOCKING_CLAIM'
            ? 'HIGH'
            : gap.severity === 'IMPORTANT'
              ? 'NORMAL'
              : 'LOW',
        sourceEvidenceIds: [],
      },
      sessionId,
      status: 'ASKED',
      updatedAt: timestamp,
      version: 1,
    });
  }
  m11State().researchQuestions[projectId] = questions;
  const session = (m11State().researchSessions[projectId] ?? []).find(
    (item) => item.id === sessionId,
  );
  if (!session) throw new ApiError(404, 'NOT_FOUND', '研究会话不存在');
  session.questionIds = questions
    .filter((item) => item.sessionId === sessionId)
    .map((item) => item.id);
  session.updatedAt = timestamp;
  session.version += 1;
  persistState();
  return getResearchSessionView(projectId, sessionId);
}

export function answerResearchQuestion(
  projectId: string,
  questionId: string,
  payload: Record<string, any>,
) {
  getProjectOrThrow(projectId);
  const question = (m11State().researchQuestions[projectId] ?? []).find(
    (item) => item.id === questionId,
  );
  if (!question) throw new ApiError(404, 'NOT_FOUND', '研究问题不存在');
  const answerText = String(payload.answer ?? '').trim();
  if (!answerText) {
    throw new ApiError(422, 'VALIDATION_ERROR', '回答不能为空');
  }
  if (Number(payload.expectedVersion) !== question.version) {
    throw new ApiError(409, 'VERSION_CONFLICT', '问题版本已变化', {
      currentVersion: question.version,
    });
  }
  const answers = m11State().researchAnswers[projectId] ?? [];
  const existing = answers.find((item) => item.questionId === questionId);
  if (existing) {
    if (existing.answer === answerText) return existing;
    throw new ApiError(409, 'QUESTION_ALREADY_ANSWERED', '该问题已有答案', {
      answerId: existing.id,
    });
  }
  const timestamp = iso();
  const answerId = nextId('researchanswer');
  const ingestion = state.ingestions[projectId];
  if (!ingestion)
    throw new ApiError(404, 'PROJECT_NOT_FOUND', '项目资料不存在');
  const sourceId = `source_user_note_${answerId}`;
  const evidenceId = `evidence_user_note_${answerId}`;
  const source = {
    createdAt: timestamp,
    evidenceIds: [evidenceId],
    id: sourceId,
    includedInAnalysis: true,
    kind: 'USER_NOTE' as const,
    mock: true as const,
    projectId,
    status: 'READY' as const,
    summary: answerText,
    title: `访谈回答：${question.question}`,
    updatedAt: timestamp,
    version: 1,
  };
  ingestion.sources.push(source);
  const evidence: Evidence = {
    addedBy: 'user',
    excerpt: answerText,
    id: evidenceId,
    level: 'user_confirmed',
    projectId,
    sourceId,
    title: '访谈回答',
  };
  state.evidence[projectId] = state.evidence[projectId] ?? [];
  state.evidence[projectId].push(evidence);
  const answer = {
    answer: answerText,
    createdAt: timestamp,
    id: answerId,
    projectId,
    questionId,
    sourceId,
    sourceVersion: 1,
    updatedAt: timestamp,
    validity: 'VALID',
    version: 1,
  };
  answers.push(answer);
  m11State().researchAnswers[projectId] = answers;
  question.answerId = answerId;
  question.status = 'ANSWERED';
  question.updatedAt = timestamp;
  question.version += 1;
  question.contextFingerprint = sourceFingerprint(projectId);
  if (question.rules) {
    question.rules.applicableContextFingerprint = question.contextFingerprint;
  }
  const gap = (m11State().researchGaps[projectId] ?? []).find(
    (item) => item.id === question.gapId,
  );
  if (gap) {
    gap.state = 'ANSWER_IN_PROGRESS';
    gap.updatedAt = timestamp;
    gap.version += 1;
  }
  persistState();
  return answer;
}

export function revokeResearchAnswer(projectId: string, answerId: string) {
  getProjectOrThrow(projectId);
  const answer = (m11State().researchAnswers[projectId] ?? []).find(
    (item: any) => item.id === answerId,
  );
  if (!answer) throw new ApiError(404, 'NOT_FOUND', '研究回答不存在');
  answer.validity = 'REVOKED';
  answer.updatedAt = iso();
  answer.version += 1;
  const question = (m11State().researchQuestions[projectId] ?? []).find(
    (item: any) => item.id === answer.questionId,
  );
  const source = (state.ingestions[projectId]?.sources ?? []).find(
    (item: any) => item.id === answer.sourceId,
  );
  if (source) {
    source.includedInAnalysis = false;
    source.status = 'EXCLUDED';
    source.updatedAt = iso();
    source.version += 1;
  }
  const gap = (m11State().researchGaps[projectId] ?? []).find(
    (item: any) => item.id === question?.gapId,
  );
  if (gap) {
    gap.state = 'STALE';
    gap.updatedAt = iso();
    gap.version += 1;
  }
  persistState();
  return answer;
}

export function skipResearchQuestion(
  projectId: string,
  questionId: string,
  payload: Record<string, any>,
) {
  const question = (m11State().researchQuestions[projectId] ?? []).find(
    (item) => item.id === questionId,
  );
  if (!question) throw new ApiError(404, 'NOT_FOUND', '研究问题不存在');
  if (Number(payload.expectedVersion) !== question.version) {
    throw new ApiError(409, 'VERSION_CONFLICT', '问题版本已变化');
  }
  question.status = 'SKIPPED';
  question.updatedAt = iso();
  question.version += 1;
  question.contextFingerprint = sourceFingerprint(projectId);
  if (question.rules) {
    question.rules.applicableContextFingerprint = question.contextFingerprint;
  }
  const gap = (m11State().researchGaps[projectId] ?? []).find(
    (item) => item.id === question.gapId,
  );
  if (gap) {
    gap.state = 'SKIPPED';
    gap.updatedAt = iso();
    gap.version += 1;
  }
  persistState();
  return question;
}

export function dismissResearchQuestion(
  projectId: string,
  questionId: string,
  payload: Record<string, any>,
) {
  const question = (m11State().researchQuestions[projectId] ?? []).find(
    (item) => item.id === questionId,
  );
  if (!question) throw new ApiError(404, 'NOT_FOUND', '研究问题不存在');
  if (Number(payload.expectedVersion) !== question.version) {
    throw new ApiError(409, 'VERSION_CONFLICT', '问题版本已变化');
  }
  const reason = String(payload.reason ?? '').trim();
  if (!reason) {
    throw new ApiError(422, 'VALIDATION_ERROR', '该问题不适用时必须填写理由');
  }
  question.status = 'DISMISSED';
  question.dismissedReason = reason;
  question.updatedAt = iso();
  question.version += 1;
  question.contextFingerprint = sourceFingerprint(projectId);
  if (question.rules) {
    question.rules.applicableContextFingerprint = question.contextFingerprint;
  }
  const gap = (m11State().researchGaps[projectId] ?? []).find(
    (item) => item.id === question.gapId,
  );
  if (gap) {
    gap.state = 'DISMISSED';
    gap.updatedAt = iso();
    gap.version += 1;
  }
  persistState();
  return question;
}

export function confirmResearchFact(
  projectId: string,
  answerId: string,
  payload: Record<string, any>,
) {
  getProjectOrThrow(projectId);
  const answer = (m11State().researchAnswers[projectId] ?? []).find(
    (item) => item.id === answerId,
  );
  if (!answer) throw new ApiError(404, 'NOT_FOUND', '回答不存在');
  return {
    answerId,
    projectId,
    proposedFeature: {
      description: answer.answer,
      evidenceLevel: 'user_confirmed',
      title: String(payload.title ?? '待审核的访谈事实'),
    },
    status: 'PROPOSED_NOT_VERIFIED',
  };
}

export function getResearchHistory(projectId: string) {
  const sources = (state.ingestions[projectId]?.sources ?? []).filter(
    (item) => item.kind === 'USER_NOTE',
  );
  const answers = m11State().researchAnswers[projectId] ?? [];
  return { answers, sources };
}

export function listClaimAnchors(projectId: string, revisionId?: string) {
  getProjectOrThrow(projectId);
  return (m11State().claimAnchors[projectId] ?? []).filter(
    (item) => !revisionId || item.sourceRevisionId === revisionId,
  );
}

export function listClaimConflicts(projectId: string, status?: string) {
  getProjectOrThrow(projectId);
  return (m11State().claimConflicts[projectId] ?? []).filter(
    (item) => !status || item.status === status,
  );
}

export function getClaimConflict(projectId: string, conflictId: string) {
  const conflict = (m11State().claimConflicts[projectId] ?? []).find(
    (item) => item.id === conflictId,
  );
  if (!conflict) throw new ApiError(404, 'NOT_FOUND', '冲突不存在');
  const anchors = listClaimAnchors(projectId).filter(
    (item) => item.id === conflict.claimId,
  );
  const resolution = (m11State().conflictResolutions[projectId] ?? []).find(
    (item) => item.id === conflict.activeResolutionId,
  );
  return { anchors, conflict, resolution };
}

export function startClaimScan(
  projectId: string,
  payload: Record<string, any>,
) {
  getProjectOrThrow(projectId);
  const project = getProjectOrThrow(projectId);
  const job = createJob(projectId, 'SCAN_CLAIMS', 'NORMAL', payload);
  job.ingestionSnapshotId =
    payload.ingestionSnapshotId ??
    ensureIngestion(project.id).lastConfirmedSnapshotId;
  state.jobs[job.id] = job;
  return { jobId: job.id };
}

export function previewConflictResolution(
  projectId: string,
  conflictId: string,
  payload: Record<string, any>,
) {
  const detail = getClaimConflict(projectId, conflictId);
  const decision = String(payload.decision ?? '');
  const warnings: string[] = [];
  if (!decision) {
    throw new ApiError(422, 'CONFLICT_DECISION_INCOMPLETE', '必须选择裁决');
  }
  if (
    ['CONFIRM_A', 'CONFIRM_B', 'NOT_A_CONFLICT'].includes(decision) &&
    !String(payload.applicabilityNotes ?? '').trim()
  ) {
    warnings.push('需要说明版本、地区或套餐适用范围');
  }
  if (
    decision === 'REWRITE_SAFE' &&
    !String(payload.proposedSafeStatement ?? '').trim()
  ) {
    warnings.push('需要填写可核验的安全改写');
  }
  return {
    affectedClaimIds: detail.conflict.affectedMarketingClaimIds,
    canAutoResolve: false,
    decision,
    remainingBlockedClaimIds:
      decision === 'NEEDS_EVIDENCE'
        ? detail.conflict.affectedMarketingClaimIds
        : [],
    revisionDraftImpact:
      '裁决只会进入新的理解修订草稿；旧已批准报告不会被覆盖。',
    warnings,
  };
}

export function createConflictResolution(
  projectId: string,
  conflictId: string,
  payload: Record<string, any>,
) {
  const detail = getClaimConflict(projectId, conflictId);
  const decision = String(payload.decision ?? '');
  if (!decision || !String(payload.reason ?? '').trim()) {
    throw new ApiError(422, 'CONFLICT_DECISION_INCOMPLETE', '需要裁决与原因');
  }
  if (Number(payload.expectedVersion) !== detail.conflict.version) {
    throw new ApiError(409, 'VERSION_CONFLICT', '冲突版本已变化');
  }
  const resolution = {
    applicabilityNotes: payload.applicabilityNotes,
    approvalStatus: 'SUBMITTED',
    conflictId,
    createdAt: iso(),
    createdBy: 'demo_owner',
    decision,
    id: nextId('resolution'),
    linkedEvidenceIds: payload.linkedEvidenceIds ?? [],
    projectId,
    proposedSafeStatement: payload.proposedSafeStatement,
    reason: String(payload.reason),
    updatedAt: iso(),
    version: 1,
  };
  (m11State().conflictResolutions[projectId] ?? []).push(resolution);
  detail.conflict.activeResolutionId = resolution.id;
  detail.conflict.status = 'UNDER_REVIEW';
  detail.conflict.updatedAt = iso();
  detail.conflict.version += 1;
  persistState();
  return resolution;
}

export function approveConflictResolution(
  projectId: string,
  resolutionId: string,
  payload: Record<string, any>,
  actor: Actor,
) {
  const resolution = (m11State().conflictResolutions[projectId] ?? []).find(
    (item) => item.id === resolutionId,
  );
  if (!resolution) throw new ApiError(404, 'NOT_FOUND', '裁决建议不存在');
  if (Number(payload.expectedVersion) !== resolution.version) {
    throw new ApiError(409, 'VERSION_CONFLICT', '裁决建议版本已变化');
  }
  const conflict = (m11State().claimConflicts[projectId] ?? []).find(
    (item) => item.id === resolution.conflictId,
  );
  if (!conflict) throw new ApiError(404, 'NOT_FOUND', '冲突不存在');
  const base = latestApprovedRevision(projectId);
  if (!base)
    throw new ApiError(409, 'CONFLICT_UNRESOLVED', '没有已批准理解可派生');
  const revisions = projectRevisions(projectId);
  const draft = {
    ...clone(base),
    approvedAt: undefined,
    approvedBy: undefined,
    createdAt: iso(),
    id: nextId('revision'),
    parentRevisionId: base.id,
    relatedConflictResolutionIds: [resolution.id],
    revisionNo: Math.max(...revisions.map((item) => item.revisionNo)) + 1,
    status: 'DRAFT' as const,
    updatedAt: iso(),
    version: 1,
  };
  revisions.push(draft as UnderstandingRevision);
  ensureClaimAnchors(draft as UnderstandingRevision);
  const baseAnchor = (m11State().claimAnchors[projectId] ?? []).find(
    (item) => item.id === conflict.claimId,
  );
  if (baseAnchor) {
    const list = m11State().claimAnchors[projectId] ?? [];
    const anchorId = `claim:${draft.id}:supersedes:${baseAnchor.id}`;
    if (!list.some((item) => item.id === anchorId)) {
      list.push({
        ...baseAnchor,
        createdAt: iso(),
        id: anchorId,
        sourceEvidenceIds:
          resolution.linkedEvidenceIds.length > 0
            ? resolution.linkedEvidenceIds
            : baseAnchor.sourceEvidenceIds,
        sourceRevisionId: draft.id,
        statementSnapshot:
          resolution.proposedSafeStatement ?? baseAnchor.statementSnapshot,
        supersedesClaimAnchorId: baseAnchor.id,
      });
    }
    m11State().claimAnchors[projectId] = list;
  }
  resolution.approvalStatus = 'APPROVED';
  resolution.proposedUnderstandingRevisionId = draft.id;
  resolution.reviewedAt = iso();
  resolution.reviewedBy = actor.id;
  resolution.updatedAt = iso();
  resolution.version += 1;
  conflict.status = 'UNDER_REVIEW';
  conflict.updatedAt = iso();
  conflict.version += 1;
  persistState();
  return { conflict, draft, resolution };
}

export function listClaimReadiness(projectId: string, revisionId: string) {
  getProjectOrThrow(projectId);
  const revision = projectRevisions(projectId).find(
    (item) => item.id === revisionId,
  );
  if (!revision) throw new ApiError(404, 'NOT_FOUND', '理解修订不存在');
  const anchors = (m11State().claimAnchors[projectId] ?? []).filter(
    (item) => item.sourceRevisionId === revisionId,
  );
  const conflicts = m11State().claimConflicts[projectId] ?? [];
  const resolutions = m11State().conflictResolutions[projectId] ?? [];
  return anchors.map((anchor) => {
    const related = conflicts.filter(
      (conflict) =>
        (conflict.claimId === anchor.id ||
          (anchor.supersedesClaimAnchorId &&
            conflict.claimId === anchor.supersedesClaimAnchorId)) &&
        ['OPEN', 'REOPENED', 'UNDER_REVIEW'].includes(conflict.status),
    );
    const resolvedForThisRevision = related.some((conflict) => {
      const resolution = resolutions.find(
        (item) => item.id === conflict.activeResolutionId,
      );
      return (
        resolution?.approvalStatus === 'APPROVED' &&
        resolution.proposedUnderstandingRevisionId === revisionId
      );
    });
    const unsupported = related.some(
      (conflict) =>
        conflict.conflictType === 'QUANTIFIED_CLAIM_UNSUPPORTED' ||
        (conflict.evidenceIdsA.length === 0 &&
          conflict.evidenceIdsB.length === 0),
    );
    const factual = related.some(
      (conflict) => conflict.conflictType === 'FACTUAL_CONTRADICTION',
    );
    const noEvidence = (anchor.sourceEvidenceIds ?? []).length === 0;
    const highRisk = /(\d+%|提升|第一|最大|最低|唯一)/.test(
      anchor.statementSnapshot,
    );
    return {
      claimAnchorId: anchor.id,
      evaluatedForRevisionId: revisionId,
      reasonCodes: resolvedForThisRevision
        ? ['RESOLUTION_APPROVED_FOR_REVISION']
        : unsupported
          ? ['QUANTIFIED_CLAIM_UNSUPPORTED']
          : factual
            ? ['FACTUAL_CONFLICT_OPEN']
            : noEvidence
              ? ['NO_REVERSE_EVIDENCE']
              : [],
      relatedConflictIds: related.map((item) => item.id),
      status: resolvedForThisRevision
        ? 'NEEDS_REVIEW'
        : unsupported || (noEvidence && highRisk)
          ? 'BLOCKED'
          : factual || noEvidence
            ? 'NEEDS_REVIEW'
            : 'USABLE',
    };
  });
}

function readinessItem(
  key: string,
  label: string,
  status: 'BLOCKED' | 'FUTURE' | 'NOT_APPLICABLE' | 'PASS' | 'WARN',
  reason?: string,
  actionRoute?: string,
  affectedShotIds?: string[],
) {
  return { actionRoute, affectedShotIds, key, label, reason, status };
}

export function getProductionReadiness(projectId: string) {
  const project = getProjectOrThrow(projectId);
  const revision = latestApprovedRevision(projectId);
  const m2 = m2State();
  const brief = (m2.briefs[projectId] ?? []).find(
    (item) => item.status === 'APPROVED',
  );
  const concept = (m2.concepts[projectId] ?? []).find(
    (item) => item.status === 'APPROVED',
  );
  const script = (m2.scripts[projectId] ?? []).find(
    (item) => item.status === 'APPROVED',
  );
  const bible = (m2.visualBibles[projectId] ?? []).find(
    (item) => item.status === 'APPROVED',
  );
  const board = (m2.storyboards[projectId] ?? []).find(
    (item) => item.status === 'APPROVED',
  );
  const animatic = (m2.animatics[projectId] ?? []).find(
    (item) => item.status === 'APPROVED',
  );
  const shots = board
    ? (m2.shots[projectId] ?? []).filter((shot: any) =>
        board.orderedShotRevisionIds.includes(shot.id),
      )
    : [];
  const missingShotIds = shots
    .filter((shot: any) => shot.reviewStatus !== 'APPROVED')
    .map((shot: any) => shot.shotId);
  const missingRefShotIds = shots
    .filter(
      (shot: any) =>
        !shot.activeReferenceImageId ||
        !(shot.referenceImageVersionIds ?? []).includes(
          shot.activeReferenceImageId,
        ),
    )
    .map((shot: any) => shot.shotId);
  const claimItems = revision ? listClaimReadiness(projectId, revision.id) : [];
  const claimAnchors = revision ? listClaimAnchors(projectId, revision.id) : [];
  const blockedClaims = claimItems.filter((item) => item.status === 'BLOCKED');
  const reviewClaims = claimItems.filter(
    (item) => item.status === 'NEEDS_REVIEW',
  );
  const blockedShotIds = [
    ...new Set(
      blockedClaims.flatMap((claim) => {
        const anchor = claimAnchors.find(
          (item: any) => item.id === claim.claimAnchorId,
        );
        return shots
          .filter((shot: any) =>
            (shot.evidenceIds ?? []).some((id: string) =>
              (anchor?.sourceEvidenceIds ?? []).includes(id),
            ),
          )
          .map((shot: any) => shot.shotId);
      }),
    ),
  ];
  const understandingOk = revision && revision.status === 'APPROVED';
  const items = [
    readinessItem(
      'understanding',
      '产品理解已批准',
      understandingOk ? 'PASS' : 'BLOCKED',
      understandingOk ? `使用 ${revision.id}` : '需要先在 M1 审核通过产品理解',
      `/studio/${projectId}/understanding`,
    ),
    readinessItem(
      'brief',
      '创意 Brief 已批准',
      brief ? 'PASS' : 'BLOCKED',
      brief ? brief.id : '需要先确认创意 Brief',
      `/studio/${projectId}/angles`,
    ),
    readinessItem(
      'concept',
      '创意方案已批准',
      concept ? 'PASS' : 'BLOCKED',
      concept ? concept.id : '需要先审核通过一套创意方案',
      `/studio/${projectId}/concepts`,
    ),
    readinessItem(
      'script',
      '剧本与时长有效',
      script ? 'PASS' : 'BLOCKED',
      script ? script.id : '需要已批准剧本',
      `/studio/${projectId}/script`,
    ),
    readinessItem(
      'visualBible',
      '视觉规范已批准',
      bible ? 'PASS' : 'BLOCKED',
      bible ? bible.id : '需要已批准 Visual Bible',
      `/studio/${projectId}/storyboard`,
    ),
    readinessItem(
      'shots',
      '当前镜头全部已批准',
      shots.length > 0 && missingShotIds.length === 0 ? 'PASS' : 'BLOCKED',
      shots.length === 0
        ? '当前没有已批准分镜'
        : missingShotIds.length > 0
          ? `${missingShotIds.length} 个镜头未批准：${missingShotIds.join('、')}`
          : `${shots.length}/${shots.length} 已批准`,
      `/studio/${projectId}/storyboard`,
      missingShotIds,
    ),
    readinessItem(
      'referenceImages',
      '参考图有效',
      shots.length > 0 && missingRefShotIds.length === 0 ? 'PASS' : 'BLOCKED',
      missingRefShotIds.length > 0
        ? `缺少有效参考图：${missingRefShotIds.join('、')}`
        : '每个镜头均已选择属于自身的参考图',
      `/studio/${projectId}/storyboard`,
      missingRefShotIds,
    ),
    readinessItem(
      'animatic',
      '预演已批准且当前有效',
      animatic ? 'PASS' : 'BLOCKED',
      animatic ? animatic.id : '需要先生成并确认 AnimaticSnapshot',
      `/studio/${projectId}/animatic`,
    ),
    readinessItem(
      'claims',
      '宣传主张可用性',
      blockedClaims.length > 0
        ? 'BLOCKED'
        : reviewClaims.length > 0
          ? 'WARN'
          : 'PASS',
      blockedClaims.length > 0
        ? `${blockedClaims.length} 个主张被阻塞：${blockedClaims
            .map((item) => item.claimAnchorId)
            .join('、')}`
        : reviewClaims.length > 0
          ? `${reviewClaims.length} 个主张需要复核`
          : '没有阻塞主张',
      `/studio/${projectId}/understanding`,
      blockedShotIds,
    ),
    readinessItem(
      'model',
      'M3 模型选择',
      'FUTURE',
      'M3 才选择模型，不阻塞 M2 预演',
    ),
    readinessItem(
      'budget',
      'M3 预算/报价',
      'FUTURE',
      '进入 M3 准备不等于付费；本期不报价',
    ),
  ];
  const blocking = items.some((item) => item.status === 'BLOCKED');
  return {
    animaticSnapshotId: animatic?.id,
    canEnterM3: Boolean(
      understandingOk &&
      brief &&
      concept &&
      script &&
      bible &&
      board &&
      animatic &&
      shots.length > 0 &&
      missingShotIds.length === 0 &&
      missingRefShotIds.length === 0 &&
      blockedClaims.length === 0,
    ),
    effectiveValidity: blocking
      ? 'BLOCKED'
      : reviewClaims.length > 0
        ? 'REVIEW_REQUIRED'
        : 'CURRENT',
    evaluatedAt: iso(),
    hasUnapprovedDrafts: (m2.scripts[projectId] ?? []).some(
      (item) => item.status !== 'APPROVED',
    ),
    items,
    projectId: project.id,
    storyboardRevisionId: board?.id,
    understandingRevisionId: revision?.id ?? '',
  };
}

export function previewDependencyImpact(
  projectId: string,
  payload: Record<string, any>,
) {
  getProjectOrThrow(projectId);
  const changeKind = String(payload.changeKind ?? 'ASSET_CONTENT');
  const affected: any[] = [];
  if (payload.assetId) {
    const usage = listAssetUsage(projectId, String(payload.assetId));
    for (const item of usage) {
      affected.push({
        actionRoute:
          item.targetType === 'VISUAL_BIBLE_REVISION'
            ? `/studio/${projectId}/storyboard`
            : `/studio/${projectId}/ingest`,
        effectiveValidity:
          item.targetType === 'VISUAL_BIBLE_REVISION'
            ? 'REVIEW_REQUIRED'
            : 'CURRENT',
        objectId: item.targetId,
        objectLabel: item.usageRole,
        objectType:
          item.targetType === 'VISUAL_BIBLE_REVISION'
            ? 'VISUAL_BIBLE'
            : 'ASSET',
        reason: '素材内容版本变化会影响引用它的草稿或已批准版本',
      });
    }
  }
  if (payload.shotId) {
    const shot = (state.m2?.shots[projectId] ?? []).find(
      (item: any) =>
        item.shotId === payload.shotId || item.id === payload.shotId,
    );
    if (shot) {
      affected.push({
        actionRoute: `/studio/${projectId}/storyboard`,
        effectiveValidity: 'REVIEW_REQUIRED',
        objectId: shot.id,
        objectLabel: `镜头 ${shot.order} · ${shot.title}`,
        objectType: 'SHOT',
        reason: '镜头引用或内容发生变化',
      });
    }
  }
  if (changeKind === 'FACT' && payload.claimAnchorId) {
    const anchor = (m11State().claimAnchors[projectId] ?? []).find(
      (item) => item.id === payload.claimAnchorId,
    );
    if (anchor) {
      affected.push({
        actionRoute: `/studio/${projectId}/understanding`,
        effectiveValidity: 'BLOCKED',
        objectId: anchor.id,
        objectLabel: anchor.statementSnapshot,
        objectType: 'CONCEPT',
        reason: '产品事实变化会影响引用该主张的创意和脚本',
      });
    }
  }
  return {
    affected,
    changeKind,
    evaluatedAt: iso(),
    projectId,
    requiresNewReview: affected.length > 0,
    sourceId: String(
      payload.assetId ?? payload.claimAnchorId ?? payload.shotId ?? '',
    ),
    summary:
      affected.length > 0
        ? `${affected.length} 个对象引用受影响；旧已批准快照仍只读保留。`
        : '没有发现下游引用。',
  };
}

function currentGenerationBoard(projectId: string) {
  return (state.m2?.storyboards[projectId] ?? []).find(
    (item: any) => item.status === 'APPROVED',
  );
}

export function getGenerationSpecs(projectId: string) {
  const project = getProjectOrThrow(projectId);
  const board = currentGenerationBoard(projectId);
  const bible = (state.m2?.visualBibles[projectId] ?? []).find(
    (item: any) => item.status === 'APPROVED',
  );
  const shots = board
    ? (state.m2?.shots[projectId] ?? []).filter((shot: any) =>
        board.orderedShotRevisionIds.includes(shot.id),
      )
    : [];
  const stored = m21State().generationSpecs[projectId] ?? [];
  return shots.map((shot: any) => {
    const spec = stored.find((item) => item.shotId === shot.shotId);
    const suggestion = {
      expectedDurationMs: shot.durationMs,
      mode: shot.generationMode,
      outputAspectRatio: project.aspectRatio,
      referenceAssetVersionIds: [],
      referenceImageVersionIds: shot.referenceImageVersionIds ?? [],
      shotId: shot.shotId,
      shotRevisionId: shot.id,
      visualBibleVersionId: bible?.id ?? '',
    };
    if (!spec) {
      return {
        comparedAt: iso(),
        currentApprovedShotRevisionId: shot.id,
        outdatedReasonCodes: [],
        shotId: shot.shotId,
        specValidity: 'NOT_CONFIGURED',
        suggestedSpec: suggestion,
      };
    }
    const reasons: string[] = [];
    if (spec.shotRevisionId !== shot.id) reasons.push('SHOT_REVISION_CHANGED');
    if (spec.sourceShotRevisionVersion !== shot.version) {
      reasons.push('SHOT_VERSION_CHANGED');
    }
    if (spec.visualBibleVersionId !== bible?.id) {
      reasons.push('VISUAL_BIBLE_CHANGED');
    }
    if (spec.outputAspectRatio !== project.aspectRatio) {
      reasons.push('ASPECT_RATIO_CHANGED');
    }
    if (
      !(shot.referenceImageVersionIds ?? []).includes(
        shot.activeReferenceImageId,
      )
    ) {
      reasons.push('REFERENCE_IMAGE_CHANGED');
    }
    return {
      comparedAt: iso(),
      currentApprovedShotRevisionId: shot.id,
      outdatedReasonCodes: reasons,
      shotId: shot.shotId,
      spec,
      specValidity: reasons.length > 0 ? 'OUTDATED' : 'CURRENT',
      suggestedSpec: suggestion,
    };
  });
}

export function putGenerationSpec(
  projectId: string,
  payload: Record<string, any>,
) {
  getProjectOrThrow(projectId);
  const board = currentGenerationBoard(projectId);
  if (!board) {
    throw new ApiError(409, 'CLAIM_BLOCKED', '当前没有已批准分镜');
  }
  const input = payload.spec ?? payload;
  const shotId = String(input.shotId ?? '');
  const shot = (state.m2?.shots[projectId] ?? []).find(
    (item: any) =>
      item.shotId === shotId && board.orderedShotRevisionIds.includes(item.id),
  );
  if (!shot) throw new ApiError(404, 'NOT_FOUND', '当前正式镜头不存在');
  if (String(payload.expectedApprovedShotRevisionId ?? shot.id) !== shot.id) {
    throw new ApiError(409, 'GENERATION_SPEC_OUTDATED', '正式镜头已变化', {
      currentApprovedShotRevisionId: shot.id,
    });
  }
  for (const assetVersionId of input.referenceAssetVersionIds ?? []) {
    const version = (m11State().assetContentVersions[projectId] ?? []).find(
      (item) => item.id === assetVersionId,
    );
    if (!version || version.status !== 'READY') {
      throw new ApiError(
        422,
        'ASSET_CONTENT_UNAVAILABLE',
        `引用内容版本不可用：${assetVersionId}`,
      );
    }
  }
  for (const imageVersionId of input.referenceImageVersionIds ?? []) {
    if (
      !(m2State().images[projectId] ?? []).some(
        (item: any) =>
          item.id === imageVersionId && item.shotId === shot.shotId,
      )
    ) {
      throw new ApiError(
        422,
        'VALIDATION_ERROR',
        `参考图不属于当前镜头：${imageVersionId}`,
      );
    }
  }
  if (
    input.visualBibleVersionId &&
    input.visualBibleVersionId !== getActiveVisualBible(projectId)?.id
  ) {
    throw new ApiError(422, 'VALIDATION_ERROR', '视觉规范不是当前正式版本');
  }
  if (input.outputAspectRatio !== getProjectOrThrow(projectId).aspectRatio) {
    throw new ApiError(422, 'VALIDATION_ERROR', '画幅与项目不一致');
  }
  if (input.mode !== shot.generationMode) {
    throw new ApiError(422, 'VALIDATION_ERROR', '生成方式必须与已批准镜头一致');
  }
  if (Number(input.expectedDurationMs) !== shot.durationMs) {
    throw new ApiError(422, 'VALIDATION_ERROR', '时长必须与已批准镜头一致');
  }
  const specList = m21State().generationSpecs[projectId] ?? [];
  const existing = specList.find((item) => item.shotId === shotId);
  if (
    existing &&
    payload.expectedVersion !== undefined &&
    Number(payload.expectedVersion) !== existing.version
  ) {
    throw new ApiError(409, 'VERSION_CONFLICT', '生成建议版本已变化');
  }
  const timestamp = iso();
  if (existing) {
    Object.assign(existing, input, {
      updatedAt: timestamp,
      version: existing.version + 1,
    });
    persistState();
    return existing;
  }
  const spec = {
    ...input,
    createdAt: timestamp,
    id: nextId('generationspec'),
    projectId,
    shotId,
    shotRevisionId: shot.id,
    sourceShotRevisionVersion: shot.version,
    updatedAt: timestamp,
    version: 1,
  };
  specList.push(spec);
  m21State().generationSpecs[projectId] = specList;
  persistState();
  return spec;
}

seedM11();
seedM21();
