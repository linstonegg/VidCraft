<script lang="ts" setup>
interface Props {
  description?: string;
  title: string;
}

withDefaults(defineProps<Props>(), {
  description: '',
});
</script>

<template>
  <section class="vc-empty">
    <div class="vc-empty__mark" aria-hidden="true">▢</div>
    <h3 class="vc-empty__title">{{ title }}</h3>
    <p v-if="description" class="vc-empty__desc">{{ description }}</p>
    <div v-if="$slots.default" class="vc-empty-actions">
      <slot></slot>
    </div>
  </section>
</template>

<style scoped>
.vc-empty {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding: 36px 16px;
  text-align: center;
  border: 1px dashed var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-empty__mark {
  font-size: 28px;
  line-height: 1;
  color: var(--vc-brand);
  opacity: 0.5;
}

.vc-empty__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-empty__desc {
  max-width: 460px;
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--vc-text-weak);
}
</style>
