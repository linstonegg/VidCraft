import type { MockJob } from '#/types/creative-video';

import { getBusinessData, postBusinessData } from './client';

export function getJob(jobId: string) {
  return getBusinessData<MockJob>(`/jobs/${encodeURIComponent(jobId)}`);
}

export function cancelJob(jobId: string) {
  return postBusinessData<MockJob>(`/jobs/${encodeURIComponent(jobId)}/cancel`);
}

export function listProjectJobs(projectId: string) {
  return getBusinessData<MockJob[]>(
    `/projects/${encodeURIComponent(projectId)}/jobs`,
  );
}

export function getDemoScenarios() {
  return getBusinessData<{
    collectUrl: string[];
    demoSession: string[];
    understanding: string[];
  }>('/demo/scenarios');
}
