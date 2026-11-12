<script lang="ts" setup>
import type { VideoProject } from '#/types/creative-video';

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useUserStore } from '@vben/stores';

import {
  ElButton,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
} from 'element-plus';

import { getProject } from '#/api/creative-video';
import DemoModeBanner from '#/components/creative-video/DemoModeBanner.vue';
import ErrorState from '#/components/creative-video/ErrorState.vue';
import LoadingState from '#/components/creative-video/LoadingState.vue';
import { $t } from '#/locales';
import { useAuthStore } from '#/store';
import { useCreativeVideoIngestionStore } from '#/stores/creative-video';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';
import { formatDuration, PLATFORM_KEYS } from '#/utils/creative-video/format';
import { getStageByKey, STUDIO_STAGES } from '#/utils/creative-video/stages';

defineOptions({ name: 'VidCraftStudioShell' });

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();

const ingestionStore = useCreativeVideoIngestionStore();
onBeforeUnmount(() => ingestionStore.clearPreviews());
const project = ref<null | VideoProject>(null);
const loading = ref(true);
const errorMessage = ref('');

const projectId = computed(() => String(route.params.id ?? ''));
const activeSlug = computed(() => {
  const slug = route.path.split('/').findLast(Boolean) ?? '';
  // /concepts 是 S3 的子页，Stepper 仍高亮「创意方向」
  return slug === 'concepts' ? 'angles' : slug;
});

const stageLabel = computed(() => {
  const stage = project.value
    ? getStageByKey(project.value.currentStage)
    : undefined;
  return stage ? $t(stage.titleKey) : '—';
});

async function loadProject() {
  if (!projectId.value) {
    loading.value = false;
    project.value = null;
    errorMessage.value = '缺少项目编号，请返回项目中心重新选择。';
    return;
  }
  loading.value = true;
  errorMessage.value = '';
  try {
    project.value = await getProject(projectId.value);
    if (project.value.archivedAt)
      errorMessage.value = '项目已归档，请返回项目中心恢复后再继续创作';
  } catch (error) {
    project.value = null;
    errorMessage.value = friendlyErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function handleLogout() {
  await authStore.logout();
}

function backToProjects() {
  router.push('/projects');
}

onMounted(loadProject);
watch(projectId, () => {
  ingestionStore.clearPreviews();
  void loadProject();
});
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <div class="vidcraft-studio">
    <DemoModeBanner />

    <header class="vidcraft-studio__header">
      <router-link class="vidcraft-studio__back" to="/projects">
        ← {{ $t('vidcraft.backToProjects') }}
      </router-link>
      <span class="vidcraft-studio__divider"></span>
      <img
        alt=""
        aria-hidden="true"
        class="vidcraft-studio__mark"
        src="/brand/vidcraft-mark.svg"
      />
      <span class="vidcraft-studio__brand">VidCraft</span>
      <span class="vidcraft-studio__divider"></span>
      <span class="vidcraft-studio__project">
        {{
          project?.title ??
          (errorMessage ? '项目不可用' : $t('vidcraft.states.loading'))
        }}
      </span>
      <span class="vc-studio-badge">{{ $t('vidcraft.mockBadge') }}</span>

      <span class="vidcraft-studio__spacer"></span>

      <span v-if="project" class="vidcraft-studio__meta">
        {{ formatDuration(project.durationSec) }} · {{ project.aspectRatio }} ·
        {{ $t(PLATFORM_KEYS[project.platform]) }} ·
        {{ stageLabel }}
      </span>
      <span class="vidcraft-studio__meta">{{
        $t('vidcraft.studioShell.saveStatus')
      }}</span>

      <ElDropdown trigger="click">
        <ElButton text size="small">
          {{
            userStore.userInfo?.realName ?? $t('vidcraft.studioShell.roleLabel')
          }}
        </ElButton>
        <template #dropdown>
          <ElDropdownMenu>
            <ElDropdownItem @click="backToProjects">
              {{ $t('vidcraft.backToProjects') }}
            </ElDropdownItem>
            <ElDropdownItem divided @click="handleLogout">
              {{ $t('vidcraft.studioShell.logout') }}
            </ElDropdownItem>
          </ElDropdownMenu>
        </template>
      </ElDropdown>
    </header>

    <nav v-if="project" class="vc-stage-nav" aria-label="创作阶段">
      <router-link
        v-for="(stage, index) in STUDIO_STAGES"
        :key="stage.key"
        :class="{ 'is-active': stage.slug === activeSlug }"
        :to="`/studio/${encodeURIComponent(projectId)}/${stage.slug}`"
        class="vc-stage-nav__item"
      >
        <span class="vc-stage-nav__index">{{ index + 1 }}</span>
        <span>{{ $t(stage.titleKey) }}</span>
      </router-link>
    </nav>

    <main class="vidcraft-studio__content">
      <LoadingState v-if="loading" :rows="6" />

      <ErrorState
        v-else-if="errorMessage"
        :message="errorMessage"
        :show-retry="false"
        :title="$t('vidcraft.states.notFoundTitle')"
      >
        <ElButton type="primary" plain @click="backToProjects">
          {{ $t('vidcraft.backToProjects') }}
        </ElButton>
        <ElButton @click="loadProject">
          {{ $t('vidcraft.common.retry') }}
        </ElButton>
      </ErrorState>

      <router-view v-else v-slot="{ Component }">
        <component :is="Component" :project="project" />
      </router-view>
    </main>
  </div>
</template>

<style scoped>
.vidcraft-studio__mark {
  width: 22px;
  height: 22px;
  border-radius: 6px;
}
</style>
