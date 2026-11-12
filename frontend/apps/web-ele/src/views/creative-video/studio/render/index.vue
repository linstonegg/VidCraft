<script lang="ts" setup>
import type { VideoProject } from '#/types/creative-video';

import StagePlaceholder from '../components/StagePlaceholder.vue';

defineOptions({ name: 'VidCraftStudioRender' });

defineProps<{
  project?: null | VideoProject;
}>();
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <StagePlaceholder :project="project" stage="RENDER" />
</template>
