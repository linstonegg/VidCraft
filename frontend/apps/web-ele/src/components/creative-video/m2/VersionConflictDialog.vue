<script lang="ts" setup>
import { computed } from 'vue';

import { ElAlert, ElButton, ElDialog } from 'element-plus';

export interface ConflictField {
  label: string;
  latest: string;
  local: string;
}

const props = withDefaults(
  defineProps<{
    busy?: boolean;
    canKeep?: boolean;
    fields: ConflictField[];
    open: boolean;
    title?: string;
  }>(),
  {
    busy: false,
    canKeep: true,
    title: '版本冲突',
  },
);

const emit = defineEmits<{
  fork: [];
  keep: [];
  latest: [];
  'update:open': [value: boolean];
}>();

const changed = computed(() =>
  props.fields.filter((field) => field.local !== field.latest),
);
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <ElDialog
    :model-value="open"
    :title="title"
    width="680px"
    @update:model-value="emit('update:open', $event)"
  >
    <ElAlert
      :closable="false"
      show-icon
      title="服务端已有更新版本，页面没有静默覆盖你的修改。请选择如何处理。"
      type="warning"
    />

    <p class="vc-conflict__summary">
      {{ changed.length }} 个字段不同 · 本地修改仍保留在弹窗中
    </p>

    <table class="vc-conflict__table">
      <thead>
        <tr>
          <th>字段</th>
          <th>我的编辑（未保存）</th>
          <th>服务端最新</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="field in fields" :key="field.label">
          <td>{{ field.label }}</td>
          <td :class="{ 'is-different': field.local !== field.latest }">
            {{ field.local }}
          </td>
          <td :class="{ 'is-different': field.local !== field.latest }">
            {{ field.latest }}
          </td>
        </tr>
      </tbody>
    </table>

    <p v-if="!canKeep" class="vc-conflict__note">
      服务端最新版本已经审核通过，不能直接覆盖；请选择“另存为新草稿”或查看最新版本。
    </p>

    <template #footer>
      <div class="vc-conflict__actions">
        <ElButton :loading="busy" @click="emit('latest')"
          >查看最新版本</ElButton
        >
        <ElButton :disabled="!canKeep" :loading="busy" @click="emit('keep')">
          保留我的编辑
        </ElButton>
        <ElButton :loading="busy" type="primary" @click="emit('fork')">
          另存为新草稿
        </ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<style scoped>
.vc-conflict__summary {
  margin: 12px 0 6px;
  font-size: 12px;
  color: var(--vc-text-weak);
}

.vc-conflict__table {
  width: 100%;
  font-size: 12px;
  border-collapse: collapse;
}

.vc-conflict__table th,
.vc-conflict__table td {
  padding: 8px;
  vertical-align: top;
  text-align: left;
  border-bottom: 1px solid var(--vc-border);
}

.vc-conflict__table th {
  color: var(--vc-text-weak);
  background: var(--el-fill-color-lighter);
}

.vc-conflict__table td.is-different {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.vc-conflict__note {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--el-color-warning);
}

.vc-conflict__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
