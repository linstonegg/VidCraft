<script lang="ts" setup>
import { ref } from 'vue';

import {
  ElButton,
  ElDialog,
  ElMessage,
  ElRadio,
  ElRadioGroup,
  ElTag,
} from 'element-plus';

import { useCreativeVideoIngestionStore } from '#/stores/creative-video';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{
  done: [];
  'update:open': [value: boolean];
}>();

const store = useCreativeVideoIngestionStore();
const scenario = ref('AUTH_SUCCESS');
const submitting = ref(false);

const scenarios = [
  ['AUTH_SUCCESS', '授权成功（只读 30 分钟）'],
  ['MFA_REQUIRED', '需要 MFA'],
  ['ACCESS_DENIED', '权限不足'],
  ['SESSION_EXPIRED', '会话已过期'],
  ['NO_DEMO_DATA', '没有演示数据'],
];

async function submit() {
  submitting.value = true;
  try {
    await store.startDemoSession(scenario.value);
    ElMessage.success('模拟授权结果已写入会话摘要（不涉及真实账号）');
    emit('update:open', false);
    emit('done');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    submitting.value = false;
  }
}

function close() {
  emit('update:open', false);
}
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <ElDialog
    :model-value="props.open"
    title="打开演示环境授权（模拟）"
    width="560px"
    @update:model-value="(value: boolean) => emit('update:open', value)"
  >
    <div class="vc-demo-auth">
      <ElTag type="warning" effect="light">Mock 授权演示</ElTag>
      <p>
        这是演示用的模拟授权，<strong>不会连接或登录真实网站</strong>，不会保存密码、Cookie
        或 Token。 真实系统未来会在隔离浏览器会话中处理凭据。
      </p>
      <ul>
        <li>只读示例账号：<code>demo_viewer</code></li>
        <li>授权范围：域名白名单、只读访问</li>
        <li>禁止操作：删除、付款、导出客户数据</li>
      </ul>
      <ElRadioGroup v-model="scenario" class="vc-demo-auth__scenarios">
        <ElRadio v-for="item in scenarios" :key="item[0]" :value="item[0]">
          {{ item[1] }}
        </ElRadio>
      </ElRadioGroup>
      <p class="vc-demo-auth__weak">
        选择不同场景可以演示 MFA、权限不足、过期与没有演示数据；这些只是 Mock
        状态，不代表真实授权结果。
      </p>
    </div>
    <template #footer>
      <ElButton @click="close">取消</ElButton>
      <ElButton :loading="submitting" type="primary" @click="submit">
        模拟授权
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.vc-demo-auth {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  line-height: 1.7;
}

.vc-demo-auth p {
  margin: 0;
}

.vc-demo-auth ul {
  padding-left: 18px;
  margin: 0;
  color: var(--vc-text-weak);
}

.vc-demo-auth__scenarios {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}

.vc-demo-auth__weak {
  font-size: 12px;
  color: var(--vc-text-weak);
}
</style>
