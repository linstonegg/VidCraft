<script lang="ts" setup>
import type { AssetKind, AssetRef } from '#/types/creative-video';

import { computed, onBeforeUnmount, ref } from 'vue';

import {
  ElAlert,
  ElButton,
  ElDialog,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElProgress,
  ElSelect,
  ElTag,
} from 'element-plus';

import { updateAsset } from '#/api/creative-video';
import AssetPreview from '#/components/creative-video/AssetPreview.vue';
import AssetUsageDrawer from '#/components/creative-video/m11/AssetUsageDrawer.vue';
import { useCreativeVideoIngestionStore } from '#/stores/creative-video';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';
import {
  formatFileSize,
  validateAssetFile,
} from '#/utils/creative-video/validation';

const store = useCreativeVideoIngestionStore();
const fileInput = ref<HTMLInputElement | null>(null);
const kind = ref<AssetKind>('image');
const purpose = ref('');
const uploadScenario = ref('SUCCESS');
const uploading = ref(false);
interface UploadRow {
  id: number;
  name: string;
  progress: number;
  status: string;
  controller: AbortController;
}
const uploadRows = ref<UploadRow[]>([]);
const uploadStatusLabels: Record<string, string> = {
  UPLOADING: '模拟上传中',
  COMMITTING: '提交元数据中',
  SUCCEEDED: '已完成',
  FAILED: '失败，可重试',
  CANCELLED: '已取消',
};
let uploadSequence = 0;
const cancelledUploads = ref<string[]>([]);
function cancelUploads() {
  for (const row of uploadRows.value) {
    if (row.status === 'UPLOADING') row.controller.abort();
  }
}
onBeforeUnmount(cancelUploads);
const failedUploads = ref<
  Array<{ error: string; file: File; kind: AssetKind }>
>([]);
const previewAsset = ref<AssetRef | null>(null);
const previewOpen = ref(false);
const usageOpen = ref(false);
const usageAsset = ref<AssetRef | null>(null);

const dragging = ref(false);
const metadataAsset = ref<AssetRef | null>(null);
const metadataKind = ref<AssetKind>('image');
const metadataPurpose = ref('');
const metadataSaving = ref(false);
function editMetadata(asset: AssetRef) {
  metadataAsset.value = asset;
  metadataKind.value = asset.kind;
  metadataPurpose.value = asset.purpose || '';
}
async function saveMetadata() {
  const asset = metadataAsset.value;
  if (!asset) return;
  metadataSaving.value = true;
  try {
    await updateAsset(asset.projectId, asset.id, {
      expectedVersion: asset.version,
      patch: { kind: metadataKind.value, purpose: metadataPurpose.value },
    });
    await store.refresh();
    metadataAsset.value = null;
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    metadataSaving.value = false;
  }
}
function needsReselect(asset: AssetRef) {
  return (
    ['image', 'logo', 'video'].includes(asset.kind) &&
    !store.getPreviewUrl(asset.id) &&
    !asset.previewUrl
  );
}

const assets = computed(() => store.state?.assets ?? []);

const kindOptions: Array<{ label: string; value: AssetKind }> = [
  { label: '产品截图', value: 'image' },
  { label: '产品录屏', value: 'video' },
  { label: '产品文档', value: 'document' },
  { label: '品牌 Logo', value: 'logo' },
];

function pickFiles() {
  fileInput.value?.click();
}

async function uploadOne(file: File, fileKind: AssetKind) {
  const row = {
    id: ++uploadSequence,
    name: file.name,
    progress: 0,
    status: 'UPLOADING',
    controller: new AbortController(),
  };
  uploadRows.value.push(row);
  const entry = row;
  try {
    await store.uploadFile(
      file,
      fileKind,
      purpose.value || undefined,
      uploadScenario.value === 'UPLOAD_FAILED' ? 'UPLOAD_FAILED' : undefined,
      entry.controller.signal,
      (value) => {
        entry.progress = value;
        if (value === 90) entry.status = 'COMMITTING';
      },
    );
    entry.status = 'SUCCEEDED';
    ElMessage.success(
      `素材信息已保存：${file.name}（Mock：仅元数据，不持久化文件内容）`,
    );
    return true;
  } catch (uploadError) {
    if (
      uploadError instanceof DOMException &&
      uploadError.name === 'AbortError'
    ) {
      entry.status = 'CANCELLED';
      cancelledUploads.value.push(file.name);
      return false;
    }
    entry.status = 'FAILED';
    failedUploads.value.push({
      error: friendlyErrorMessage(uploadError),
      file,
      kind: fileKind,
    });
    return false;
  }
}

async function handleFiles(files: FileList | null) {
  if (uploading.value || !files || files.length === 0) {
    return;
  }
  failedUploads.value = [];
  uploading.value = true;
  try {
    const fileKind = kind.value;
    await Promise.all(
      [...files].map(async (file) => {
        const error = validateAssetFile(file, fileKind);
        if (error) {
          failedUploads.value.push({ error, file, kind: fileKind });
          return;
        }
        await uploadOne(file, fileKind);
      }),
    );
  } finally {
    uploading.value = false;
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  }
}

async function retryUpload(entry: {
  error: string;
  file: File;
  kind: AssetKind;
}) {
  uploading.value = true;
  try {
    const index = failedUploads.value.indexOf(entry);
    if (index !== -1) {
      failedUploads.value.splice(index, 1);
    }
    await uploadOne(entry.file, entry.kind);
  } finally {
    uploading.value = false;
  }
}

function onDrop(event: DragEvent) {
  dragging.value = false;
  void handleFiles(event.dataTransfer?.files ?? null);
}

async function rename(asset: AssetRef) {
  try {
    const { value } = await ElMessageBox.prompt(
      '请输入新的文件名',
      '重命名素材',
      {
        cancelButtonText: '取消',
        confirmButtonText: '保存',
        inputPattern: /^.{1,120}$/,
        inputValue: asset.filename,
      },
    );
    await store.renameAsset(asset.id, String(value).trim(), asset.version);
    ElMessage.success('素材已重命名');
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return;
    }
    ElMessage.error(friendlyErrorMessage(error));
  }
}

async function remove(asset: AssetRef) {
  try {
    await ElMessageBox.confirm(
      '删除素材后，资料覆盖度与理解报告可能需要重新分析；确定删除？',
      '删除素材',
      { cancelButtonText: '取消', confirmButtonText: '删除', type: 'warning' },
    );
    await store.removeAsset(asset.id, asset.version);
    ElMessage.success('素材已删除');
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return;
    }
    ElMessage.error(friendlyErrorMessage(error));
  }
}

function openUsage(asset: AssetRef) {
  usageAsset.value = asset;
  usageOpen.value = true;
}

function openPreview(asset: AssetRef) {
  previewAsset.value = asset;
  previewOpen.value = true;
}
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <div>
    <div class="vc-upload__controls">
      <ElSelect v-model="kind" size="small" class="vc-upload__kind">
        <ElOption
          v-for="item in kindOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </ElSelect>
      <ElInput
        v-model="purpose"
        clearable
        placeholder="用途备注（可选）"
        size="small"
        class="vc-upload__purpose"
      />
      <ElSelect v-model="uploadScenario" size="small" class="vc-upload__kind">
        <ElOption label="上传成功" value="SUCCESS" />
        <ElOption label="模拟上传失败" value="UPLOAD_FAILED" />
      </ElSelect>
      <ElButton size="small" :loading="uploading" @click="pickFiles">
        选择文件
      </ElButton>
      <ElButton v-if="uploading" size="small" @click="cancelUploads">
        取消待提交上传
      </ElButton>
      <span class="vc-upload__weak">也可以把文件拖到下方区域</span>
    </div>

    <p v-if="uploading" class="vc-upload__weak" role="status">
      正在模拟上传并保存文件元数据（百分比为 Mock 准备进度）…
    </p>

    <p v-for="(name, index) in cancelledUploads" :key="index" role="status">
      {{ name }}：CANCELLED（已取消，未提交素材）
    </p>

    <ul aria-label="文件上传进度">
      <li v-for="row in uploadRows" :key="row.id">
        <span>{{ row.name }} · {{ uploadStatusLabels[row.status] }}</span>
        <ElProgress
          :percentage="row.progress"
          :status="
            row.status === 'FAILED'
              ? 'exception'
              : row.status === 'SUCCEEDED'
                ? 'success'
                : undefined
          "
        />
        <ElButton
          v-if="row.status === 'UPLOADING'"
          size="small"
          @click="row.controller.abort()"
          >取消 {{ row.name }}</ElButton
        >
      </li>
    </ul>
    <input
      ref="fileInput"
      accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.webm,.pdf,.docx,.txt,.md,.pptx"
      class="vc-upload__input"
      multiple
      type="file"
      @change="handleFiles(($event.target as HTMLInputElement).files)"
    />

    <div
      :class="{ 'is-dragging': dragging }"
      class="vc-upload__dropzone"
      role="button"
      tabindex="0"
      @click="pickFiles"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
      @keydown.enter.prevent="pickFiles"
      @keydown.space.prevent="pickFiles"
    >
      <span>拖拽文件到这里，或点击选择</span>
      <span class="vc-upload__weak">
        图片 ≤ 20MB / 录屏 ≤ 500MB / 文档 ≤ 50MB；Mock 只保存文件元数据
      </span>
    </div>

    <ul v-if="failedUploads.length > 0" class="vc-upload__failed">
      <li
        v-for="(entry, index) in failedUploads"
        :key="entry.file.name + index"
      >
        <ElAlert
          :closable="false"
          :title="`${entry.file.name}：${entry.error}`"
          show-icon
          type="warning"
        />
        <ElButton size="small" :loading="uploading" @click="retryUpload(entry)">
          重试
        </ElButton>
      </li>
    </ul>

    <ul v-if="assets.length > 0" class="vc-upload__list">
      <li v-for="asset in assets" :key="asset.id" class="vc-upload__item">
        <div class="vc-upload__meta">
          <strong>{{ asset.filename }}</strong>
          <span>
            {{
              kindOptions.find((item) => item.value === asset.kind)?.label ||
              asset.kind
            }}
            · {{ formatFileSize(asset.sizeBytes) }} ·
            {{ asset.mimeType || '未知类型' }}
          </span>
          <ElTag
            :type="asset.uploadStatus === 'SUCCEEDED' ? 'success' : 'warning'"
            effect="plain"
            size="small"
          >
            {{
              asset.uploadStatus === 'SUCCEEDED'
                ? needsReselect(asset)
                  ? '需要重新选择（NEEDS_RESELECT）'
                  : '已保存元数据'
                : asset.uploadStatus
            }}
          </ElTag>
        </div>
        <div class="vc-upload__actions">
          <ElButton size="small" text @click="openPreview(asset)">
            预览
          </ElButton>
          <ElButton size="small" text @click="editMetadata(asset)"
            >编辑</ElButton
          >
          <ElDropdown trigger="click">
            <ElButton
              size="small"
              text
              :aria-label="`${asset.filename}的更多操作`"
              >更多 ▾</ElButton
            >
            <template #dropdown>
              <ElDropdownMenu>
                <ElDropdownItem @click="openUsage(asset)"
                  >使用位置</ElDropdownItem
                >
                <ElDropdownItem @click="rename(asset)">重命名</ElDropdownItem>
                <ElDropdownItem divided @click="remove(asset)"
                  >删除</ElDropdownItem
                >
              </ElDropdownMenu>
            </template>
          </ElDropdown>
        </div>
      </li>
    </ul>
    <p v-else class="vc-upload__weak">
      尚未上传素材。M1 不会把文件上传到真实服务器，也不会调用 OCR / STT /
      文档解析。
    </p>

    <AssetUsageDrawer v-model:open="usageOpen" :asset="usageAsset" />

    <ElDialog
      :model-value="!!metadataAsset"
      title="编辑素材分类与备注"
      @close="metadataAsset = null"
    >
      <ElSelect v-model="metadataKind" aria-label="素材分类"
        ><ElOption
          v-for="item in kindOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
      /></ElSelect>
      <ElInput
        v-model="metadataPurpose"
        aria-label="素材用途备注"
        placeholder="用途备注"
      />
      <template #footer
        ><ElButton :loading="metadataSaving" @click="saveMetadata"
          >保存素材信息</ElButton
        ></template
      >
    </ElDialog>
    <ElDialog
      v-model="previewOpen"
      :title="previewAsset?.filename || '素材预览'"
      width="640px"
    >
      <AssetPreview
        v-if="previewAsset"
        :asset="previewAsset"
        :summary="
          store.state?.sources.find(
            (source) => source.id === previewAsset?.sourceId,
          )?.summary
        "
      />
    </ElDialog>
  </div>
</template>

<style scoped>
.vc-upload__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

.vc-upload__kind {
  width: 120px;
}

.vc-upload__purpose {
  width: 180px;
}

.vc-upload__failed {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  margin: 8px 0 0;
  list-style: none;
}

.vc-upload__failed li {
  display: flex;
  gap: 8px;
  align-items: center;
}

.vc-upload__failed .el-alert {
  flex: 1;
}

.vc-upload__input {
  display: none;
}

.vc-upload__dropzone {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  min-height: 112px;
  padding: 22px 18px;
  font-size: 13px;
  color: var(--vc-text-weak);
  text-align: center;
  cursor: pointer;
  background:
    linear-gradient(180deg, rgb(103 87 215 / 5%) 0%, transparent 70%),
    var(--el-bg-color-page, #f5f6f8);
  border: 1px dashed var(--vc-brand-border);
  border-radius: 12px;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease;
}

.vc-upload__dropzone:hover,
.vc-upload__dropzone.is-dragging {
  background: var(--vc-brand-soft);
  border-color: var(--vc-brand);
  box-shadow: 0 8px 20px rgb(103 87 215 / 10%);
}

.vc-upload__alert {
  margin-top: 8px;
}

.vc-upload__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  margin: 12px 0 0;
  list-style: none;
}

.vc-upload__item {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid transparent;
  border-radius: 10px;
  transition:
    background 0.16s ease,
    border-color 0.16s ease;
}

.vc-upload__item:hover {
  background: var(--vc-brand-soft);
  border-color: var(--vc-brand-border);
}

.vc-upload__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  font-size: 12px;
  color: var(--vc-text-weak);
}

.vc-upload__meta strong {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
  white-space: nowrap;
}

.vc-upload__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.vc-upload__preview {
  max-width: 100%;
  max-height: 360px;
  border-radius: 8px;
}

.vc-upload__weak {
  font-size: 12px;
  line-height: 1.6;
  color: var(--vc-text-weak);
}

@media (prefers-reduced-motion: reduce) {
  .vc-upload__dropzone,
  .vc-upload__item {
    transition: none;
  }
}
</style>
