<script lang="ts" setup>
import type { StaleImpactItem } from '#/api/creative-video/projects';

import { useRouter } from 'vue-router';

import { ElAlert, ElButton, ElDrawer, ElTag } from 'element-plus';

defineProps<{
  items: StaleImpactItem[];
  loading?: boolean;
  open: boolean;
  summary?: string;
}>();
const emit = defineEmits<{ 'update:open': [value: boolean] }>();
const router = useRouter();

const stageTagType: Record<string, 'info' | 'success' | 'warning'> = {
  创意方向: 'warning',
  创意故事: 'warning',
  分镜: 'info',
  剧本: 'warning',
  视觉规范: 'info',
  预演: 'warning',
};

function go(item: StaleImpactItem) {
  emit('update:open', false);
  void router.push(item.link);
}
</script>

<template>
  <ElDrawer
    :model-value="open"
    title="失效影响详情"
    size="520px"
    @update:model-value="emit('update:open', $event)"
  >
    <ElAlert
      :closable="false"
      show-icon
      :title="summary || '上游已变化，以下产物需要复核。'"
      type="warning"
    />
    <p class="vc-stale__hint">
      旧已批准版本仍保留，可只读查看；但不能再作为 M3 的最新输入。
    </p>
    <ul v-if="items.length > 0" class="vc-stale__list">
      <li v-for="item in items" :key="item.id">
        <div class="vc-stale__head">
          <ElTag :type="stageTagType[item.stage] ?? 'info'" size="small">
            {{ item.stage }}
          </ElTag>
          <strong>{{ item.title }}</strong>
          <span class="vc-stale__version">v{{ item.version ?? '—' }}</span>
        </div>
        <p>{{ item.reason }}</p>
        <ElButton size="small" text @click="go(item)">去处理</ElButton>
      </li>
    </ul>
    <p v-else class="vc-stale__empty">当前没有可定位的失效对象。</p>
    <template #footer>
      <ElButton @click="emit('update:open', false)">继续查看旧版本</ElButton>
    </template>
  </ElDrawer>
</template>

<style scoped>
.vc-stale__hint {
  margin: 10px 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vc-text-weak);
}

.vc-stale__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.vc-stale__list li {
  padding: 10px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.vc-stale__head {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
}

.vc-stale__version {
  margin-left: auto;
  font-family: ui-monospace, monospace;
  font-size: 10px;
  color: var(--vc-text-weak);
}

.vc-stale__list p {
  margin: 6px 0 2px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--vc-text-weak);
}

.vc-stale__empty {
  margin-top: 16px;
  color: var(--vc-text-weak);
}
</style>
