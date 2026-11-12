<script lang="ts" setup>
import { Fallback } from '@vben/common-ui';

defineOptions({ name: 'VidCraftFallbackForbidden' });
</script>

<template>
  <Fallback
    :description="$t('vidcraft.fallback.forbiddenDesc')"
    home-path="/dashboard"
    :title="$t('vidcraft.fallback.forbiddenTitle')"
    status="403"
  />
</template>
