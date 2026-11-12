import type {
  CoverageState,
  EvidenceLevel,
  MarketingObjective,
  Platform,
  ProjectMarket,
  ProjectStatus,
  ReviewStatus,
  StageReviewState,
  VideoProject,
  VideoRatio,
} from '#/types/creative-video';

import { $t } from '#/locales';

import { getStageByKey } from './stages';

export const PLATFORM_OPTIONS: Array<{ label: string; value: Platform }> = [
  { label: '抖音', value: 'douyin' },
  { label: '视频号', value: 'wechat_channels' },
  { label: 'B 站', value: 'bilibili' },
  { label: 'TikTok', value: 'tiktok' },
  { label: '官网', value: 'website' },
  { label: '销售介绍', value: 'sales' },
  { label: '其他', value: 'other' },
];

export const OBJECTIVE_OPTIONS: Array<{
  label: string;
  value: MarketingObjective;
}> = [
  { label: '吸引注册', value: 'signup' },
  { label: '品牌认知', value: 'awareness' },
  { label: '产品发布', value: 'launch' },
  { label: '促进购买', value: 'purchase' },
  { label: '引流访问', value: 'traffic' },
];

export const MARKET_OPTIONS: Array<{ label: string; value: ProjectMarket }> = [
  { label: '中国大陆', value: 'CN' },
  { label: '海外', value: 'GLOBAL' },
  { label: '其他', value: 'OTHER' },
];

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export const RATIO_OPTIONS: Array<{ label: string; value: VideoRatio }> = [
  { label: '9:16 竖屏', value: '9:16' },
  { label: '16:9 横屏', value: '16:9' },
  { label: '1:1 方形', value: '1:1' },
];

export const STYLE_OPTIONS = [
  '反常规',
  '痛点共鸣',
  '幽默',
  '视觉冲击',
  '电影感',
  '3D',
  'MG 动画',
  '故事反转',
];

export const STATUS_OPTIONS: Array<{ label: string; value: ProjectStatus }> = [
  { label: '草稿', value: 'DRAFT' },
  { label: '制作中', value: 'IN_PROGRESS' },
  { label: '待审核', value: 'WAITING_REVIEW' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已归档', value: 'ARCHIVED' },
];

export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  hypothesis: 'AI 推测 · 待验证',
  unsupported: '不可作为确定性主张',
  user_confirmed: '客户已确认',
  verified: '有资料依据',
};

export const EVIDENCE_TAG_TYPES: Record<
  EvidenceLevel,
  'danger' | 'info' | 'success' | 'warning'
> = {
  hypothesis: 'warning',
  unsupported: 'danger',
  user_confirmed: 'success',
  verified: 'success',
};

export const REVIEW_LABELS: Record<ReviewStatus, string> = {
  approved: '已确认',
  needs_changes: '需修改',
  pending: '待审核',
  rejected: '已驳回',
};

export const COVERAGE_LABELS: Record<CoverageState, string> = {
  CONFIRMED: '已确认',
  MISSING: '缺失',
  TO_VERIFY: '待验证',
};

export const COVERAGE_TAG_TYPES: Record<
  CoverageState,
  'danger' | 'info' | 'success' | 'warning'
> = {
  CONFIRMED: 'success',
  MISSING: 'danger',
  TO_VERIFY: 'warning',
};

export const PROJECT_STATUS_KEYS: Record<ProjectStatus, string> = {
  ARCHIVED: 'vidcraft.status.ARCHIVED',
  COMPLETED: 'vidcraft.status.COMPLETED',
  DRAFT: 'vidcraft.status.DRAFT',
  IN_PROGRESS: 'vidcraft.status.IN_PROGRESS',
  WAITING_REVIEW: 'vidcraft.status.WAITING_REVIEW',
};

export function platformLabel(platform: Platform): string {
  return (
    PLATFORM_OPTIONS.find((item) => item.value === platform)?.label ?? '其他'
  );
}

export function projectPlatforms(project: VideoProject): Platform[] {
  return project.platforms?.length ? project.platforms : [project.platform];
}

export function stageLabel(stage: VideoProject['currentStage']): string {
  const definition = getStageByKey(stage);
  return definition ? $t(definition.titleKey) : stage;
}

export function stageIndex(stage: VideoProject['currentStage']): number {
  const order = [
    'INGEST',
    'UNDERSTANDING',
    'ANGLES',
    'SCRIPT',
    'STORYBOARD',
    'ANIMATIC',
    'GENERATE',
    'RENDER',
  ];
  return order.indexOf(stage);
}

/** 列表页的细粒度阶段汇总：由阶段 + 项目状态推导，不代表服务端权威状态 */
export function stageReviewState(project: VideoProject): StageReviewState {
  if (project.status === 'WAITING_REVIEW') {
    return 'WAITING_REVIEW';
  }
  if (stageIndex(project.currentStage) >= stageIndex('ANGLES')) {
    return 'CONFIRMED';
  }
  return 'IN_PROGRESS';
}

export const STAGE_REVIEW_LABELS: Record<StageReviewState, string> = {
  CONFIRMED: '已确认',
  IN_PROGRESS: '进行中',
  WAITING_REVIEW: '待确认',
};

export const STAGE_REVIEW_TAG_TYPES: Record<
  StageReviewState,
  'info' | 'success' | 'warning'
> = {
  CONFIRMED: 'success',
  IN_PROGRESS: 'info',
  WAITING_REVIEW: 'warning',
};
