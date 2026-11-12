<script lang="ts" setup>
import type { SourceCoverageItem } from '#/types/creative-video';

import { ElTag } from 'element-plus';

import {
  COVERAGE_LABELS,
  COVERAGE_TAG_TYPES,
} from '#/utils/creative-video/project-stage';

defineProps<{ coverage: SourceCoverageItem[] }>();
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <section class="vc-coverage">
    <h3 class="vc-coverage__title">资料覆盖度</h3>
    <p class="vc-coverage__weak">
      以项目已知信息为准，而不是文件数量。缺失项不阻止分析，但会降低报告置信度。
    </p>
    <ul class="vc-coverage__list">
      <li v-for="item in coverage" :key="item.code">
        <span class="vc-coverage__label">{{ item.label }}</span>
        <ElTag
          :type="COVERAGE_TAG_TYPES[item.status]"
          effect="plain"
          size="small"
        >
          {{ COVERAGE_LABELS[item.status] }}
        </ElTag>
        <span v-if="item.explanation" class="vc-coverage__hint">{{
          item.explanation
        }}</span>
      </li>
    </ul>
    <slot></slot>
  </section>
</template>

<style scoped>
.vc-coverage__title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-coverage__weak {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vc-text-weak);
}

.vc-coverage__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.vc-coverage__list li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 8px;
  align-items: center;
  padding: 10px 12px;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid transparent;
  border-radius: 10px;
}

.vc-coverage__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-coverage__hint {
  grid-column: 1 / -1;
  font-size: 12px;
  line-height: 1.5;
  color: var(--vc-text-weak);
}
</style>
