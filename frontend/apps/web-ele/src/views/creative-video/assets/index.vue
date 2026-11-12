<script lang="ts" setup>
import PagePlaceholder from '#/components/creative-video/PagePlaceholder.vue';

defineOptions({ name: 'VidCraftAssets' });
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <div class="vc-page">
    <header class="vc-page__header">
      <div>
        <h1 class="vc-page__title">{{ $t('vidcraft.pages.assetsTitle') }}</h1>
        <p class="vc-page__subtitle">{{ $t('vidcraft.pages.assetsDesc') }}</p>
      </div>
    </header>
    <PagePlaceholder
      :badge="$t('vidcraft.placeholder.badge')"
      :description="$t('vidcraft.pages.assetsDesc')"
      :tips="[
        '后续提供素材上传、分类与项目引用关系。',
        'M0 不提供真实上传入口，避免把占位按钮当成可用功能。',
      ]"
      :title="$t('vidcraft.pages.assetsTitle')"
    />
  </div>
</template>
