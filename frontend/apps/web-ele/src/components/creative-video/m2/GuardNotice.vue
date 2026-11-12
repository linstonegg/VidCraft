<script lang="ts" setup>
import { ElButton } from 'element-plus';

defineProps<{
  description: string;
  label?: string;
  title: string;
  to: string;
}>();
</script>

<template>
  <section class="vc-m2-guard vc-card">
    <div class="vc-m2-guard__badge">M2 · 前置条件</div>
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
    <ElButton type="primary" @click="$router.push(to)">
      {{ label ?? '前往前置步骤' }}
    </ElButton>
  </section>
</template>

<style scoped>
.vc-m2-guard {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
  max-width: 720px;
  padding: 32px;
  margin: 40px auto;
}

.vc-m2-guard__badge {
  padding: 2px 10px;
  font-size: 12px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 999px;
}

.vc-m2-guard h2 {
  margin: 0;
  font-size: 22px;
}

.vc-m2-guard p {
  margin: 0;
  line-height: 1.7;
  color: var(--vc-text-weak);
}
</style>
