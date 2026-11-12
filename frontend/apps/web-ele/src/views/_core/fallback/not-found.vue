<script lang="ts" setup>
import { Fallback } from '@vben/common-ui';

defineOptions({ name: 'VidCraftFallbackNotFound' });
</script>

<template>
  <Fallback
    :description="$t('vidcraft.fallback.notFoundDesc')"
    home-path="/dashboard"
    :title="$t('vidcraft.fallback.notFoundTitle')"
    status="404"
  />
</template>
