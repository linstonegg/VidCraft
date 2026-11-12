<script lang="ts" setup>
import type { ProjectStatus, VideoProject } from '#/types/creative-video';

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
  ElButton,
  ElCheckbox,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElSegmented,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import {
  archiveProject,
  deleteProject,
  restoreProject,
} from '#/api/creative-video';
import EmptyState from '#/components/creative-video/EmptyState.vue';
import ErrorState from '#/components/creative-video/ErrorState.vue';
import LoadingState from '#/components/creative-video/LoadingState.vue';
import ProjectCard from '#/components/creative-video/ProjectCard.vue';
import { useProjectAccess } from '#/composables/creative-video/use-project-access';
import { useCreativeVideoProjectStore } from '#/stores/creative-video';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';
import { formatDateTime, formatDuration } from '#/utils/creative-video/format';
import {
  PLATFORM_OPTIONS,
  platformLabel,
  PROJECT_STATUS_KEYS,
  projectPlatforms,
  STAGE_REVIEW_LABELS,
  STAGE_REVIEW_TAG_TYPES,
  stageLabel,
  stageReviewState,
  STATUS_OPTIONS,
} from '#/utils/creative-video/project-stage';
import { getStudioPath, STUDIO_STAGES } from '#/utils/creative-video/stages';

defineOptions({ name: 'VidCraftProjectList' });

const router = useRouter();
const store = useCreativeVideoProjectStore();
const { canCreate, canEdit, canManage } = useProjectAccess();
const resetting = ref(false);
const selectedIds = ref<string[]>([]);
const batchBusy = ref(false);
watch(
  () => store.items,
  () => {
    selectedIds.value = [];
  },
);
async function batch(action: 'archive' | 'delete' | 'restore') {
  if (!canManage.value || batchBusy.value) return;
  const targets = store.items.filter((item) =>
    selectedIds.value.includes(item.id),
  );
  if (targets.length === 0) return;
  const label = { archive: '归档', restore: '恢复', delete: '删除' }[action];
  try {
    await ElMessageBox.confirm(
      `确定${label}所选 ${targets.length} 个项目？删除为可恢复的软删除。`,
      `批量${label}`,
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' },
    );
  } catch {
    return;
  }
  batchBusy.value = true;
  try {
    const perform = (item: VideoProject) => {
      if (action === 'archive') {
        return archiveProject(item.id, item.version);
      }
      if (action === 'restore') {
        return restoreProject(item.id, item.version);
      }
      return deleteProject(item.id, item.version);
    };
    const results = await Promise.allSettled(
      targets.map((item) => perform(item)),
    );
    const failed = results.filter((item) => item.status === 'rejected').length;
    if (failed)
      ElMessage.warning(
        `${targets.length - failed} 个成功，${failed} 个失败；请刷新检查项目状态后重试`,
      );
    else ElMessage.success(`已${label} ${targets.length} 个项目`);
    await load();
  } finally {
    batchBusy.value = false;
  }
}

let keywordTimer: null | ReturnType<typeof setTimeout> = null;

const stageOptions = STUDIO_STAGES.map((stage) => ({
  label: stageLabel(stage.key),
  value: stage.key,
}));

const pageSizes = [12, 24, 48];

const showPagination = computed(() => store.total > store.pageSize);

async function load() {
  try {
    await store.fetchProjects();
  } catch {
    // 错误由 store.errorMessage 呈现
  }
}

function scheduleKeywordFetch() {
  if (keywordTimer) {
    clearTimeout(keywordTimer);
  }
  keywordTimer = setTimeout(() => {
    store.setPage(1);
    void load();
  }, 350);
}

watch(
  () => store.scope,
  () => {
    store.setPage(1);
    void load();
  },
);

watch(
  () => store.status,
  () => {
    store.setPage(1);
    void load();
  },
);
watch(
  () => store.stage,
  () => {
    store.setPage(1);
    void load();
  },
);
watch(
  () => store.platform,
  () => {
    store.setPage(1);
    void load();
  },
);
watch(
  () => store.sort,
  () => {
    store.setPage(1);
    void load();
  },
);
watch(
  () => store.includeDeleted,
  () => {
    store.setPage(1);
    void load();
  },
);
watch(() => store.keyword, scheduleKeywordFetch);

function resetFilters() {
  store.resetFilters();
  void load();
}

async function handleReset() {
  try {
    await ElMessageBox.confirm(
      '将恢复四个固定 Seed 项目，并重置本机 Mock 服务中的资料、理解报告和任务。确定继续？',
      '恢复演示数据',
      { cancelButtonText: '取消', confirmButtonText: '确定', type: 'warning' },
    );
  } catch {
    return;
  }
  resetting.value = true;
  try {
    await store.resetDemo();
    ElMessage.success('演示数据已恢复初始状态');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    resetting.value = false;
  }
}

function continueProject(project: VideoProject) {
  if (project.deletedAt) {
    ElMessage.warning('项目已删除，恢复后才能继续编辑');
    return;
  }
  if (project.archivedAt) {
    ElMessage.warning('项目已归档，恢复后可编辑');
    return;
  }
  router.push(getStudioPath(project.id, project.currentStage));
}

async function handleAction(command: string, project: VideoProject) {
  try {
    if (command === 'continue') {
      continueProject(project);
      return;
    }
    if (command === 'detail') {
      router.push(`/projects/${project.id}`);
      return;
    }
    if (command === 'rename') {
      const { value } = await ElMessageBox.prompt(
        '请输入新的项目名称（1～100 字）',
        '重命名项目',
        {
          cancelButtonText: '取消',
          confirmButtonText: '保存',
          inputPattern: /^.{1,100}$/,
          inputValue: project.title,
          inputValidator: (input) => {
            const text = String(input ?? '').trim();
            if (!text) {
              return '项目名称不能为空';
            }
            if (text.length > 100) {
              return '项目名称不能超过 100 个字符';
            }
            return true;
          },
        },
      );
      await store.rename(project.id, String(value).trim(), project.version);
      ElMessage.success('项目已重命名');
      await load();
      return;
    }
    if (command === 'duplicate') {
      await ElMessageBox.confirm(
        '将复制项目基础配置与资料元数据，生成一个新的草稿项目；不会复制演示授权会话。',
        '复制项目',
        { cancelButtonText: '取消', confirmButtonText: '复制' },
      );
      const copy = await store.duplicate(project.id, project.version);
      ElMessage.success(`已创建副本：${copy.title}`);
      return;
    }
    if (command === 'archive') {
      await ElMessageBox.confirm('归档后项目将只读，可随时恢复。', '归档项目', {
        cancelButtonText: '取消',
        confirmButtonText: '归档',
        type: 'warning',
      });
      await store.archive(project.id, project.version);
      ElMessage.success('项目已归档');
      return;
    }
    if (command === 'restore') {
      await store.restore(project.id, project.version);
      ElMessage.success('项目已恢复');
      return;
    }
    if (command === 'delete') {
      await ElMessageBox.confirm(
        '删除为软删除，列表默认不再显示；演示环境可在“显示已删除”中恢复。账务说明：当前没有真实账务。',
        '删除项目',
        { cancelButtonText: '取消', confirmButtonText: '删除', type: 'error' },
      );
      await store.remove(project.id, project.version);
      ElMessage.success('项目已删除');
      return;
    }
    if (command === 'undelete') {
      await store.undelete(project.id, project.version);
      ElMessage.success('项目已恢复');
    }
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return;
    }
    if (typeof error === 'string') {
      return;
    }
    ElMessage.error(friendlyErrorMessage(error));
  }
}

function projectStatusKey(status: ProjectStatus) {
  return PROJECT_STATUS_KEYS[status] ?? 'vidcraft.status.DRAFT';
}

function changePage(value: number) {
  store.setPage(value);
  void load();
}

function changePageSize(value: number) {
  store.setPageSize(value);
  void load();
}

function handleRowDbClick(row: VideoProject) {
  router.push(`/projects/${row.id}`);
}

onMounted(load);
onBeforeUnmount(() => {
  if (keywordTimer) {
    clearTimeout(keywordTimer);
  }
});
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <div class="vc-page vc-projects">
    <header class="vc-projects__hero">
      <div class="vc-projects__hero-copy">
        <p class="vc-projects__eyebrow">Projects</p>
        <h1 class="vc-page__title">项目中心</h1>
        <p class="vc-page__subtitle">
          管理营销视频项目：搜索、筛选、继续编辑，或创建新的项目并进入资料采集。
        </p>
      </div>
      <div class="vc-m1-actions">
        <label class="vc-projects__deleted-toggle">
          <ElCheckbox v-model="store.includeDeleted" size="small">
            显示已删除
          </ElCheckbox>
        </label>
        <ElButton :loading="resetting" @click="handleReset">
          恢复演示数据
        </ElButton>
        <ElButton
          v-if="canCreate"
          type="primary"
          @click="router.push('/projects/new')"
        >
          新建营销视频
        </ElButton>
      </div>
    </header>

    <section class="vc-projects__controls">
      <div class="vc-projects__scope">
        <ElSegmented
          v-model="store.scope"
          :options="[
            { label: '全部项目', value: 'all' },
            { label: '最近编辑', value: 'recent' },
            { label: '我的项目', value: 'mine' },
            { label: '已归档', value: 'archived' },
          ]"
          aria-label="项目范围"
        />
      </div>

      <div class="vc-projects__toolbar">
        <div class="vc-projects__filters">
          <ElInput
            v-model="store.keyword"
            clearable
            placeholder="搜索项目名、产品名或网址"
            class="vc-m1-toolbar__search"
          />
          <ElSelect
            v-model="store.stage"
            clearable
            placeholder="阶段"
            class="vc-m1-toolbar__select"
          >
            <ElOption
              v-for="item in stageOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
          <ElSelect
            v-model="store.status"
            clearable
            placeholder="状态"
            class="vc-m1-toolbar__select"
          >
            <ElOption
              v-for="item in STATUS_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
          <ElSelect
            v-model="store.platform"
            clearable
            placeholder="平台"
            class="vc-m1-toolbar__select"
          >
            <ElOption
              v-for="item in PLATFORM_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
          <ElSelect v-model="store.sort" class="vc-m1-toolbar__select">
            <ElOption label="最近更新" value="updated" />
            <ElOption label="创建时间" value="created" />
            <ElOption label="名称" value="name" />
          </ElSelect>
          <ElButton @click="resetFilters">重置</ElButton>
        </div>
        <div class="vc-projects__toolbar-meta">
          <span class="vc-m1-toolbar__count">共 {{ store.total }} 个项目</span>
          <ElSegmented
            v-model="store.viewMode"
            :options="[
              { label: '卡片', value: 'card' },
              { label: '表格', value: 'table' },
            ]"
          />
        </div>
      </div>
    </section>

    <LoadingState v-if="store.loading && store.items.length === 0" />

    <ErrorState
      v-else-if="store.errorMessage"
      :message="store.errorMessage"
      @retry="load"
    />

    <EmptyState
      v-else-if="store.items.length === 0"
      class="vc-projects__empty"
      :title="store.hasFilters ? '没有匹配的项目' : '还没有项目'"
      :description="
        store.hasFilters
          ? '尝试清空筛选条件，或恢复演示数据。'
          : '创建第一个营销视频项目，或恢复四个演示种子。'
      "
    >
      <ElButton v-if="store.hasFilters" @click="resetFilters">
        清空筛选
      </ElButton>
      <ElButton :loading="resetting" @click="handleReset">
        恢复演示数据
      </ElButton>
      <ElButton
        v-if="canCreate"
        type="primary"
        @click="router.push('/projects/new')"
      >
        新建营销视频
      </ElButton>
    </EmptyState>

    <template v-else>
      <div
        v-if="canManage"
        class="vc-projects__batch"
        aria-label="批量项目操作"
      >
        <div class="vc-projects__batch-main">
          <ElCheckbox
            :model-value="
              selectedIds.length === store.items.length &&
              store.items.length > 0
            "
            :indeterminate="
              selectedIds.length > 0 && selectedIds.length < store.items.length
            "
            @change="
              (value) =>
                (selectedIds = value ? store.items.map((item) => item.id) : [])
            "
            >选择本页全部项目</ElCheckbox
          >
          <span class="vc-projects__batch-count"
            >已选 {{ selectedIds.length }} 项</span
          >
          <ElButton
            :disabled="selectedIds.length === 0 || batchBusy"
            @click="batch('archive')"
            >批量归档</ElButton
          >
          <ElButton
            :disabled="selectedIds.length === 0 || batchBusy"
            @click="batch('restore')"
            >批量恢复</ElButton
          >
          <ElButton
            :disabled="selectedIds.length === 0 || batchBusy"
            type="danger"
            @click="batch('delete')"
            >批量删除</ElButton
          >
        </div>
        <ElSelect
          v-model="selectedIds"
          multiple
          collapse-tags
          placeholder="选择项目"
          aria-label="批量选择项目"
          class="vc-projects__batch-select"
          ><ElOption
            v-for="item in store.items"
            :key="item.id"
            :label="item.title"
            :value="item.id"
        /></ElSelect>
      </div>

      <div class="vc-projects__content">
        <div v-if="store.viewMode === 'card'" class="vc-project-grid">
          <ProjectCard
            v-for="project in store.items"
            :key="project.id"
            :can-edit="canEdit"
            :can-manage="canManage"
            :project="project"
            @action="handleAction"
            @open="router.push(`/projects/${project.id}`)"
          />
        </div>

        <div v-else class="vc-projects__table-wrap">
          <ElTable
            :data="store.items"
            class="vc-m1-table"
            @row-dblclick="handleRowDbClick"
          >
            <ElTableColumn label="项目" min-width="220">
              <template #default="{ row }">
                <div class="vc-m1-table__title">{{ row.title }}</div>
                <div class="vc-m1-table__weak">
                  {{ row.productName || '未填写产品' }}
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="产品网址" min-width="180">
              <template #default="{ row }">
                <a
                  v-if="row.productUrl"
                  :href="row.productUrl"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {{ row.productUrl.replace(/^https?:\/\//, '') }}
                </a>
                <span v-else class="vc-m1-table__weak">仅上传资料</span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="当前阶段" width="120">
              <template #default="{ row }">
                <span class="vc-chip">{{ stageLabel(row.currentStage) }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="阶段状态" width="100">
              <template #default="{ row }">
                <ElTag
                  :type="STAGE_REVIEW_TAG_TYPES[stageReviewState(row)]"
                  effect="plain"
                  size="small"
                >
                  {{ STAGE_REVIEW_LABELS[stageReviewState(row)] }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="时长" width="90">
              <template #default="{ row }">
                {{ formatDuration(row.durationSec) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="平台" min-width="140">
              <template #default="{ row }">
                {{
                  projectPlatforms(row)
                    .map((item) => platformLabel(item))
                    .join(' / ')
                }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="状态" width="100">
              <template #default="{ row }">
                <ElTag
                  :type="row.status === 'ARCHIVED' ? 'info' : 'primary'"
                  effect="light"
                  size="small"
                >
                  {{ $t(projectStatusKey(row.status)) }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="最近更新" width="150">
              <template #default="{ row }">
                {{ formatDateTime(row.updatedAt) }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="操作" fixed="right" width="120">
              <template #default="{ row }">
                <ElDropdown
                  trigger="click"
                  @command="(command: string) => handleAction(command, row)"
                >
                  <ElButton size="small" text>操作</ElButton>
                  <template #dropdown>
                    <ElDropdownMenu>
                      <ElDropdownItem command="continue"
                        >继续编辑</ElDropdownItem
                      >
                      <ElDropdownItem command="detail">项目详情</ElDropdownItem>
                      <ElDropdownItem v-if="canEdit" command="rename">
                        重命名
                      </ElDropdownItem>
                      <ElDropdownItem v-if="canEdit" command="duplicate">
                        复制
                      </ElDropdownItem>
                      <ElDropdownItem
                        v-if="canManage && !row.archivedAt"
                        command="archive"
                      >
                        归档
                      </ElDropdownItem>
                      <ElDropdownItem
                        v-if="canManage && row.archivedAt"
                        command="restore"
                      >
                        恢复
                      </ElDropdownItem>
                      <ElDropdownItem
                        v-if="canManage && !row.deletedAt"
                        command="delete"
                      >
                        删除
                      </ElDropdownItem>
                      <ElDropdownItem
                        v-if="canManage && row.deletedAt"
                        command="undelete"
                      >
                        恢复删除
                      </ElDropdownItem>
                    </ElDropdownMenu>
                  </template>
                </ElDropdown>
              </template>
            </ElTableColumn>
          </ElTable>
        </div>

        <div v-if="showPagination" class="vc-m1-pagination">
          <ElPagination
            :current-page="store.page"
            :page-size="store.pageSize"
            :page-sizes="pageSizes"
            :total="store.total"
            background
            layout="total, sizes, prev, pager, next"
            @current-change="changePage"
            @size-change="changePageSize"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.vc-projects {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.vc-projects__hero {
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

.vc-projects__hero-copy {
  min-width: 0;
  max-width: 720px;
}

.vc-projects__eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 650;
  color: var(--vc-brand);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.vc-projects__hero .vc-page__title {
  font-size: 22px;
  letter-spacing: -0.02em;
}

.vc-projects__hero .vc-page__subtitle {
  max-width: 58ch;
}

.vc-m1-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.vc-projects__deleted-toggle {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid var(--vc-border);
  border-radius: 999px;
}

.vc-projects__controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  background: var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-projects__scope {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.vc-projects__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid var(--vc-border);
}

.vc-projects__filters {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.vc-projects__toolbar-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.vc-m1-toolbar__search {
  width: min(280px, 100%);
}

.vc-m1-toolbar__select {
  width: 120px;
}

.vc-m1-toolbar__count {
  font-size: 12px;
  color: var(--vc-text-weak);
  white-space: nowrap;
}

.vc-projects__batch {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background:
    linear-gradient(180deg, rgb(103 87 215 / 4%) 0%, transparent 70%),
    var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--vc-brand-border);
  border-radius: var(--vc-border-radius);
}

.vc-projects__batch-main {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.vc-projects__batch-count {
  min-width: 72px;
  font-size: 12px;
  color: var(--vc-text-weak);
}

.vc-projects__batch-select {
  width: min(260px, 100%);
}

.vc-projects__content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.vc-projects__empty {
  padding: 28px 16px;
  background: var(--el-bg-color-overlay, #fff);
  border: 1px dashed var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-projects__table-wrap {
  overflow: hidden;
  background: var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-m1-table {
  width: 100%;
}

.vc-m1-table :deep(.el-table__header th) {
  font-size: 12px;
  font-weight: 600;
  color: var(--vc-text-weak);
  background: var(--el-bg-color-page, #f5f6f8);
}

.vc-m1-table :deep(.el-table__row) {
  cursor: pointer;
}

.vc-m1-table :deep(.el-table__body tr:hover > td) {
  background: var(--vc-brand-soft) !important;
}

.vc-m1-table__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-m1-table__weak {
  margin-top: 2px;
  font-size: 12px;
  color: var(--vc-text-weak);
}

.vc-m1-table a {
  color: var(--vc-brand);
  text-decoration: none;
}

.vc-m1-table a:hover {
  text-decoration: underline;
}

.vc-m1-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 4px 2px 0;
}

@media (max-width: 900px) {
  .vc-projects__hero {
    padding: 16px;
  }

  .vc-projects__toolbar {
    align-items: stretch;
  }

  .vc-projects__toolbar-meta {
    justify-content: space-between;
    width: 100%;
  }
}
</style>
