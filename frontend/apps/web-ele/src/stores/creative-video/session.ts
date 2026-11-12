import type { DemoRole, ServiceHealth } from '#/types/creative-video';

import { computed, ref } from 'vue';

import { useUserStore } from '@vben/stores';

import { defineStore } from 'pinia';

import {
  getServiceHealth,
  listDemoRoles,
  resetDemoProjects,
} from '#/api/creative-video';

/**
 * M0 演示会话状态：角色、Mock 标识与服务健康。
 * 只保存跨页面可见的演示状态，不保存任何真实凭据。
 */
export const useCreativeVideoSessionStore = defineStore(
  'creative-video-session',
  () => {
    const userStore = useUserStore();

    /** 编译期 Mock 开关（VITE_APP_MOCK_BUSINESS），仅开发环境生效 */
    const isMockEnv =
      import.meta.env.DEV && import.meta.env.VITE_APP_MOCK_BUSINESS === 'true';

    const health = ref<null | ServiceHealth>(null);
    const healthError = ref('');
    const healthLoading = ref(false);
    const demoRoles = ref<DemoRole[]>([]);
    const rolesLoading = ref(false);
    const resetting = ref(false);
    const lastResetAt = ref('');

    /** 服务端模式：避免把编译环境当成唯一事实源 */
    const serverMode = computed(
      () => health.value?.capabilities.mode ?? 'UNKNOWN',
    );

    const isMockMode = computed(() => isMockEnv || serverMode.value === 'MOCK');

    const currentRole = computed(
      () => userStore.userInfo?.roles?.[0] ?? 'unknown',
    );

    async function checkHealth() {
      healthLoading.value = true;
      healthError.value = '';
      try {
        health.value = await getServiceHealth();
        return health.value;
      } catch (error) {
        health.value = null;
        healthError.value =
          error instanceof Error ? error.message : 'Mock 服务不可用';
        throw error;
      } finally {
        healthLoading.value = false;
      }
    }

    async function loadDemoRoles() {
      if (demoRoles.value.length > 0) {
        return demoRoles.value;
      }
      rolesLoading.value = true;
      try {
        demoRoles.value = await listDemoRoles();
        return demoRoles.value;
      } finally {
        rolesLoading.value = false;
      }
    }

    async function restoreDemoSeed() {
      resetting.value = true;
      try {
        const result = await resetDemoProjects();
        lastResetAt.value = result.resetAt;
        return result;
      } finally {
        resetting.value = false;
      }
    }

    function $reset() {
      health.value = null;
      healthError.value = '';
      healthLoading.value = false;
      rolesLoading.value = false;
      resetting.value = false;
      lastResetAt.value = '';
    }

    return {
      $reset,
      checkHealth,
      currentRole,
      demoRoles,
      health,
      healthError,
      healthLoading,
      isMockMode,
      isMockEnv,
      lastResetAt,
      loadDemoRoles,
      restoreDemoSeed,
      rolesLoading,
      serverMode,
    };
  },
);
