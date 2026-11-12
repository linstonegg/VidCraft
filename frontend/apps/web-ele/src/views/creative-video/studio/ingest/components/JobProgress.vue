<script lang="ts" setup>
import type { MockJob } from '#/types/creative-video';

import { computed, ref } from 'vue';

import { ElButton, ElMessage, ElProgress, ElTag } from 'element-plus';

import { cancelJob } from '#/api/creative-video/jobs';
import { useProjectAccess } from '#/composables/creative-video/use-project-access';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';

const props = defineProps<{
  job: MockJob | null;
  title?: string;
}>();
const { canEdit } = useProjectAccess();
const cancelling = ref(false);
async function cancel() {
  if (!props.job) return;
  cancelling.value = true;
  try {
    await cancelJob(props.job.id);
    ElMessage.success('任务已取消');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    cancelling.value = false;
  }
}

const statusText = computed(() => {
  if (!props.job) {
    return '等待任务';
  }
  const map: Record<string, string> = {
    CANCELLED: '已取消',
    CREATED: '已创建',
    FAILED: '失败',
    QUEUED: '排队中',
    RUNNING: '运行中',
    SUCCEEDED: '已完成',
  };
  return map[props.job.status] ?? props.job.status;
});

const progressStatus = computed(() => {
  if (props.job?.status === 'FAILED') {
    return 'exception';
  }
  if (props.job?.status === 'SUCCEEDED') {
    return 'success';
  }
  return undefined;
});

const eventType = (status: string) => {
  if (status === 'SUCCEEDED') {
    return 'success';
  }
  if (status === 'FAILED') {
    return 'danger';
  }
  if (status === 'RUNNING') {
    return 'warning';
  }
  return 'info';
};
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <div v-if="job" class="vc-job">
    <div class="vc-job__head">
      <strong>{{ title || '模拟任务' }}</strong>
      <ElButton
        v-if="canEdit && ['CREATED', 'QUEUED', 'RUNNING'].includes(job.status)"
        :loading="cancelling"
        size="small"
        @click="cancel"
        >取消任务</ElButton
      >
      <ElTag
        :type="
          job.status === 'FAILED'
            ? 'danger'
            : job.status === 'SUCCEEDED'
              ? 'success'
              : 'primary'
        "
        size="small"
      >
        {{ statusText }}
      </ElTag>
    </div>
    <ElProgress
      :percentage="job.progress"
      :status="progressStatus"
      :stroke-width="8"
    />
    <p v-if="job.errorMessage" class="vc-job__error">{{ job.errorMessage }}</p>
    <ul class="vc-job__events">
      <li v-for="event in job.events" :key="event.code + event.at">
        <ElTag :type="eventType(event.status)" effect="plain" size="small">
          {{ event.status }}
        </ElTag>
        <span>{{ event.label }}</span>
      </li>
    </ul>
    <p class="vc-job__weak">
      任务状态保存在 Mock 服务端，刷新页面后可继续查询；这仍是演示数据，不是真实
      AI 处理。
    </p>
  </div>
</template>

<style scoped>
.vc-job {
  padding: 10px 12px;
  margin-top: 10px;
  background: var(--vc-brand-soft);
  border-radius: 10px;
}

.vc-job__head {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.vc-job__events {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  margin: 10px 0 0;
  list-style: none;
}

.vc-job__events li {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: var(--vc-text-weak);
}

.vc-job__error {
  margin: 8px 0 0;
  font-size: 12px;
  color: #cf1322;
}

.vc-job__weak {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--vc-text-weak);
}
</style>
