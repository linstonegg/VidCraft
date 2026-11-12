<script lang="ts" setup>
import type {
  AssetContentVersion,
  AssetRef,
  AssetUsageMetadata,
  AssetUsageRef,
} from '#/types/creative-video';

import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import {
  ElAlert,
  ElButton,
  ElDrawer,
  ElMessage,
  ElOption,
  ElSelect,
  ElTag,
} from 'element-plus';

import {
  createAssetContentVersion,
  getAssetContentVersions,
  getAssetUsage,
  getAssetUsageMetadata,
  patchAssetUsageMetadata,
  previewAssetReplacement,
} from '#/api/creative-video';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';

const props = defineProps<{ asset: AssetRef | null; open: boolean }>();
const emit = defineEmits<{ 'update:open': [value: boolean] }>();
const route = useRoute();
const projectId = computed(() => String(route.params.id ?? ''));

const loading = ref(false);
const versions = ref<AssetContentVersion[]>([]);
const metadata = ref<AssetUsageMetadata | null>(null);
const usage = ref<AssetUsageRef[]>([]);
const revokedVersions = computed(() =>
  versions.value.filter((item) =>
    ['REDACTED', 'UNAVAILABLE'].includes(item.status),
  ),
);
const rightsRestricted = computed(
  () =>
    Boolean(metadata.value?.rightsStatus) &&
    metadata.value?.rightsStatus !== 'DECLARED',
);
const hasAccessBlock = computed(
  () => revokedVersions.value.length > 0 || rightsRestricted.value,
);
const creating = ref(false);
const replacing = ref(false);
const replaceImpact = ref<null | {
  requiresNewRevision: boolean;
  summary: string;
}>(null);

const typeLabel: Record<string, string> = {
  CREATIVE_CONCEPT_REVISION: '创意方案',
  PRODUCT_SOURCE: 'M1 资料来源',
  SHOT_REVISION: '镜头',
  STORYBOARD_REVISION: '分镜',
  UNDERSTANDING_REVISION: '理解报告',
  VISUAL_BIBLE_REVISION: '视觉规范',
};

async function load() {
  if (!props.asset) return;
  loading.value = true;
  try {
    const [versionList, meta, usageList] = await Promise.all([
      getAssetContentVersions(projectId.value, props.asset.id),
      getAssetUsageMetadata(projectId.value, props.asset.id),
      getAssetUsage(projectId.value, props.asset.id),
    ]);
    versions.value = versionList;
    metadata.value = meta;
    usage.value = usageList;
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    loading.value = false;
  }
}

async function saveRights() {
  if (!metadata.value) return;
  try {
    metadata.value = await patchAssetUsageMetadata(
      projectId.value,
      metadata.value.assetId,
      {
        expectedVersion: metadata.value.version,
        patch: {
          mayBeShownInFinalVideo: metadata.value.mayBeShownInFinalVideo,
          mayBeUsedForAnalysis: metadata.value.mayBeUsedForAnalysis,
          rightsStatus: metadata.value.rightsStatus,
        },
      },
    );
    await load();
    ElMessage.success('素材用途已保存；不会改动已批准镜头内容');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  }
}

async function previewReplace() {
  if (!props.asset) return;
  const latest = versions.value.at(-1);
  if (!latest) return;
  replacing.value = true;
  try {
    replaceImpact.value = await previewAssetReplacement(
      projectId.value,
      props.asset.id,
      latest.id,
    );
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    replacing.value = false;
  }
}

async function createVersion() {
  if (!props.asset) return;
  creating.value = true;
  try {
    await createAssetContentVersion(projectId.value, props.asset.id, {
      expectedAssetVersion: props.asset.version,
      filename: 'demo-content-v2.svg',
      fixtureKey: '/brand/vidcraft-avatar.svg',
    });
    await load();
    ElMessage.success('已新增内容版本；旧版本和已批准引用保持不变');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    creating.value = false;
  }
}

watch(
  () => [props.open, props.asset?.id] as const,
  ([open]) => {
    if (open) void load();
  },
  { immediate: true },
);
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <ElDrawer
    :model-value="open"
    size="500px"
    title="素材内容版本与使用位置"
    @update:model-value="emit('update:open', $event)"
  >
    <div v-if="asset" class="vc-asset-usage">
      <ElAlert
        :closable="false"
        show-icon
        title="AssetRef.version 只是元数据乐观锁；下面的内容版本才是不可变文件版本。"
        type="info"
      />

      <ElAlert
        v-if="hasAccessBlock"
        :closable="false"
        show-icon
        :title="`已撤权素材：禁止预览、下载和新引用（版本 ${revokedVersions.length}）`"
        type="error"
      />

      <section>
        <h3>内容历史</h3>
        <ul class="vc-asset-usage__versions">
          <li v-for="version in versions" :key="version.id">
            <ElTag
              :type="version.status === 'READY' ? 'success' : 'danger'"
              size="small"
            >
              v{{ version.contentRevisionNo }} · {{ version.status }}
            </ElTag>
            <code>{{ version.id }}</code>
            <small
              >{{ version.originalFilename }} · {{ version.mimeType }}</small
            >
          </li>
        </ul>
        <ElButton :loading="creating" size="small" @click="createVersion">
          新增演示内容版本 V{{ (versions.at(-1)?.contentRevisionNo ?? 0) + 1 }}
        </ElButton>
        <ElButton
          :loading="replacing"
          size="small"
          text
          @click="previewReplace"
        >
          预览采用最新版本的影响
        </ElButton>
        <p v-if="replaceImpact" class="vc-asset-usage__hint">
          {{ replaceImpact.summary }}
          {{
            replaceImpact.requiresNewRevision ? '需要新草稿与重新审核。' : ''
          }}
        </p>
      </section>

      <section v-if="metadata">
        <h3>用途与展示权</h3>
        <ElSelect
          v-model="metadata.rightsStatus"
          class="vc-asset-usage__rights"
          size="small"
        >
          <ElOption label="已声明可用" value="DECLARED" />
          <ElOption label="授权不确定" value="UNCERTAIN" />
          <ElOption label="不允许使用（REDACTED）" value="NOT_ALLOWED" />
        </ElSelect>
        <label class="vc-asset-usage__check">
          <input v-model="metadata.mayBeUsedForAnalysis" type="checkbox" />
          可用于研究分析
        </label>
        <label class="vc-asset-usage__check">
          <input v-model="metadata.mayBeShownInFinalVideo" type="checkbox" />
          可在最终成片展示
        </label>
        <p class="vc-asset-usage__hint">
          授权状态：{{ metadata.rightsStatus }} · 敏感数据：{{
            metadata.containsSensitiveData ? '需脱敏' : '否'
          }}
        </p>
        <ElButton size="small" @click="saveRights">保存用途</ElButton>
      </section>

      <section>
        <h3>已在什么地方使用（{{ usage.length }}）</h3>
        <ul class="vc-asset-usage__usage">
          <li v-for="item in usage" :key="item.id">
            <ElTag size="small">
              {{ typeLabel[item.targetType] ?? item.targetType }}
            </ElTag>
            <div>
              <strong>{{ item.targetId }}</strong>
              <small>
                {{ item.usageRole }} ·
                {{ item.assetVersionId ?? '历史版本未确定' }} ·
                {{ item.isInApprovedSnapshot ? '已批准快照' : '草稿/候选' }}
              </small>
            </div>
          </li>
        </ul>
        <p v-if="usage.length === 0" class="vc-asset-usage__hint">
          当前没有反向引用；新采用需要先预览影响并走目标修订审核。
        </p>
      </section>
    </div>
  </ElDrawer>
</template>

<style scoped>
.vc-asset-usage section {
  margin-top: 18px;
}

.vc-asset-usage h3 {
  margin: 0 0 8px;
  font-size: 13px;
}

.vc-asset-usage__versions,
.vc-asset-usage__usage {
  padding: 0;
  margin: 0 0 8px;
  list-style: none;
}

.vc-asset-usage__versions li,
.vc-asset-usage__usage li {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0;
  border-bottom: 1px solid var(--vc-border);
}

.vc-asset-usage__usage li {
  flex-direction: row;
  gap: 8px;
  align-items: flex-start;
}

.vc-asset-usage__usage div {
  display: flex;
  flex-direction: column;
}

.vc-asset-usage code {
  font-size: 10px;
  word-break: break-all;
}

.vc-asset-usage small,
.vc-asset-usage__hint {
  font-size: 11px;
  color: var(--vc-text-weak);
}

.vc-asset-usage__rights {
  width: 100%;
  margin-bottom: 8px;
}

.vc-asset-usage__check {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
}

.vc-asset-usage__check input {
  margin-right: 6px;
}
</style>
