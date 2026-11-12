/**
 * M1 Mock 服务端领域模型（与服务端 fixture 一起使用，不跨 workspace 引用前端类型）。
 */
export type ID = string;

export interface Project {
  archivedAt?: string;
  aspectRatio: '1:1' | '9:16' | '16:9';
  coverAssetId?: ID;
  createdAt: string;
  currentStage: ProjectStage;
  deletedAt?: string;
  description: string;
  durationSec: number;
  id: ID;
  language?: string;
  lastVisitedStage?: ProjectStage;
  market?: 'CN' | 'GLOBAL' | 'OTHER';
  marketingObjective?: MarketingObjective;
  negativeGuidance?: string;
  ownerId: ID;
  platform: Platform;
  platforms?: Platform[];
  productName?: string;
  productUrl?: string;
  reviewerCanApprove?: boolean;
  status: ProjectStatus;
  stylePreferences?: string[];
  targetAudience?: string;
  title: string;
  updatedAt: string;
  version: number;
}

export type ProjectStage =
  | 'ANGLES'
  | 'ANIMATIC'
  | 'GENERATE'
  | 'INGEST'
  | 'RENDER'
  | 'SCRIPT'
  | 'STORYBOARD'
  | 'UNDERSTANDING';

export type ProjectStatus =
  | 'ARCHIVED'
  | 'COMPLETED'
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'WAITING_REVIEW';

export type Platform =
  | 'bilibili'
  | 'douyin'
  | 'other'
  | 'sales'
  | 'tiktok'
  | 'website'
  | 'wechat_channels';

export type MarketingObjective =
  | 'awareness'
  | 'launch'
  | 'purchase'
  | 'signup'
  | 'traffic';

export type SourceKind =
  | 'BRAND_ASSET'
  | 'DEMO_SESSION'
  | 'DOCUMENT'
  | 'PUBLIC_WEB'
  | 'REFERENCE_AD'
  | 'SCREEN_RECORDING'
  | 'SCREENSHOT'
  | 'USER_NOTE';

export type UrlCollectionStatus =
  | 'FETCH_FAILED'
  | 'FETCHING'
  | 'LOGIN_REQUIRED'
  | 'NOT_STARTED'
  | 'PARTIAL'
  | 'PUBLIC_SUCCESS';

export type DemoSessionStatus =
  | 'ACCESS_DENIED'
  | 'ACTIVE'
  | 'AUTHORIZING'
  | 'EXPIRED'
  | 'MFA_REQUIRED'
  | 'NO_DEMO_DATA'
  | 'NONE'
  | 'REVOKED';

export interface Source {
  analysisScope?: 'CREATIVE_REFERENCE' | 'PRODUCT_EVIDENCE';
  assetId?: ID;
  createdAt: string;
  errorCode?: string;
  evidenceIds: ID[];
  id: ID;
  includedInAnalysis: boolean;
  kind: SourceKind;
  mock: true;
  projectId: ID;
  referenceUrl?: string;
  status: 'EXCLUDED' | 'FAILED' | 'PENDING' | 'PROCESSING' | 'READY';
  summary?: string;
  title: string;
  updatedAt: string;
  version: number;
}

export interface Evidence {
  addedBy: 'mock_agent' | 'user';
  excerpt: string;
  id: ID;
  level: 'hypothesis' | 'unsupported' | 'user_confirmed' | 'verified';
  pageNo?: number;
  projectId: ID;
  screenshotAssetId?: ID;
  sourceId: ID;
  timeEndSec?: number;
  timeStartSec?: number;
  title: string;
}

export interface Asset {
  createdAt: string;
  filename: string;
  id: ID;
  kind: 'document' | 'image' | 'logo' | 'other' | 'video';
  mimeType: string;
  mockOnly: true;
  previewUrl?: string;
  projectId: ID;
  purpose?: string;
  sizeBytes: number;
  sourceId?: ID;
  uploadStatus:
    | 'CANCELLED'
    | 'FAILED'
    | 'NEEDS_RESELECT'
    | 'SELECTED'
    | 'SUCCEEDED'
    | 'UPLOADING'
    | 'VALIDATING';
  updatedAt: string;
  version: number;
}

export interface DemoSession {
  actorLabel: string;
  createdAt: string;
  demoUrl?: string;
  expiresAt?: string;
  id: ID;
  mock: true;
  projectId: ID;
  readOnly: true;
  revokedAt?: string;
  scopedDomains: string[];
  status: DemoSessionStatus;
}

export interface CoverageItem {
  code: string;
  evidenceIds: ID[];
  explanation?: string;
  label: string;
  status: 'CONFIRMED' | 'MISSING' | 'TO_VERIFY';
}

export interface Ingestion {
  assets: Asset[];
  coverage: CoverageItem[];
  demoSession?: DemoSession;
  lastConfirmedSnapshotId?: ID;
  projectId: ID;
  sources: Source[];
  status: 'COLLECTING' | 'CONFIRMED' | 'EMPTY' | 'READY_TO_CONFIRM' | 'STALE';
  urlCollectionStatus: UrlCollectionStatus;
  urlJobId?: ID;
  version: number;
}

export interface IngestionSnapshot {
  sourceCopies?: Source[];
  assetCopies?: Asset[];
  evidenceCopies?: Evidence[];
  completeness?: 'COMPLETE' | 'LEGACY_PARTIAL';
  confirmedAt: string;
  confirmedBy: ID;
  coverage: CoverageItem[];
  createdAt: string;
  id: ID;
  projectId: ID;
  sourceIds: ID[];
  sourceVersions: Record<ID, number>;
  updatedAt: string;
  version: number;
}

export type UnderstandingStatus =
  | 'APPROVED'
  | 'DRAFT'
  | 'REJECTED'
  | 'STALE'
  | 'WAITING_REVIEW';

export interface Persona {
  currentApproach: string;
  editorNote?: string;
  evidenceLevel: 'hypothesis' | 'unsupported' | 'user_confirmed' | 'verified';
  id: ID;
  jobsToBeDone: string[];
  mainFrictions: string[];
  name: string;
  purchaseMotivation?: string;
  reviewStatus: 'approved' | 'needs_changes' | 'pending' | 'rejected';
  role: string;
  sourceEvidenceIds: ID[];
}

export interface Feature {
  description: string;
  editorNote?: string;
  evidenceLevel: 'hypothesis' | 'unsupported' | 'user_confirmed' | 'verified';
  id: ID;
  outcome: string;
  reviewStatus: 'approved' | 'needs_changes' | 'pending' | 'rejected';
  sourceEvidenceIds: ID[];
  title: string;
  usableInMarketing: boolean;
}

export interface PainPoint {
  costOfProblem?: string;
  currentApproach?: string;
  editorNote?: string;
  emotions: string[];
  evidenceLevel: 'hypothesis' | 'unsupported' | 'user_confirmed' | 'verified';
  id: ID;
  linkedFeatureIds: ID[];
  painPoint: string;
  personaIds: ID[];
  reviewStatus: 'approved' | 'needs_changes' | 'pending' | 'rejected';
  scenario: string;
  sourceEvidenceIds: ID[];
}

export interface ValueSeed {
  audienceReaction: string;
  category:
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
  evidenceLevel: 'hypothesis' | 'unsupported' | 'user_confirmed' | 'verified';
  id: ID;
  newApproach?: string;
  note?: string;
  oldApproach?: string;
  relatedFeatureIds: ID[];
  relatedPainPointIds: ID[];
  title: string;
}

export interface UnderstandingRevision {
  deletionHistory?: Array<{
    at: string;
    by: string;
    collection: 'features' | 'painPoints' | 'personas' | 'valueAngleSeeds';
    content: Feature | PainPoint | Persona | ValueSeed;
    id: string;
  }>;
  approvedAt?: string;
  approvedBy?: ID;
  brandGuidelines: string[];
  category: string;
  competitorAlternatives: string[];
  createdAt: string;
  features: Feature[];
  id: ID;
  ingestionSnapshotId: ID;
  missingInformation: string[];
  painPoints: PainPoint[];
  parentRevisionId?: ID;
  personas: Persona[];
  productSummary: string;
  prohibitedClaims: string[];
  projectId: ID;
  revisionNo: number;
  reviewerNotes?: string;
  reviewLog?: Array<{ at: string; by: string; note: string }>;
  riskNotes: string[];
  status: UnderstandingStatus;
  updatedAt: string;
  usedEvidenceIds: ID[];
  valueAngleSeeds: ValueSeed[];
  version: number;
  whyThisAngle?: string;
}

export type JobKind =
  | 'ANALYZE_DEMO'
  | 'ANALYZE_REFERENCE_AD'
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

export type JobStatus =
  | 'CANCELLED'
  | 'CREATED'
  | 'FAILED'
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCEEDED';

export interface JobEvent {
  at: string;
  code: string;
  label: string;
  status: 'FAILED' | 'PENDING' | 'RUNNING' | 'SUCCEEDED';
}

export interface Job {
  ingestionSnapshotId?: ID;
  evidenceSnapshot?: Evidence[];
  applied: boolean;
  createdAt: string;
  durationMs: number;
  errorCode?: string;
  errorMessage?: string;
  events: JobEvent[];
  id: ID;
  kind: JobKind;
  projectId: ID;
  resultRefId?: ID;
  scenario?: string;
  status: JobStatus;
  updatedAt: string;
  version: number;
}

export interface Actor {
  id: ID;
  roles: string[];
  username: string;
}

export interface StoredResponse {
  body: unknown;
  status: number;
}

export interface IdempotencyEntry {
  bodyHash: string;
  response: StoredResponse;
  resourceId?: ID;
  username: string;
}
