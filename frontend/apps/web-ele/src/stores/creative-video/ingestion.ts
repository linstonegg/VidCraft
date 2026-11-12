import type {
  AssetKind,
  EvidenceRef,
  IngestionSnapshot,
  IngestionState,
  ProductSource,
} from '#/types/creative-video';

import { computed, reactive, ref } from 'vue';

import { defineStore } from 'pinia';

import {
  analyzeUrl,
  confirmIngestion,
  createAsset,
  createDemoSession,
  deleteAsset,
  getIngestion,
  listEvidence,
  listSnapshots,
  revokeDemoSession,
  updateAsset,
  updateSource,
} from '#/api/creative-video';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';
import {
  createIdempotencyKey,
  inferAssetKind,
  validateAssetFile,
} from '#/utils/creative-video/validation';

export const useCreativeVideoIngestionStore = defineStore(
  'creative-video-ingestion',
  () => {
    const projectId = ref('');
    const state = ref<IngestionState | null>(null);
    const evidence = ref<EvidenceRef[]>([]);
    const snapshots = ref<IngestionSnapshot[]>([]);
    const loading = ref(false);
    const saving = ref(false);
    const errorMessage = ref('');
    /** 仅当前会话有效的本地预览 URL，绝不持久化为服务端资源 */
    const previewUrls = reactive<Record<string, string>>({});
    let previewEpoch = 0;
    const uploadKeys = new WeakMap<File, Map<string, string>>();

    const includedSources = computed(
      () =>
        state.value?.sources.filter((item) => item.includedInAnalysis) ?? [],
    );

    const readySources = computed(
      () =>
        state.value?.sources.filter((item) => item.status === 'READY') ?? [],
    );

    const hasValidSource = computed(() => readySources.value.length > 0);

    const activeDemoSession = computed(() => state.value?.demoSession ?? null);

    async function load(id: string) {
      projectId.value = id;
      loading.value = true;
      errorMessage.value = '';
      try {
        const [ingestion, evidenceList, snapshotList] = await Promise.all([
          getIngestion(id),
          listEvidence(id),
          listSnapshots(id),
        ]);
        state.value = ingestion;
        evidence.value = evidenceList;
        snapshots.value = snapshotList;
      } catch (error) {
        errorMessage.value = friendlyErrorMessage(error);
        throw error;
      } finally {
        loading.value = false;
      }
    }

    async function refresh() {
      if (!projectId.value) {
        return;
      }
      const [ingestion, evidenceList, snapshotList] = await Promise.all([
        getIngestion(projectId.value),
        listEvidence(projectId.value),
        listSnapshots(projectId.value),
      ]);
      state.value = ingestion;
      evidence.value = evidenceList;
      snapshots.value = snapshotList;
    }

    async function toggleSource(source: ProductSource, included: boolean) {
      if (!state.value) {
        return;
      }
      saving.value = true;
      try {
        state.value = await updateSource(projectId.value, source.id, {
          expectedVersion: source.version,
          patch: { includedInAnalysis: included },
        });
        evidence.value = await listEvidence(projectId.value);
      } finally {
        saving.value = false;
      }
    }

    async function runUrlAnalysis(url: string, scenario?: string) {
      const result = await analyzeUrl(projectId.value, { scenario, url });
      await refresh();
      return result;
    }

    async function confirm(includedSourceIds: string[]) {
      if (!state.value) {
        throw new Error('资料尚未加载');
      }
      const snapshot = await confirmIngestion(projectId.value, {
        expectedVersion: state.value.version,
        includedSourceIds,
      });
      snapshots.value = await listSnapshots(projectId.value);
      await refresh();
      return snapshot;
    }

    async function uploadFile(
      file: File,
      kind: AssetKind,
      purpose?: string,
      scenario?: string,
      signal?: AbortSignal,
      onProgress?: (value: number) => void,
    ) {
      const targetProjectId = projectId.value;
      const epoch = previewEpoch;
      const validationError = validateAssetFile(file, kind);
      if (validationError) throw new Error(validationError);
      await new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException('上传已取消', 'AbortError'));
          return;
        }
        let progress = 0;
        const interval = setInterval(() => {
          progress += 20;
          onProgress?.(Math.min(progress, 80));
        }, 160);
        const cancel = () => {
          clearInterval(interval);
          clearTimeout(timer);
          reject(new DOMException('上传已取消', 'AbortError'));
        };
        const timer = setTimeout(() => {
          clearInterval(interval);
          signal?.removeEventListener('abort', cancel);
          resolve();
        }, 800);
        signal?.addEventListener('abort', cancel, { once: true });
      });
      onProgress?.(90);
      const fingerprint = JSON.stringify({
        project: targetProjectId,
        kind,
        purpose,
        scenario,
      });
      let keys = uploadKeys.get(file);
      if (!keys) {
        keys = new Map();
        uploadKeys.set(file, keys);
      }
      if (!keys.has(fingerprint))
        keys.set(fingerprint, createIdempotencyKey('asset'));
      const uploadKey = keys.get(fingerprint);
      if (!uploadKey) {
        throw new Error('无法创建资料上传请求');
      }
      const asset = await createAsset(
        targetProjectId,
        {
          filename: file.name,
          kind: kind ?? inferAssetKind(file.type),
          mimeType: file.type || 'application/octet-stream',
          previewUrl: undefined,
          purpose,
          scenario,
          sizeBytes: file.size,
        },
        uploadKey,
      );
      if (
        epoch === previewEpoch &&
        projectId.value === targetProjectId &&
        (file.type.startsWith('image/') || file.type.startsWith('video/'))
      ) {
        previewUrls[asset.id] = URL.createObjectURL(file);
      }
      onProgress?.(100);
      if (projectId.value === targetProjectId) await refresh();
      return asset;
    }

    async function renameAsset(
      assetId: string,
      filename: string,
      version: number,
    ) {
      const asset = await updateAsset(projectId.value, assetId, {
        expectedVersion: version,
        patch: { filename },
      });
      await refresh();
      return asset;
    }

    async function removeAsset(assetId: string, expectedVersion?: number) {
      await deleteAsset(projectId.value, assetId, expectedVersion);
      if (previewUrls[assetId]) {
        URL.revokeObjectURL(previewUrls[assetId] as string);
        Reflect.deleteProperty(previewUrls, assetId);
      }
      await refresh();
    }

    async function startDemoSession(scenario: string) {
      saving.value = true;
      try {
        const session = await createDemoSession(projectId.value, {
          demoUrl: undefined,
          scenario,
        });
        await refresh();
        return session;
      } finally {
        saving.value = false;
      }
    }

    async function revokeDemo() {
      saving.value = true;
      try {
        const session = await revokeDemoSession(projectId.value);
        await refresh();
        return session;
      } finally {
        saving.value = false;
      }
    }

    function reselectAsset(
      asset: import('#/types/creative-video').AssetRef,
      file: File,
    ) {
      const error = validateAssetFile(file, asset.kind);
      if (error) throw new Error(error);
      if (
        file.size !== asset.sizeBytes ||
        (asset.mimeType !== 'application/octet-stream' &&
          file.type &&
          file.type !== asset.mimeType)
      )
        throw new Error(
          '文件大小或类型与原素材不同，请选择原文件；新资料请使用上传入口',
        );
      const existingPreview = previewUrls[asset.id];
      if (existingPreview) URL.revokeObjectURL(existingPreview);
      previewUrls[asset.id] = URL.createObjectURL(file);
    }

    function getPreviewUrl(assetId: string): string {
      return previewUrls[assetId] ?? '';
    }

    function clearPreviews() {
      previewEpoch += 1;
      for (const key of Object.keys(previewUrls)) {
        const preview = previewUrls[key];
        if (preview) URL.revokeObjectURL(preview);
        Reflect.deleteProperty(previewUrls, key);
      }
    }

    function $reset() {
      previewEpoch += 1;
      projectId.value = '';
      state.value = null;
      evidence.value = [];
      snapshots.value = [];
      loading.value = false;
      saving.value = false;
      errorMessage.value = '';
      for (const key of Object.keys(previewUrls)) {
        URL.revokeObjectURL(previewUrls[key] as string);
        Reflect.deleteProperty(previewUrls, key);
      }
    }

    return {
      $reset,
      clearPreviews,
      activeDemoSession,
      confirm,
      errorMessage,
      evidence,
      getPreviewUrl,
      reselectAsset,
      hasValidSource,
      includedSources,
      load,
      loading,
      projectId,
      readySources,
      refresh,
      removeAsset,
      renameAsset,
      revokeDemo,
      runUrlAnalysis,
      saving,
      snapshots,
      startDemoSession,
      state,
      toggleSource,
      uploadFile,
    };
  },
);
