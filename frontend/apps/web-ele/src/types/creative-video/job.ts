import type { ID, ISODateTime, VersionedEntity } from './common';

export type MockJobKind =
  | 'ANALYZE_DEMO'
  | 'BUILD_ANIMATIC'
  | 'COLLECT_URL'
  | 'DISCOVER_ANGLES'
  | 'EVALUATE_DURATION'
  | 'GENERATE_CONCEPTS'
  | 'GENERATE_REFERENCE_IMAGE'
  | 'GENERATE_SCRIPT'
  | 'GENERATE_STORYBOARD'
  | 'GENERATE_VISUAL_BIBLE'
  | 'PLAN_CREATIVE_CHANGE'
  | 'SCAN_CLAIMS'
  | 'UNDERSTANDING';

export type MockJobStatus =
  | 'CANCELLED'
  | 'CREATED'
  | 'FAILED'
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCEEDED';

export interface MockJobEvent {
  at: ISODateTime;
  code: string;
  label: string;
  status: 'FAILED' | 'PENDING' | 'RUNNING' | 'SUCCEEDED';
}

export interface MockJob extends VersionedEntity {
  errorCode?: string;
  errorMessage?: string;
  events: MockJobEvent[];
  kind: MockJobKind;
  progress: number;
  projectId: ID;
  resultRefId?: ID;
  scenario?: string;
  status: MockJobStatus;
  version: number;
}
