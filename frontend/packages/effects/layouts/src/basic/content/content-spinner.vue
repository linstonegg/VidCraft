<script lang="ts" setup>
import { useContentSpinner } from './use-content-spinner';

defineOptions({ name: 'LayoutContentSpinner' });

const { spinning } = useContentSpinner();
const appTitle = import.meta.env.VITE_APP_TITLE ?? 'VidCraft 创作平台';
</script>
<template>
  <div
    :class="{ 'is-hidden': !spinning }"
    aria-live="polite"
    class="vc-route-loading"
    role="status"
  >
    <div class="vc-route-loading__loader"></div>
    <div class="vc-route-loading__title">{{ appTitle }}</div>
    <p class="vc-route-loading__text">正在加载演示数据…</p>
  </div>
</template>
<style scoped>
.vc-route-loading {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f4f7f9;
  transition:
    opacity 0.35s ease,
    visibility 0.35s ease;
}

.vc-route-loading.is-hidden {
  visibility: hidden;
  pointer-events: none;
  opacity: 0;
}

.vc-route-loading__loader {
  position: relative;
  width: 48px;
  height: 48px;
}

.vc-route-loading__loader::before {
  position: absolute;
  top: 60px;
  left: 0;
  width: 48px;
  height: 5px;
  content: '';
  background: hsl(var(--primary, 249 60% 59%) / 35%);
  border-radius: 50%;
  animation: vc-route-shadow 0.5s linear infinite;
}

.vc-route-loading__loader::after {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  content: '';
  background: hsl(var(--primary, 249 60% 59%));
  border-radius: 4px;
  animation: vc-route-jump 0.5s linear infinite;
}

.vc-route-loading__title {
  margin-top: 66px;
  font-size: 28px;
  font-weight: 600;
  color: rgb(0 0 0 / 85%);
}

.vc-route-loading__text {
  margin: 8px 0 0;
  font-size: 12px;
  color: rgb(0 0 0 / 45%);
}

@keyframes vc-route-jump {
  15% {
    border-bottom-right-radius: 3px;
  }

  25% {
    transform: translateY(9px) rotate(22.5deg);
  }

  50% {
    border-bottom-right-radius: 40px;
    transform: translateY(18px) scale(1, 0.9) rotate(45deg);
  }

  75% {
    transform: translateY(9px) rotate(67.5deg);
  }

  100% {
    transform: translateY(0) rotate(90deg);
  }
}

@keyframes vc-route-shadow {
  0%,
  100% {
    transform: scale(1, 1);
  }

  50% {
    transform: scale(1.2, 1);
  }
}
</style>
