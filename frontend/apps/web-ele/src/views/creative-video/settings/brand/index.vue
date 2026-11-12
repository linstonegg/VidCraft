<script lang="ts" setup>
import PagePlaceholder from '#/components/creative-video/PagePlaceholder.vue';

defineOptions({ name: 'VidCraftSettingsBrand' });
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <div class="vc-page">
    <header class="vc-page__header">
      <div>
        <h1 class="vc-page__title">{{ $t('vidcraft.pages.brandTitle') }}</h1>
        <p class="vc-page__subtitle">{{ $t('vidcraft.pages.brandDesc') }}</p>
      </div>
    </header>
    <PagePlaceholder
      :badge="$t('vidcraft.placeholder.badge')"
      :description="$t('vidcraft.pages.brandDesc')"
      :tips="[
        '品牌资产与水印规范将在 M2 与图文分镜一起设计。',
        'M0 只提供自有 SVG 品牌标识，不使用未授权商业素材。',
      ]"
      :title="$t('vidcraft.pages.brandTitle')"
    />
  </div>
</template>
