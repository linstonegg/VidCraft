import type { ID, ISODateTime, VersionedEntity } from './common';

export type ReferenceAdPatternKey =
  | 'audio'
  | 'cta'
  | 'hook'
  | 'narrative'
  | 'pacing'
  | 'visual';

export interface ReferenceAdPattern {
  key: ReferenceAdPatternKey;
  label: string;
  value: string;
}

export interface ReferenceAdSourceExtension {
  analysisScope?: 'CREATIVE_REFERENCE' | 'PRODUCT_EVIDENCE';
}

export interface ReferenceAdInsight extends VersionedEntity {
  abstractLanguage: string[];
  analysisScope: 'CREATIVE_REFERENCE';
  analysisStatus: 'READY';
  assetId?: ID;
  canBeUsedAsProductEvidence: false;
  copyright: {
    declaredAt: ISODateTime;
    declaredByUser: boolean;
    note: string;
  };
  doNotCopy: string[];
  asr?: {
    language: string;
    text: string;
  };
  durationSec: number;
  format: string;
  media?: {
    height: number;
    mimeType: string;
    previewDataUrl?: string;
    storageRef?: string;
    width: number;
  };
  patterns: ReferenceAdPattern[];
  projectId: ID;
  sourceId: ID;
  summary: string;
  title: string;
}
