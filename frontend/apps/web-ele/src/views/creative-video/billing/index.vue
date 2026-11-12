<script lang="ts" setup>
import { computed } from 'vue';

import { Fallback } from '@vben/common-ui';

import PagePlaceholder from '#/components/creative-video/PagePlaceholder.vue';
import { useCreativeVideoSessionStore } from '#/stores/creative-video';

defineOptions({ name: 'VidCraftBilling' });

const session = useCreativeVideoSessionStore();
const allowed = computed(() =>
  ['admin', 'owner'].includes(session.currentRole),
);
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <Fallback
    v-if="!allowed"
    :description="$t('vidcraft.fallback.forbiddenDesc')"
    home-path="/dashboard"
    :title="$t('vidcraft.fallback.forbiddenTitle')"
    status="403"
  />
  <div v-else class="vc-page">
    <header class="vc-page__header">
      <div>
        <h1 class="vc-page__title">{{ $t('vidcraft.pages.billingTitle') }}</h1>
        <p class="vc-page__subtitle">{{ $t('vidcraft.pages.billingDesc') }}</p>
      </div>
    </header>
    <PagePlaceholder
      :badge="$t('vidcraft.placeholder.badge')"
      :description="$t('vidcraft.pages.billingDesc')"
      :tips="[
        'M0 只演示菜单与权限差异：仅 owner / admin 可见本页。',
        '报价、冻结、结算与释放必须由服务端保证一致性。',
      ]"
      :title="$t('vidcraft.pages.billingTitle')"
    />
  </div>
</template>
