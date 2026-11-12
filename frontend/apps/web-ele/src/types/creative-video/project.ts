import type { ID, ISODateTime, VersionedEntity, VideoRatio } from './common';

/**
 * 项目领域模型（M1 扩展，兼容 M0 字段）。
 */
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

/** 兼容 M0 命名 */
export type AspectRatio = VideoRatio;

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

export type ProjectMarket = 'CN' | 'GLOBAL' | 'OTHER';

export interface VideoProject extends VersionedEntity {
  archivedAt?: ISODateTime;
  aspectRatio: VideoRatio;
  coverAssetId?: ID;
  coverPreviewUrl?: string;
  createdAt: ISODateTime;
  currentStage: ProjectStage;
  deletedAt?: ISODateTime;
  description: string;
  durationSec: number;
  id: ID;
  language?: string;
  lastVisitedStage?: ProjectStage;
  market?: ProjectMarket;
  marketingObjective?: MarketingObjective;
  negativeGuidance?: string;
  ownerId: ID;
  /** 兼容 M0：首选平台，创建时等于 platforms[0] */
  platform: Platform;
  platforms?: Platform[];
  productName?: string;
  productUrl?: string;
  /** 是否允许 reviewer 审核确认（M1 演示字段） */
  reviewerCanApprove?: boolean;
  status: ProjectStatus;
  stylePreferences?: string[];
  targetAudience?: string;
  title: string;
  updatedAt: ISODateTime;
  version: number;
}

export interface CreateProjectRequest {
  aspectRatio: VideoRatio;
  description?: string;
  durationSec: number;
  language: string;
  market: ProjectMarket;
  marketingObjective: MarketingObjective;
  negativeGuidance?: string;
  platforms: Platform[];
  productName?: string;
  productUrl?: string;
  rightsConfirmed: boolean;
  stylePreferences: string[];
  targetAudience?: string;
  title: string;
}

export interface UpdateProjectRequest {
  expectedVersion: number;
  patch: Partial<Omit<CreateProjectRequest, 'rightsConfirmed'>> & {
    coverAssetId?: string;
  };
}

export type ProjectSort = 'created' | 'name' | 'updated';

export interface ProjectListQuery {
  scope?: 'all' | 'archived' | 'mine' | 'recent';
  includeDeleted?: boolean;
  keyword?: string;
  page?: number;
  pageSize?: number;
  platform?: '' | Platform;
  sort?: ProjectSort;
  stage?: '' | ProjectStage;
  status?: '' | ProjectStatus;
}

export interface DemoResetResult {
  resetAt: ISODateTime;
  restoredProjects: number;
}

/** 项目级进度汇总（列表 stageReviewState 使用） */
export type StageReviewState = 'CONFIRMED' | 'IN_PROGRESS' | 'WAITING_REVIEW';
