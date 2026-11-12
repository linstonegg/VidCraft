import type { ID, ISODateTime } from './common';

export type AnswerValidity = 'CONTRADICTED' | 'REVOKED' | 'STALE' | 'VALID';

export type ResearchGapState =
  | 'ANSWER_IN_PROGRESS'
  | 'DISMISSED'
  | 'OPEN'
  | 'RESOLVED'
  | 'SKIPPED'
  | 'STALE';

export type ResearchGapSeverity = 'BLOCKING_CLAIM' | 'IMPORTANT' | 'OPTIONAL';

export type ResearchQuestionStatus =
  | 'ANSWER_DRAFT'
  | 'ANSWERED'
  | 'ASKED'
  | 'DISMISSED'
  | 'INCORPORATED'
  | 'SKIPPED'
  | 'STALE'
  | 'SUGGESTED';

export interface ResearchContextRef {
  ingestionSnapshotId?: ID;
  ingestionStateVersion: number;
  sourceSetFingerprint?: string;
}

export interface ResearchGap {
  code: string;
  coverageCode?: string;
  createdAt: ISODateTime;
  id: ID;
  impactDescription?: string;
  projectId: ID;
  question?: string;
  severity: ResearchGapSeverity;
  state: ResearchGapState;
  title: string;
  updatedAt: ISODateTime;
  version: number;
  whyItMatters: string;
}

export interface ResearchGapVM {
  id: ID;
  needsReconfirmation?: boolean;
  priorityScore: number;
  relevantEvidenceFingerprint?: string;
  severity: ResearchGapSeverity;
  status: ResearchGapState;
}

export interface ResearchQuestionRules {
  applicableContextFingerprint?: string;
  blockingPolicy: 'BLOCK_APPROVAL' | 'NONE' | 'WARN';
  priority: 'HIGH' | 'LOW' | 'NORMAL';
  sourceEvidenceIds: ID[];
}

export interface ResearchQuestion {
  answerId?: ID;
  contextFingerprint?: string;
  createdAt: ISODateTime;
  dismissedReason?: string;
  gapId: ID;
  id: ID;
  options?: string[];
  projectId: ID;
  question: string;
  rules?: ResearchQuestionRules;
  sessionId: ID;
  status: ResearchQuestionStatus;
  updatedAt: ISODateTime;
  version: number;
}

export interface ResearchQuestionValidityVM {
  answerValidity?: AnswerValidity;
  applicableContextFingerprint?: string;
  gapId: ID;
  gapRelevantEvidenceFingerprint?: string;
  questionId: ID;
  sessionId: ID;
  status: ResearchQuestionStatus;
}

export interface ResearchAnswer {
  answer: string;
  createdAt: ISODateTime;
  id: ID;
  projectId: ID;
  questionId: ID;
  sourceId?: ID;
  sourceVersion?: number;
  updatedAt: ISODateTime;
  validity: AnswerValidity;
  version: number;
}

export interface ResearchSession {
  basedOnIngestionVersion: number;
  createdAt: ISODateTime;
  id: ID;
  projectId: ID;
  questionIds: ID[];
  status: 'ACTIVE' | 'CLOSED';
  updatedAt: ISODateTime;
  version: number;
}

export interface ResearchSessionView {
  answers: ResearchAnswer[];
  gaps: ResearchGap[];
  questions: ResearchQuestion[];
  session: ResearchSession;
  validity: ResearchQuestionValidityVM[];
}
