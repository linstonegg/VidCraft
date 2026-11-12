import type { ID, ISODateTime, VersionedEntity } from './common';
import type { AssetRef } from './ingestion';

/** 同一 AssetRef 的不可变内容版本；与 AssetRef.version 的元数据乐观锁严格区分。 */
export interface AssetContentVersion {
  assetId: ID;
  contentHash?: string;
  contentRevisionNo: number;
  createdAt: ISODateTime;
  createdBy?: ID;
  id: ID;
  mimeType: string;
  originalFilename?: string;
  projectId: ID;
  replacesVersionId?: ID;
  sizeBytes: number;
  status: 'READY' | 'REDACTED' | 'UNAVAILABLE';
  storageRef?: string;
}

export interface AssetIdentityView {
  activeContentVersionId?: ID;
  asset: AssetRef;
  contentVersions: AssetContentVersion[];
}

export type AssetPurpose =
  | 'BRAND_LOGO'
  | 'BRAND_STYLE'
  | 'CHARACTER_REFERENCE'
  | 'EVIDENCE_DOCUMENT'
  | 'OTHER'
  | 'PRODUCT_DEMO'
  | 'PRODUCT_UI'
  | 'REFERENCE_AD'
  | 'SCENE_REFERENCE';

export interface AssetUsageMetadata extends VersionedEntity {
  assetId: ID;
  containsSensitiveData: boolean;
  mayBeShownInFinalVideo: boolean;
  mayBeUsedForAnalysis: boolean;
  notes?: string;
  projectId: ID;
  purposes: AssetPurpose[];
  rightsStatus: 'DECLARED' | 'NOT_ALLOWED' | 'UNCERTAIN';
}

export type AssetUseTarget =
  | 'CREATIVE_CONCEPT_REVISION'
  | 'PRODUCT_SOURCE'
  | 'REFERENCE_AD_ANALYSIS'
  | 'SHOT_REVISION'
  | 'STORYBOARD_REVISION'
  | 'UNDERSTANDING_REVISION'
  | 'VISUAL_BIBLE_REVISION';

export interface AssetUsageRef {
  assetId: ID;
  assetVersionId?: ID;
  id: ID;
  isActiveCandidate: boolean;
  isInApprovedSnapshot: boolean;
  projectId: ID;
  targetId: ID;
  targetRevisionId?: ID;
  targetType: AssetUseTarget;
  unresolvedLegacy?: boolean;
  usageRole: string;
}

export interface AssetContentBinding {
  assetId: ID;
  assetVersionId: ID;
  targetEntityId?: ID;
  usageRole: string;
}

export interface VisualBibleContentExtension {
  assetContentBindings?: AssetContentBinding[];
}

export interface ShotContentExtension {
  assetContentBindings?: AssetContentBinding[];
}

export interface ConceptMoodboardBinding {
  assetContentVersionId: ID;
  assetId: ID;
  usageRole: 'CHARACTER_IDEA' | 'MOODBOARD' | 'SCENE_IDEA';
}

export interface CreativeConceptMoodboardExtension {
  conceptMoodboardBindings?: ConceptMoodboardBinding[];
}
