<script lang="ts" setup>
import { ElSkeleton } from 'element-plus';

interface Props {
  rows?: number;
  text?: string;
}

withDefaults(defineProps<Props>(), {
  rows: 4,
  text: '',
});
</script>

<template>
  <div class="vc-loading" role="status" aria-live="polite">
    <ElSkeleton :rows="rows" animated />
    <p class="vc-loading__text">{{ text || $t('vidcraft.states.loading') }}</p>
  </div>
</template>

<style scoped>
.vc-loading {
  padding: 12px 4px;
}

.vc-loading__text {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--vc-text-weak);
  text-align: center;
}
</style>
