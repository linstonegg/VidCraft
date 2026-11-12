import type { EffectiveValidity, ID } from './common';

export type StoryboardViewMode = 'SHOT_DETAIL' | 'SHOT_OVERVIEW';
export type StudioViewMode = 'DIRECTOR' | 'EXPLORATION';
export type ViewingContext = 'APPROVED_BASELINE' | 'HISTORY' | 'WORKING_DRAFT';

export interface CanvasViewport {
  panX: number;
  panY: number;
  scale: number;
}

export interface ExplorationConceptCardVM {
  conceptGroupId: ID;
  conceptRevisionId: ID;
  focused: boolean;
  isActiveApproved: boolean;
  moodboardAssetIds: ID[];
  selectedInGroup: boolean;
  title: string;
}

export interface StoryboardOverviewCardVM {
  approvedShotRevisionId?: ID;
  displayedStoryboardRevisionId: ID;
  draftShotRevisionId?: ID;
  durationMs: number;
  effectiveValidity: EffectiveValidity;
  orderIndex: number;
  referencedCharacterIds: ID[];
  referencedSceneIds: ID[];
  reviewStatus:
    | 'APPROVED'
    | 'DRAFT'
    | 'NEEDS_CHANGES'
    | 'PENDING_REVIEW'
    | 'STALE';
  selectedReferenceImageVersionId?: ID;
  shotId: ID;
  shotRevisionId: ID;
  storyBeatId: ID;
  viewingContext: ViewingContext;
  warnings: string[];
}

export interface StudioPresentationPreference {
  focusedConceptRevisionId?: ID;
  layoutByContext?: Record<string, Record<ID, { x: number; y: number }>>;
  projectId: ID;
  storyboardViewMode: StoryboardViewMode;
  userId: ID;
  viewMode: StudioViewMode;
  viewportByContext?: Record<string, CanvasViewport>;
}
