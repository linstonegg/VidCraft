import type {
  AnalyzeUrlRequest,
  AssetRef,
  ConfirmIngestionRequest,
  CreateAssetRequest,
  CreateDemoSessionRequest,
  DemoSessionSummary,
  EvidenceRef,
  IngestionSnapshot,
  IngestionState,
  ProductSource,
} from '#/types/creative-video';

import {
  deleteBusinessData,
  getBusinessData,
  patchBusinessData,
  postBusinessData,
} from './client';

export function getIngestion(projectId: string) {
  return getBusinessData<IngestionState>(
    `/projects/${encodeURIComponent(projectId)}/ingestion`,
  );
}

export function listSources(projectId: string) {
  return getBusinessData<ProductSource[]>(
    `/projects/${encodeURIComponent(projectId)}/sources`,
  );
}

export function updateSource(
  projectId: string,
  sourceId: string,
  payload: { expectedVersion: number; patch: Partial<ProductSource> },
) {
  return patchBusinessData<IngestionState>(
    `/projects/${encodeURIComponent(projectId)}/sources/${encodeURIComponent(sourceId)}`,
    payload,
  );
}

export function listAssets(projectId: string) {
  return getBusinessData<AssetRef[]>(
    `/projects/${encodeURIComponent(projectId)}/assets`,
  );
}

export function createAsset(
  projectId: string,
  payload: CreateAssetRequest,
  idempotencyKey: string,
) {
  return postBusinessData<AssetRef>(
    `/projects/${encodeURIComponent(projectId)}/assets`,
    payload,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
}

export function updateAsset(
  projectId: string,
  assetId: string,
  payload: { expectedVersion: number; patch: Partial<AssetRef> },
) {
  return patchBusinessData<AssetRef>(
    `/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}`,
    payload,
  );
}

export function deleteAsset(
  projectId: string,
  assetId: string,
  expectedVersion?: number,
) {
  return deleteBusinessData<{ deletedId: string }>(
    `/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}`,
    { expectedVersion },
  );
}

export function getDemoSession(projectId: string) {
  return getBusinessData<DemoSessionSummary | null>(
    `/projects/${encodeURIComponent(projectId)}/demo-session`,
  );
}

export function createDemoSession(
  projectId: string,
  payload: CreateDemoSessionRequest,
) {
  return postBusinessData<DemoSessionSummary>(
    `/projects/${encodeURIComponent(projectId)}/demo-session`,
    payload,
  );
}

export function revokeDemoSession(projectId: string) {
  return deleteBusinessData<DemoSessionSummary>(
    `/projects/${encodeURIComponent(projectId)}/demo-session`,
  );
}

export function analyzeUrl(projectId: string, payload: AnalyzeUrlRequest) {
  return postBusinessData<{ jobId: string }>(
    `/projects/${encodeURIComponent(projectId)}/ingestion/analyze-url`,
    payload,
  );
}

export function confirmIngestion(
  projectId: string,
  payload: ConfirmIngestionRequest,
) {
  return postBusinessData<IngestionSnapshot>(
    `/projects/${encodeURIComponent(projectId)}/ingestion/confirm`,
    payload,
  );
}

export function listSnapshots(projectId: string) {
  return getBusinessData<IngestionSnapshot[]>(
    `/projects/${encodeURIComponent(projectId)}/ingestion/snapshots`,
  );
}

export function listEvidence(
  projectId: string,
  query: { level?: string; sourceId?: string } = {},
) {
  const params: Record<string, string> = {};
  if (query.level) {
    params.level = query.level;
  }
  if (query.sourceId) {
    params.sourceId = query.sourceId;
  }
  return getBusinessData<EvidenceRef[]>(
    `/projects/${encodeURIComponent(projectId)}/evidence`,
    { params },
  );
}
