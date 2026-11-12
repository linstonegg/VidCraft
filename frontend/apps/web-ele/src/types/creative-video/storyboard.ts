import type { ID, ISODateTime, VersionedEntity } from './common';
import type { NarrativeRole } from './script';

export type ShotGenerationMode =
  | 'ai_video'
  | 'image_animation'
  | 'motion_graphics'
  | 'real_footage';

export type ShotReviewState =
  | 'APPROVED'
  | 'DRAFT'
  | 'NEEDS_CHANGES'
  | 'PENDING_REVIEW'
  | 'STALE';

export interface ImageAssetVersion {
  aspectRatio: string;
  height: number;
  id: ID;
  mimeType: string;
  mockUrl: string;
  promptSnapshot: string;
  shotId: ID;
  sourceType: 'm1_source' | 'mock_generated' | 'uploaded' | 'user_selected';
  status: 'EXPIRED' | 'FAILED' | 'READY';
  versionNo: number;
  visualBibleVersionId: ID;
  width: number;
}

export interface ShotRevision extends VersionedEntity {
  actionDescription: string;
  activeReferenceImageId?: ID;
  aiPrompt: string;
  approvedAt?: ISODateTime;
  approvedBy?: ID;
  cameraPlan: string;
  characterIds: ID[];
  dialogue: string;
  durationMs: number;
  evidenceIds: ID[];
  generationMode: ShotGenerationMode;
  musicCue: string;
  narration: string;
  narrativePurpose: NarrativeRole;
  negativePrompt: string;
  onScreenText: string[];
  order: number;
  parentRevisionId?: ID;
  productPlacement: string;
  projectId: ID;
  referenceImageVersionIds: ID[];
  reviewStatus: ShotReviewState;
  revisionNo: number;
  riskNotes: string[];
  sceneDescription: string;
  sceneIds: ID[];
  scriptRevisionId: ID;
  sfx: string[];
  shotId: ID;
  storyBeatId: ID;
  subtitles: string[];
  title: string;
  transitionIn: string;
  transitionOut: string;
  transitionOverlapToNextMs: number;
  visualBibleVersionId: ID;
  visualStyle: string;
}

export interface StoryboardRevision extends VersionedEntity {
  approvedAt?: ISODateTime;
  approvedBy?: ID;
  orderedShotRevisionIds: ID[];
  parentRevisionId?: ID;
  projectId: ID;
  revisionNo: number;
  scriptRevisionId: ID;
  status: 'APPROVED' | 'DRAFT' | 'STALE' | 'WAITING_REVIEW';
  totalDurationMs: number;
  visualBibleVersionId: ID;
}
