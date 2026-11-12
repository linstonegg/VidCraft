import { computed } from 'vue';

import { useCreativeVideoSessionStore } from '#/stores/creative-video';

/**
 * 演示模式判定：前端开关（VITE_APP_MOCK_BUSINESS）或服务端
 * capabilities.mode === 'MOCK'，二者共同决定，不把编译环境当成唯一事实源。
 */
export function useMockMode() {
  const sessionStore = useCreativeVideoSessionStore();

  return {
    isMockEnv: computed(() => sessionStore.isMockEnv),
    isMockMode: computed(() => sessionStore.isMockMode),
    serverMode: computed(() => sessionStore.serverMode),
  };
}
