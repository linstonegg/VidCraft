import type { EffectiveValidity, ID, ISODateTime } from './common';

export type DependencyImpactSeverity = 'BLOCKED' | 'INFO' | 'REVIEW_REQUIRED';

export interface DependencyImpactItem {
  actionRoute?: string;
  effectiveValidity: EffectiveValidity;
  objectId: ID;
  objectLabel: string;
  objectType:
    | 'ANIMATIC'
    | 'ASSET'
    | 'BRIEF'
    | 'CONCEPT'
    | 'SCRIPT'
    | 'SHOT'
    | 'STORYBOARD'
    | 'VISUAL_BIBLE';
  reason: string;
}

export interface DependencyImpactPreview {
  affected: DependencyImpactItem[];
  changeKind: 'ASSET_CONTENT' | 'FACT' | 'REFERENCE_IMAGE' | 'VISUAL_BIBLE';
  evaluatedAt: ISODateTime;
  projectId: ID;
  requiresNewReview: boolean;
  sourceId: ID;
  summary: string;
}
