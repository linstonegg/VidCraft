import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

/**
 * 把 M2 Mock 任务 ID 同步到 URL query，刷新页面后继续轮询。
 * 任务结果由服务端权威保存，不依赖浏览器定时器。
 */
export function useM2JobId() {
  const route = useRoute();
  const router = useRouter();
  const jobId = ref<null | string>(
    typeof route.query.jobId === 'string' ? route.query.jobId : null,
  );

  function setJob(id: string) {
    jobId.value = id;
    void router.replace({
      query: { ...route.query, jobId: id },
    });
  }

  function clearJob() {
    jobId.value = null;
    if (route.query.jobId) {
      const query = { ...route.query };
      delete query.jobId;
      void router.replace({ query });
    }
  }

  return { clearJob, jobId, setJob };
}
