import type {
  CanvasViewport,
  StudioPresentationPreference,
} from '#/types/creative-video';

import { computed, ref } from 'vue';

import { useUserStore } from '@vben/stores';

import {
  sanitizeCanvasPoint,
  sanitizeLayout,
} from '#/utils/creative-video/presentation';

export function usePresentationPreference(projectId: { value: string }) {
  const userStore = useUserStore();
  const userId = computed(() =>
    String(
      userStore.userInfo?.userId ??
        userStore.userInfo?.id ??
        userStore.userInfo?.username ??
        'demo',
    ),
  );
  const storageKey = computed(
    () => `vidcraft:presentation:${userId.value}:${projectId.value}`,
  );
  const preference = ref<StudioPresentationPreference>({
    projectId: projectId.value,
    storyboardViewMode: 'SHOT_DETAIL',
    userId: userId.value,
    viewMode: 'DIRECTOR',
  });

  function load() {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey.value);
      if (raw) {
        preference.value = {
          ...preference.value,
          ...JSON.parse(raw),
        };
      }
    } catch {
      // 损坏的本地布局偏好不应阻塞业务页面
    }
  }

  function save() {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        storageKey.value,
        JSON.stringify(preference.value),
      );
    } catch {
      // localStorage 不可用时静默降级为当前页面内存布局
    }
  }

  function contextKey(type: 'concepts' | 'storyboard', id: string) {
    return `${projectId.value}:${userId.value}:${type}:${id}`;
  }

  function getLayout(
    context: string,
  ): Record<string, { x: number; y: number }> {
    return sanitizeLayout(preference.value.layoutByContext?.[context]);
  }

  function setPoint(
    context: string,
    id: string,
    point: { x: number; y: number },
  ) {
    const layout = preference.value.layoutByContext ?? {};
    layout[context] = {
      ...layout[context],
      [id]: sanitizeCanvasPoint(point),
    };
    preference.value.layoutByContext = layout;
    save();
  }

  function getViewport(context: string): CanvasViewport | undefined {
    return preference.value.viewportByContext?.[context];
  }

  function setViewport(context: string, viewport: CanvasViewport) {
    const map = preference.value.viewportByContext ?? {};
    map[context] = viewport;
    preference.value.viewportByContext = map;
    save();
  }

  function update(patch: Partial<StudioPresentationPreference>) {
    preference.value = { ...preference.value, ...patch };
    save();
  }

  function reset() {
    preference.value = {
      projectId: projectId.value,
      storyboardViewMode: 'SHOT_DETAIL',
      userId: userId.value,
      viewMode: 'DIRECTOR',
    };
    save();
  }

  load();

  return {
    contextKey,
    getLayout,
    getViewport,
    preference,
    reset,
    setPoint,
    setViewport,
    update,
  };
}
