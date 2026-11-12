<script lang="ts" setup>
import type { ProjectStage, VideoProject } from '#/types/creative-video';

import { computed } from 'vue';

import { ElTag } from 'element-plus';

import PagePlaceholder from '#/components/creative-video/PagePlaceholder.vue';
import { $t } from '#/locales';
import { formatDuration, PLATFORM_KEYS } from '#/utils/creative-video/format';
import {
  getStageByKey,
  PROJECT_STATUS_KEYS,
  PROJECT_STATUS_TYPES,
} from '#/utils/creative-video/stages';

const props = defineProps<{
  project?: null | VideoProject;
  stage: ProjectStage;
}>();

const definition = computed(() => getStageByKey(props.stage));

const title = computed(() => {
  const stageName = definition.value
    ? $t(definition.value.titleKey)
    : props.stage;
  return $t('vidcraft.placeholder.title', { stage: stageName });
});

const description = computed(() =>
  definition.value ? $t(definition.value.descriptionKey) : '',
);

const statusType = computed(() =>
  props.project ? PROJECT_STATUS_TYPES[props.project.status] : 'info',
);

const tips = computed(() => [
  `当前阶段只确认路由、布局与数据结构，不提供伪造的可用操作。`,
  `计划承接：${$t('vidcraft.placeholder.plannedMilestone')} 及后续里程碑。`,
  `真实数据将由业务 API 提供，页面禁止直接引用 Mock fixture。`,
]);
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <PagePlaceholder
    :badge="$t('vidcraft.placeholder.badge')"
    :description="description"
    :tips="tips"
    :title="title"
  >
    <div v-if="project" class="vc-stage-project">
      <span class="vc-stage-project__title">
        {{ $t('vidcraft.placeholder.projectLabel') }}：{{ project.title }}
      </span>
      <span class="vc-stage-project__meta">ID {{ project.id }}</span>
      <span class="vc-stage-project__meta">
        {{ $t('vidcraft.projectsPage.duration') }}
        {{ formatDuration(project.durationSec) }}
      </span>
      <span class="vc-stage-project__meta">
        {{ $t(PLATFORM_KEYS[project.platform]) }} · {{ project.aspectRatio }}
      </span>
      <ElTag :type="statusType" effect="light" size="small">
        {{ $t(PROJECT_STATUS_KEYS[project.status]) }}
      </ElTag>
    </div>
  </PagePlaceholder>
</template>

<style scoped>
.vc-stage-project {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--vc-text-weak);
  background: var(--cell-bg, #f8f8fb);
  border: 1px solid var(--vc-border);
  border-radius: 10px;
}

.vc-stage-project__title {
  font-weight: 600;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-stage-project__meta + .vc-stage-project__meta::before {
  margin-right: 10px;
  color: var(--vc-border);
  content: '|';
}
</style>
