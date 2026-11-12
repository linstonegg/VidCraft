import type {
  CoverageState,
  EvidenceLevel,
  ID,
  ISODateTime,
  VersionedEntity,
} from './common';

/** 六类产品资料 */
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

export type SourceStatus =
  | 'EXCLUDED'
  | 'FAILED'
  | 'PENDING'
  | 'PROCESSING'
  | 'READY';

export interface ProductSource extends VersionedEntity {
  analysisScope?: 'CREATIVE_REFERENCE' | 'PRODUCT_EVIDENCE';
  assetId?: ID;
  errorCode?: string;
  evidenceIds: ID[];
  includedInAnalysis: boolean;
  kind: SourceKind;
  mock: true;
  projectId: ID;
  referenceUrl?: string;
  status: SourceStatus;
  summary?: string;
  title: string;
  version: number;
}

export interface EvidenceRef {
  addedBy: 'mock_agent' | 'user';
  excerpt: string;
  id: ID;
  level: EvidenceLevel;
  pageNo?: number;
  projectId: ID;
  screenshotAssetId?: ID;
  sourceId: ID;
  timeEndSec?: number;
  timeStartSec?: number;
  title: string;
}

export interface DemoSessionSummary {
  actorLabel: string;
  createdAt: ISODateTime;
  demoUrl?: string;
  expiresAt?: ISODateTime;
  id: ID;
  mock: true;
  projectId: ID;
  readOnly: true;
  revokedAt?: ISODateTime;
  scopedDomains: string[];
  status: DemoSessionStatus;
}

export interface SourceCoverageItem {
  code: string;
  evidenceIds: ID[];
  explanation?: string;
  label: string;
  status: CoverageState;
}

export interface IngestionState {
  assets: AssetRef[];
  coverage: SourceCoverageItem[];
  demoSession?: DemoSessionSummary;
  lastConfirmedSnapshotId?: ID;
  projectId: ID;
  sources: ProductSource[];
  status: 'COLLECTING' | 'CONFIRMED' | 'EMPTY' | 'READY_TO_CONFIRM' | 'STALE';
  urlCollectionStatus: UrlCollectionStatus;
  urlJobId?: ID;
  version: number;
}

export interface IngestionSnapshot extends VersionedEntity {
  sourceCopies?: ProductSource[];
  assetCopies?: AssetRef[];
  evidenceCopies?: EvidenceRef[];
  completeness?: 'COMPLETE' | 'LEGACY_PARTIAL';
  confirmedAt: ISODateTime;
  confirmedBy: ID;
  coverage: SourceCoverageItem[];
  id: ID;
  projectId: ID;
  sourceIds: ID[];
  sourceVersions: Record<ID, number>;
}

export type AssetKind = 'document' | 'image' | 'logo' | 'other' | 'video';

export type AssetUploadStatus =
  | 'CANCELLED'
  | 'FAILED'
  | 'NEEDS_RESELECT'
  | 'SELECTED'
  | 'SUCCEEDED'
  | 'UPLOADING'
  | 'VALIDATING';

export interface AssetRef extends VersionedEntity {
  filename: string;
  id: ID;
  kind: AssetKind;
  mimeType: string;
  mockOnly: true;
  previewUrl?: string;
  projectId: ID;
  purpose?: string;
  sizeBytes: number;
  sourceId?: ID;
  uploadStatus: AssetUploadStatus;
  version: number;
}

export interface AnalyzeUrlRequest {
  scenario?: string;
  url: string;
}

export interface ConfirmIngestionRequest {
  expectedVersion: number;
  includedSourceIds: ID[];
}

export interface CreateDemoSessionRequest {
  demoUrl?: string;
  scenario?: string;
}

export interface CreateAssetRequest {
  filename: string;
  kind: AssetKind;
  mimeType: string;
  previewUrl?: string;
  purpose?: string;
  scenario?: string;
  sizeBytes: number;
}
