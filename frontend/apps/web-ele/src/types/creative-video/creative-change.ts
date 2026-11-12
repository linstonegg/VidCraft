import type { ID, ISODateTime, VersionedEntity } from './common';

export type ChangeIntent =
  | 'BRAND_PLACEMENT'
  | 'CAMERA_MOTION'
  | 'CHARACTER_EXPRESSION'
  | 'FACTUAL_CLAIM'
  | 'GLOBAL_CHARACTER'
  | 'HOOK'
  | 'MOTION_ACTION'
  | 'NARRATION_AUDIO'
  | 'OTHER'
  | 'REFERENCE_IMAGE'
  | 'SCRIPT_TEXT'
  | 'STORY_DIRECTION'
  | 'STRUCTURE'
  | 'TIMELINE'
  | 'VALUE_ANGLE'
  | 'VISUAL_STYLE';

export interface CreativeChangePlan extends VersionedEntity {
  affectedAssetIds?: ID[];
  affectedReviewSnapshotIds?: ID[];
  affectedShotIds?: ID[];
  changeCategory?:
    | 'CHARACTER_GLOBAL'
    | 'CREATIVE_DIRECTION'
    | 'DURATION'
    | 'LOCAL_TEXT'
    | 'LOCAL_VISUAL'
    | 'SCENE_GLOBAL';
  estimatedFutureCostImpact?: 'HIGH' | 'LOW' | 'MEDIUM' | 'NONE' | 'UNKNOWN';
  staleReasons?: string[];
  suggestedActions?: Array<
    | 'EDIT_PROMPT'
    | 'REGENERATE_IMAGE'
    | 'REGENERATE_VIDEO'
    | 'RETIME'
    | 'REVIEW_ONLY'
  >;
  durationDeltaMs: number;
  impactedShotIds: ID[];
  intent: ChangeIntent | string;
  invalidatedStageNames: string[];
  mockReasoningSummary: string;
  operations: Array<{
    after?: unknown;
    before?: unknown;
    fieldPath: string;
    operation: 'add' | 'remove' | 'replace';
  }>;
  projectId: ID;
  risks: string[];
  scope: 'BEAT' | 'BRIEF' | 'CONCEPT' | 'SHOT' | 'VISUAL_BIBLE';
  state: 'APPLIED' | 'DISCARDED' | 'PROPOSED';
  targetId: ID;
  userMessage: string;
}

export interface DirectorMessage {
  changePlanId?: ID;
  content: string;
  createdAt: ISODateTime;
  id: ID;
  mocked: true;
  projectId: ID;
  role: 'assistant' | 'system' | 'user';
  scope: 'BEAT' | 'BRIEF' | 'CONCEPT' | 'FEEDBACK' | 'SHOT' | 'VISUAL_BIBLE';
  stage: 'ANGLES' | 'ANIMATIC' | 'SCRIPT' | 'STORYBOARD';
  targetId?: ID;
}
