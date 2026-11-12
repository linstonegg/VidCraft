import type {
  ConceptGroup,
  CreativeConceptRevision,
} from '#/types/creative-video';

import { createIdempotencyKey } from '#/utils/creative-video/validation';

import { getBusinessData, patchBusinessData, postBusinessData } from './client';

export function generateConcepts(
  projectId: string,
  payload: { briefId: string; count?: number; scenario?: string },
  key = createIdempotencyKey('concepts'),
) {
  return postBusinessData<{ jobId: string }>(
    `/projects/${encodeURIComponent(projectId)}/concepts/generate`,
    { count: 3, ...payload },
    { headers: { 'Idempotency-Key': key } },
  );
}

export function listConceptGroups(projectId: string) {
  return getBusinessData<ConceptGroup[]>(
    `/projects/${encodeURIComponent(projectId)}/concepts/groups`,
  );
}

export function getConceptGroup(projectId: string, groupId: string) {
  return getBusinessData<{
    concepts: CreativeConceptRevision[];
    group: ConceptGroup;
  }>(
    `/projects/${encodeURIComponent(projectId)}/concepts/groups/${encodeURIComponent(groupId)}`,
  );
}

export function getConcept(projectId: string, revisionId: string) {
  return getBusinessData<CreativeConceptRevision>(
    `/projects/${encodeURIComponent(projectId)}/concepts/revisions/${encodeURIComponent(revisionId)}`,
  );
}

export function patchConcept(
  projectId: string,
  revisionId: string,
  payload: { expectedVersion: number; patch: Record<string, any> },
) {
  return patchBusinessData<CreativeConceptRevision>(
    `/projects/${encodeURIComponent(projectId)}/concepts/revisions/${encodeURIComponent(revisionId)}`,
    payload,
  );
}

export function forkConcept(
  projectId: string,
  revisionId: string,
  expectedVersion: number,
  expectedBriefId?: string,
) {
  return postBusinessData<CreativeConceptRevision>(
    `/projects/${encodeURIComponent(projectId)}/concepts/revisions/${encodeURIComponent(revisionId)}/fork`,
    { expectedBriefId, expectedVersion },
  );
}

export function submitConceptReview(
  projectId: string,
  revisionId: string,
  expectedVersion: number,
) {
  return postBusinessData<CreativeConceptRevision>(
    `/projects/${encodeURIComponent(projectId)}/concepts/revisions/${encodeURIComponent(revisionId)}/submit-review`,
    { expectedVersion },
  );
}

export function approveConcept(
  projectId: string,
  revisionId: string,
  expectedVersion: number,
) {
  return postBusinessData<CreativeConceptRevision>(
    `/projects/${encodeURIComponent(projectId)}/concepts/revisions/${encodeURIComponent(revisionId)}/approve`,
    { expectedVersion },
  );
}

export function rejectConcept(
  projectId: string,
  revisionId: string,
  expectedVersion: number,
  reason: string,
) {
  return postBusinessData<CreativeConceptRevision>(
    `/projects/${encodeURIComponent(projectId)}/concepts/revisions/${encodeURIComponent(revisionId)}/reject`,
    { expectedVersion, reason },
  );
}

export function selectConcept(
  projectId: string,
  groupId: string,
  revisionId: string,
  expectedVersion: number,
) {
  return postBusinessData<ConceptGroup>(
    `/projects/${encodeURIComponent(projectId)}/concepts/groups/${encodeURIComponent(groupId)}/select`,
    { expectedVersion, revisionId },
  );
}

export function favoriteConcept(
  projectId: string,
  groupId: string,
  revisionId: string,
  favorite: boolean,
) {
  return postBusinessData<ConceptGroup>(
    `/projects/${encodeURIComponent(projectId)}/concepts/groups/${encodeURIComponent(groupId)}/favorite`,
    { favorite, revisionId },
  );
}

export function getActiveConcept(projectId: string) {
  return getBusinessData<CreativeConceptRevision | null>(
    `/projects/${encodeURIComponent(projectId)}/concepts/active`,
  );
}
export function patchConceptMoodboard(
  projectId: string,
  revisionId: string,
  payload: {
    bindings: Array<{
      assetContentVersionId: string;
      assetId: string;
      usageRole: 'CHARACTER_IDEA' | 'MOODBOARD' | 'SCENE_IDEA';
    }>;
    expectedVersion: number;
  },
) {
  return patchBusinessData<CreativeConceptRevision>(
    `/projects/${encodeURIComponent(projectId)}/concepts/revisions/${encodeURIComponent(revisionId)}/moodboard-bindings`,
    payload,
  );
}
