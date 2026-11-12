import type {
  AssetContentVersion,
  AssetUsageMetadata,
  AssetUsageRef,
} from '#/types/creative-video';

import {
  deleteBusinessData,
  getBusinessData,
  patchBusinessData,
  postBusinessData,
} from './client';

export function getAssetContentVersions(projectId: string, assetId: string) {
  return getBusinessData<AssetContentVersion[]>(
    `/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/content-versions`,
  );
}

export function createAssetContentVersion(
  projectId: string,
  assetId: string,
  payload: {
    expectedAssetVersion: number;
    filename?: string;
    fixtureKey: string;
    mimeType?: string;
    replacesVersionId?: string;
    sizeBytes?: number;
  },
) {
  return postBusinessData<AssetContentVersion>(
    `/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/content-versions`,
    payload,
  );
}

export function getAssetUsage(projectId: string, assetId: string) {
  return getBusinessData<AssetUsageRef[]>(
    `/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/usage`,
  );
}

export function getAssetUsageMetadata(projectId: string, assetId: string) {
  return getBusinessData<AssetUsageMetadata>(
    `/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/usage-metadata`,
  );
}

export function patchAssetUsageMetadata(
  projectId: string,
  assetId: string,
  payload: { expectedVersion: number; patch: Partial<AssetUsageMetadata> },
) {
  return patchBusinessData<AssetUsageMetadata>(
    `/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/usage-metadata`,
    payload,
  );
}

export function previewAssetReplacement(
  projectId: string,
  assetId: string,
  newContentVersionId: string,
) {
  return postBusinessData<{
    affected: AssetUsageRef[];
    newContentVersionId: string;
    requiresNewRevision: boolean;
    summary: string;
  }>(
    `/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/replace-preview`,
    { newContentVersionId },
  );
}

export function previewAssetReference(
  projectId: string,
  assetId: string,
  payload: { targetId: string; targetType: string },
) {
  return postBusinessData<{
    allowed: boolean;
    existingUsage: AssetUsageRef[];
    previewOnly: boolean;
    warnings: string[];
  }>(
    `/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/reference-preview`,
    payload,
  );
}

export function writeAssetReference(
  projectId: string,
  assetId: string,
  payload: {
    assetVersionId: string;
    targetId: string;
    targetRevisionId: string;
    targetType: 'SHOT_REVISION' | 'VISUAL_BIBLE_REVISION';
    usageRole: string;
  },
) {
  return postBusinessData<{
    reference: AssetUsageRef;
    revision: { id: string; version: number };
    targetLabel: string;
  }>(
    `/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/references`,
    payload,
  );
}

export function deleteAssetReference(
  projectId: string,
  referenceId: string,
  expectedVersion: number,
) {
  return deleteBusinessData<{ deletedReferenceId: string }>(
    `/projects/${encodeURIComponent(projectId)}/assets/references/${encodeURIComponent(referenceId)}`,
    { expectedVersion },
  );
}
