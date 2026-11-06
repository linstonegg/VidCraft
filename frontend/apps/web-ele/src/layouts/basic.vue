<script lang="ts" setup>
import {computed,watch} from 'vue';
import {useWatermark} from '@vben/hooks';
import {useRouter} from 'vue-router';
import {AuthenticationLoginExpiredModal} from '@vben/common-ui';
import {BasicLayout,LockScreen,UserDropdown} from '@vben/layouts';
import {preferences,usePreferences} from '@vben/preferences';
import {useAccessStore,useUserStore} from '@vben/stores';
import {ElButton} from 'element-plus';
import {useAuthStore} from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';
const router=useRouter();const userStore=useUserStore();const authStore=useAuthStore();const accessStore=useAccessStore();
const avatar=computed(()=>userStore.userInfo?.avatar??preferences.app.defaultAvatar);
const menus=computed(()=>[
 {handler:()=>router.push('/projects'),icon:'lucide:clapperboard',text:'项目中心'},
 {handler:()=>router.push('/billing'),icon:'lucide:wallet',text:'积分与账单'},
]);
async function handleLogout(){await authStore.logout(false);}
const {destroyWatermark,updateWatermark}=useWatermark();
const {isDark}=usePreferences();
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
<template><BasicLayout :avatar :text="userStore.userInfo?.realName" @clear-preferences-and-logout="handleLogout" @logout="handleLogout"><template #user-dropdown><UserDropdown :avatar :menus :text="userStore.userInfo?.realName" description="VidCraft · 演示工作区" tag-text="Mock" @clear-preferences-and-logout="handleLogout" @logout="handleLogout"/></template><template #notification><ElButton text aria-label="打开创作通知" @click="router.push('/notifications')">创作通知</ElButton></template><template #extra><AuthenticationLoginExpiredModal v-model:open="accessStore.loginExpired" :avatar><LoginForm/></AuthenticationLoginExpiredModal></template><template #lock-screen><LockScreen :avatar @to-login="handleLogout"/></template></BasicLayout></template>
