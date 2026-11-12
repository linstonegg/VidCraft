import type { Ref } from 'vue';

import { onBeforeUnmount, onMounted, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';

import { ElMessageBox } from 'element-plus';

/**
 * 未保存修改提示：路由离开 + 浏览器关闭。
 * 只比较本地表单快照，不代表服务端已保存。
 */
export function useUnsavedChanges(
  dirty: Ref<boolean>,
  message = '有未保存修改，确定离开？',
) {
  async function confirmLeave() {
    if (!dirty.value) {
      return true;
    }
    try {
      await ElMessageBox.confirm(message, '未保存的修改', {
        cancelButtonText: '继续编辑',
        confirmButtonText: '放弃修改并离开',
        type: 'warning',
      });
      return true;
    } catch {
      return false;
    }
  }

  function beforeUnload(event: BeforeUnloadEvent) {
    if (!dirty.value) {
      return;
    }
    event.preventDefault();
    event.returnValue = '';
  }

  onBeforeRouteLeave(async () => {
    return await confirmLeave();
  });

  onMounted(() => {
    window.addEventListener('beforeunload', beforeUnload);
  });
  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', beforeUnload);
  });

  watch(dirty, (value) => {
    if (value) {
      window.addEventListener('beforeunload', beforeUnload);
    } else {
      window.removeEventListener('beforeunload', beforeUnload);
    }
  });

  return { confirmLeave };
}
