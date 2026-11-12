<script lang="ts" setup>
import { computed, watch } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationLoginExpiredModal } from '@vben/common-ui';
import { useWatermark } from '@vben/hooks';
import { BookOpenText, CircleHelp } from '@vben/icons';
import { BasicLayout, LockScreen, UserDropdown } from '@vben/layouts';
import { preferences, usePreferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import DemoModeBanner from '#/components/creative-video/DemoModeBanner.vue';
import { $t } from '#/locales';
import { useAuthStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';

const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const { destroyWatermark, updateWatermark } = useWatermark();
const { isDark } = usePreferences();

const roleText = computed(() => {
  const role = userStore.userInfo?.roles?.[0];
  return role ? `演示角色：${role}` : '演示账号';
});

const menus = computed(() => [
  {
    handler: () => {
      router.push('/projects');
    },
    icon: BookOpenText,
    text: $t('vidcraft.projects'),
  },
  {
    handler: () => {
      router.push({ name: 'Profile' });
    },
    icon: 'lucide:user',
    text: $t('page.auth.profile'),
  },
  {
    handler: () => {
      router.push('/dashboard');
    },
    icon: CircleHelp,
    text: $t('vidcraft.dashboardMenu'),
  },
]);

const avatar = computed(
  () => userStore.userInfo?.avatar ?? preferences.app.defaultAvatar,
);

async function handleLogout() {
  await authStore.logout(false);
}

watch(
  () => ({
    enable: preferences.app.watermark,
    content: preferences.app.watermarkContent,
    isDark: isDark.value,
  }),
  async ({ enable, content, isDark: isDarkValue }) => {
    if (enable) {
      const watermarkColor = isDarkValue
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(0, 0, 0, 0.12)';

      await updateWatermark({
        advancedStyle: {
          colorStops: [
            {
              color: watermarkColor,
              offset: 0,
            },
            {
              color: watermarkColor,
              offset: 1,
            },
          ],
          type: 'linear',
        },
        content:
          content ||
          `${userStore.userInfo?.username} - ${userStore.userInfo?.realName}`,
      });
    } else {
      destroyWatermark();
    }
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <div class="vc-layout-shell">
    <DemoModeBanner />
    <div class="vc-layout-shell__body">
      <BasicLayout @clear-preferences-and-logout="handleLogout">
        <template #user-dropdown>
          <UserDropdown
            :avatar
            :menus
            :text="userStore.userInfo?.realName"
            :description="roleText"
            @clear-preferences-and-logout="handleLogout"
            @logout="handleLogout"
          />
        </template>
        <template #extra>
          <AuthenticationLoginExpiredModal
            v-model:open="accessStore.loginExpired"
            :avatar
          >
            <LoginForm />
          </AuthenticationLoginExpiredModal>
        </template>
        <template #lock-screen>
          <LockScreen :avatar @to-login="handleLogout" />
        </template>
      </BasicLayout>
    </div>
  </div>
</template>
