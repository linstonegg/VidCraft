<script lang="ts" setup>
import type { ProductionReadiness } from '#/types/creative-video';

import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { ElButton, ElTag } from 'element-plus';

import { getProductionReadiness } from '#/api/creative-video';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';

const props = defineProps<{ projectId: string }>();
const router = useRouter();
const loading = ref(false);
const open = ref(false);
const error = ref('');
const readiness = ref<null | ProductionReadiness>(null);

const statusType: Record<string, 'danger' | 'info' | 'success' | 'warning'> = {
  BLOCKED: 'danger',
  FUTURE: 'info',
  NOT_APPLICABLE: 'info',
  PASS: 'success',
  WARN: 'warning',
};

async function load() {
  loading.value = true;
  error.value = '';
  try {
    readiness.value = await getProductionReadiness(props.projectId);
  } catch (error_) {
    error.value = friendlyErrorMessage(error_);
  } finally {
    loading.value = false;
  }
}

function go(route?: string) {
  if (route) void router.push(route);
}

onMounted(load);
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <section class="vc-card vc-readiness">
    <header class="vc-readiness__head">
      <div>
        <strong>M3 制作就绪度</strong>
        <p class="vc-m2-muted">
          只读派生自当前正式版本链；进入 M3 不等于付费。
          <template v-if="readiness">
            · {{ readiness.storyboardRevisionId ?? '无分镜' }} ·
            {{ readiness.animaticSnapshotId ?? '无预演' }}
          </template>
        </p>
      </div>
      <div class="vc-readiness__actions">
        <ElTag
          v-if="readiness"
          :type="readiness.canEnterM3 ? 'success' : 'danger'"
        >
          {{ readiness.canEnterM3 ? '可进入 M3 准备' : '暂不可进入' }}
        </ElTag>
        <ElTag v-if="readiness" type="info">
          {{ readiness.effectiveValidity }}
        </ElTag>
        <ElButton :loading="loading" size="small" text @click="load">
          重新检查
        </ElButton>
        <ElButton size="small" text @click="open = !open">
          {{ open ? '收起' : '查看明细' }}
        </ElButton>
      </div>
    </header>

    <p v-if="error" class="vc-m2-blocked">{{ error }}</p>
    <ul v-else-if="open && readiness" class="vc-readiness__list">
      <li v-for="item in readiness.items" :key="item.key">
        <ElTag :type="statusType[item.status] ?? 'info'" size="small">
          {{ item.status }}
        </ElTag>
        <div>
          <strong>{{ item.label }}</strong>
          <p v-if="item.reason">{{ item.reason }}</p>
          <p v-if="item.affectedShotIds?.length" class="vc-readiness__ids">
            镜头：{{ item.affectedShotIds.join('、') }}
          </p>
        </div>
        <ElButton
          v-if="
            item.actionRoute &&
            item.status !== 'PASS' &&
            item.status !== 'FUTURE'
          "
          size="small"
          text
          @click="go(item.actionRoute)"
        >
          去处理
        </ElButton>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.vc-readiness {
  margin-top: 12px;
}

.vc-readiness__head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.vc-readiness__head p {
  margin: 2px 0 0;
  font-size: 12px;
}

.vc-readiness__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  justify-content: flex-end;
}

.vc-readiness__list {
  padding: 0;
  margin: 10px 0 0;
  list-style: none;
}

.vc-readiness__list li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 8px 0;
  font-size: 12px;
  border-top: 1px solid var(--vc-border);
}

.vc-readiness__list li > div {
  flex: 1;
}

.vc-readiness__list p {
  margin: 2px 0 0;
  color: var(--vc-text-weak);
}

.vc-readiness__ids {
  font-family: ui-monospace, monospace;
  font-size: 10px;
}
</style>
