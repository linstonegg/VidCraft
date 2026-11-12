import type { ID, ISODateTime, VersionedEntity } from './common';

export interface AnimaticComment {
  atMs: number;
  authorId: ID;
  createdAt: ISODateTime;
  id: ID;
  shotId: ID;
  text: string;
}

export interface AnimaticSnapshot extends VersionedEntity {
  approvedAt?: ISODateTime;
  approvedBy?: ID;
  comments: AnimaticComment[];
  orderedShotRevisionIds: ID[];
  projectId: ID;
  scriptRevisionId: ID;
  selectedReferenceImageVersionIds: ID[];
  status: 'APPROVED' | 'DRAFT' | 'STALE';
  storyboardRevisionId: ID;
  totalDurationMs: number;
  visualBibleVersionId: ID;
}

export interface TimelineSegment {
  durationMs: number;
  endMs: number;
  overlapWithNextMs: number;
  referenceImageId?: ID;
  shotId: ID;
  shotRevisionId: ID;
  startMs: number;
}

export interface M2Handoff {
  canEnterM3?: boolean;
  claimReadiness?: Array<{ claimAnchorId: string; status: string }>;
  effectiveValidity?: 'BLOCKED' | 'CURRENT' | 'REVIEW_REQUIRED';
  generationSpecs?: any[];
  m3BlockingItems?: Array<{ key: string; label: string; reason?: string }>;
  productionReadiness?: any;
  approvedAnimaticSnapshotId: ID;
  approvedConceptRevisionId: ID;
  approvedCreativeBriefId: ID;
  approvedScriptRevisionId: ID;
  approvedStoryboardRevisionId: ID;
  approvedVisualBibleVersionId: ID;
  aspectRatio: string;
  language: string;
  mockOnly: true;
  orderedApprovedShotRevisionIds: ID[];
  platform: string;
  projectId: ID;
  targetDurationMs: number;
  timelineVersion: number;
  understandingRevisionId: ID;
}
