import type { EvidenceLevel, ID, ISODateTime, VersionedEntity } from './common';

export type ClaimOrigin =
  | 'ANGLE'
  | 'FEATURE'
  | 'FREE_TEXT'
  | 'PAIN_POINT'
  | 'SCRIPT_BEAT'
  | 'SHOT';

export interface ClaimAnchor {
  createdAt: ISODateTime;
  entityId?: ID;
  fieldPath?: string;
  id: ID;
  origin: ClaimOrigin;
  projectId: ID;
  sourceEvidenceIds: ID[];
  sourceRevisionId: ID;
  statementSnapshot: string;
  supersedesClaimAnchorId?: ID;
}

export type ClaimReadinessStatus = 'BLOCKED' | 'NEEDS_REVIEW' | 'USABLE';

export interface ClaimReadinessItem {
  claimAnchorId: ID;
  evaluatedForRevisionId: ID;
  reasonCodes: string[];
  relatedConflictIds: ID[];
  status: ClaimReadinessStatus;
}

export type ConflictType =
  | 'FACTUAL_CONTRADICTION'
  | 'POLICY_RESTRICTION'
  | 'QUANTIFIED_CLAIM_UNSUPPORTED'
  | 'SOURCE_STALENESS'
  | 'VERSION_SCOPE';

export type ConflictDecision =
  | 'CONFIRM_A'
  | 'CONFIRM_B'
  | 'EXCLUDE_CLAIM'
  | 'NEEDS_EVIDENCE'
  | 'NOT_A_CONFLICT'
  | 'REWRITE_SAFE';

export interface ClaimConflict extends VersionedEntity {
  activeResolutionId?: ID;
  affectedMarketingClaimIds: ID[];
  candidateSafeStatement?: string;
  claimId: ID;
  conflictType: ConflictType;
  detectedFromSnapshotId: ID;
  evidenceIdsA: ID[];
  evidenceIdsB: ID[];
  explanation: string;
  mocked: true;
  projectId: ID;
  relatedFeatureIds: ID[];
  resultingClaimAnchorId?: ID;
  severity: 'HIGH' | 'LOW' | 'MEDIUM';
  statementA?: string;
  statementB?: string;
  status:
    | 'DISMISSED_AS_NON_CONFLICT'
    | 'OPEN'
    | 'REOPENED'
    | 'RESOLVED'
    | 'UNDER_REVIEW';
  title: string;
}

export interface ConflictResolution extends VersionedEntity {
  applicabilityNotes?: string;
  approvalStatus: 'APPROVED' | 'DRAFT' | 'REJECTED' | 'SUBMITTED';
  conflictId: ID;
  createdBy: ID;
  decision: ConflictDecision;
  linkedEvidenceIds: ID[];
  projectId: ID;
  proposedSafeStatement?: string;
  proposedUnderstandingRevisionId?: ID;
  reason: string;
  reviewedAt?: ISODateTime;
  reviewedBy?: ID;
}

export interface ConflictResolutionPreview {
  affectedClaimIds: ID[];
  canAutoResolve: boolean;
  decision: ConflictDecision;
  remainingBlockedClaimIds: ID[];
  revisionDraftImpact: string;
  warnings: string[];
}

export interface EvidenceLocatorBase {
  capturedAt: ISODateTime;
  capturedForRevisionId: ID;
  evidenceId: ID;
  id: ID;
  ingestionSnapshotId: ID;
  locator: {
    pageNo?: number;
    screenshotAssetId?: ID;
    timeEndSec?: number;
    timeStartSec?: number;
  };
  projectId: ID;
  sourceId: ID;
}

export type EvidenceLocatorSnapshot = EvidenceLocatorBase &
  (
    | {
        evidenceLevelAtCapture: EvidenceLevel;
        excerptSnapshot: string;
        recoverability: 'CAPTURED' | 'RECONSTRUCTED';
        sourceVersion: number;
      }
    | {
        evidenceLevelAtCapture?: EvidenceLevel;
        excerptSnapshot?: string;
        recoverability: 'LEGACY_EVIDENCE_UNRESOLVED';
        sourceVersion?: number;
        unresolvedReason: string;
      }
  );
