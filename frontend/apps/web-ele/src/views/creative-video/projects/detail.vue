<script lang="ts" setup>
import type { AssetRef, VideoProject } from '#/types/creative-video';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElTag,
} from 'element-plus';

import { listAssets, updateProject } from '#/api/creative-video';
import ErrorState from '#/components/creative-video/ErrorState.vue';
import LoadingState from '#/components/creative-video/LoadingState.vue';
import { useProjectAccess } from '#/composables/creative-video/use-project-access';
import {
  useCreativeVideoIngestionStore,
  useCreativeVideoProjectStore,
} from '#/stores/creative-video';
import {
  friendlyErrorMessage,
  isNotFoundError,
} from '#/utils/creative-video/errors';
import { formatDateTime, formatDuration } from '#/utils/creative-video/format';
import {
  MARKET_OPTIONS,
  OBJECTIVE_OPTIONS,
  platformLabel,
  PROJECT_STATUS_KEYS,
  projectPlatforms,
  STAGE_REVIEW_LABELS,
  STAGE_REVIEW_TAG_TYPES,
  stageLabel,
  stageReviewState,
} from '#/utils/creative-video/project-stage';
import { getStudioPath, STUDIO_STAGES } from '#/utils/creative-video/stages';

defineOptions({ name: 'VidCraftProjectDetail' });

const route = useRoute();
const router = useRouter();
const store = useCreativeVideoProjectStore();
const projectId = computed(() => String(route.params.id ?? ''));
const project = ref<null | VideoProject>(null);
const loading = ref(true);
const errorMessage = ref('');
const coverAssets = ref<AssetRef[]>([]);
const selectedCover = ref('');
const coverSaving = ref(false);
const coverStatus = ref('');
const ingestionStore = useCreativeVideoIngestionStore();
const { canEdit } = useProjectAccess(project);

const reviewState = computed(() =>
  project.value ? stageReviewState(project.value) : 'IN_PROGRESS',
);

async function load() {
  loading.value = true;
  errorMessage.value = '';
  try {
    project.value = await store.fetchProject(projectId.value);
    const assets = await listAssets(projectId.value);
    coverAssets.value = assets.filter((item) =>
      ['image', 'logo'].includes(item.kind),
    );
    selectedCover.value = project.value.coverAssetId || '';
  } catch (error) {
    project.value = null;
    errorMessage.value = isNotFoundError(error)
      ? '项目不存在或已被移除'
      : friendlyErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function saveCover() {
  if (!project.value) return;
  coverSaving.value = true;
  coverStatus.value = '保存中';
  try {
    project.value = await updateProject(projectId.value, {
      expectedVersion: project.value.version,
      patch: { coverAssetId: selectedCover.value },
    });
    coverStatus.value = '已保存';
  } catch (error) {
    coverStatus.value = '保存失败，请重试';
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    coverSaving.value = false;
  }
}

function openStage(stage: VideoProject['currentStage']) {
  if (!project.value) {
    return;
  }
  router.push(getStudioPath(project.value.id, stage));
}

async function rename() {
  if (!project.value) {
    return;
  }
  try {
    const { value } = await ElMessageBox.prompt(
      '请输入新的项目名称（1～100 字）',
      '重命名项目',
      {
        cancelButtonText: '取消',
        confirmButtonText: '保存',
        inputPattern: /^.{1,100}$/,
        inputValue: project.value.title,
      },
    );
    project.value = await store.rename(
      project.value.id,
      String(value).trim(),
      project.value.version,
    );
    ElMessage.success('项目已重命名');
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return;
    }
    ElMessage.error(friendlyErrorMessage(error));
  }
}

onMounted(load);
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <div class="vc-page vc-detail">
    <LoadingState v-if="loading" />

    <ErrorState
      v-else-if="errorMessage"
      class="vc-detail__error"
      :message="errorMessage"
      :show-retry="false"
      title="无法打开项目"
    >
      <ElButton type="primary" plain @click="router.push('/projects')">
        返回项目中心
      </ElButton>
      <ElButton @click="load">重试</ElButton>
    </ErrorState>

    <template v-else-if="project">
      <header class="vc-detail__hero">
        <div class="vc-detail__hero-copy">
          <p class="vc-detail__eyebrow">Project Detail</p>
          <h1 class="vc-page__title">{{ project.title }}</h1>
          <p class="vc-page__subtitle">
            {{ project.productName || '未填写产品名称' }} ·
            {{ project.productUrl || '仅上传资料' }}
          </p>
          <div class="vc-m1-detail__tags">
            <ElTag type="primary" effect="light">
              {{ $t(PROJECT_STATUS_KEYS[project.status]) }}
            </ElTag>
            <span class="vc-chip">{{ stageLabel(project.currentStage) }}</span>
            <ElTag :type="STAGE_REVIEW_TAG_TYPES[reviewState]" effect="plain">
              {{ STAGE_REVIEW_LABELS[reviewState] }}
            </ElTag>
            <span class="vc-m1-detail__version"
              >版本 v{{ project.version }}</span
            >
          </div>
        </div>
        <div class="vc-m1-actions">
          <ElButton @click="router.push('/projects')">返回项目中心</ElButton>
          <ElButton v-if="canEdit" @click="rename">重命名</ElButton>
          <ElButton type="primary" @click="openStage('INGEST')">
            进入资料采集
          </ElButton>
          <ElButton
            v-if="project.currentStage !== 'INGEST'"
            @click="openStage('UNDERSTANDING')"
          >
            查看产品理解
          </ElButton>
        </div>
      </header>

      <section class="vc-detail__panel vc-detail__stages-panel">
        <div class="vc-detail__panel-head">
          <div>
            <h2 class="vc-m1-detail__section">阶段进度</h2>
            <p class="vc-m1-detail__weak">
              阶段只表示当前位置；未确认产品理解前，后续创意与生成阶段会被门禁拦截。
            </p>
          </div>
        </div>
        <div class="vc-m1-detail__stages">
          <button
            v-for="(stage, index) in STUDIO_STAGES"
            :key="stage.key"
            :class="{ 'is-active': stage.key === project.currentStage }"
            class="vc-m1-detail__stage"
            type="button"
            @click="openStage(stage.key)"
          >
            <span class="vc-m1-detail__stage-index">{{ index + 1 }}</span>
            <span>{{ stageLabel(stage.key) }}</span>
          </button>
        </div>
      </section>

      <div class="vc-detail__body">
        <section class="vc-detail__panel vc-detail__overview">
          <div class="vc-detail__panel-head">
            <h2 class="vc-m1-detail__section">项目概览</h2>
          </div>

          <ElDescriptions :column="3" border class="vc-m1-detail__desc">
            <ElDescriptionsItem label="产品名称">
              {{ project.productName || '—' }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="产品网址">
              {{ project.productUrl || '仅上传资料' }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="目标市场">
              {{
                MARKET_OPTIONS.find((item) => item.value === project?.market)
                  ?.label || '—'
              }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="营销目标">
              {{
                OBJECTIVE_OPTIONS.find(
                  (item) => item.value === project?.marketingObjective,
                )?.label || '—'
              }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="目标时长">
              {{ formatDuration(project.durationSec) }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="画面比例">
              {{ project.aspectRatio }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="目标平台">
              {{
                projectPlatforms(project)
                  .map((item) => platformLabel(item))
                  .join(' / ')
              }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="视频语言">
              {{ project.language || 'zh-CN' }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="风格偏好">
              {{ project.stylePreferences?.join('、') || '交给 AI 判断' }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="目标用户" :span="2">
              {{ project.targetAudience || '交给 AI 判断' }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="负责人">
              {{ project.ownerId }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="最近更新">
              {{ formatDateTime(project.updatedAt) }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="创建时间">
              {{ formatDateTime(project.createdAt) }}
            </ElDescriptionsItem>
            <ElDescriptionsItem label="项目 ID">
              {{ project.id }}
            </ElDescriptionsItem>
          </ElDescriptions>

          <div
            v-if="project.description || project.negativeGuidance"
            class="vc-detail__notes"
          >
            <p v-if="project.description" class="vc-m1-detail__text">
              {{ project.description }}
            </p>
            <p v-if="project.negativeGuidance" class="vc-m1-detail__weak">
              创作禁区：{{ project.negativeGuidance }}
            </p>
          </div>
        </section>

        <aside class="vc-detail__aside">
          <section class="vc-detail__panel vc-detail__cover">
            <div class="vc-detail__panel-head">
              <h2 class="vc-m1-detail__section">项目封面</h2>
            </div>

            <div class="vc-detail__cover-preview">
              <img
                v-if="
                  selectedCover && ingestionStore.getPreviewUrl(selectedCover)
                "
                :src="ingestionStore.getPreviewUrl(selectedCover)"
                alt="所选封面"
                class="vc-detail__cover-image"
              />
              <div v-else class="vc-detail__cover-fallback" aria-hidden="true">
                <span>{{
                  (project.productName || project.title).slice(0, 1)
                }}</span>
                <small>默认封面</small>
              </div>
            </div>

            <div class="vc-detail__cover-controls">
              <ElSelect
                v-model="selectedCover"
                placeholder="选择图片素材"
                :disabled="!canEdit || !!project.archivedAt"
                aria-label="项目封面"
                class="vc-detail__cover-select"
              >
                <ElOption label="默认封面" value="" />
                <ElOption
                  v-for="asset in coverAssets"
                  :key="asset.id"
                  :label="asset.filename"
                  :value="asset.id"
                />
              </ElSelect>
              <ElButton
                :disabled="!canEdit || !!project.archivedAt"
                :loading="coverSaving"
                type="primary"
                plain
                @click="saveCover"
                >保存封面</ElButton
              >
            </div>
            <span class="vc-detail__cover-status" role="status">{{
              coverStatus
            }}</span>
            <p class="vc-m1-detail__weak">
              从资料采集页添加图片后可在此选择；仅保存素材引用。本地文件刷新后需重新选择才能预览，没有可用图片时显示默认封面。
            </p>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.vc-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.vc-detail__error {
  padding: 8px 0;
}

.vc-detail__hero {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  align-items: flex-end;
  justify-content: space-between;
  padding: 20px 22px;
  background:
    linear-gradient(
      135deg,
      rgb(103 87 215 / 8%) 0%,
      rgb(103 87 215 / 2%) 42%,
      transparent 72%
    ),
    var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-detail__hero-copy {
  min-width: 0;
  max-width: 760px;
}

.vc-detail__eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 650;
  color: var(--vc-brand);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.vc-detail__hero .vc-page__title {
  font-size: 22px;
  letter-spacing: -0.02em;
}

.vc-detail__hero .vc-page__subtitle {
  max-width: 60ch;
  word-break: break-all;
}

.vc-m1-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.vc-m1-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
}

.vc-m1-detail__version {
  padding: 2px 8px;
  font-size: 12px;
  color: var(--vc-text-weak);
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid var(--vc-border);
  border-radius: 999px;
}

.vc-detail__panel {
  box-sizing: border-box;
  padding: 18px 20px;
  background: var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-detail__panel-head {
  margin-bottom: 14px;
}

.vc-m1-detail__section {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-detail__panel-head .vc-m1-detail__weak {
  margin-top: 6px;
}

.vc-detail__stages-panel {
  background:
    linear-gradient(180deg, rgb(103 87 215 / 4%) 0%, transparent 70%),
    var(--el-bg-color-overlay, #fff);
}

.vc-m1-detail__stages {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.vc-m1-detail__stage {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  min-height: 36px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--vc-text-weak);
  cursor: pointer;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid var(--vc-border);
  border-radius: 999px;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease,
    transform 0.16s ease;
}

.vc-m1-detail__stage:hover {
  color: var(--vc-brand);
  background: var(--vc-brand-soft);
  border-color: var(--vc-brand-border);
  transform: translateY(-1px);
}

.vc-m1-detail__stage.is-active {
  font-weight: 650;
  color: #fff;
  background: var(--vc-brand);
  border-color: var(--vc-brand);
}

.vc-m1-detail__stage.is-active:hover {
  color: #fff;
  background: var(--vc-brand);
  border-color: var(--vc-brand);
}

.vc-m1-detail__stage-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 11px;
  font-weight: 650;
  background: rgb(0 0 0 / 6%);
  border-radius: 50%;
}

.vc-m1-detail__stage.is-active .vc-m1-detail__stage-index {
  background: rgb(255 255 255 / 22%);
}

.vc-detail__body {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.9fr);
  gap: 16px;
  align-items: start;
}

.vc-detail__aside {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.vc-m1-detail__desc {
  margin-bottom: 0;
}

.vc-m1-detail__desc :deep(.el-descriptions__label) {
  width: 96px;
  color: var(--vc-text-weak);
}

.vc-detail__notes {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  margin-top: 14px;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid var(--vc-border);
  border-radius: 10px;
}

.vc-m1-detail__text {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-regular, #4b5563);
}

.vc-m1-detail__weak {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vc-text-weak);
}

.vc-detail__cover-preview {
  margin-bottom: 14px;
  overflow: hidden;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid var(--vc-border);
  border-radius: 10px;
}

.vc-detail__cover-image {
  display: block;
  width: 100%;
  max-height: 180px;
  object-fit: cover;
}

.vc-detail__cover-fallback {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  min-height: 140px;
  color: #fff;
  background:
    radial-gradient(circle at 20% 20%, rgb(255 255 255 / 18%), transparent 42%),
    linear-gradient(135deg, #7b6be6, #4f3fbf);
}

.vc-detail__cover-fallback span {
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
}

.vc-detail__cover-fallback small {
  font-size: 12px;
  opacity: 0.85;
}

.vc-detail__cover-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.vc-detail__cover-select {
  flex: 1;
  min-width: 160px;
}

.vc-detail__cover-status {
  display: block;
  min-height: 18px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--vc-brand);
}

@media (max-width: 1100px) {
  .vc-detail__body {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .vc-detail__hero {
    padding: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vc-m1-detail__stage {
    transition: none;
  }

  .vc-m1-detail__stage:hover {
    transform: none;
  }
}
</style>
