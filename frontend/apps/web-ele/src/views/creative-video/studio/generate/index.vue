<script lang="ts" setup>
import type { M2Handoff, VideoProject } from '#/types/creative-video';

import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import {
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElTag,
} from 'element-plus';

import { getM2Handoff } from '#/api/creative-video';
import GuardNotice from '#/components/creative-video/m2/GuardNotice.vue';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';

defineOptions({ name: 'VidCraftStudioGenerate' });

const props = defineProps<{ project?: null | VideoProject }>();
const route = useRoute();
const projectId = computed(() => String(route.params.id ?? ''));
const loading = ref(true);
const errorMessage = ref('');
const handoff = ref<M2Handoff | null>(null);

onMounted(async () => {
  loading.value = true;
  try {
    handoff.value = await getM2Handoff(projectId.value);
  } catch (error) {
    errorMessage.value = friendlyErrorMessage(error);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <div class="vc-m2-page">
    <div v-if="loading" class="vc-m2-loading">正在检查预演交接…</div>

    <GuardNotice
      v-else-if="!handoff"
      description="M3 单镜头视频生成只能基于已确认的预演快照。请先完成 15/15 镜头审核与预演确认。"
      label="去确认预演"
      title="还没有可进入 M3 的已确认预演"
      :to="`/studio/${projectId}/animatic`"
    />

    <section v-else class="vc-card vc-m3">
      <p class="vc-m2-eyebrow">S7 · 镜头视频生成（M3 占位）</p>
      <h1>M2 已完成交接</h1>
      <p class="vc-m2-sub">
        当前项目：{{ props.project?.title }} · 本页只展示 M3
        契约，不调用真实视频模型、不冻结积分。
      </p>
      <ElTag type="success">AnimaticSnapshot 已确认</ElTag>
      <ElTag :type="handoff.canEnterM3 ? 'success' : 'danger'" class="ml-2">
        {{ handoff.canEnterM3 ? '当前可进入 M3 准备' : '仍有阻塞项' }}
      </ElTag>
      <ElTag class="ml-2" type="info">
        {{ handoff.effectiveValidity ?? 'CURRENT' }}
      </ElTag>
      <ul v-if="handoff.m3BlockingItems?.length" class="vc-m3__blocking">
        <li v-for="item in handoff.m3BlockingItems" :key="item.key">
          {{ item.label }}：{{ item.reason }}
        </li>
      </ul>
      <p v-if="handoff.claimReadiness?.length" class="vc-m2-muted">
        宣称可用性：
        {{
          handoff.claimReadiness
            .map((item) => `${item.claimAnchorId}=${item.status}`)
            .join(' · ')
        }}
      </p>

      <ElDescriptions :column="2" border class="vc-m3__desc">
        <ElDescriptionsItem label="预演快照">
          {{ handoff.approvedAnimaticSnapshotId }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="剧本版本">
          {{ handoff.approvedScriptRevisionId }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="分镜集合">
          {{ handoff.approvedStoryboardRevisionId }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="视觉规范">
          {{ handoff.approvedVisualBibleVersionId }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="创意方案">
          {{ handoff.approvedConceptRevisionId }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="目标时长">
          {{ handoff.targetDurationMs / 1000 }}s
        </ElDescriptionsItem>
        <ElDescriptionsItem label="画幅 / 平台">
          {{ handoff.aspectRatio }} /
          {{ handoff.platform }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="镜头数">
          {{ handoff.orderedApprovedShotRevisionIds.length }}
        </ElDescriptionsItem>
      </ElDescriptions>

      <h3>M3 需要读取的镜头顺序</h3>
      <ol class="vc-m3__shots">
        <li v-for="id in handoff.orderedApprovedShotRevisionIds" :key="id">
          {{ id }}
        </li>
      </ol>

      <details>
        <summary>查看交接 JSON</summary>
        <pre>{{ JSON.stringify(handoff, null, 2) }}</pre>
      </details>

      <p class="vc-m2-muted">
        M3 才能发起单镜头视频生成、版本候选与模拟积分冻结；M2 不产生任何费用。
      </p>
      <ElButton @click="$router.push(`/studio/${projectId}/animatic`)">
        返回预演
      </ElButton>
    </section>
  </div>
</template>

<style scoped>
.vc-m2-page {
  padding-bottom: 48px;
}

.vc-m3 {
  max-width: 960px;
  margin: 20px auto;
}

.vc-m3 h1 {
  margin: 4px 0 6px;
  font-size: 26px;
}

.vc-m3__blocking {
  margin: 8px 0;
  font-size: 12px;
  color: var(--el-color-danger);
}

.vc-m3__desc {
  margin: 16px 0;
}

.vc-m3__shots {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px 16px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
}

.vc-m2-eyebrow {
  margin: 0;
  font-size: 12px;
  color: var(--el-color-primary);
  letter-spacing: 0.08em;
}

.vc-m2-sub,
.vc-m2-muted {
  font-size: 12px;
  color: var(--vc-text-weak);
}

pre {
  max-height: 300px;
  padding: 12px;
  overflow: auto;
  font-size: 11px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}
</style>
