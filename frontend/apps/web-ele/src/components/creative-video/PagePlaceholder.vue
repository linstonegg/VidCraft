<script lang="ts" setup>
interface Props {
  /** 右上角标记，例如 “M0 占位” */
  badge?: string;
  description?: string;
  title: string;
  /** 计划承接的说明，避免伪造可用按钮 */
  tips?: string[];
}

withDefaults(defineProps<Props>(), {
  badge: '',
  description: '',
  tips: () => [],
});
</script>

<template>
  <section class="vc-card vc-placeholder">
    <header class="vc-placeholder__head">
      <span v-if="badge" class="vc-chip">{{ badge }}</span>
      <h2 class="vc-placeholder__title">{{ title }}</h2>
    </header>
    <p v-if="description" class="vc-placeholder__desc">{{ description }}</p>
    <ul v-if="tips.length > 0" class="vc-placeholder__tips">
      <li v-for="tip in tips" :key="tip">{{ tip }}</li>
    </ul>
    <footer v-if="$slots.default" class="vc-placeholder__footer">
      <slot></slot>
    </footer>
  </section>
</template>

<style scoped>
.vc-placeholder {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
  min-height: 220px;
}

.vc-placeholder__head {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.vc-placeholder__title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-placeholder__desc {
  max-width: 720px;
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vc-text-weak);
}

.vc-placeholder__tips {
  padding-left: 18px;
  margin: 0;
  font-size: 12px;
  line-height: 1.9;
  color: var(--vc-text-weak);
}

.vc-placeholder__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}
</style>
