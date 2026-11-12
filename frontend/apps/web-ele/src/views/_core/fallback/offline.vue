<script lang="ts" setup>
import { Fallback } from '@vben/common-ui';

defineOptions({ name: 'VidCraftFallbackOffline' });
</script>

<template>
  <Fallback
    :description="$t('vidcraft.fallback.offlineDesc')"
    home-path="/dashboard"
    :title="$t('vidcraft.fallback.offlineTitle')"
    status="offline"
  />
</template>
