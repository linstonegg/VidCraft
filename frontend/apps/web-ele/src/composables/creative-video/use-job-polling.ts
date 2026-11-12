import type { Ref } from 'vue';

import type { MockJob } from '#/types/creative-video';

import { onScopeDispose, ref, watch } from 'vue';

import { getJob } from '#/api/creative-video';

/**
 * Mock 任务轮询：800～1500ms，终态自动停止，页面卸载自动清理。
 * 任务状态由 Mock 服务端推进，刷新页面后可用 jobId 恢复。
 */
export function useJobPolling(
  jobId: Ref<null | string>,
  options: {
    intervalMs?: number;
    onTerminal?: (job: MockJob) => Promise<void> | void;
  } = {},
) {
  const intervalMs = options.intervalMs ?? 1000;
  const job = ref<MockJob | null>(null);
  const polling = ref(false);
  const errorMessage = ref('');
  let timer: null | ReturnType<typeof setTimeout> = null;
  let disposed = false;

  function stop() {
    polling.value = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  async function poll(id: string) {
    if (disposed) {
      return;
    }
    try {
      const result = await getJob(id);
      if (disposed || jobId.value !== id) return;
      job.value = result;
      errorMessage.value = '';
      if (['CANCELLED', 'FAILED', 'SUCCEEDED'].includes(result.status)) {
        stop();
        await options.onTerminal?.(result);
        return;
      }
    } catch (error) {
      errorMessage.value =
        error instanceof Error ? error.message : '任务状态查询失败';
    }
    if (!disposed) {
      timer = setTimeout(() => poll(id), intervalMs);
    }
  }

  function start(id: string) {
    stop();
    polling.value = true;
    void poll(id);
  }

  watch(
    jobId,
    (value) => {
      if (value) {
        start(value);
      } else {
        stop();
        job.value = null;
      }
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    disposed = true;
    stop();
  });

  return { errorMessage, job, polling, start, stop };
}
