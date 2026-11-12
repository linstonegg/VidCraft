<script lang="ts" setup>
import { useMockMode } from '#/composables/creative-video/use-mock-mode';

/**
 * 演示模式 Banner。
 * 显示条件由 useMockMode 统一判定，标准布局与 Studio 共用。
 */
const { isMockMode } = useMockMode();
</script>

<template>
  <div v-if="isMockMode" class="vc-demo-banner" role="status">
    <span class="vc-demo-banner__tag">演示模式</span>
    <span>{{ $t('vidcraft.mockBanner') }}</span>
  </div>
</template>
