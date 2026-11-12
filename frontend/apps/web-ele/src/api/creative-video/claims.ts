import type {
  ClaimAnchor,
  ClaimConflict,
  ClaimReadinessItem,
  ConflictDecision,
  ConflictResolution,
  ConflictResolutionPreview,
  EvidenceLocatorSnapshot,
} from '#/types/creative-video';

import { getBusinessData, postBusinessData } from './client';

export function getClaimAnchors(projectId: string, revisionId?: string) {
  const query = revisionId
    ? `?revisionId=${encodeURIComponent(revisionId)}`
    : '';
  return getBusinessData<ClaimAnchor[]>(
    `/projects/${encodeURIComponent(projectId)}/claims/anchors${query}`,
  );
}

export function getClaimReadiness(projectId: string, revisionId: string) {
  return getBusinessData<ClaimReadinessItem[]>(
    `/projects/${encodeURIComponent(projectId)}/claims/readiness?understandingRevisionId=${encodeURIComponent(revisionId)}`,
  );
}

export function getClaimConflicts(projectId: string, status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return getBusinessData<ClaimConflict[]>(
    `/projects/${encodeURIComponent(projectId)}/claim-conflicts${query}`,
  );
}

export function getClaimConflict(projectId: string, conflictId: string) {
  return getBusinessData<{
    anchors: ClaimAnchor[];
    conflict: ClaimConflict;
    resolution?: ConflictResolution;
  }>(
    `/projects/${encodeURIComponent(projectId)}/claim-conflicts/${encodeURIComponent(conflictId)}`,
  );
}

export function scanClaimConflicts(projectId: string) {
  return postBusinessData<{ conflicts: ClaimConflict[]; scanned: boolean }>(
    `/projects/${encodeURIComponent(projectId)}/claim-conflicts/scan`,
    {},
  );
}

export function previewConflictResolution(
  projectId: string,
  conflictId: string,
  payload: {
    applicabilityNotes?: string;
    decision: ConflictDecision;
    proposedSafeStatement?: string;
  },
) {
  return postBusinessData<ConflictResolutionPreview>(
    `/projects/${encodeURIComponent(projectId)}/claim-conflicts/${encodeURIComponent(conflictId)}/resolution-preview`,
    payload,
  );
}

export function createConflictResolution(
  projectId: string,
  conflictId: string,
  payload: {
    applicabilityNotes?: string;
    decision: ConflictDecision;
    expectedVersion: number;
    linkedEvidenceIds?: string[];
    proposedSafeStatement?: string;
    reason: string;
  },
) {
  return postBusinessData<ConflictResolution>(
    `/projects/${encodeURIComponent(projectId)}/claim-conflicts/${encodeURIComponent(conflictId)}/resolutions`,
    payload,
  );
}

export function approveConflictResolution(
  projectId: string,
  resolutionId: string,
  expectedVersion: number,
) {
  return postBusinessData<{
    conflict: ClaimConflict;
    draft: { id: string; revisionNo: number };
    resolution: ConflictResolution;
  }>(
    `/projects/${encodeURIComponent(projectId)}/claim-conflicts/resolutions/${encodeURIComponent(resolutionId)}/approve`,
    { expectedVersion },
  );
}

export function getEvidenceSnapshots(projectId: string, revisionId: string) {
  return getBusinessData<EvidenceLocatorSnapshot[]>(
    `/projects/${encodeURIComponent(projectId)}/understanding/revisions/${encodeURIComponent(revisionId)}/evidence-snapshots`,
  );
}
