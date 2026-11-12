import type {
  CreativeChangePlan,
  DirectorMessage,
} from '#/types/creative-video';

import { getBusinessData, postBusinessData } from './client';

export function createChangePlan(
  projectId: string,
  payload: {
    scope: string;
    targetId: string;
    userMessage: string;
  },
) {
  return postBusinessData<CreativeChangePlan>(
    `/projects/${encodeURIComponent(projectId)}/director/change-plans`,
    payload,
  );
}

export function getChangePlan(projectId: string, planId: string) {
  return getBusinessData<CreativeChangePlan>(
    `/projects/${encodeURIComponent(projectId)}/director/change-plans/${encodeURIComponent(planId)}`,
  );
}

export function applyChangePlan(
  projectId: string,
  planId: string,
  payload: { expectedTargetVersion?: number; expectedVersion: number },
) {
  return postBusinessData<{ plan: CreativeChangePlan; updated: any }>(
    `/projects/${encodeURIComponent(projectId)}/director/change-plans/${encodeURIComponent(planId)}/apply`,
    payload,
  );
}

export function discardChangePlan(
  projectId: string,
  planId: string,
  expectedVersion: number,
) {
  return postBusinessData<CreativeChangePlan>(
    `/projects/${encodeURIComponent(projectId)}/director/change-plans/${encodeURIComponent(planId)}/discard`,
    { expectedVersion },
  );
}

export function listDirectorMessages(
  projectId: string,
  scope?: string,
  targetId?: string,
) {
  const params = new URLSearchParams();
  if (scope) params.set('scope', scope);
  if (targetId) params.set('targetId', targetId);
  const query = params.toString();
  return getBusinessData<DirectorMessage[]>(
    `/projects/${encodeURIComponent(projectId)}/director/messages${query ? `?${query}` : ''}`,
  );
}
