import type { ID, ISODateTime, VersionedEntity } from './common';

export interface ConceptStory {
  callToAction: string;
  centralConflict: string;
  climax: string;
  emotionalTone: string;
  escalation: string;
  leadCharacter: string;
  mainSetting: string;
  openingHookText: string;
  openingVisualHook: string;
  productReveal: string;
  setup: string;
  storyStructure: string;
  twist: string;
}

export interface CreativeConceptRevision extends VersionedEntity {
  approvedAt?: ISODateTime;
  approvedBy?: ID;
  briefId: ID;
  claimEvidenceIds: ID[];
  complexity: 'HIGH' | 'LOW' | 'MEDIUM';
  compositionProvenance?: Array<{
    field: string;
    sourceConceptRevisionId: ID;
  }>;
  conceptMoodboardBindings?: Array<{
    assetContentVersionId: ID;
    assetId: ID;
    usageRole: 'CHARACTER_IDEA' | 'MOODBOARD' | 'SCENE_IDEA';
  }>;
  conceptGroupId: ID;
  logline: string;
  maximumUsefulDurationSec: number;
  minimumViableDurationSec: number;
  missingAssets: string[];
  moodboardAssetIds: ID[];
  musicMood: string;
  parentRevisionId?: ID;
  primaryAngleId: ID;
  projectId: ID;
  recommendedAspectRatio: '1:1' | '9:16' | '16:9';
  revisionNo: number;
  reviewerNotes?: string;
  riskNotes: string[];
  secondaryAngleIds: ID[];
  status: 'APPROVED' | 'DRAFT' | 'REJECTED' | 'STALE' | 'WAITING_REVIEW';
  story: ConceptStory;
  suggestedDurationSec: number;
  targetPersonaIds: ID[];
  title: string;
  visualStyles: string[];
}

export interface ConceptGroup extends VersionedEntity {
  briefId: ID;
  conceptRevisionIds: ID[];
  favoriteConceptRevisionIds: ID[];
  generationJobId: ID;
  homogeneous?: boolean;
  projectId: ID;
  selectedConceptRevisionId?: ID;
  status: 'FAILED' | 'GENERATING' | 'READY' | 'STALE';
}
