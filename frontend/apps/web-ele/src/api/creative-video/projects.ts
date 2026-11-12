import type {
  DemoResetResult,
  PageResult,
  ProjectListQuery,
  UpdateProjectRequest,
  VideoProject,
} from '#/types/creative-video';
import type { CreateProjectRequest } from '#/types/creative-video/project';

import {
  deleteBusinessData,
  getBusinessData,
  patchBusinessData,
  postBusinessData,
} from './client';

function buildQuery(query: ProjectListQuery): Record<string, string> {
  const params: Record<string, string> = {};
  if (query.scope) params.scope = query.scope;
  if (query.page) {
    params.page = String(query.page);
  }
  if (query.pageSize) {
    params.pageSize = String(query.pageSize);
  }
  if (query.keyword) {
    params.keyword = query.keyword;
  }
  if (query.status) {
    params.status = query.status;
  }
  if (query.stage) {
    params.stage = query.stage;
  }
  if (query.platform) {
    params.platform = query.platform;
  }
  if (query.sort) {
    params.sort = query.sort;
  }
  if (query.includeDeleted) {
    params.includeDeleted = 'true';
  }
  return params;
}

export function listProjects(query: ProjectListQuery = {}) {
  return getBusinessData<PageResult<VideoProject>>('/projects', {
    params: buildQuery(query),
  });
}

export function getProject(id: string) {
  return getBusinessData<VideoProject>(`/projects/${encodeURIComponent(id)}`);
}

export function createProject(
  payload: CreateProjectRequest,
  idempotencyKey: string,
) {
  return postBusinessData<VideoProject>('/projects', payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
}

export function updateProject(id: string, payload: UpdateProjectRequest) {
  return patchBusinessData<VideoProject>(
    `/projects/${encodeURIComponent(id)}`,
    payload,
  );
}

export function duplicateProject(
  id: string,
  payload: { copyAssetRefs?: boolean; expectedVersion?: number } = {},
) {
  return postBusinessData<VideoProject>(
    `/projects/${encodeURIComponent(id)}/duplicate`,
    payload,
  );
}

export function archiveProject(id: string, expectedVersion?: number) {
  return postBusinessData<VideoProject>(
    `/projects/${encodeURIComponent(id)}/archive`,
    { expectedVersion },
  );
}

export function restoreProject(id: string, expectedVersion?: number) {
  return postBusinessData<VideoProject>(
    `/projects/${encodeURIComponent(id)}/restore`,
    { expectedVersion },
  );
}

export function deleteProject(id: string, expectedVersion?: number) {
  return deleteBusinessData<{ deletedAt: string; id: string }>(
    `/projects/${encodeURIComponent(id)}`,
    { expectedVersion },
  );
}

export function undeleteProject(id: string, expectedVersion?: number) {
  return postBusinessData<VideoProject>(
    `/projects/${encodeURIComponent(id)}/undelete`,
    { expectedVersion },
  );
}

/**
 * 兼容 M0：恢复演示种子（M1 Mock 会同时恢复项目、资料、报告和任务）
 */
export function resetDemoProjects() {
  return postBusinessData<DemoResetResult>('/demo/reset');
}

export interface StaleImpactItem {
  id: string;
  link: string;
  reason: string;
  stage: string;
  title: string;
  type: string;
  updatedAt?: string;
  version?: number;
}

export interface StaleImpact {
  items: StaleImpactItem[];
  projectId: string;
  summary: string;
  total: number;
  understanding: null | {
    id: string;
    revisionNo: number;
    status: string;
  };
}

export function getStaleImpact(projectId: string) {
  return getBusinessData<StaleImpact>(
    `/projects/${encodeURIComponent(projectId)}/stale-impact`,
  );
}
