<script lang="ts" setup>
import type {
  AssetRef,
  EvidenceRef,
  ProductSource,
  UnderstandingRevision,
} from '#/types/creative-video';

import { computed } from 'vue';

import { ElDrawer, ElTag } from 'element-plus';

import AssetPreview from '#/components/creative-video/AssetPreview.vue';
import {
  EVIDENCE_LABELS,
  EVIDENCE_TAG_TYPES,
} from '#/utils/creative-video/project-stage';

const props = defineProps<{
  assets?: AssetRef[];
  evidence: EvidenceRef[];
  open: boolean;
  revision?: null | UnderstandingRevision;
  sources: ProductSource[];
  title?: string;
}>();

const emit = defineEmits<{ 'update:open': [value: boolean] }>();

const sourceTitle = computed(() => {
  const map = new Map<string, string>();
  for (const source of props.sources) {
    map.set(source.id, source.title);
  }
  return map;
});

function usedBy(id: string): string {
  const report = props.revision;
  if (!report) return '暂无反向引用';
  return (
    [
      ...report.features.map((item) => ({
        ids: item.sourceEvidenceIds,
        title: item.title,
      })),
      ...report.personas.map((item) => ({
        ids: item.sourceEvidenceIds,
        title: item.name,
      })),
      ...report.painPoints.map((item) => ({
        ids: item.sourceEvidenceIds,
        title: item.painPoint,
      })),
      ...report.valueAngleSeeds.map((seed) => ({
        title: seed.title,
        ids: [
          ...report.features
            .filter((feature) => seed.relatedFeatureIds.includes(feature.id))
            .flatMap((feature) => feature.sourceEvidenceIds),
          ...report.painPoints
            .filter((pain) => seed.relatedPainPointIds.includes(pain.id))
            .flatMap((pain) => pain.sourceEvidenceIds),
        ],
      })),
    ]
      .filter((item) => item.ids.includes(id))
      .map((item) => item.title)
      .join('、') || '暂无引用'
  );
}

function linkedAsset(item: EvidenceRef) {
  const assetId =
    item.screenshotAssetId ||
    props.sources.find((source) => source.id === item.sourceId)?.assetId;
  return props.assets?.find((asset) => asset.id === assetId);
}
function webUrl(sourceId: string) {
  const url = props.sources.find(
    (source) => source.id === sourceId,
  )?.referenceUrl;
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}
function sourceName(id: string) {
  return sourceTitle.value.get(id) ?? id;
}

function addedByLabel(addedBy: 'mock_agent' | 'user') {
  return addedBy === 'user' ? '用户补充' : 'Mock Agent';
}
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <ElDrawer
    :model-value="props.open"
    :title="props.title || '证据来源'"
    size="420px"
    @update:model-value="(value: boolean) => emit('update:open', value)"
  >
    <p v-if="props.evidence.length === 0" class="vc-evidence__weak">
      当前没有可展示的证据；请在资料采集页补充来源。
    </p>
    <ul v-else class="vc-evidence__list">
      <li v-for="item in props.evidence" :key="item.id">
        <div class="vc-evidence__head">
          <strong>{{ item.title }}</strong>
          <ElTag
            :type="EVIDENCE_TAG_TYPES[item.level]"
            effect="plain"
            size="small"
          >
            {{ EVIDENCE_LABELS[item.level] }}
          </ElTag>
        </div>
        <a
          v-if="webUrl(item.sourceId)"
          :href="webUrl(item.sourceId)"
          target="_blank"
          rel="noopener noreferrer"
          >打开来源网页 ↗</a
        >
        <AssetPreview
          v-if="linkedAsset(item)"
          :asset="linkedAsset(item)!"
          :start="item.timeStartSec"
          :end="item.timeEndSec"
          :summary="item.excerpt"
        />
        <p
          v-else-if="!sources.some((source) => source.id === item.sourceId)"
          role="status"
        >
          原来源已删除，历史引用保留；请补充资料后重新审核。
        </p>
        <p class="vc-evidence__excerpt">{{ item.excerpt }}</p>
        <p class="vc-evidence__meta">引用此证据：{{ usedBy(item.id) }}</p>
        <details>
          <summary>查看来源摘要</summary>
          <p>
            {{
              sources.find((source) => source.id === item.sourceId)?.summary ||
              '暂无来源摘要，请到资料页补充'
            }}
          </p>
          <p>
            {{
              sources.find((source) => source.id === item.sourceId)
                ?.referenceUrl
            }}
          </p>
        </details>
        <p class="vc-evidence__meta">
          来源：{{ sourceName(item.sourceId) }}
          <span v-if="item.pageNo"> · 第 {{ item.pageNo }} 页</span>
          <span v-if="item.timeStartSec !== undefined">
            · {{ item.timeStartSec }}s–{{ item.timeEndSec }}s
          </span>
          <span>· {{ addedByLabel(item.addedBy) }}</span>
        </p>
      </li>
    </ul>
    <p class="vc-evidence__weak">
      证据来自 Mock
      固定资料或当前会话上传的元数据；不会真实抓取网站或解析文件内容。
    </p>
  </ElDrawer>
</template>

<style scoped>
.vc-evidence__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.vc-evidence__head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.vc-evidence__excerpt {
  padding: 8px;
  margin: 6px 0;
  font-size: 12px;
  line-height: 1.7;
  background: #faf9ff;
  border-radius: 6px;
}

.vc-evidence__meta,
.vc-evidence__weak {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vc-text-weak);
}

.vc-evidence__weak {
  margin-top: 12px;
}
</style>
