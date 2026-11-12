import type { ProjectStage, ProjectStatus } from '#/types/creative-video';

export interface StudioStageDefinition {
  descriptionKey: string;
  key: ProjectStage;
  routeName: string;
  /** URL 片段，例如 /studio/:id/ingest */
  slug: string;
  titleKey: string;
}

/**
 * Studio 八步流程的唯一来源。
 * 路由表、阶段导航、占位页都从这里派生，避免多处硬编码顺序。
 */
export const STUDIO_STAGES: StudioStageDefinition[] = [
  {
    descriptionKey: 'vidcraft.stageDesc.INGEST',
    key: 'INGEST',
    routeName: 'VidCraftStudioIngest',
    slug: 'ingest',
    titleKey: 'vidcraft.stage.INGEST',
  },
  {
    descriptionKey: 'vidcraft.stageDesc.UNDERSTANDING',
    key: 'UNDERSTANDING',
    routeName: 'VidCraftStudioUnderstanding',
    slug: 'understanding',
    titleKey: 'vidcraft.stage.UNDERSTANDING',
  },
  {
    descriptionKey: 'vidcraft.stageDesc.ANGLES',
    key: 'ANGLES',
    routeName: 'VidCraftStudioAngles',
    slug: 'angles',
    titleKey: 'vidcraft.stage.ANGLES',
  },
  {
    descriptionKey: 'vidcraft.stageDesc.SCRIPT',
    key: 'SCRIPT',
    routeName: 'VidCraftStudioScript',
    slug: 'script',
    titleKey: 'vidcraft.stage.SCRIPT',
  },
  {
    descriptionKey: 'vidcraft.stageDesc.STORYBOARD',
    key: 'STORYBOARD',
    routeName: 'VidCraftStudioStoryboard',
    slug: 'storyboard',
    titleKey: 'vidcraft.stage.STORYBOARD',
  },
  {
    descriptionKey: 'vidcraft.stageDesc.ANIMATIC',
    key: 'ANIMATIC',
    routeName: 'VidCraftStudioAnimatic',
    slug: 'animatic',
    titleKey: 'vidcraft.stage.ANIMATIC',
  },
  {
    descriptionKey: 'vidcraft.stageDesc.GENERATE',
    key: 'GENERATE',
    routeName: 'VidCraftStudioGenerate',
    slug: 'generate',
    titleKey: 'vidcraft.stage.GENERATE',
  },
  {
    descriptionKey: 'vidcraft.stageDesc.RENDER',
    key: 'RENDER',
    routeName: 'VidCraftStudioRender',
    slug: 'render',
    titleKey: 'vidcraft.stage.RENDER',
  },
];

export const DEFAULT_STUDIO_STAGE = STUDIO_STAGES[0] as StudioStageDefinition;

export function getStageByKey(
  key: ProjectStage,
): StudioStageDefinition | undefined {
  return STUDIO_STAGES.find((stage) => stage.key === key);
}

export function getStageBySlug(
  slug: string,
): StudioStageDefinition | undefined {
  return STUDIO_STAGES.find((stage) => stage.slug === slug);
}

export function getStageIndex(key: ProjectStage): number {
  return STUDIO_STAGES.findIndex((stage) => stage.key === key);
}

/** 生成某个项目的阶段链接，ID 始终来自路由参数，不做本地持久化 */
export function getStudioPath(
  projectId: string,
  stage: ProjectStage = 'INGEST',
): string {
  const target = getStageByKey(stage) ?? DEFAULT_STUDIO_STAGE;
  return `/studio/${encodeURIComponent(projectId)}/${target.slug}`;
}

export const PROJECT_STATUS_KEYS: Record<ProjectStatus, string> = {
  ARCHIVED: 'vidcraft.status.ARCHIVED',
  COMPLETED: 'vidcraft.status.COMPLETED',
  DRAFT: 'vidcraft.status.DRAFT',
  IN_PROGRESS: 'vidcraft.status.IN_PROGRESS',
  WAITING_REVIEW: 'vidcraft.status.WAITING_REVIEW',
};

export const PROJECT_STATUS_TYPES: Record<
  ProjectStatus,
  'danger' | 'info' | 'primary' | 'success' | 'warning'
> = {
  ARCHIVED: 'info',
  COMPLETED: 'success',
  DRAFT: 'info',
  IN_PROGRESS: 'primary',
  WAITING_REVIEW: 'warning',
};
