<script lang="ts" setup>
import PagePlaceholder from '#/components/creative-video/PagePlaceholder.vue';

defineOptions({ name: 'VidCraftSettingsModels' });
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <div class="vc-page">
    <header class="vc-page__header">
      <div>
        <h1 class="vc-page__title">{{ $t('vidcraft.pages.modelsTitle') }}</h1>
        <p class="vc-page__subtitle">{{ $t('vidcraft.pages.modelsDesc') }}</p>
      </div>
    </header>
    <PagePlaceholder
      :badge="$t('vidcraft.placeholder.badge')"
      :description="$t('vidcraft.pages.modelsDesc')"
      :tips="[
        '模型选择、清晰度与候选数量必须与真实服务契约一起设计。',
        'M0 不写入任何模型 Key 或第三方账号信息。',
      ]"
      :title="$t('vidcraft.pages.modelsTitle')"
    />
  </div>
</template>
