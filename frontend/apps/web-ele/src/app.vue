<script lang="ts" setup>
import { useElementPlusDesignTokens } from '@vben/hooks';

import { useUserStore } from '@vben/stores';
import { ElConfigProvider } from 'element-plus';

import { elementLocale } from '#/locales';

defineOptions({ name: 'App' });
const userStore=useUserStore();

useElementPlusDesignTokens();
</script>

<template>
  <ElConfigProvider :locale="elementLocale">
    <RouterView :key="userStore.userInfo?.username || 'guest'" />
  </ElConfigProvider>
</template>
