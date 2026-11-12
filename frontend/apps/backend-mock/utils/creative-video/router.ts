import type { Actor } from './domain';

import { getHeader, getRequestURL, readBody, setResponseStatus } from 'h3';
import { verifyAccessToken } from '~/utils/jwt-utils';

import {
  addRevisionComment,
  addShot,
  answerResearchQuestion,
  ApiError,
  approveAnimatic,
  approveConcept,
  approveConflictResolution,
  approveCreativeBrief,
  approveRevision,
  approveScript,
  approveShot,
  approveStoryboard,
  approveVisualBible,
  archiveProject,
  batchApproveShots,
  cancelJob,
  commentAnimatic,
  confirmIngestion,
  createAsset,
  createAssetContentVersion,
  createConflictResolution,
  createCreativeBrief,
  createDemoSession,
  createDirectionPlan,
  createProject,
  createResearchSession,
  createShotRevision,
  deleteAsset,
  deleteProject,
  deleteShot,
  discardDirectionPlan,
  duplicateProject,
  duplicateShot,
  evaluateDurationPlan,
  exploreDemo,
  favoriteConcept,
  findIdempotency,
  forkAngleSet,
  forkConcept,
  forkRevision,
  forkScript,
  forkVisualBible,
  getActiveConcept,
  getActiveCreativeBrief,
  getActiveScript,
  getActiveUnderstanding,
  getActiveVisualBible,
  getAnglesState,
  getAnimaticState,
  getAssetUsageMetadata,
  getClaimConflict,
  getConcept,
  getConceptGroup,
  getDirectionPlan,
  getDurationPlans,
  getEvidenceList,
  getGenerationSpecs,
  getHandoff,
  getIngestion,
  getJob,
  getM2Handoff,
  getProductionReadiness,
  getProject,
  getProjectList,
  getReferenceAdInsight,
  getResearchHistory,
  getResearchSessionView,
  getRevision,
  getScript,
  getScriptsState,
  getShot,
  getShotRevisions,
  getShots,
  getSnapshots,
  getStaleImpact,
  getStoryboardState,
  getUnderstandingDiff,
  listAssetContentVersions,
  listAssetUsage,
  listClaimAnchors,
  listClaimConflicts,
  listClaimReadiness,
  listConceptGroups,
  listDirectorMessages,
  listEvidenceSnapshots,
  listProjectJobs,
  listReferenceAdInsights,
  listResearchGaps,
  listResearchQuestions,
  listRevisions,
  listVisualBibles,
  mergeShots,
  nextResearchQuestions,
  patchAngleSet,
  patchAssetUsageMetadata,
  patchConcept,
  patchConceptMoodboard,
  patchDurationPlan,
  patchScript,
  patchShot,
  patchVisualBible,
  persistState,
  previewAssetReference,
  previewAssetReplacement,
  previewConflictResolution,
  previewDependencyImpact,
  putGenerationSpec,
  rejectAnimatic,
  rejectConcept,
  rejectRevision,
  rejectScript,
  rejectShot,
  reorderShots,
  resetAll,
  restoreProject,
  restoreState,
  revokeDemoSession,
  revokeResearchAnswer,
  saveIdempotency,
  selectConcept,
  selectReferenceImage,
  setAngleSetReferenceInsight,
  skipResearchQuestion,
  splitShot,
  startAngleGeneration,
  startAnimaticBuild,
  startClaimScan,
  startConceptGeneration,
  startReferenceAdAnalysis,
  startReferenceAdReanalysis,
  startReferenceImageGeneration,
  startScriptGeneration,
  startStoryboardGeneration,
  startUnderstanding,
  startUrlAnalysis,
  startVisualBibleGeneration,
  submitConceptReview,
  submitRevision,
  submitScriptReview,
  undeleteProject,
  updateAsset,
  updateProject,
  updateRevision,
  updateSource,
  writeAssetReference,
} from './store';

interface HandlerResult {
  body: unknown;
  status: number;
}

restoreState();

const BASE = '/api/creative-video/v1';

function requestId(): string {
  return `req-m1-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function ok(data: unknown, message = 'success', status = 200): HandlerResult {
  return {
    body: {
      code: 'OK',
      data,
      message,
      requestId: requestId(),
      timestamp: new Date().toISOString(),
    },
    status,
  };
}

function fail(
  status: number,
  code: string,
  message: string,
  data: unknown = null,
): HandlerResult {
  return {
    body: {
      code,
      data,
      message,
      requestId: requestId(),
      timestamp: new Date().toISOString(),
    },
    status,
  };
}

function getActor(event: any): Actor {
  const userinfo = verifyAccessToken(event);
  if (!userinfo) {
    throw new ApiError(401, 'UNAUTHORIZED', '登录状态已失效，请重新登录');
  }
  const role = (userinfo.roles?.[0] ?? 'viewer') as string;
  return {
    id: `demo_${role}`,
    roles: userinfo.roles ?? [],
    username: userinfo.username,
  };
}

function hasRole(actor: Actor, roles: string[]) {
  return actor.roles.some((role) => roles.includes(role));
}

async function readOptionalBody(event: any): Promise<Record<string, any>> {
  try {
    const body = await readBody(event);
    return (body ?? {}) as Record<string, any>;
  } catch {
    return {};
  }
}

function requireRole(actor: Actor, roles: string[]) {
  if (!hasRole(actor, roles)) {
    throw new ApiError(403, 'FORBIDDEN', '当前演示角色无权执行该操作');
  }
}

function requireApprover(actor: Actor, projectId: string) {
  const project = getProject(projectId);
  if (hasRole(actor, ['owner'])) {
    return;
  }
  if (hasRole(actor, ['reviewer']) && project.reviewerCanApprove) {
    return;
  }
  throw new ApiError(
    403,
    'FORBIDDEN',
    '当前角色没有该项目的审核权，请由项目拥有者或获授权的审核员确认',
  );
}

const isOwner = (actor: Actor) => hasRole(actor, ['owner']);

function match(path: string, pattern: RegExp): null | RegExpMatchArray {
  return path.match(pattern);
}

async function handle(
  event: any,
  path: string,
  method: string,
): Promise<HandlerResult> {
  const url = getRequestURL(event);

  // 健康检查公开访问
  if (method === 'GET' && path === '/health') {
    return ok(
      {
        capabilities: {
          mode: 'MOCK',
          service: 'vidcraft-mock-m1',
          status: 'ok',
        },
        serverTime: new Date().toISOString(),
      },
      'success',
    );
  }

  const actor = getActor(event);
  const projectWrite = path.match(/^\/projects\/([^/]+)(?:\/(.*))?$/);
  if (
    projectWrite &&
    method !== 'GET' &&
    !(method === 'DELETE' && !projectWrite[2]) &&
    !['archive', 'duplicate', 'restore', 'undelete'].includes(
      projectWrite[2] ?? '',
    ) &&
    getProject(projectWrite[1] ?? '').archivedAt
  )
    throw new ApiError(409, 'CONFLICT', '项目已归档，请先恢复后编辑');

  if (method === 'GET' && path === '/projects') {
    return ok(
      getProjectList({
        ...Object.fromEntries(url.searchParams.entries()),
        ownerId: actor.id,
      }),
    );
  }

  if (method === 'GET' && path === '/demo/users') {
    return ok([
      {
        code: 'owner',
        displayName: '产品拥有者（演示）',
        scope: '全部常规业务菜单、创意审核与模拟费用入口。',
        username: 'owner',
      },
      {
        code: 'editor',
        displayName: '内容编辑（演示）',
        scope: '项目、素材、任务；账单入口可见但访问会返回 403。',
        username: 'editor',
      },
      {
        code: 'reviewer',
        displayName: '审核员（演示）',
        scope: '项目与任务中心待审核入口，可审核确认（按项目授权）。',
        username: 'reviewer',
      },
      {
        code: 'admin',
        displayName: '系统管理员（演示）',
        scope: '只读访问与演示重置，不默认获得客户资料编辑权。',
        username: 'admin',
      },
    ]);
  }

  if (method === 'GET' && path === '/demo/forbidden') {
    throw new ApiError(403, 'FORBIDDEN', '当前演示角色无权访问该页面');
  }

  if (method === 'GET' && path === '/demo/conflict') {
    throw new ApiError(409, 'VERSION_CONFLICT', '项目版本已变化，请刷新后重试');
  }

  if (method === 'GET' && path === '/demo/error') {
    throw new ApiError(500, 'MOCK_PROCESSING_FAILED', '演示服务内部错误');
  }

  if (method === 'POST' && path === '/projects') {
    requireRole(actor, ['editor', 'owner']);
    const body = (await readBody(event)) as Record<string, any>;
    const idempotency = useIdempotency(event, actor, body, url.pathname);
    if (idempotency?.replay) {
      return {
        body: idempotency.replay.body,
        status: idempotency.replay.status,
      };
    }
    const project = createProject(body, actor);
    const result = ok(project, 'created', 201);
    idempotency?.save(result);
    return result;
  }

  let params = match(path, /^\/projects\/([^/]+)$/);
  if (params) {
    const [, id = ''] = params;
    if (method === 'GET') {
      return ok(getProject(id));
    }
    if (method === 'PATCH') {
      requireRole(actor, ['editor', 'owner']);
      return ok(
        updateProject(id, (await readBody(event)) as Record<string, any>),
      );
    }
    if (method === 'DELETE') {
      requireRole(actor, ['owner']);
      const body = (await readOptionalBody(event)) as Record<string, any>;
      return ok(deleteProject(id, body));
    }
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/(duplicate|archive|restore|undelete)$/,
  );
  if (params && method === 'POST') {
    const [, id = '', action = ''] = params;
    const body = (await readOptionalBody(event)) as Record<string, any>;
    if (action === 'duplicate') {
      requireRole(actor, ['editor', 'owner']);
      return ok(duplicateProject(id, actor, body), 'duplicated', 201);
    }
    requireRole(actor, ['owner']);
    if (action === 'archive') {
      return ok(archiveProject(id, body));
    }
    if (action === 'restore') {
      return ok(restoreProject(id, body));
    }
    return ok(undeleteProject(id, body));
  }

  if (method === 'GET' && /^\/projects\/[^/]+\/stale-impact$/.test(path)) {
    const id = path.split('/')[2] ?? '';
    return ok(getStaleImpact(id));
  }

  if (method === 'GET' && /^\/projects\/[^/]+\/ingestion$/.test(path)) {
    const id = path.split('/')[2] ?? '';
    return ok(getIngestion(id));
  }

  params = match(path, /^\/projects\/([^/]+)\/ingestion\/analyze-url$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const id = params[1] ?? '';
    const body = (await readBody(event)) as Record<string, any>;
    const idempotency = useIdempotency(event, actor, body, url.pathname);
    if (idempotency?.replay) {
      return {
        body: idempotency.replay.body,
        status: idempotency.replay.status,
      };
    }
    const result = ok(startUrlAnalysis(id, body, actor), 'accepted', 202);
    idempotency?.save(result);
    return result;
  }

  params = match(path, /^\/projects\/([^/]+)\/ingestion\/confirm$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const id = params[1] ?? '';
    const body = (await readBody(event)) as Record<string, any>;
    const idempotency = useIdempotency(event, actor, body, url.pathname);
    if (idempotency?.replay) {
      return {
        body: idempotency.replay.body,
        status: idempotency.replay.status,
      };
    }
    const result = ok(
      confirmIngestion(id, body, actor),
      'snapshot_confirmed',
      201,
    );
    idempotency?.save(result);
    return result;
  }

  if (
    method === 'GET' &&
    /^\/projects\/[^/]+\/ingestion\/snapshots$/.test(path)
  ) {
    const id = path.split('/')[2] ?? '';
    return ok(getSnapshots(id));
  }

  if (method === 'GET' && /^\/projects\/[^/]+\/sources$/.test(path)) {
    const id = path.split('/')[2] ?? '';
    return ok(getIngestion(id).sources);
  }

  params = match(path, /^\/projects\/([^/]+)\/sources\/([^/]+)$/);
  if (params && method === 'PATCH') {
    requireRole(actor, ['editor', 'owner']);
    const [, id = '', sourceId = ''] = params;
    return ok(
      updateSource(
        id,
        sourceId,
        (await readBody(event)) as Record<string, any>,
      ),
    );
  }

  if (method === 'GET' && /^\/projects\/[^/]+\/assets$/.test(path)) {
    const id = path.split('/')[2] ?? '';
    return ok(getIngestion(id).assets);
  }

  params = match(path, /^\/projects\/([^/]+)\/assets$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const id = params[1] ?? '';
    const body = (await readBody(event)) as Record<string, any>;
    const idempotency = useIdempotency(event, actor, body, url.pathname);
    if (idempotency?.replay) {
      return {
        body: idempotency.replay.body,
        status: idempotency.replay.status,
      };
    }
    const result = ok(createAsset(id, body), 'asset_created', 201);
    idempotency?.save(result);
    return result;
  }

  // M1.1 / M2.1 P0 增量接口
  params = match(
    path,
    /^\/projects\/([^/]+)\/assets\/([^/]+)\/content-versions$/,
  );
  if (params) {
    const [, id = '', assetId = ''] = params;
    if (method === 'GET') {
      return ok(listAssetContentVersions(id, assetId));
    }
    requireRole(actor, ['editor', 'owner']);
    const body = (await readBody(event)) as Record<string, any>;
    const idempotency = useIdempotency(event, actor, body, url.pathname);
    if (idempotency?.replay) {
      return {
        body: idempotency.replay.body,
        status: idempotency.replay.status,
      };
    }
    const result = ok(
      createAssetContentVersion(id, assetId, body),
      'asset_content_version_created',
      201,
    );
    idempotency?.save(result);
    return result;
  }

  params = match(path, /^\/projects\/([^/]+)\/assets\/([^/]+)\/references$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    return ok(
      writeAssetReference(
        params[1] ?? '',
        params[2] ?? '',
        (await readBody(event)) as Record<string, any>,
      ),
      'asset_reference_created',
      201,
    );
  }

  params = match(path, /^\/projects\/([^/]+)\/assets\/references\/([^/]+)$/);
  if (params && method === 'DELETE') {
    requireRole(actor, ['editor', 'owner']);
    return ok(
      deleteAssetReference(
        params[1] ?? '',
        params[2] ?? '',
        (await readOptionalBody(event)) as Record<string, any>,
      ),
    );
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/assets\/([^/]+)\/replace-preview$/,
  );
  if (params && method === 'POST') {
    return ok(
      previewAssetReplacement(
        params[1] ?? '',
        params[2] ?? '',
        (await readBody(event)) as Record<string, any>,
      ),
    );
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/assets\/([^/]+)\/reference-preview$/,
  );
  if (params && method === 'POST') {
    return ok(
      previewAssetReference(
        params[1] ?? '',
        params[2] ?? '',
        (await readBody(event)) as Record<string, any>,
      ),
    );
  }

  params = match(path, /^\/projects\/([^/]+)\/assets\/([^/]+)\/usage$/);
  if (params && method === 'GET') {
    return ok(listAssetUsage(params[1] ?? '', params[2] ?? ''));
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/assets\/([^/]+)\/usage-metadata$/,
  );
  if (params) {
    const [, id = '', assetId = ''] = params;
    if (method === 'GET') {
      return ok(getAssetUsageMetadata(id, assetId));
    }
    if (method === 'PATCH') {
      requireRole(actor, ['editor', 'owner']);
      return ok(
        patchAssetUsageMetadata(
          id,
          assetId,
          (await readBody(event)) as Record<string, any>,
        ),
      );
    }
  }

  params = match(path, /^\/projects\/([^/]+)\/reference-ads$/);
  if (params && method === 'GET') {
    return ok(listReferenceAdInsights(params[1] ?? ''));
  }
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    return ok(
      startReferenceAdAnalysis(
        params[1] ?? '',
        (await readBody(event)) as Record<string, any>,
      ),
      'reference_ad_analysis_started',
      202,
    );
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/reference-ads\/([^/]+)\/reanalyze$/,
  );
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    return ok(
      startReferenceAdReanalysis(params[1] ?? '', params[2] ?? ''),
      'reference_ad_reanalysis_started',
      202,
    );
  }

  params = match(path, /^\/projects\/([^/]+)\/reference-ads\/([^/]+)$/);
  if (params && method === 'GET') {
    return ok(getReferenceAdInsight(params[1] ?? '', params[2] ?? ''));
  }

  params = match(path, /^\/projects\/([^/]+)\/research\/gaps$/);
  if (params && method === 'GET') {
    return ok(listResearchGaps(params[1] ?? ''));
  }

  params = match(path, /^\/projects\/([^/]+)\/research\/questions$/);
  if (params && method === 'GET') {
    return ok(listResearchQuestions(params[1] ?? ''));
  }

  params = match(path, /^\/projects\/([^/]+)\/research\/gaps\/evaluate$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    return ok(
      { evaluated: true, gaps: listResearchGaps(params[1] ?? '').gaps },
      'gaps_evaluated',
      202,
    );
  }

  params = match(path, /^\/projects\/([^/]+)\/research\/sessions$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const body = (await readBody(event)) as Record<string, any>;
    const idempotency = useIdempotency(event, actor, body, url.pathname);
    if (idempotency?.replay) {
      return {
        body: idempotency.replay.body,
        status: idempotency.replay.status,
      };
    }
    const result = ok(
      createResearchSession(params[1] ?? '', body),
      'research_session_created',
      201,
    );
    idempotency?.save(result);
    return result;
  }

  params = match(path, /^\/projects\/([^/]+)\/research\/sessions\/([^/]+)$/);
  if (params && method === 'GET') {
    return ok(getResearchSessionView(params[1] ?? '', params[2] ?? ''));
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/research\/sessions\/([^/]+)\/questions\/next$/,
  );
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    return ok(
      nextResearchQuestions(
        params[1] ?? '',
        params[2] ?? '',
        (await readBody(event)) as Record<string, any>,
      ),
    );
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/research\/answers\/([^/]+)\/revoke$/,
  );
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    return ok(revokeResearchAnswer(params[1] ?? '', params[2] ?? ''));
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/research\/questions\/([^/]+)\/answers$/,
  );
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const body = (await readBody(event)) as Record<string, any>;
    const idempotency = useIdempotency(event, actor, body, url.pathname);
    if (idempotency?.replay) {
      return {
        body: idempotency.replay.body,
        status: idempotency.replay.status,
      };
    }
    const result = ok(
      answerResearchQuestion(params[1] ?? '', params[2] ?? '', body),
      'research_answer_created',
      201,
    );
    idempotency?.save(result);
    return result;
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/research\/questions\/([^/]+)\/dismiss$/,
  );
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    return ok(
      dismissResearchQuestion(
        params[1] ?? '',
        params[2] ?? '',
        (await readBody(event)) as Record<string, any>,
      ),
    );
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/research\/questions\/([^/]+)\/skip$/,
  );
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    return ok(
      skipResearchQuestion(
        params[1] ?? '',
        params[2] ?? '',
        (await readBody(event)) as Record<string, any>,
      ),
    );
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/research\/answers\/([^/]+)\/confirm-fact$/,
  );
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    return ok(
      confirmResearchFact(
        params[1] ?? '',
        params[2] ?? '',
        (await readBody(event)) as Record<string, any>,
      ),
    );
  }

  params = match(path, /^\/projects\/([^/]+)\/research\/history$/);
  if (params && method === 'GET') {
    return ok(getResearchHistory(params[1] ?? ''));
  }

  params = match(path, /^\/projects\/([^/]+)\/claims\/anchors$/);
  if (params && method === 'GET') {
    return ok(
      listClaimAnchors(
        params[1] ?? '',
        typeof url.searchParams.get('revisionId') === 'string'
          ? (url.searchParams.get('revisionId') as string)
          : undefined,
      ),
    );
  }

  params = match(path, /^\/projects\/([^/]+)\/claims\/readiness$/);
  if (params && method === 'GET') {
    const revisionId = url.searchParams.get('understandingRevisionId') ?? '';
    if (!revisionId) {
      throw new ApiError(
        422,
        'VALIDATION_ERROR',
        '必须指定 understandingRevisionId',
      );
    }
    return ok(listClaimReadiness(params[1] ?? '', revisionId));
  }

  params = match(path, /^\/projects\/([^/]+)\/claim-conflicts$/);
  if (params && method === 'GET') {
    return ok(
      listClaimConflicts(
        params[1] ?? '',
        url.searchParams.get('status') ?? undefined,
      ),
    );
  }

  params = match(path, /^\/projects\/([^/]+)\/claim-conflicts\/scan$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    return ok(
      startClaimScan(
        params[1] ?? '',
        (await readBody(event)) as Record<string, any>,
      ),
      'claim_scan_started',
      202,
    );
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/claim-conflicts\/resolutions\/([^/]+)\/approve$/,
  );
  if (params && method === 'POST') {
    requireApprover(actor, params[1] ?? '');
    return ok(
      approveConflictResolution(
        params[1] ?? '',
        params[2] ?? '',
        (await readBody(event)) as Record<string, any>,
        actor,
      ),
    );
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/claim-conflicts\/([^/]+)\/resolution-preview$/,
  );
  if (params && method === 'POST') {
    return ok(
      previewConflictResolution(
        params[1] ?? '',
        params[2] ?? '',
        (await readBody(event)) as Record<string, any>,
      ),
    );
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/claim-conflicts\/([^/]+)\/resolutions$/,
  );
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    return ok(
      createConflictResolution(
        params[1] ?? '',
        params[2] ?? '',
        (await readBody(event)) as Record<string, any>,
      ),
      'conflict_resolution_created',
      201,
    );
  }

  params = match(path, /^\/projects\/([^/]+)\/claim-conflicts\/([^/]+)$/);
  if (params && method === 'GET') {
    return ok(getClaimConflict(params[1] ?? '', params[2] ?? ''));
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/understanding\/revisions\/([^/]+)\/evidence-snapshots$/,
  );
  if (params && method === 'GET') {
    return ok(listEvidenceSnapshots(params[1] ?? '', params[2] ?? ''));
  }

  params = match(path, /^\/projects\/([^/]+)\/production-readiness$/);
  if (params && method === 'GET') {
    return ok(getProductionReadiness(params[1] ?? ''));
  }

  params = match(path, /^\/projects\/([^/]+)\/dependency-impact\/preview$/);
  if (params && method === 'POST') {
    return ok(
      previewDependencyImpact(
        params[1] ?? '',
        (await readBody(event)) as Record<string, any>,
      ),
    );
  }

  params = match(path, /^\/projects\/([^/]+)\/generation-specs$/);
  if (params) {
    if (method === 'GET') {
      return ok(getGenerationSpecs(params[1] ?? ''));
    }
    if (method === 'PUT') {
      requireRole(actor, ['editor', 'owner']);
      return ok(
        putGenerationSpec(
          params[1] ?? '',
          (await readBody(event)) as Record<string, any>,
        ),
      );
    }
  }

  params = match(path, /^\/projects\/([^/]+)\/assets\/([^/]+)$/);
  if (params) {
    const [, id = '', assetId = ''] = params;
    if (method === 'PATCH') {
      requireRole(actor, ['editor', 'owner']);
      return ok(
        updateAsset(
          id,
          assetId,
          (await readBody(event)) as Record<string, any>,
        ),
      );
    }
    if (method === 'DELETE') {
      requireRole(actor, ['editor', 'owner']);
      const body = (await readOptionalBody(event)) as Record<string, any>;
      return ok(deleteAsset(id, assetId, body));
    }
  }

  params = match(path, /^\/projects\/([^/]+)\/demo-session\/explore$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    return ok(exploreDemo(params[1] ?? ''));
  }

  params = match(path, /^\/projects\/([^/]+)\/demo-session$/);
  if (params) {
    const id = params[1] ?? '';
    if (method === 'GET') {
      return ok(getIngestion(id).demoSession ?? null);
    }
    if (method === 'POST') {
      requireRole(actor, ['editor', 'owner']);
      return ok(
        createDemoSession(id, (await readBody(event)) as Record<string, any>),
        'demo_session_created',
        201,
      );
    }
    if (method === 'DELETE') {
      requireRole(actor, ['editor', 'owner']);
      return ok(revokeDemoSession(id));
    }
  }

  if (method === 'GET' && /^\/projects\/[^/]+\/evidence$/.test(path)) {
    const id = path.split('/')[2] ?? '';
    return ok(
      getEvidenceList(id, {
        level: url.searchParams.get('level') ?? undefined,
        sourceId: url.searchParams.get('sourceId') ?? undefined,
      }),
    );
  }

  if (
    method === 'GET' &&
    /^\/projects\/[^/]+\/understanding\/active$/.test(path)
  ) {
    const id = path.split('/')[2] ?? '';
    return ok(getActiveUnderstanding(id));
  }

  params = match(path, /^\/projects\/([^/]+)\/understanding\/diff$/);
  if (params && method === 'GET') {
    const fromRevisionId = url.searchParams.get('fromRevisionId') ?? '';
    const toRevisionId = url.searchParams.get('toRevisionId') ?? '';
    if (!fromRevisionId || !toRevisionId) {
      throw new ApiError(
        422,
        'VALIDATION_ERROR',
        '必须同时指定 fromRevisionId 与 toRevisionId',
      );
    }
    return ok(
      getUnderstandingDiff(params[1] ?? '', fromRevisionId, toRevisionId),
    );
  }

  params = match(path, /^\/projects\/([^/]+)\/understanding\/revisions$/);
  if (params && method === 'GET') {
    return ok(listRevisions(params[1] ?? ''));
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/understanding\/revisions\/([^/]+)$/,
  );
  if (params) {
    const [, id = '', revisionId = ''] = params;
    if (method === 'GET') {
      return ok(getRevision(id, revisionId));
    }
    if (method === 'PATCH') {
      requireRole(actor, ['editor', 'owner']);
      return ok(
        updateRevision(id, revisionId, {
          ...((await readBody(event)) as Record<string, any>),
          actorId: actor.id,
        }),
      );
    }
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/understanding\/revisions\/([^/]+)\/comment$/,
  );
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner', 'reviewer']);
    const [, id = '', revisionId = ''] = params;
    const body = (await readBody(event)) as Record<string, any>;
    return ok(addRevisionComment(id, revisionId, body, actor));
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/understanding\/revisions\/([^/]+)\/(fork|submit-review|approve|reject)$/,
  );
  if (params && method === 'POST') {
    const [, id = '', revisionId = '', action = ''] = params;
    const body = (await readBody(event)) as Record<string, any>;
    if (action === 'fork') {
      requireRole(actor, ['editor', 'owner']);
      return ok(forkRevision(id, revisionId), 'forked', 201);
    }
    if (action === 'submit-review') {
      requireRole(actor, ['editor', 'owner']);
      return ok(submitRevision(id, revisionId, body));
    }
    if (action === 'approve') {
      const project = getProject(id);
      if (
        !isOwner(actor) &&
        (!hasRole(actor, ['reviewer']) || !project.reviewerCanApprove)
      ) {
        throw new ApiError(403, 'FORBIDDEN', '当前角色没有审核确认权限');
      }
      return ok(approveRevision(id, revisionId, body, actor), 'approved');
    }
    if (action === 'reject') {
      requireRole(actor, ['editor', 'owner']);
      return ok(rejectRevision(id, revisionId, body));
    }
  }

  params = match(path, /^\/projects\/([^/]+)\/understanding\/generate$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const id = params[1] ?? '';
    const body = (await readBody(event)) as Record<string, any>;
    const idempotency = useIdempotency(event, actor, body, url.pathname);
    if (idempotency?.replay) {
      return {
        body: idempotency.replay.body,
        status: idempotency.replay.status,
      };
    }
    const result = ok(startUnderstanding(id, body), 'accepted', 202);
    idempotency?.save(result);
    return result;
  }

  if (
    method === 'GET' &&
    /^\/projects\/[^/]+\/understanding\/handoff$/.test(path)
  ) {
    const id = path.split('/')[2] ?? '';
    return ok(getHandoff(id));
  }

  if (method === 'GET' && /^\/projects\/[^/]+\/jobs$/.test(path)) {
    const id = path.split('/')[2] ?? '';
    return ok(listProjectJobs(id));
  }

  params = match(path, /^\/jobs\/([^/]+)$/);
  if (params && method === 'GET') {
    return ok(getJob(params[1] ?? ''));
  }

  params = match(path, /^\/jobs\/([^/]+)\/cancel$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    return ok(cancelJob(params[1] ?? ''));
  }

  if (method === 'GET' && path === '/demo/scenarios') {
    return ok({
      collectUrl: [
        'PUBLIC_SUCCESS',
        'PARTIAL',
        'LOGIN_REQUIRED',
        'FETCH_FAILED',
        'SLOW_COLLECT',
      ],
      demoSession: [
        'AUTH_SUCCESS',
        'MFA_REQUIRED',
        'ACCESS_DENIED',
        'SESSION_EXPIRED',
        'NO_DEMO_DATA',
      ],
      understanding: [
        'UNDERSTANDING_SUCCESS',
        'UNDERSTANDING_FAILED',
        'UNDERSTANDING_SLOW',
      ],
    });
  }

  if (method === 'POST' && path === '/demo/reset') {
    requireRole(actor, ['owner', 'admin']);
    const body = (await readOptionalBody(event)) as Record<string, any>;
    const m2Seed = body.m2Seed === 'interactive' ? 'interactive' : 'full';
    return ok(
      { ...resetAll({ m2Seed }), restoredProjects: 4, m2Seed },
      'reset',
    );
  }

  // ---------------------------------------------------------------------
  // M2：创意切口 / Brief
  // ---------------------------------------------------------------------
  if (method === 'GET' && /^\/projects\/[^/]+\/angles$/.test(path)) {
    const id = path.split('/')[2] ?? '';
    return ok(getAnglesState(id));
  }

  params = match(path, /^\/projects\/([^/]+)\/angles\/generate$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const id = params[1] ?? '';
    const body = (await readBody(event)) as Record<string, any>;
    const idempotency = useIdempotency(event, actor, body, url.pathname);
    if (idempotency?.replay) {
      return idempotency.replay;
    }
    const result = ok(
      startAngleGeneration(id, body),
      '已创建传播切口发现任务',
      202,
    );
    idempotency?.save(result);
    return result;
  }

  if (method === 'GET' && /^\/projects\/[^/]+\/angles\/sets$/.test(path)) {
    const id = path.split('/')[2] ?? '';
    return ok(getAnglesState(id).sets);
  }

  params = match(path, /^\/projects\/([^/]+)\/angles\/sets\/([^/]+)$/);
  if (params) {
    const [, id = '', setId = ''] = params;
    if (method === 'GET') {
      return ok(getAnglesState(id).sets.find((item: any) => item.id === setId));
    }
    if (method === 'PATCH') {
      requireRole(actor, ['editor', 'owner']);
      const body = (await readBody(event)) as Record<string, any>;
      return ok(patchAngleSet(id, setId, body));
    }
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/angles\/sets\/([^/]+)\/reference-insight$/,
  );
  if (params && method === 'PATCH') {
    requireRole(actor, ['editor', 'owner']);
    const [, id = '', setId = ''] = params;
    const body = (await readBody(event)) as Record<string, any>;
    return ok(setAngleSetReferenceInsight(id, setId, body));
  }

  params = match(path, /^\/projects\/([^/]+)\/angles\/sets\/([^/]+)\/fork$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const [, id = '', setId = ''] = params;
    const body = (await readBody(event)) as Record<string, any>;
    return ok(forkAngleSet(id, setId, body), 'forked', 201);
  }

  params = match(path, /^\/projects\/([^/]+)\/creative-briefs$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const id = params[1] ?? '';
    const body = (await readBody(event)) as Record<string, any>;
    return ok(createCreativeBrief(id, body), 'brief_created', 201);
  }

  if (
    method === 'GET' &&
    /^\/projects\/[^/]+\/creative-briefs\/active$/.test(path)
  ) {
    const id = path.split('/')[2] ?? '';
    return ok(getActiveCreativeBrief(id));
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/creative-briefs\/([^/]+)\/approve$/,
  );
  if (params && method === 'POST') {
    const [, id = '', briefId = ''] = params;
    requireApprover(actor, id);
    const body = (await readBody(event)) as Record<string, any>;
    return ok(approveCreativeBrief(id, briefId, body, actor));
  }

  // ---------------------------------------------------------------------
  // M2：创意故事
  // ---------------------------------------------------------------------
  params = match(path, /^\/projects\/([^/]+)\/concepts\/generate$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const id = params[1] ?? '';
    const body = (await readBody(event)) as Record<string, any>;
    const idempotency = useIdempotency(event, actor, body, url.pathname);
    if (idempotency?.replay) {
      return idempotency.replay;
    }
    const result = ok(
      startConceptGeneration(id, body),
      '已创建创意生成任务',
      202,
    );
    idempotency?.save(result);
    return result;
  }

  if (method === 'GET' && /^\/projects\/[^/]+\/concepts\/active$/.test(path)) {
    const id = path.split('/')[2] ?? '';
    return ok(getActiveConcept(id));
  }

  if (method === 'GET' && /^\/projects\/[^/]+\/concepts\/groups$/.test(path)) {
    const id = path.split('/')[2] ?? '';
    return ok(listConceptGroups(id));
  }

  params = match(path, /^\/projects\/([^/]+)\/concepts\/groups\/([^/]+)$/);
  if (params && method === 'GET') {
    const [, id = '', groupId = ''] = params;
    return ok(getConceptGroup(id, groupId));
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/concepts\/groups\/([^/]+)\/(select|favorite)$/,
  );
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const [, id = '', groupId = '', action = ''] = params;
    const body = (await readBody(event)) as Record<string, any>;
    return ok(
      action === 'select'
        ? selectConcept(id, groupId, body)
        : favoriteConcept(id, groupId, body),
    );
  }

  params = match(path, /^\/projects\/([^/]+)\/concepts\/revisions\/([^/]+)$/);
  if (params) {
    const [, id = '', revisionId = ''] = params;
    if (method === 'GET') {
      return ok(getConcept(id, revisionId));
    }
    if (method === 'PATCH') {
      requireRole(actor, ['editor', 'owner']);
      const body = (await readBody(event)) as Record<string, any>;
      return ok(patchConcept(id, revisionId, body));
    }
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/concepts\/revisions\/([^/]+)\/moodboard-bindings$/,
  );
  if (params && method === 'PATCH') {
    requireRole(actor, ['editor', 'owner']);
    return ok(
      patchConceptMoodboard(
        params[1] ?? '',
        params[2] ?? '',
        (await readBody(event)) as Record<string, any>,
      ),
    );
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/concepts\/revisions\/([^/]+)\/(fork|submit-review|approve|reject)$/,
  );
  if (params && method === 'POST') {
    const [, id = '', revisionId = '', action = ''] = params;
    const body = (await readBody(event)) as Record<string, any>;
    if (action === 'approve') {
      requireApprover(actor, id);
      return ok(approveConcept(id, revisionId, body, actor));
    }
    if (action === 'reviewer-note') {
      requireRole(actor, ['editor', 'owner']);
    }
    requireRole(actor, ['editor', 'owner']);
    if (action === 'fork') {
      return ok(forkConcept(id, revisionId, body), 'forked', 201);
    }
    if (action === 'submit-review') {
      return ok(submitConceptReview(id, revisionId, body));
    }
    return ok(rejectConcept(id, revisionId, body));
  }

  // ---------------------------------------------------------------------
  // M2：时长计划与剧本
  // ---------------------------------------------------------------------
  params = match(path, /^\/projects\/([^/]+)\/duration-plans\/evaluate$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const id = params[1] ?? '';
    const body = (await readBody(event)) as Record<string, any>;
    return ok(evaluateDurationPlan(id, body));
  }

  if (method === 'GET' && /^\/projects\/[^/]+\/duration-plans$/.test(path)) {
    const id = path.split('/')[2] ?? '';
    return ok(getDurationPlans(id));
  }

  params = match(path, /^\/projects\/([^/]+)\/duration-plans\/([^/]+)$/);
  if (params && method === 'PATCH') {
    requireRole(actor, ['editor', 'owner']);
    const [, id = '', planId = ''] = params;
    const body = (await readBody(event)) as Record<string, any>;
    return ok(patchDurationPlan(id, planId, body));
  }

  params = match(path, /^\/projects\/([^/]+)\/scripts\/generate$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const id = params[1] ?? '';
    const body = (await readBody(event)) as Record<string, any>;
    const idempotency = useIdempotency(event, actor, body, url.pathname);
    if (idempotency?.replay) {
      return idempotency.replay;
    }
    const result = ok(
      startScriptGeneration(id, body),
      '已创建剧本生成任务',
      202,
    );
    idempotency?.save(result);
    return result;
  }

  if (method === 'GET' && /^\/projects\/[^/]+\/scripts\/active$/.test(path)) {
    const id = path.split('/')[2] ?? '';
    return ok(getActiveScript(id));
  }

  if (
    method === 'GET' &&
    /^\/projects\/[^/]+\/scripts\/revisions$/.test(path)
  ) {
    const id = path.split('/')[2] ?? '';
    return ok(getScriptsState(id));
  }

  params = match(path, /^\/projects\/([^/]+)\/scripts\/revisions\/([^/]+)$/);
  if (params) {
    const [, id = '', revisionId = ''] = params;
    if (method === 'GET') {
      return ok(getScript(id, revisionId));
    }
    if (method === 'PATCH') {
      requireRole(actor, ['editor', 'owner']);
      const body = (await readBody(event)) as Record<string, any>;
      return ok(patchScript(id, revisionId, body));
    }
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/scripts\/revisions\/([^/]+)\/(fork|submit-review|approve|reject)$/,
  );
  if (params && method === 'POST') {
    const [, id = '', revisionId = '', action = ''] = params;
    const body = (await readBody(event)) as Record<string, any>;
    if (action === 'approve') {
      requireApprover(actor, id);
      return ok(approveScript(id, revisionId, body, actor));
    }
    requireRole(actor, ['editor', 'owner']);
    if (action === 'fork') {
      return ok(forkScript(id, revisionId, body), 'forked', 201);
    }
    if (action === 'submit-review') {
      return ok(submitScriptReview(id, revisionId, body));
    }
    return ok(rejectScript(id, revisionId, body));
  }

  // ---------------------------------------------------------------------
  // M2：视觉规范
  // ---------------------------------------------------------------------
  params = match(path, /^\/projects\/([^/]+)\/visual-bible\/generate$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const id = params[1] ?? '';
    const body = (await readBody(event)) as Record<string, any>;
    const idempotency = useIdempotency(event, actor, body, url.pathname);
    if (idempotency?.replay) {
      return idempotency.replay;
    }
    const result = ok(
      startVisualBibleGeneration(id, body),
      '已创建视觉规范任务',
      202,
    );
    idempotency?.save(result);
    return result;
  }

  if (
    method === 'GET' &&
    /^\/projects\/[^/]+\/visual-bible\/revisions$/.test(path)
  ) {
    const id = path.split('/')[2] ?? '';
    return ok(listVisualBibles(id));
  }

  if (
    method === 'GET' &&
    /^\/projects\/[^/]+\/visual-bible\/active$/.test(path)
  ) {
    const id = path.split('/')[2] ?? '';
    return ok(getActiveVisualBible(id));
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/visual-bible\/revisions\/([^/]+)\/fork$/,
  );
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    return ok(
      forkVisualBible(params[1] ?? '', params[2] ?? ''),
      'visual_bible_forked',
      201,
    );
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/visual-bible\/revisions\/([^/]+)$/,
  );
  if (params && method === 'PATCH') {
    requireRole(actor, ['editor', 'owner']);
    const [, id = '', revisionId = ''] = params;
    const body = (await readBody(event)) as Record<string, any>;
    return ok(patchVisualBible(id, revisionId, body));
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/visual-bible\/revisions\/([^/]+)\/approve$/,
  );
  if (params && method === 'POST') {
    const [, id = '', revisionId = ''] = params;
    requireApprover(actor, id);
    const body = (await readBody(event)) as Record<string, any>;
    return ok(approveVisualBible(id, revisionId, body, actor));
  }

  // ---------------------------------------------------------------------
  // M2：图文分镜
  // ---------------------------------------------------------------------
  params = match(path, /^\/projects\/([^/]+)\/storyboard\/generate$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const id = params[1] ?? '';
    const body = (await readBody(event)) as Record<string, any>;
    const idempotency = useIdempotency(event, actor, body, url.pathname);
    if (idempotency?.replay) {
      return idempotency.replay;
    }
    const result = ok(
      startStoryboardGeneration(id, body),
      '已创建分镜生成任务',
      202,
    );
    idempotency?.save(result);
    return result;
  }

  if (method === 'GET' && /^\/projects\/[^/]+\/storyboard$/.test(path)) {
    const id = path.split('/')[2] ?? '';
    return ok(getStoryboardState(id));
  }

  if (
    method === 'GET' &&
    /^\/projects\/[^/]+\/storyboard\/revisions$/.test(path)
  ) {
    const id = path.split('/')[2] ?? '';
    return ok(getStoryboardState(id).storyboards);
  }

  params = match(path, /^\/projects\/([^/]+)\/storyboard\/revisions\/([^/]+)$/);
  if (params && method === 'GET') {
    const [, id = '', revisionId = ''] = params;
    const state = getStoryboardState(id);
    return ok({
      ...state.latest,
      ...state,
      latest: state.latest?.id === revisionId ? state.latest : null,
    });
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/storyboard\/revisions\/([^/]+)\/approve$/,
  );
  if (params && method === 'POST') {
    const [, id = '', revisionId = ''] = params;
    requireApprover(actor, id);
    const body = (await readBody(event)) as Record<string, any>;
    return ok(approveStoryboard(id, revisionId, body, actor));
  }

  if (method === 'GET' && /^\/projects\/[^/]+\/shots$/.test(path)) {
    const id = path.split('/')[2] ?? '';
    const storyboardRevisionId =
      url.searchParams.get('storyboardRevisionId') ?? undefined;
    return ok(getShots(id, storyboardRevisionId));
  }

  params = match(path, /^\/projects\/([^/]+)\/shots$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const id = params[1] ?? '';
    const body = (await readBody(event)) as Record<string, any>;
    return ok(addShot(id, body), 'shot_created', 201);
  }

  params = match(path, /^\/projects\/([^/]+)\/shots\/reorder$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const id = params[1] ?? '';
    const body = (await readBody(event)) as Record<string, any>;
    return ok(reorderShots(id, body));
  }

  params = match(path, /^\/projects\/([^/]+)\/shots\/batch-approve$/);
  if (params && method === 'POST') {
    const id = params[1] ?? '';
    requireApprover(actor, id);
    const body = (await readBody(event)) as Record<string, any>;
    return ok(batchApproveShots(id, body, actor));
  }

  params = match(path, /^\/projects\/([^/]+)\/shots\/merge$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const id = params[1] ?? '';
    const body = (await readBody(event)) as Record<string, any>;
    return ok(mergeShots(id, body));
  }

  params = match(path, /^\/projects\/([^/]+)\/shots\/([^/]+)\/duplicate$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const [, id = '', shotId = ''] = params;
    const body = (await readBody(event)) as Record<string, any>;
    return ok(duplicateShot(id, shotId, body), 'shot_duplicated', 201);
  }

  params = match(path, /^\/projects\/([^/]+)\/shots\/([^/]+)\/split$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const [, id = '', shotId = ''] = params;
    const body = (await readBody(event)) as Record<string, any>;
    return ok(splitShot(id, shotId, body), 'shot_split', 201);
  }

  params = match(path, /^\/projects\/([^/]+)\/shots\/([^/]+)$/);
  if (params) {
    const [, id = '', shotId = ''] = params;
    if (method === 'GET') {
      return ok(getShot(id, shotId));
    }
    if (method === 'DELETE') {
      requireRole(actor, ['editor', 'owner']);
      return ok(deleteShot(id, shotId));
    }
  }

  params = match(path, /^\/projects\/([^/]+)\/shots\/([^/]+)\/revisions$/);
  if (params) {
    const [, id = '', shotId = ''] = params;
    if (method === 'GET') {
      return ok(getShotRevisions(id, shotId));
    }
    if (method === 'POST') {
      requireRole(actor, ['editor', 'owner']);
      const body = (await readBody(event)) as Record<string, any>;
      return ok(createShotRevision(id, shotId, body), 'revision_created', 201);
    }
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/shots\/([^/]+)\/revisions\/([^/]+)$/,
  );
  if (params && method === 'PATCH') {
    requireRole(actor, ['editor', 'owner']);
    const [, id = '', shotId = '', revisionId = ''] = params;
    const body = (await readBody(event)) as Record<string, any>;
    return ok(patchShot(id, shotId, revisionId, body));
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/shots\/([^/]+)\/revisions\/([^/]+)\/(approve|reject)$/,
  );
  if (params && method === 'POST') {
    const [, id = '', shotId = '', revisionId = '', action = ''] = params;
    const body = (await readBody(event)) as Record<string, any>;
    if (action === 'approve') {
      requireApprover(actor, id);
      return ok(approveShot(id, shotId, revisionId, body, actor));
    }
    requireRole(actor, ['editor', 'owner']);
    return ok(rejectShot(id, shotId, revisionId, body));
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/shots\/([^/]+)\/reference-images$/,
  );
  if (params && method === 'GET') {
    const [, id = '', shotId = ''] = params;
    const shot = getShot(id, shotId);
    const state = getStoryboardState(id);
    return ok(
      state.images.filter((image: any) =>
        (shot.referenceImageVersionIds ?? []).includes(image.id),
      ),
    );
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/shots\/([^/]+)\/reference-images\/generate$/,
  );
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const [, id = '', shotId = ''] = params;
    const body = (await readBody(event)) as Record<string, any>;
    const idempotency = useIdempotency(event, actor, body, url.pathname);
    if (idempotency?.replay) {
      return idempotency.replay;
    }
    const result = ok(
      startReferenceImageGeneration(id, shotId, body),
      '已创建参考图任务',
      202,
    );
    idempotency?.save(result);
    return result;
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/shots\/([^/]+)\/reference-images\/([^/]+)\/select$/,
  );
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const [, id = '', shotId = '', imageId = ''] = params;
    const body = (await readBody(event)) as Record<string, any>;
    return ok(selectReferenceImage(id, shotId, imageId, body));
  }

  // ---------------------------------------------------------------------
  // M2：预演
  // ---------------------------------------------------------------------
  params = match(path, /^\/projects\/([^/]+)\/animatic\/build$/);
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const id = params[1] ?? '';
    const body = (await readBody(event)) as Record<string, any>;
    const idempotency = useIdempotency(event, actor, body, url.pathname);
    if (idempotency?.replay) {
      return idempotency.replay;
    }
    const result = ok(startAnimaticBuild(id, body), '已创建预演构建任务', 202);
    idempotency?.save(result);
    return result;
  }

  if (method === 'GET' && /^\/projects\/[^/]+\/animatic$/.test(path)) {
    const id = path.split('/')[2] ?? '';
    return ok(getAnimaticState(id));
  }

  if (
    method === 'GET' &&
    /^\/projects\/[^/]+\/animatic\/snapshots$/.test(path)
  ) {
    const id = path.split('/')[2] ?? '';
    return ok(getAnimaticState(id).snapshots);
  }

  params = match(path, /^\/projects\/([^/]+)\/animatic\/snapshots\/([^/]+)$/);
  if (params && method === 'GET') {
    const [, id = '', snapshotId = ''] = params;
    return ok(
      getAnimaticState(id).snapshots.find(
        (item: any) => item.id === snapshotId,
      ),
    );
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/animatic\/snapshots\/([^/]+)\/comments$/,
  );
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner', 'reviewer']);
    const [, id = '', snapshotId = ''] = params;
    const body = (await readBody(event)) as Record<string, any>;
    return ok(commentAnimatic(id, snapshotId, body, actor));
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/animatic\/snapshots\/([^/]+)\/(approve|reject)$/,
  );
  if (params && method === 'POST') {
    const [, id = '', snapshotId = '', action = ''] = params;
    const body = (await readBody(event)) as Record<string, any>;
    if (action === 'approve') {
      requireApprover(actor, id);
      return ok(approveAnimatic(id, snapshotId, body, actor));
    }
    requireRole(actor, ['editor', 'owner']);
    return ok(rejectAnimatic(id, snapshotId, body));
  }

  if (method === 'GET' && /^\/projects\/[^/]+\/animatic\/handoff$/.test(path)) {
    const id = path.split('/')[2] ?? '';
    return ok(getM2Handoff(id));
  }

  // ---------------------------------------------------------------------
  // M2：AI 导演变更计划
  // ---------------------------------------------------------------------
  params = match(path, /^\/projects\/([^/]+)\/director\/change-plans$/);
  if (params) {
    const id = params[1] ?? '';
    if (method === 'GET') {
      return ok(listDirectorMessages(id));
    }
    if (method === 'POST') {
      requireRole(actor, ['editor', 'owner']);
      const body = (await readBody(event)) as Record<string, any>;
      return ok(createDirectionPlan(id, body, actor), 'proposed', 201);
    }
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/director\/change-plans\/([^/]+)$/,
  );
  if (params && method === 'GET') {
    const [, id = '', planId = ''] = params;
    return ok(getDirectionPlan(id, planId));
  }

  params = match(
    path,
    /^\/projects\/([^/]+)\/director\/change-plans\/([^/]+)\/(apply|discard)$/,
  );
  if (params && method === 'POST') {
    requireRole(actor, ['editor', 'owner']);
    const [, id = '', planId = '', action = ''] = params;
    const body = (await readBody(event)) as Record<string, any>;
    if (action === 'apply') {
      return ok(applyDirectionPlan(id, planId, body, actor));
    }
    return ok(discardDirectionPlan(id, planId, body));
  }

  if (
    method === 'GET' &&
    /^\/projects\/[^/]+\/director\/messages$/.test(path)
  ) {
    const id = path.split('/')[2] ?? '';
    return ok(
      listDirectorMessages(
        id,
        url.searchParams.get('scope') ?? undefined,
        url.searchParams.get('targetId') ?? undefined,
      ),
    );
  }

  throw new ApiError(404, 'NOT_FOUND', `未实现的 Mock 接口：${method} ${path}`);
}

function useIdempotency(
  event: any,
  actor: Actor,
  body: Record<string, any>,
  pathname: string,
) {
  const key = getHeader(event, 'Idempotency-Key');
  if (!key) {
    return null;
  }
  const bodyHash = hash(`${event.method}:${pathname}:${JSON.stringify(body)}`);
  const existing = findIdempotency(actor.username, key);
  if (existing) {
    if (existing.bodyHash !== bodyHash) {
      throw new ApiError(
        409,
        'IDEMPOTENCY_CONFLICT',
        '相同幂等键但请求内容不同，请使用新的请求键',
      );
    }
    return {
      replay: existing.response,
      save: () => {},
    };
  }
  return {
    replay: null,
    save: (result: HandlerResult) => {
      saveIdempotency(actor.username, key, {
        bodyHash,
        response: result,
        username: actor.username,
      });
      void pathname;
    },
  };
}

function hash(value: string): string {
  // FNV-1a 32 位：避免长字符串在 JS 浮点精度下产生哈希碰撞
  const fnvOffset = 2_166_136_261;
  const fnvPrime = 16_777_619;
  let h = fnvOffset;
  for (const char of value) {
    h ^= char.codePointAt(0) ?? 0;
    h = Math.imul(h, fnvPrime) >>> 0;
  }
  return h.toString(16);
}

export async function handleCreativeVideoRequest(event: any): Promise<unknown> {
  const pathname = getRequestURL(event).pathname;
  const path = decodeURIComponent(pathname.replace(BASE, '')) || '/';
  const method = String(event.method ?? 'GET').toUpperCase();
  try {
    const result = await handle(event, path, method);
    persistState();
    setResponseStatus(event, result.status);
    return result.body;
  } catch (error) {
    if (error instanceof ApiError) {
      setResponseStatus(event, error.status);
      return fail(error.status, error.code, error.message, error.data).body;
    }
    console.error('[mock]', error);
    setResponseStatus(event, 500);
    return fail(500, 'INTERNAL_ERROR', 'Mock 服务内部错误，请稍后重试').body;
  }
}
