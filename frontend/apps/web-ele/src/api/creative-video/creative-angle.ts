import type { CreativeBrief, MarketingAngleSet } from '#/types/creative-video';

import { createIdempotencyKey } from '#/utils/creative-video/validation';

import { getBusinessData, patchBusinessData, postBusinessData } from './client';

export function getAngles(projectId: string) {
  return getBusinessData<{
    activeBrief: CreativeBrief | null;
    angleSet: MarketingAngleSet | null;
    brief: CreativeBrief | null;
    sets: MarketingAngleSet[];
    understanding: {
      id: string;
      revisionNo: number;
      usedEvidenceIds: string[];
      version: number;
    };
  }>(`/projects/${encodeURIComponent(projectId)}/angles`);
}

export function generateAngles(
  projectId: string,
  payload: {
    excludedCodes?: string[];
    scenario?: string;
    understandingRevisionId: string;
  },
  key = createIdempotencyKey('angles'),
) {
  return postBusinessData<{ jobId: string }>(
    `/projects/${encodeURIComponent(projectId)}/angles/generate`,
    payload,
    { headers: { 'Idempotency-Key': key } },
  );
}

export function patchAngleSet(
  projectId: string,
  setId: string,
  payload: { expectedVersion: number; patch: Record<string, any> },
) {
  return patchBusinessData<MarketingAngleSet>(
    `/projects/${encodeURIComponent(projectId)}/angles/sets/${encodeURIComponent(setId)}`,
    payload,
  );
}

export function forkAngleSet(
  projectId: string,
  setId: string,
  expectedVersion: number,
) {
  return postBusinessData<MarketingAngleSet>(
    `/projects/${encodeURIComponent(projectId)}/angles/sets/${encodeURIComponent(setId)}/fork`,
    { expectedVersion },
  );
}

export function createCreativeBrief(
  projectId: string,
  payload: {
    angleSetId: string;
    extraInstructions?: string;
    primaryAngleId: string;
    secondaryAngleIds?: string[];
  },
) {
  return postBusinessData<CreativeBrief>(
    `/projects/${encodeURIComponent(projectId)}/creative-briefs`,
    payload,
  );
}

export function approveCreativeBrief(
  projectId: string,
  briefId: string,
  expectedVersion: number,
) {
  return postBusinessData<CreativeBrief>(
    `/projects/${encodeURIComponent(projectId)}/creative-briefs/${encodeURIComponent(briefId)}/approve`,
    { expectedVersion },
  );
}

export function getActiveCreativeBrief(projectId: string) {
  return getBusinessData<CreativeBrief | null>(
    `/projects/${encodeURIComponent(projectId)}/creative-briefs/active`,
  );
}
export function setAngleSetReferenceInsight(
  projectId: string,
  setId: string,
  payload: { expectedVersion: number; insightId: string },
) {
  return patchBusinessData<MarketingAngleSet>(
    `/projects/${encodeURIComponent(projectId)}/angles/sets/${encodeURIComponent(setId)}/reference-insight`,
    payload,
  );
}
