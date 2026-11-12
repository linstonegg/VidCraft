<script lang="ts" setup>
import { ElAlert, ElButton } from 'element-plus';

interface Props {
  /** 面向用户的错误说明（来自 friendlyErrorMessage） */
  message: string;
  retryText?: string;
  showRetry?: boolean;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  retryText: '',
  showRetry: true,
  title: '',
});

const emit = defineEmits<{ retry: [] }>();

function handleRetry() {
  emit('retry');
}
</script>

<template>
  <ElAlert
    :closable="false"
    :title="props.title || $t('vidcraft.states.errorTitle')"
    show-icon
    type="error"
  >
    <template #default>
      <p class="vc-error-message">{{ props.message }}</p>
      <div v-if="props.showRetry || $slots.default" class="vc-error-actions">
        <ElButton
          v-if="props.showRetry"
          size="small"
          type="primary"
          plain
          @click="handleRetry"
        >
          {{ props.retryText || $t('vidcraft.common.retry') }}
        </ElButton>
        <slot></slot>
      </div>
    </template>
  </ElAlert>
</template>

<style scoped>
.vc-error-message {
  margin: 0 0 8px;
  font-size: 12px;
  line-height: 1.6;
}

.vc-error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}
</style>
