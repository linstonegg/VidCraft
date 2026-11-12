import type { ID, ISODateTime, VersionedEntity } from './common';
import type { ShotGenerationMode } from './storyboard';

export type FootageSubtype =
  | 'camera_footage'
  | 'licensed_stock'
  | 'other'
  | 'screen_recording';

export interface ShotGenerationSpec extends VersionedEntity {
  expectedDurationMs: number;
  footageSubtype?: FootageSubtype;
  mode: ShotGenerationMode;
  modelId?: string;
  outputAspectRatio: '1:1' | '9:16' | '16:9';
  projectId: ID;
  referenceAssetVersionIds: ID[];
  referenceImageVersionIds?: ID[];
  shotId: ID;
  shotRevisionId: ID;
  sourceShotRevisionVersion: number;
  visualBibleVersionId: ID;
}

export type SpecValidity =
  | 'BLOCKED'
  | 'CURRENT'
  | 'NOT_CONFIGURED'
  | 'OUTDATED';

export interface ShotGenerationSpecSuggestion {
  expectedDurationMs: number;
  mode: ShotGenerationMode;
  outputAspectRatio: '1:1' | '9:16' | '16:9';
  referenceAssetVersionIds: ID[];
  referenceImageVersionIds: ID[];
  shotId: ID;
  shotRevisionId: ID;
  visualBibleVersionId: ID;
}

export type SpecOutdatedReason =
  | 'ASPECT_RATIO_CHANGED'
  | 'ASSET_REDACTED'
  | 'ASSET_VERSION_CHANGED'
  | 'CLAIM_BLOCKED'
  | 'MISSING_ACTIVE_BASELINE'
  | 'REFERENCE_IMAGE_CHANGED'
  | 'SHOT_REVISION_CHANGED'
  | 'SHOT_VERSION_CHANGED'
  | 'UNRESOLVED_LEGACY_VERSION'
  | 'VISUAL_BIBLE_CHANGED';

export interface ShotGenerationSpecView {
  comparedAt: ISODateTime;
  currentApprovedShotRevisionId?: ID;
  outdatedReasonCodes: SpecOutdatedReason[];
  shotId: ID;
  spec?: ShotGenerationSpec;
  specValidity: SpecValidity;
  suggestedSpec?: ShotGenerationSpecSuggestion;
}
