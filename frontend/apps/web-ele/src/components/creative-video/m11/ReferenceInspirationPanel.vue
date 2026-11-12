<script lang="ts" setup>
import type { ReferenceAdInsight } from '#/types/creative-video';

import { computed, onMounted, ref, watch } from 'vue';

import { ElAlert, ElOption, ElSelect, ElTag } from 'element-plus';

import { listReferenceAdInsights } from '#/api/creative-video';

const props = defineProps<{
  projectId: string;
  selectedInsightId?: string;
}>();
const emit = defineEmits<{ selectInsight: [insightId: string] }>();
const insights = ref<ReferenceAdInsight[]>([]);
const selectedId = ref('');
const loading = ref(false);

const selected = computed(
  () => insights.value.find((item) => item.id === selectedId.value) ?? null,
);

onMounted(async () => {
  loading.value = true;
  try {
    insights.value = await listReferenceAdInsights(props.projectId);
    selectedId.value = props.selectedInsightId ?? insights.value[0]?.id ?? '';
  } catch {
    insights.value = [];
  } finally {
    loading.value = false;
  }
});

watch(selectedId, (value) => {
  if (value) emit('selectInsight', value);
});
</script>

<template>
  <section v-if="insights.length > 0" class="vc-card vc-reference-language">
    <header>
      <div>
        <h3>参考创意语言（可选）</h3>
        <p class="vc-m2-muted">
          只读取同一份 ReferenceAdInsight 的抽象规律；不会改写产品事实或镜头。
        </p>
      </div>
      <ElTag type="warning">仅灵感</ElTag>
    </header>
    <ElSelect
      v-model="selectedId"
      :loading="loading"
      placeholder="选择参考广告洞察"
      style="width: 100%"
    >
      <ElOption
        v-for="insight in insights"
        :key="insight.id"
        :label="insight.title"
        :value="insight.id"
      />
    </ElSelect>
    <template v-if="selected">
      <div class="vc-reference-language__patterns">
        <span v-for="pattern in selected.patterns" :key="pattern.key">
          <strong>{{ pattern.label }}</strong> {{ pattern.value }}
        </span>
      </div>
      <ul>
        <li v-for="item in selected.abstractLanguage" :key="item">
          {{ item }}
        </li>
      </ul>
      <ElAlert
        :closable="false"
        show-icon
        title="参考广告不能作为产品证据；采用前仍需用当前产品的真实资料确认。"
        type="info"
      />
    </template>
  </section>
</template>

<style scoped>
.vc-reference-language {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.vc-reference-language header {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  justify-content: space-between;
}

.vc-reference-language h3 {
  margin: 0;
  font-size: 14px;
}

.vc-reference-language ul {
  padding-left: 18px;
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
}

.vc-reference-language__patterns {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.vc-reference-language__patterns span {
  padding: 4px 8px;
  font-size: 11px;
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
}

.vc-reference-language__patterns strong {
  color: var(--el-color-primary);
}
</style>
