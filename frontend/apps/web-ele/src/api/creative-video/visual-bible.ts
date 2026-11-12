import type { VisualBibleRevision } from '#/types/creative-video';

import { createIdempotencyKey } from '#/utils/creative-video/validation';

import { getBusinessData, patchBusinessData, postBusinessData } from './client';

export function generateVisualBible(
  projectId: string,
  payload: { scenario?: string; scriptRevisionId: string },
  key = createIdempotencyKey('visual-bible'),
) {
  return postBusinessData<{ jobId: string }>(
    `/projects/${encodeURIComponent(projectId)}/visual-bible/generate`,
    payload,
    { headers: { 'Idempotency-Key': key } },
  );
}

export function listVisualBibles(projectId: string) {
  return getBusinessData<VisualBibleRevision[]>(
    `/projects/${encodeURIComponent(projectId)}/visual-bible/revisions`,
  );
}

export function getActiveVisualBible(projectId: string) {
  return getBusinessData<null | VisualBibleRevision>(
    `/projects/${encodeURIComponent(projectId)}/visual-bible/active`,
  );
}

export function patchVisualBible(
  projectId: string,
  revisionId: string,
  payload: { expectedVersion: number; patch: Record<string, any> },
) {
  return patchBusinessData<VisualBibleRevision>(
    `/projects/${encodeURIComponent(projectId)}/visual-bible/revisions/${encodeURIComponent(revisionId)}`,
    payload,
  );
}

export function approveVisualBible(
  projectId: string,
  revisionId: string,
  expectedVersion: number,
) {
  return postBusinessData<VisualBibleRevision>(
    `/projects/${encodeURIComponent(projectId)}/visual-bible/revisions/${encodeURIComponent(revisionId)}/approve`,
    { expectedVersion },
  );
}
export function forkVisualBible(projectId: string, revisionId: string) {
  return postBusinessData<VisualBibleRevision>(
    `/projects/${encodeURIComponent(projectId)}/visual-bible/revisions/${encodeURIComponent(revisionId)}/fork`,
    {},
  );
}
