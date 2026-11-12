/**
 * VidCraft 业务接口通用契约（M1 扩展，兼容 M0）。
 */
export type ID = string;
export type ISODateTime = string;

export type ApiCode =
  | 'ASSET_CONTENT_UNAVAILABLE'
  | 'ASSET_CROSS_PROJECT_DENIED'
  | 'ASSET_NOT_FOUND'
  | 'ASSET_REFERENCE_IN_USE'
  | 'ASSET_RIGHTS_REVOKED'
  | 'CLAIM_BLOCKED'
  | 'CONCEPT_CROSS_BRIEF_COMPOSITION_DENIED'
  | 'CONCEPT_GROUP_MEMBERSHIP_CONFLICT'
  | 'CONFLICT'
  | 'CONFLICT_DECISION_INCOMPLETE'
  | 'CONFLICT_UNRESOLVED'
  | 'EVIDENCE_NOT_FOUND'
  | 'EVIDENCE_VERSION_UNRESOLVED'
  | 'FORBIDDEN'
  | 'GENERATION_SPEC_OUTDATED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'INTERNAL_ERROR'
  | 'MOCK_PROCESSING_FAILED'
  | 'MOCK_SCENARIO_UNAVAILABLE'
  | 'MOODBOARD_ASSET_VERSION_MISMATCH'
  | 'NO_VALID_SOURCE'
  | 'NOT_FOUND'
  | 'OK'
  | 'PAID_GENERATION_NOT_AVAILABLE'
  | 'PROJECT_NOT_FOUND'
  | 'QUESTION_ALREADY_ANSWERED'
  | 'QUESTION_OPTION_INVALID'
  | 'RATE_LIMITED'
  | 'REFERENCE_AD_RIGHTS_NOT_CONFIRMED'
  | 'RESEARCH_PERMISSION_DENIED'
  | 'RESEARCH_STALE_VERSION'
  | 'REVIEW_EXPECTED_VERSION_CONFLICT'
  | 'SERVICE_UNAVAILABLE'
  | 'STORYBOARD_REORDER_BEAT_CONFLICT'
  | 'STORYBOARD_REORDER_INVALID_TRANSITION'
  | 'UNAUTHORIZED'
  | 'UNDERSTANDING_NOT_READY'
  | 'UNSUPPORTED_CLAIM'
  | 'VALIDATION_ERROR'
  | 'VERSION_CONFLICT';

export interface ApiResponse<T> {
  code: ApiCode;
  message: string;
  data: T;
  requestId: string;
  /** ISO 8601 */
  timestamp: ISODateTime;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface VersionedEntity {
  id: ID;
  /** 乐观锁版本，创建为 1 */
  version: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** 证据等级：事实、客户确认、AI 推测、无依据 */
export type EvidenceLevel =
  | 'hypothesis'
  | 'unsupported'
  | 'user_confirmed'
  | 'verified';

/** 人工审核状态 */
export type ReviewStatus =
  | 'approved'
  | 'needs_changes'
  | 'pending'
  | 'rejected';

/** 资料覆盖度状态 */
export type CoverageState = 'CONFIRMED' | 'MISSING' | 'TO_VERIFY';

/** P0 公共有效性投影；历史审批状态不变，只表达“相对当前事实/权属/正式链是否可用”。 */
export type EffectiveValidity = 'BLOCKED' | 'CURRENT' | 'REVIEW_REQUIRED';

/** M1 统一视频比例 */
export type VideoRatio = '1:1' | '9:16' | '16:9';

export interface ConflictPayload {
  currentVersion: number;
  expectedVersion: number;
  resourceId: ID;
  resourceType: string;
}

export interface ServiceCapabilities {
  mode: 'LIVE' | 'MOCK' | 'UNKNOWN';
  service: string;
  status: 'degraded' | 'ok';
}

export interface ServiceHealth {
  capabilities: ServiceCapabilities;
  serverTime: ISODateTime;
}
