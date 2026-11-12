import type {
  AnimaticSnapshot,
  M2Handoff,
  ShotRevision,
} from '#/types/creative-video';

import { createIdempotencyKey } from '#/utils/creative-video/validation';

import { getBusinessData, postBusinessData } from './client';

export interface AnimaticState {
  active: AnimaticSnapshot | null;
  images: any[];
  latest: AnimaticSnapshot | null;
  shots: ShotRevision[];
  snapshots: AnimaticSnapshot[];
  storyboard: any;
}

export function buildAnimatic(
  projectId: string,
  payload: {
    scenario?: string;
    storyboardRevisionId: string;
    visualBibleVersionId?: string;
  },
  key = createIdempotencyKey('animatic'),
) {
  return postBusinessData<{ jobId: string }>(
    `/projects/${encodeURIComponent(projectId)}/animatic/build`,
    payload,
    { headers: { 'Idempotency-Key': key } },
  );
}

export function getAnimaticState(projectId: string) {
  return getBusinessData<AnimaticState>(
    `/projects/${encodeURIComponent(projectId)}/animatic`,
  );
}

export function commentAnimatic(
  projectId: string,
  snapshotId: string,
  payload: { atMs: number; shotId: string; text: string },
) {
  return postBusinessData<AnimaticSnapshot>(
    `/projects/${encodeURIComponent(projectId)}/animatic/snapshots/${encodeURIComponent(snapshotId)}/comments`,
    payload,
  );
}

export function approveAnimatic(
  projectId: string,
  snapshotId: string,
  expectedVersion: number,
) {
  return postBusinessData<AnimaticSnapshot>(
    `/projects/${encodeURIComponent(projectId)}/animatic/snapshots/${encodeURIComponent(snapshotId)}/approve`,
    { expectedVersion },
  );
}

export function rejectAnimatic(
  projectId: string,
  snapshotId: string,
  expectedVersion: number,
  reason: string,
) {
  return postBusinessData<AnimaticSnapshot>(
    `/projects/${encodeURIComponent(projectId)}/animatic/snapshots/${encodeURIComponent(snapshotId)}/reject`,
    { expectedVersion, reason },
  );
}

export function getM2Handoff(projectId: string) {
  return getBusinessData<M2Handoff | null>(
    `/projects/${encodeURIComponent(projectId)}/animatic/handoff`,
  );
}
