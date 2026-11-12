<script lang="ts" setup>
import PagePlaceholder from '#/components/creative-video/PagePlaceholder.vue';

defineOptions({ name: 'VidCraftTasks' });
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <div class="vc-page">
    <header class="vc-page__header">
      <div>
        <h1 class="vc-page__title">{{ $t('vidcraft.pages.tasksTitle') }}</h1>
        <p class="vc-page__subtitle">{{ $t('vidcraft.pages.tasksDesc') }}</p>
      </div>
    </header>
    <PagePlaceholder
      :badge="$t('vidcraft.placeholder.badge')"
      :description="$t('vidcraft.pages.tasksDesc')"
      :tips="[
        '审核员将在这里查看待审核镜头与整片版本。',
        '异步任务、失败释放与重试策略在 M3 设计，M0 不伪造任务队列。',
      ]"
      :title="$t('vidcraft.pages.tasksTitle')"
    />
  </div>
</template>
