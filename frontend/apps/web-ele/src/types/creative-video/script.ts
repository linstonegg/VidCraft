import type { ID, ISODateTime, VersionedEntity } from './common';

export type DurationFit =
  | 'CAN_EXPAND'
  | 'NEEDS_NEW_CHAPTERS'
  | 'NOT_RECOMMENDED'
  | 'SUFFICIENT';

export type ExpansionStrategy =
  | 'KEEP_SHORT'
  | 'MULTI_CHAPTER'
  | 'NATURAL_STORY_EXPANSION';

export type NarrativeRole =
  | 'CONFLICT'
  | 'CTA'
  | 'HOOK'
  | 'OTHER'
  | 'PROOF'
  | 'REVEAL'
  | 'SETUP'
  | 'TURN'
  | 'VALUE';

export interface DurationPlan extends VersionedEntity {
  acceptedRiskNotes: string[];
  conceptRevisionId: ID;
  id: ID;
  naturalDurationMs: number;
  projectId: ID;
  rationale: string;
  recommendedBeatCount: number;
  riskNotes: string[];
  selectedStrategy?: ExpansionStrategy;
  status: DurationFit;
  targetDurationMs: number;
  version: number;
}

export interface StoryBeat {
  audioMood: string;
  characterMotivation: string;
  conflictOrChange: string;
  dialogue: string;
  durationMs: number;
  editorNotes?: string;
  emotionalIntensity: number;
  evidenceIds: ID[];
  id: ID;
  narrativeRole: NarrativeRole;
  newInformation: string;
  onScreenText: string;
  order: number;
  plot: string;
  productPlacement: string;
  relatedFeatureIds: ID[];
  relatedPainPointIds: ID[];
  reviewStatus: 'approved' | 'needs_changes' | 'pending';
  riskNotes: string[];
  title: string;
  transitionToNext: string;
  visualIntent: string;
  voiceover: string;
}

export interface ScriptRevision extends VersionedEntity {
  approvedAt?: ISODateTime;
  approvedBy?: ID;
  beats: StoryBeat[];
  conceptRevisionId: ID;
  durationPlanId: ID;
  narrationPrinciples: string[];
  parentRevisionId?: ID;
  prohibitedClaims: string[];
  projectId: ID;
  revisionNo: number;
  riskNotes: string[];
  status: 'APPROVED' | 'DRAFT' | 'REJECTED' | 'STALE' | 'WAITING_REVIEW';
  synopsis: string;
  targetDurationMs: number;
  title: string;
  visualPrinciples: string[];
}
