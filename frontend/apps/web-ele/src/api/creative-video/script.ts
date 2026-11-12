import type { DurationPlan, ScriptRevision } from '#/types/creative-video';

import { createIdempotencyKey } from '#/utils/creative-video/validation';

import { getBusinessData, patchBusinessData, postBusinessData } from './client';

export function evaluateDuration(
  projectId: string,
  payload: { conceptRevisionId: string; targetDurationMs: number },
) {
  return postBusinessData<DurationPlan>(
    `/projects/${encodeURIComponent(projectId)}/duration-plans/evaluate`,
    payload,
  );
}

export function listDurationPlans(projectId: string) {
  return getBusinessData<DurationPlan[]>(
    `/projects/${encodeURIComponent(projectId)}/duration-plans`,
  );
}

export function patchDurationPlan(
  projectId: string,
  planId: string,
  payload: {
    acceptedRiskNotes?: string[];
    expectedVersion: number;
    selectedStrategy?: string;
  },
) {
  return patchBusinessData<DurationPlan>(
    `/projects/${encodeURIComponent(projectId)}/duration-plans/${encodeURIComponent(planId)}`,
    payload,
  );
}

export function generateScript(
  projectId: string,
  payload: {
    conceptRevisionId: string;
    durationPlanId: string;
    scenario?: string;
  },
  key = createIdempotencyKey('script'),
) {
  return postBusinessData<{ jobId: string }>(
    `/projects/${encodeURIComponent(projectId)}/scripts/generate`,
    payload,
    { headers: { 'Idempotency-Key': key } },
  );
}

export function getScriptsState(projectId: string) {
  return getBusinessData<{
    active: null | ScriptRevision;
    concept: any;
    durationPlans: DurationPlan[];
    latest: null | ScriptRevision;
    scripts: ScriptRevision[];
  }>(`/projects/${encodeURIComponent(projectId)}/scripts/revisions`);
}

export function getScript(projectId: string, revisionId: string) {
  return getBusinessData<ScriptRevision>(
    `/projects/${encodeURIComponent(projectId)}/scripts/revisions/${encodeURIComponent(revisionId)}`,
  );
}

export function patchScript(
  projectId: string,
  revisionId: string,
  payload: { expectedVersion: number; patch: Record<string, any> },
) {
  return patchBusinessData<ScriptRevision>(
    `/projects/${encodeURIComponent(projectId)}/scripts/revisions/${encodeURIComponent(revisionId)}`,
    payload,
  );
}

export function forkScript(
  projectId: string,
  revisionId: string,
  expectedVersion: number,
) {
  return postBusinessData<ScriptRevision>(
    `/projects/${encodeURIComponent(projectId)}/scripts/revisions/${encodeURIComponent(revisionId)}/fork`,
    { expectedVersion },
  );
}

export function submitScriptReview(
  projectId: string,
  revisionId: string,
  expectedVersion: number,
) {
  return postBusinessData<ScriptRevision>(
    `/projects/${encodeURIComponent(projectId)}/scripts/revisions/${encodeURIComponent(revisionId)}/submit-review`,
    { expectedVersion },
  );
}

export function approveScript(
  projectId: string,
  revisionId: string,
  expectedVersion: number,
) {
  return postBusinessData<ScriptRevision>(
    `/projects/${encodeURIComponent(projectId)}/scripts/revisions/${encodeURIComponent(revisionId)}/approve`,
    { expectedVersion },
  );
}

export function rejectScript(
  projectId: string,
  revisionId: string,
  expectedVersion: number,
  reason: string,
) {
  return postBusinessData<ScriptRevision>(
    `/projects/${encodeURIComponent(projectId)}/scripts/revisions/${encodeURIComponent(revisionId)}/reject`,
    { expectedVersion, reason },
  );
}

export function getActiveScript(projectId: string) {
  return getBusinessData<null | ScriptRevision>(
    `/projects/${encodeURIComponent(projectId)}/scripts/active`,
  );
}
