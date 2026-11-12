<script lang="ts" setup>
import { Fallback } from '@vben/common-ui';

defineOptions({ name: 'VidCraftFallbackInternalError' });
</script>

<template>
  <Fallback
    :description="$t('vidcraft.fallback.errorDesc')"
    home-path="/dashboard"
    :title="$t('vidcraft.fallback.errorTitle')"
    status="500"
  />
</template>
