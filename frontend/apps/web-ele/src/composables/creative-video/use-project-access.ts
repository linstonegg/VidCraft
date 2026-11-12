import type { Ref } from 'vue';

import type { VideoProject } from '#/types/creative-video';

import { computed } from 'vue';

import { useUserStore } from '@vben/stores';

/** 前端按钮权限（服务端 Mock 仍会返回 403，二者同时生效） */
export function useProjectAccess(project?: Ref<null | VideoProject>) {
  const userStore = useUserStore();
  const roles = computed<string[]>(() => userStore.userInfo?.roles ?? []);
  const isOwner = computed(() => roles.value.includes('owner'));
  const isEditor = computed(() => roles.value.includes('editor'));
  const isReviewer = computed(() => roles.value.includes('reviewer'));
  const isAdmin = computed(() => roles.value.includes('admin'));

  const canCreate = computed(() => isOwner.value || isEditor.value);
  const canEdit = computed(
    () => (isOwner.value || isEditor.value) && !project?.value?.archivedAt,
  );
  const canManage = computed(() => isOwner.value);
  const canApprove = computed(
    () =>
      isOwner.value ||
      (isReviewer.value && Boolean(project?.value?.reviewerCanApprove)),
  );
  const readOnly = computed(() => !canEdit.value);

  return {
    canApprove,
    canCreate,
    canEdit,
    canManage,
    isAdmin,
    isEditor,
    isOwner,
    isReviewer,
    readOnly,
    roleCode: computed(() => roles.value[0] ?? 'viewer'),
  };
}
