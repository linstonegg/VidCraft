import type { ReferenceAdInsight } from '#/types/creative-video';

import { getBusinessData, postBusinessData } from './client';

export function listReferenceAdInsights(projectId: string) {
  return getBusinessData<ReferenceAdInsight[]>(
    `/projects/${encodeURIComponent(projectId)}/reference-ads`,
  );
}

export function getReferenceAdInsight(projectId: string, insightId: string) {
  return getBusinessData<ReferenceAdInsight>(
    `/projects/${encodeURIComponent(projectId)}/reference-ads/${encodeURIComponent(insightId)}`,
  );
}

export function createReferenceAdInsight(
  projectId: string,
  payload: {
    contentDataUrl?: string;
    copyrightConfirmed: boolean;
    durationSec?: number;
    fileName?: string;
    fileSize?: number;
    format?: string;
    height?: number;
    mimeType?: string;
    thumbnailDataUrl?: string;
    title: string;
    width?: number;
  },
) {
  return postBusinessData<{ jobId: string }>(
    `/projects/${encodeURIComponent(projectId)}/reference-ads`,
    payload,
  );
}
export function reanalyzeReferenceAd(projectId: string, insightId: string) {
  return postBusinessData<{ jobId: string }>(
    `/projects/${encodeURIComponent(projectId)}/reference-ads/${encodeURIComponent(insightId)}/reanalyze`,
    {},
  );
}
