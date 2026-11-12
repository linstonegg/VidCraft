import type {
  ImageAssetVersion,
  ShotRevision,
  StoryboardRevision,
} from '#/types/creative-video';

import { createIdempotencyKey } from '#/utils/creative-video/validation';

import {
  deleteBusinessData,
  getBusinessData,
  patchBusinessData,
  postBusinessData,
} from './client';

export interface StoryboardState {
  approvedCount: number;
  images: ImageAssetVersion[];
  issues: Array<{ code: string; message: string; shotId?: string }>;
  latest: null | StoryboardRevision;
  netDurationMs: number;
  script: any;
  shots: ShotRevision[];
  storyboards: StoryboardRevision[];
  totalCount: number;
  visualBible: any;
}

export function generateStoryboard(
  projectId: string,
  payload: {
    scenario?: string;
    scriptRevisionId: string;
    visualBibleVersionId: string;
  },
  key = createIdempotencyKey('storyboard'),
) {
  return postBusinessData<{ jobId: string }>(
    `/projects/${encodeURIComponent(projectId)}/storyboard/generate`,
    payload,
    { headers: { 'Idempotency-Key': key } },
  );
}

export function getStoryboardState(projectId: string) {
  return getBusinessData<StoryboardState>(
    `/projects/${encodeURIComponent(projectId)}/storyboard`,
  );
}

export function getShots(projectId: string, storyboardRevisionId?: string) {
  const query = storyboardRevisionId
    ? `?storyboardRevisionId=${encodeURIComponent(storyboardRevisionId)}`
    : '';
  return getBusinessData<ShotRevision[]>(
    `/projects/${encodeURIComponent(projectId)}/shots${query}`,
  );
}

export function getShot(projectId: string, shotId: string) {
  return getBusinessData<ShotRevision>(
    `/projects/${encodeURIComponent(projectId)}/shots/${encodeURIComponent(shotId)}`,
  );
}

export function addShot(projectId: string) {
  return postBusinessData<ShotRevision>(
    `/projects/${encodeURIComponent(projectId)}/shots`,
    {},
  );
}

export function deleteShot(projectId: string, shotId: string) {
  return deleteBusinessData<{ deletedShotId: string }>(
    `/projects/${encodeURIComponent(projectId)}/shots/${encodeURIComponent(shotId)}`,
  );
}

export function reorderShots(
  projectId: string,
  payload: {
    expectedStoryboardVersion: number;
    orderedShotIds: string[];
  },
) {
  return postBusinessData<StoryboardRevision>(
    `/projects/${encodeURIComponent(projectId)}/shots/reorder`,
    payload,
  );
}

export function patchShot(
  projectId: string,
  shotId: string,
  revisionId: string,
  payload: { expectedVersion: number; patch: Record<string, any> },
) {
  return patchBusinessData<ShotRevision>(
    `/projects/${encodeURIComponent(projectId)}/shots/${encodeURIComponent(shotId)}/revisions/${encodeURIComponent(revisionId)}`,
    payload,
  );
}

export function createShotRevision(
  projectId: string,
  shotId: string,
  payload: {
    baseRevisionId: string;
    expectedVersion: number;
    patch?: Record<string, any>;
  },
) {
  return postBusinessData<ShotRevision>(
    `/projects/${encodeURIComponent(projectId)}/shots/${encodeURIComponent(shotId)}/revisions`,
    payload,
  );
}

export function approveShot(
  projectId: string,
  shotId: string,
  revisionId: string,
  expectedVersion: number,
) {
  return postBusinessData<ShotRevision>(
    `/projects/${encodeURIComponent(projectId)}/shots/${encodeURIComponent(shotId)}/revisions/${encodeURIComponent(revisionId)}/approve`,
    { expectedVersion },
  );
}

export function rejectShot(
  projectId: string,
  shotId: string,
  revisionId: string,
  expectedVersion: number,
  reason: string,
) {
  return postBusinessData<ShotRevision>(
    `/projects/${encodeURIComponent(projectId)}/shots/${encodeURIComponent(shotId)}/revisions/${encodeURIComponent(revisionId)}/reject`,
    { expectedVersion, reason },
  );
}

export function batchApproveShots(
  projectId: string,
  payload: {
    items: Array<{
      expectedVersion: number;
      revisionId: string;
      shotId: string;
    }>;
    storyboardRevisionId: string;
  },
) {
  return postBusinessData<{ approved: ShotRevision[] }>(
    `/projects/${encodeURIComponent(projectId)}/shots/batch-approve`,
    payload,
  );
}

export function getReferenceImages(projectId: string, shotId: string) {
  return getBusinessData<ImageAssetVersion[]>(
    `/projects/${encodeURIComponent(projectId)}/shots/${encodeURIComponent(shotId)}/reference-images`,
  );
}

export function generateReferenceImage(
  projectId: string,
  shotId: string,
  scenario = 'NORMAL',
  key = createIdempotencyKey('reference-image'),
) {
  return postBusinessData<{ jobId: string }>(
    `/projects/${encodeURIComponent(projectId)}/shots/${encodeURIComponent(shotId)}/reference-images/generate`,
    { scenario },
    { headers: { 'Idempotency-Key': key } },
  );
}

export function selectReferenceImage(
  projectId: string,
  shotId: string,
  imageId: string,
  payload: { expectedVersion: number; revisionId: string },
) {
  return postBusinessData<ShotRevision>(
    `/projects/${encodeURIComponent(projectId)}/shots/${encodeURIComponent(shotId)}/reference-images/${encodeURIComponent(imageId)}/select`,
    payload,
  );
}

export function approveStoryboard(
  projectId: string,
  revisionId: string,
  expectedVersion: number,
) {
  return postBusinessData<StoryboardRevision>(
    `/projects/${encodeURIComponent(projectId)}/storyboard/revisions/${encodeURIComponent(revisionId)}/approve`,
    { expectedVersion },
  );
}

export function duplicateShot(
  projectId: string,
  shotId: string,
  expectedVersion: number,
) {
  return postBusinessData<{
    shot: ShotRevision;
    storyboard: StoryboardRevision;
  }>(
    `/projects/${encodeURIComponent(projectId)}/shots/${encodeURIComponent(shotId)}/duplicate`,
    { expectedVersion },
  );
}

export function splitShot(
  projectId: string,
  shotId: string,
  payload: { expectedVersion: number; splitAtMs: number },
) {
  return postBusinessData<{
    shots: ShotRevision[];
    storyboard: StoryboardRevision;
  }>(
    `/projects/${encodeURIComponent(projectId)}/shots/${encodeURIComponent(shotId)}/split`,
    payload,
  );
}

export function mergeShots(
  projectId: string,
  payload: {
    expectedVersion: number;
    shotIds: [string, string];
  },
) {
  return postBusinessData<{
    shot: ShotRevision;
    storyboard: StoryboardRevision;
  }>(`/projects/${encodeURIComponent(projectId)}/shots/merge`, payload);
}
