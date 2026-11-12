import type {
  DependencyImpactPreview,
  ProductionReadiness,
  ShotGenerationSpec,
  ShotGenerationSpecView,
} from '#/types/creative-video';

import { getBusinessData, postBusinessData, putBusinessData } from './client';

export function getProductionReadiness(projectId: string) {
  return getBusinessData<ProductionReadiness>(
    `/projects/${encodeURIComponent(projectId)}/production-readiness`,
  );
}

export function previewDependencyImpact(
  projectId: string,
  payload: {
    assetId?: string;
    changeKind: 'ASSET_CONTENT' | 'FACT' | 'REFERENCE_IMAGE' | 'VISUAL_BIBLE';
    claimAnchorId?: string;
    shotId?: string;
  },
) {
  return postBusinessData<DependencyImpactPreview>(
    `/projects/${encodeURIComponent(projectId)}/dependency-impact/preview`,
    payload,
  );
}

export function getGenerationSpecs(projectId: string) {
  return getBusinessData<ShotGenerationSpecView[]>(
    `/projects/${encodeURIComponent(projectId)}/generation-specs`,
  );
}

export function putGenerationSpec(
  projectId: string,
  payload: {
    expectedApprovedShotRevisionId: string;
    expectedVersion?: number;
    spec: Partial<ShotGenerationSpec> & {
      expectedDurationMs: number;
      mode: string;
      outputAspectRatio: '1:1' | '9:16' | '16:9';
      shotId: string;
    };
  },
) {
  return putBusinessData<ShotGenerationSpec>(
    `/projects/${encodeURIComponent(projectId)}/generation-specs`,
    payload,
  );
}
