<script lang="ts" setup>
import type { VideoProject } from '#/types/creative-video';

import { computed, ref } from 'vue';

import {
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElTag,
} from 'element-plus';

import { useCreativeVideoIngestionStore } from '#/stores/creative-video';
import {
  formatDateTime,
  formatDuration,
  truncateText,
} from '#/utils/creative-video/format';
import {
  platformLabel,
  PROJECT_STATUS_KEYS,
  projectPlatforms,
  STAGE_REVIEW_LABELS,
  STAGE_REVIEW_TAG_TYPES,
  stageLabel,
  stageReviewState,
} from '#/utils/creative-video/project-stage';

const props = defineProps<{
  canEdit?: boolean;
  canManage?: boolean;
  project: VideoProject;
}>();

const emit = defineEmits<{
  action: [command: string, project: VideoProject];
  open: [project: VideoProject];
}>();

const statusType = computed(
  () =>
    ({
      ARCHIVED: 'info',
      COMPLETED: 'success',
      DRAFT: 'info',
      IN_PROGRESS: 'primary',
      WAITING_REVIEW: 'warning',
    })[props.project.status] as
      | 'danger'
      | 'info'
      | 'primary'
      | 'success'
      | 'warning',
);

const ingestion = useCreativeVideoIngestionStore();
const brokenCover = ref('');
const coverUrl = computed(
  () =>
    ingestion.getPreviewUrl(props.project.coverAssetId || '') ||
    props.project.coverPreviewUrl ||
    '',
);
const reviewState = computed(() => stageReviewState(props.project));
const platforms = computed(() =>
  projectPlatforms(props.project)
    .map((item) => platformLabel(item))
    .slice(0, 3),
);

function handleCommand(command: string) {
  emit('action', command, props.project);
}
</script>

<template>
  <article
    class="vc-project-card vc-m1-card"
    tabindex="0"
    :aria-label="`打开项目：${project.title}`"
    @click="emit('open', project)"
    @keydown.enter.self.prevent="emit('open', project)"
    @keydown.space.self.prevent="emit('open', project)"
  >
    <div class="vc-m1-card__cover" aria-hidden="true">
      <img
        v-if="coverUrl && brokenCover !== coverUrl"
        :src="coverUrl"
        alt=""
        loading="lazy"
        class="vc-m1-card__cover-image"
        @error="brokenCover = coverUrl"
      />
      <span v-else>{{
        (project.productName || project.title).slice(0, 1)
      }}</span>
      <ElTag
        v-if="project.deletedAt"
        class="vc-m1-card__badge"
        type="danger"
        size="small"
      >
        已删除
      </ElTag>
      <ElTag
        v-else-if="project.archivedAt"
        class="vc-m1-card__badge"
        type="info"
        size="small"
      >
        已归档
      </ElTag>
    </div>

    <header class="vc-m1-card__head">
      <h3 class="vc-m1-card__title" :title="project.title">
        {{ truncateText(project.title, 30) }}
      </h3>
      <ElDropdown trigger="click" @command="handleCommand" @click.stop>
        <button
          aria-label="项目操作"
          class="vc-m1-card__more"
          type="button"
          @click.stop
        >
          ···
        </button>
        <template #dropdown>
          <ElDropdownMenu>
            <ElDropdownItem command="continue">继续编辑</ElDropdownItem>
            <ElDropdownItem command="detail">项目详情</ElDropdownItem>
            <ElDropdownItem v-if="canEdit" command="rename" divided>
              重命名
            </ElDropdownItem>
            <ElDropdownItem v-if="canEdit" command="duplicate">
              复制项目
            </ElDropdownItem>
            <ElDropdownItem
              v-if="canManage && !project.archivedAt"
              command="archive"
            >
              归档
            </ElDropdownItem>
            <ElDropdownItem
              v-if="canManage && project.archivedAt"
              command="restore"
            >
              恢复
            </ElDropdownItem>
            <ElDropdownItem
              v-if="canManage && !project.deletedAt"
              command="delete"
              divided
            >
              删除
            </ElDropdownItem>
            <ElDropdownItem
              v-if="canManage && project.deletedAt"
              command="undelete"
            >
              恢复已删除项目
            </ElDropdownItem>
          </ElDropdownMenu>
        </template>
      </ElDropdown>
    </header>

    <p class="vc-m1-card__product">
      {{ project.productName || '未填写产品名称' }}
      <span v-if="project.productUrl" class="vc-m1-card__url" @click.stop>
        <a :href="project.productUrl" rel="noopener noreferrer" target="_blank">
          {{ truncateText(project.productUrl.replace(/^https?:\/\//, ''), 34) }}
        </a>
      </span>
      <span v-else class="vc-m1-card__url--empty">仅上传资料</span>
    </p>

    <div class="vc-m1-card__meta">
      <ElTag :type="statusType" effect="light" size="small">
        {{ $t(PROJECT_STATUS_KEYS[project.status]) }}
      </ElTag>
      <span class="vc-chip">{{ stageLabel(project.currentStage) }}</span>
      <ElTag
        :type="STAGE_REVIEW_TAG_TYPES[reviewState]"
        effect="plain"
        size="small"
      >
        {{ STAGE_REVIEW_LABELS[reviewState] }}
      </ElTag>
      <span>{{ formatDuration(project.durationSec) }}</span>
      <span>{{ project.aspectRatio }}</span>
    </div>

    <div class="vc-m1-card__meta">
      <span v-for="platform in platforms" :key="platform" class="vc-chip">
        {{ platform }}
      </span>
      <span class="vc-m1-card__grow"></span>
      <span class="vc-m1-card__time">{{
        formatDateTime(project.updatedAt)
      }}</span>
    </div>

    <footer class="vc-m1-card__footer">
      <span>负责人 {{ project.ownerId }}</span>
      <button
        class="vc-m1-card__continue"
        type="button"
        @click.stop="emit('action', 'continue', project)"
      >
        继续 →
      </button>
    </footer>
  </article>
</template>

<style scoped>
.vc-m1-card {
  gap: 10px;
  overflow: hidden;
  cursor: pointer;
}

.vc-m1-card__cover {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 108px;
  margin: -16px -18px 2px;
  overflow: hidden;
  font-size: 30px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.02em;
  background:
    radial-gradient(circle at 20% 20%, rgb(255 255 255 / 18%), transparent 42%),
    linear-gradient(135deg, #7b6be6, #4f3fbf);
  border-radius: var(--vc-border-radius) var(--vc-border-radius) 0 0;
}

.vc-m1-card__cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vc-m1-card__badge {
  position: absolute;
  top: 10px;
  right: 10px;
}

.vc-m1-card__head {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: space-between;
}

.vc-m1-card__title {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.vc-m1-card__more {
  flex: none;
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 16px;
  line-height: 1;
  color: var(--vc-text-weak);
  cursor: pointer;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid transparent;
  border-radius: 8px;
}

.vc-m1-card__more:hover {
  color: var(--vc-brand);
  background: var(--vc-brand-soft);
  border-color: var(--vc-brand-border);
}

.vc-m1-card__product {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--vc-text-weak);
}

.vc-m1-card__url a {
  color: var(--vc-brand);
  text-decoration: none;
}

.vc-m1-card__url a:hover {
  text-decoration: underline;
}

.vc-m1-card__url--empty {
  padding: 1px 6px;
  background: var(--vc-brand-soft);
  border: 1px solid var(--vc-brand-border);
  border-radius: 999px;
}

.vc-m1-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  color: var(--vc-text-weak);
}

.vc-m1-card__grow {
  flex: 1;
}

.vc-m1-card__time {
  white-space: nowrap;
}

.vc-m1-card__footer {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  margin-top: 2px;
  font-size: 12px;
  color: var(--vc-text-weak);
  border-top: 1px solid var(--vc-border);
}

.vc-m1-card__continue {
  padding: 4px 10px;
  font-weight: 650;
  color: var(--vc-brand);
  cursor: pointer;
  background: var(--vc-brand-soft);
  border: 1px solid var(--vc-brand-border);
  border-radius: 999px;
  transition:
    background 0.16s ease,
    color 0.16s ease;
}

.vc-m1-card__continue:hover {
  color: #fff;
  background: var(--vc-brand);
  border-color: var(--vc-brand);
}

@media (prefers-reduced-motion: reduce) {
  .vc-m1-card__continue {
    transition: none;
  }
}
</style>
