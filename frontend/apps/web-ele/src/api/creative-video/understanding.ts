import type {
  ApproveRevisionRequest,
  GenerateUnderstandingRequest,
  UnderstandingDiff,
  UnderstandingHandoff,
  UnderstandingRevision,
  UpdateRevisionRequest,
} from '#/types/creative-video';

import { getBusinessData, patchBusinessData, postBusinessData } from './client';

export interface ActiveUnderstanding {
  active: null | UnderstandingRevision;
  draft: null | UnderstandingRevision;
  latest: null | UnderstandingRevision;
}

export function getActiveUnderstanding(projectId: string) {
  return getBusinessData<ActiveUnderstanding>(
    `/projects/${encodeURIComponent(projectId)}/understanding/active`,
  );
}

export function listRevisions(projectId: string) {
  return getBusinessData<UnderstandingRevision[]>(
    `/projects/${encodeURIComponent(projectId)}/understanding/revisions`,
  );
}

export function getRevision(projectId: string, revisionId: string) {
  return getBusinessData<UnderstandingRevision>(
    `/projects/${encodeURIComponent(projectId)}/understanding/revisions/${encodeURIComponent(revisionId)}`,
  );
}

export function generateUnderstanding(
  projectId: string,
  payload: GenerateUnderstandingRequest,
) {
  return postBusinessData<{ jobId: string }>(
    `/projects/${encodeURIComponent(projectId)}/understanding/generate`,
    payload,
  );
}

export function updateRevision(
  projectId: string,
  revisionId: string,
  payload: UpdateRevisionRequest,
) {
  return patchBusinessData<UnderstandingRevision>(
    `/projects/${encodeURIComponent(projectId)}/understanding/revisions/${encodeURIComponent(revisionId)}`,
    payload,
  );
}

export function forkRevision(projectId: string, revisionId: string) {
  return postBusinessData<UnderstandingRevision>(
    `/projects/${encodeURIComponent(projectId)}/understanding/revisions/${encodeURIComponent(revisionId)}/fork`,
  );
}

export function submitRevisionForReview(projectId: string, revisionId: string) {
  return postBusinessData<UnderstandingRevision>(
    `/projects/${encodeURIComponent(projectId)}/understanding/revisions/${encodeURIComponent(revisionId)}/submit-review`,
    {},
  );
}

export function approveRevision(
  projectId: string,
  revisionId: string,
  payload: ApproveRevisionRequest,
) {
  return postBusinessData<{
    project: { currentStage: string; id: string };
    revision: UnderstandingRevision;
  }>(
    `/projects/${encodeURIComponent(projectId)}/understanding/revisions/${encodeURIComponent(revisionId)}/approve`,
    payload,
  );
}

export function rejectRevision(
  projectId: string,
  revisionId: string,
  reason: string,
) {
  return postBusinessData<{
    project: { id: string };
    revision: UnderstandingRevision;
  }>(
    `/projects/${encodeURIComponent(projectId)}/understanding/revisions/${encodeURIComponent(revisionId)}/reject`,
    { reason },
  );
}

export function getHandoff(projectId: string) {
  return getBusinessData<null | UnderstandingHandoff>(
    `/projects/${encodeURIComponent(projectId)}/understanding/handoff`,
  );
}
export function addRevisionComment(
  projectId: string,
  revisionId: string,
  payload: { expectedVersion: number; note: string },
) {
  return postBusinessData<UnderstandingRevision>(
    `/projects/${encodeURIComponent(projectId)}/understanding/revisions/${encodeURIComponent(revisionId)}/comment`,
    payload,
  );
}
export function getUnderstandingDiff(
  projectId: string,
  fromRevisionId: string,
  toRevisionId: string,
) {
  return getBusinessData<UnderstandingDiff>(
    `/projects/${encodeURIComponent(projectId)}/understanding/diff?fromRevisionId=${encodeURIComponent(fromRevisionId)}&toRevisionId=${encodeURIComponent(toRevisionId)}`,
  );
}
