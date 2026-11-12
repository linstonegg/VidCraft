import type {
  EvidenceLevel,
  ID,
  ISODateTime,
  ReviewStatus,
  VersionedEntity,
} from './common';

export type UnderstandingStatus =
  | 'APPROVED'
  | 'DRAFT'
  | 'REJECTED'
  | 'STALE'
  | 'WAITING_REVIEW';

export interface Persona {
  currentApproach: string;
  editorNote?: string;
  evidenceLevel: EvidenceLevel;
  id: ID;
  jobsToBeDone: string[];
  mainFrictions: string[];
  name: string;
  purchaseMotivation?: string;
  reviewStatus: ReviewStatus;
  role: string;
  sourceEvidenceIds: ID[];
}

export interface ProductFeature {
  description: string;
  editorNote?: string;
  evidenceLevel: EvidenceLevel;
  id: ID;
  outcome: string;
  reviewStatus: ReviewStatus;
  sourceEvidenceIds: ID[];
  title: string;
  usableInMarketing: boolean;
}

export interface PainPoint {
  costOfProblem?: string;
  currentApproach?: string;
  editorNote?: string;
  emotions: string[];
  evidenceLevel: EvidenceLevel;
  id: ID;
  linkedFeatureIds: ID[];
  painPoint: string;
  personaIds: ID[];
  reviewStatus: ReviewStatus;
  scenario: string;
  sourceEvidenceIds: ID[];
}

export type ValueAngleCategory =
  | 'aspiration'
  | 'benefit'
  | 'curiosity'
  | 'demo'
  | 'humor'
  | 'identity'
  | 'novelty'
  | 'pain'
  | 'proof'
  | 'transformation';

export interface ValueAngleSeed {
  audienceReaction: string;
  category: ValueAngleCategory;
  evidenceLevel: EvidenceLevel;
  id: ID;
  newApproach?: string;
  note?: string;
  oldApproach?: string;
  relatedFeatureIds: ID[];
  relatedPainPointIds: ID[];
  title: string;
}

export interface UnderstandingRevision extends VersionedEntity {
  deletionHistory?: Array<{
    at: string;
    by: string;
    collection: 'features' | 'painPoints' | 'personas' | 'valueAngleSeeds';
    content: PainPoint | Persona | ProductFeature | ValueAngleSeed;
    id: string;
  }>;
  approvedAt?: ISODateTime;
  approvedBy?: ID;
  brandGuidelines: string[];
  category: string;
  competitorAlternatives: string[];
  features: ProductFeature[];
  id: ID;
  ingestionSnapshotId: ID;
  missingInformation: string[];
  parentRevisionId?: ID;
  painPoints: PainPoint[];
  personas: Persona[];
  productSummary: string;
  prohibitedClaims: string[];
  projectId: ID;
  revisionNo: number;
  reviewerNotes?: string;
  reviewLog?: Array<{ at: string; by: string; note: string }>;
  riskNotes: string[];
  status: UnderstandingStatus;
  usedEvidenceIds: ID[];
  valueAngleSeeds: ValueAngleSeed[];
  version: number;
  /** “为什么这么判断”的可解释性摘要 */
  whyThisAngle?: string;
}

export interface GenerateUnderstandingRequest {
  ingestionSnapshotId: ID;
  scenario?: string;
  scope: 'FULL' | 'PAIN_POINTS' | 'VALUE_ANGLES';
}

export interface UpdateRevisionRequest {
  expectedVersion: number;
  patch: Partial<
    Pick<
      UnderstandingRevision,
      | 'brandGuidelines'
      | 'category'
      | 'competitorAlternatives'
      | 'features'
      | 'missingInformation'
      | 'painPoints'
      | 'personas'
      | 'productSummary'
      | 'prohibitedClaims'
      | 'riskNotes'
      | 'valueAngleSeeds'
      | 'whyThisAngle'
    >
  >;
}

export interface ApproveRevisionRequest {
  acceptHypotheses: boolean;
  expectedVersion: number;
  reviewerNote?: string;
}

/** M2 交接引用（§16） */
export interface UnderstandingHandoff {
  prohibitedClaims: string[];
  features: ProductFeature[];
  painPoints: PainPoint[];
  brandGuidelines: string[];
  approvedAt?: ISODateTime;
  approvedBy?: ID;
  aspectRatio: string;
  evidenceIds: ID[];
  ingestionSnapshotId: ID;
  language?: string;
  primaryPlatform: string;
  productUnderstandingRevisionId: ID;
  productUnderstandingVersion: number;
  projectId: ID;
  selectedValueSeeds: ID[];
  targetDurationSec: number;
}
export interface UnderstandingDiffField {
  after?: unknown;
  before?: unknown;
  field: string;
}

export interface UnderstandingDiffItem {
  change: 'ADDED' | 'CHANGED' | 'REMOVED';
  fields: UnderstandingDiffField[];
  id: string;
  label: string;
}

export interface UnderstandingDiffSection {
  items: UnderstandingDiffItem[];
  key: string;
  label: string;
}

export interface UnderstandingDiff {
  evidence: { added: string[]; removed: string[] };
  fromRevisionId: string;
  fromRevisionNo: number;
  m2Impact: { note: string; staleStageNames: string[] };
  prohibitedClaims: { added: string[]; removed: string[] };
  sections: UnderstandingDiffSection[];
  summary: { added: number; changed: number; removed: number };
  toRevisionId: string;
  toRevisionNo: number;
}
