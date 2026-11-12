<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { ElButton, ElTag } from 'element-plus';

import ErrorState from '#/components/creative-video/ErrorState.vue';
import { useProjectAccess } from '#/composables/creative-video/use-project-access';
import {
  useCreativeVideoProjectStore,
  useCreativeVideoSessionStore,
} from '#/stores/creative-video';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';
import { formatDuration } from '#/utils/creative-video/format';
import { stageLabel } from '#/utils/creative-video/project-stage';
import { getStudioPath } from '#/utils/creative-video/stages';

defineOptions({ name: 'VidCraftDashboard' });

const router = useRouter();
const projectStore = useCreativeVideoProjectStore();
const sessionStore = useCreativeVideoSessionStore();
const { canCreate } = useProjectAccess();

const recentProjects = computed(() => projectStore.items.slice(0, 4));

function openProject(project: (typeof projectStore.items)[number]) {
  router.push(getStudioPath(project.id, project.currentStage));
}

const healthError = ref('');

const roleLabel = computed(() => {
  const current = sessionStore.currentRole;
  const matched = sessionStore.demoRoles.find((role) => role.code === current);
  return matched?.displayName ?? current;
});

const roleScope = computed(() => {
  const current = sessionStore.currentRole;
  const matched = sessionStore.demoRoles.find((role) => role.code === current);
  return matched?.scope ?? '当前角色未在演示角色清单中，仅可见基础菜单。';
});

const healthStateText = computed(() => {
  if (sessionStore.healthLoading) {
    return 'vidcraft.dashboard.healthChecking';
  }
  return sessionStore.health
    ? 'vidcraft.dashboard.mockHealthOk'
    : 'vidcraft.dashboard.mockHealthFailed';
});

async function loadHealth() {
  healthError.value = '';
  try {
    await sessionStore.checkHealth();
  } catch (error) {
    healthError.value = friendlyErrorMessage(error);
  }
}

async function loadProjects() {
  try {
    await projectStore.fetchProjects();
  } catch {
    // 错误信息已写入 Store，由页面错误态展示
  }
}

onMounted(async () => {
  await Promise.allSettled([
    loadProjects(),
    loadHealth(),
    sessionStore.loadDemoRoles(),
  ]);
});
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <div class="vc-page vc-dashboard">
    <header class="vc-dashboard__hero">
      <div class="vc-dashboard__hero-copy">
        <p class="vc-dashboard__eyebrow">Workbench</p>
        <h1 class="vc-page__title">{{ $t('vidcraft.dashboard.title') }}</h1>
        <p class="vc-page__subtitle">{{ $t('vidcraft.dashboard.subtitle') }}</p>
      </div>
      <div class="vc-dashboard__hero-actions">
        <div class="vc-dashboard__role">
          <span class="vc-dashboard__role-label">{{
            $t('vidcraft.dashboard.roleScope')
          }}</span>
          <ElTag effect="plain" size="small" round>{{ roleLabel }}</ElTag>
        </div>
        <ElButton
          v-if="canCreate"
          type="primary"
          @click="router.push('/projects/new')"
        >
          新建营销视频
        </ElButton>
      </div>
    </header>

    <div class="vc-dashboard__metrics">
      <section class="vc-dashboard__stat">
        <span class="vc-dashboard__stat-label">{{
          $t('vidcraft.dashboard.projectTotal')
        }}</span>
        <strong class="vc-dashboard__stat-value">{{
          projectStore.total
        }}</strong>
        <span class="vc-dashboard__stat-hint">
          {{
            projectStore.errorMessage
              ? projectStore.errorMessage
              : $t('vidcraft.projectsPage.subtitle')
          }}
        </span>
      </section>

      <section class="vc-dashboard__stat">
        <span class="vc-dashboard__stat-label">{{
          $t('vidcraft.dashboard.inProgress')
        }}</span>
        <strong class="vc-dashboard__stat-value">{{
          projectStore.inProgressCount
        }}</strong>
        <span class="vc-dashboard__stat-hint">{{
          $t('vidcraft.dashboard.startDemoDesc')
        }}</span>
      </section>

      <section class="vc-dashboard__stat">
        <span class="vc-dashboard__stat-label">{{
          $t('vidcraft.dashboard.mockHealth')
        }}</span>
        <strong
          class="vc-dashboard__stat-value vc-dashboard__stat-value--small"
          :class="{
            'is-ok': !!sessionStore.health,
            'is-bad': !!healthError && !sessionStore.health,
          }"
        >
          {{ $t(healthStateText) }}
        </strong>
        <span class="vc-dashboard__stat-hint">
          <template v-if="sessionStore.health">
            {{ sessionStore.health.capabilities.service }} ·
            {{ sessionStore.serverMode }}
          </template>
          <template v-else-if="healthError">—</template>
          <template v-else>…</template>
        </span>
      </section>
    </div>

    <ErrorState
      v-if="healthError"
      class="vc-dashboard__error"
      :message="healthError"
      :title="$t('vidcraft.dashboard.mockHealthFailed')"
      @retry="loadHealth"
    />

    <div
      class="vc-dashboard__body"
      :class="{ 'vc-dashboard__body--solo': recentProjects.length === 0 }"
    >
      <section
        v-if="recentProjects.length > 0"
        class="vc-dashboard__panel vc-dashboard__recent"
      >
        <div class="vc-dashboard__panel-head">
          <div>
            <h2 class="vc-dashboard__section-title">最近项目</h2>
            <p class="vc-dashboard__panel-desc">
              继续上次创作，或进入当前阶段 Studio
            </p>
          </div>
          <ElButton text type="primary" @click="router.push('/projects')">
            查看全部 →
          </ElButton>
        </div>
        <ul class="vc-dashboard__recent-list">
          <li v-for="project in recentProjects" :key="project.id">
            <button type="button" @click="openProject(project)">
              <span class="vc-dashboard__recent-main">
                <strong>{{ project.title }}</strong>
                <span class="vc-dashboard__recent-product">
                  {{ project.productName || '未填写产品' }}
                </span>
              </span>
              <span class="vc-dashboard__recent-meta">
                <span class="vc-chip">{{
                  stageLabel(project.currentStage)
                }}</span>
                <span class="vc-dashboard__recent-duration">{{
                  formatDuration(project.durationSec)
                }}</span>
              </span>
            </button>
          </li>
        </ul>
      </section>

      <aside class="vc-dashboard__aside">
        <section class="vc-dashboard__panel vc-dashboard__cta">
          <h2 class="vc-dashboard__section-title">
            {{ $t('vidcraft.dashboard.startDemo') }}
          </h2>
          <p class="vc-dashboard__text">
            {{ $t('vidcraft.dashboard.startDemoDesc') }}
          </p>
          <div class="vc-dashboard__actions">
            <ElButton type="primary" @click="router.push('/projects')">
              {{ $t('vidcraft.dashboard.goProjects') }}
            </ElButton>
          </div>
        </section>

        <section class="vc-dashboard__panel">
          <h2 class="vc-dashboard__section-title">
            {{ $t('vidcraft.dashboard.roleScope') }}
          </h2>
          <p class="vc-dashboard__text">{{ roleScope }}</p>
          <p class="vc-dashboard__text vc-dashboard__text--weak">
            {{ $t('vidcraft.dashboard.roleScopeDesc') }}
          </p>
        </section>

        <section class="vc-dashboard__panel">
          <h2 class="vc-dashboard__section-title">
            {{ $t('vidcraft.dashboard.nextMilestone') }}
          </h2>
          <p class="vc-dashboard__text">
            {{ $t('vidcraft.dashboard.nextMilestoneDesc') }}
          </p>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.vc-dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.vc-dashboard__hero {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  align-items: flex-end;
  justify-content: space-between;
  padding: 20px 22px;
  background:
    linear-gradient(
      135deg,
      rgb(103 87 215 / 8%) 0%,
      rgb(103 87 215 / 2%) 42%,
      transparent 72%
    ),
    var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-dashboard__hero-copy {
  min-width: 0;
  max-width: 720px;
}

.vc-dashboard__eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 650;
  color: var(--vc-brand);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.vc-dashboard__hero .vc-page__title {
  font-size: 22px;
  letter-spacing: -0.02em;
}

.vc-dashboard__hero .vc-page__subtitle {
  max-width: 56ch;
}

.vc-dashboard__hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.vc-dashboard__role {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--vc-text-weak);
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid var(--vc-border);
  border-radius: 999px;
}

.vc-dashboard__role-label {
  white-space: nowrap;
}

.vc-dashboard__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.vc-dashboard__stat {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 128px;
  padding: 16px 18px;
  background: var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--vc-border);
  border-top: 3px solid var(--vc-brand-border);
  border-radius: var(--vc-border-radius);
}

.vc-dashboard__stat-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--vc-text-weak);
}

.vc-dashboard__stat-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--vc-brand);
  letter-spacing: -0.03em;
}

.vc-dashboard__stat-value--small {
  font-size: 16px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
  letter-spacing: 0;
}

.vc-dashboard__stat-value--small.is-ok {
  color: #0f766e;
}

.vc-dashboard__stat-value--small.is-bad {
  color: #b42318;
}

.vc-dashboard__stat-hint {
  margin-top: auto;
  font-size: 12px;
  line-height: 1.55;
  color: var(--vc-text-weak);
}

.vc-dashboard__error {
  margin: 0;
}

.vc-dashboard__body {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(280px, 0.9fr);
  gap: 16px;
  align-items: start;
}

.vc-dashboard__body--solo {
  grid-template-columns: minmax(0, 1fr);
}

.vc-dashboard__aside {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.vc-dashboard__panel {
  box-sizing: border-box;
  padding: 18px 20px;
  background: var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-dashboard__panel-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
}

.vc-dashboard__panel-desc {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--vc-text-weak);
}

.vc-dashboard__section-title {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-dashboard__panel-head .vc-dashboard__section-title {
  margin-bottom: 0;
}

.vc-dashboard__text {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-regular, #4b5563);
}

.vc-dashboard__text--weak {
  margin-top: 6px;
  color: var(--vc-text-weak);
}

.vc-dashboard__cta {
  background:
    linear-gradient(180deg, rgb(103 87 215 / 6%) 0%, transparent 64%),
    var(--el-bg-color-overlay, #fff);
  border-color: var(--vc-brand-border);
}

.vc-dashboard__actions {
  margin-top: 14px;
}

.vc-dashboard__recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.vc-dashboard__recent-list button {
  display: flex;
  gap: 12px 16px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid transparent;
  border-radius: 10px;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.vc-dashboard__recent-list button:hover {
  background: var(--vc-brand-soft);
  border-color: var(--vc-brand-border);
  box-shadow: 0 6px 18px rgb(103 87 215 / 10%);
  transform: translateY(-1px);
}

.vc-dashboard__recent-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.vc-dashboard__recent-main strong {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary, #1f2937);
  white-space: nowrap;
}

.vc-dashboard__recent-product {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: var(--vc-text-weak);
  white-space: nowrap;
}

.vc-dashboard__recent-meta {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.vc-dashboard__recent-duration {
  font-size: 12px;
  color: var(--vc-text-weak);
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .vc-dashboard__body {
    grid-template-columns: minmax(0, 1fr);
  }

  .vc-dashboard__metrics {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}

@media (max-width: 720px) {
  .vc-dashboard__hero {
    padding: 16px;
  }

  .vc-dashboard__recent-list button {
    flex-direction: column;
    align-items: flex-start;
  }

  .vc-dashboard__recent-meta {
    justify-content: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vc-dashboard__recent-list button {
    transition: none;
  }

  .vc-dashboard__recent-list button:hover {
    transform: none;
  }
}
</style>
