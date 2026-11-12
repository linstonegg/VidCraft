<script lang="ts" setup>
import type { ShotGenerationSpecView } from '#/types/creative-video';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { ElButton, ElMessage, ElTag } from 'element-plus';

import { getGenerationSpecs, putGenerationSpec } from '#/api/creative-video';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';

const props = defineProps<{
  aspectRatio?: string;
  canEnterM3?: boolean;
  projectId: string;
  snapshotId?: string;
  totalDurationMs?: number;
}>();
const router = useRouter();
const savingId = ref('');
const loading = ref(false);
const saving = ref(false);
const open = ref(true);
const specs = ref<ShotGenerationSpecView[]>([]);

const counts = computed(() => {
  const result = { BLOCKED: 0, CURRENT: 0, NOT_CONFIGURED: 0, OUTDATED: 0 };
  for (const item of specs.value) result[item.specValidity] += 1;
  return result;
});
const modeCounts = computed(() => {
  const counts: Record<string, number> = {};
  for (const item of specs.value) {
    const mode = item.suggestedSpec?.mode ?? 'unknown';
    counts[mode] = (counts[mode] ?? 0) + 1;
  }
  return counts;
});
const modeLabels: Record<string, string> = {
  ai_video: 'AI 视频',
  image_animation: '静态图动画',
  motion_graphics: '动效',
  real_footage: '真实素材',
};
const groups = computed(() => {
  const map = new Map<string, any>();
  for (const item of specs.value) {
    const mode = item.suggestedSpec?.mode ?? 'unknown';
    if (!map.has(mode)) {
      map.set(mode, {
        current: 0,
        durationMs: 0,
        label: modeLabels[mode] ?? mode,
        mode,
        shots: [] as ShotGenerationSpecView[],
      });
    }
    const group = map.get(mode);
    group.shots.push(item);
    group.durationMs += item.suggestedSpec?.expectedDurationMs ?? 0;
    if (item.specValidity === 'CURRENT') group.current += 1;
  }
  return [...map.values()];
});
const totalDurationMs = computed(
  () =>
    props.totalDurationMs ??
    groups.value.reduce((total, group) => total + group.durationMs, 0),
);
const adoptedAssetCount = computed(() => {
  const ids = new Set<string>();
  for (const item of specs.value) {
    for (const id of item.suggestedSpec?.referenceAssetVersionIds ?? []) {
      ids.add(id);
    }
    for (const id of item.suggestedSpec?.referenceImageVersionIds ?? []) {
      ids.add(id);
    }
  }
  return ids.size;
});
const modelTiers: Record<string, string> = {
  ai_video: 'M3 视频模型档（待报价）',
  image_animation: '静帧动效档（待报价）',
  motion_graphics: '模板动效档（待报价）',
  real_footage: '真实素材剪辑档（待报价）',
};
const firstUnconfigured = computed(() =>
  specs.value.find((item) => item.specValidity === 'NOT_CONFIGURED'),
);

async function load() {
  loading.value = true;
  try {
    specs.value = await getGenerationSpecs(props.projectId);
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    loading.value = false;
  }
}

function modelTier(mode?: string) {
  return modelTiers[mode ?? ''] ?? 'M3 待选择';
}

async function saveItem(item: ShotGenerationSpecView) {
  if (!item.suggestedSpec) return;
  savingId.value = item.shotId;
  try {
    await putGenerationSpec(props.projectId, {
      expectedApprovedShotRevisionId: item.suggestedSpec.shotRevisionId,
      spec: { ...item.suggestedSpec },
    });
    await load();
    ElMessage.success('已保存非付费生成建议；M3 仍需重新报价');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    savingId.value = '';
  }
}

async function saveFirst() {
  const target = firstUnconfigured.value;
  if (!target?.suggestedSpec) return;
  saving.value = true;
  try {
    await putGenerationSpec(props.projectId, {
      expectedApprovedShotRevisionId: target.suggestedSpec.shotRevisionId,
      spec: { ...target.suggestedSpec },
    });
    await load();
    ElMessage.success('已保存非付费生成建议；M3 仍需重新报价');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <section class="vc-card vc-specs">
    <header class="vc-specs__head">
      <div>
        <strong>M3 制作准备 · 按生成方式</strong>
        <p class="vc-m2-muted">
          只保存模式/时长/引用，不生成视频、不冻结积分；M3
          按不可变请求重新报价。
        </p>
      </div>
      <div class="vc-specs__actions">
        <ElTag type="success" size="small">CURRENT {{ counts.CURRENT }}</ElTag>
        <ElTag type="warning" size="small">
          NOT_CONFIGURED {{ counts.NOT_CONFIGURED }}
        </ElTag>
        <ElTag v-if="counts.OUTDATED > 0" type="danger" size="small">
          OUTDATED {{ counts.OUTDATED }}
        </ElTag>
        <ElButton :loading="loading" size="small" text @click="load">
          刷新
        </ElButton>
        <ElButton size="small" text @click="open = !open">
          {{ open ? '收起' : '查看' }}
        </ElButton>
      </div>
    </header>
    <div v-if="specs.length > 0" class="vc-specs__facts">
      <span
        >快照 <code>{{ snapshotId || '—' }}</code></span
      >
      <span>总时长 {{ Math.round(totalDurationMs / 1000) }}s</span>
      <span>{{ specs.length }} 个镜头</span>
      <span>采用素材 {{ adoptedAssetCount }}</span>
      <span>{{ groups.length }} 种生成方式</span>
      <span>目标比例 {{ aspectRatio || '—' }}</span>
    </div>
    <p v-if="specs.length > 0" class="vc-specs__modes">
      <ElTag
        v-for="(count, mode) in modeCounts"
        :key="mode"
        size="small"
        type="info"
      >
        {{ modeLabels[mode] ?? mode }} {{ count }}
      </ElTag>
    </p>
    <div v-if="open" class="vc-specs__body">
      <p v-if="firstUnconfigured" class="vc-specs__hint">
        首镜：{{ firstUnconfigured.shotId }} ·
        {{ firstUnconfigured.suggestedSpec?.mode }} ·
        {{ firstUnconfigured.suggestedSpec?.expectedDurationMs }}ms
        <ElButton
          :loading="saving"
          size="small"
          type="primary"
          @click="saveFirst"
        >
          保存首镜建议
        </ElButton>
      </p>
      <section
        v-for="group in groups"
        :key="group.mode"
        class="vc-specs__group"
      >
        <h4>
          {{ group.label }} · {{ group.shots.length }} 镜 ·
          {{ Math.round(group.durationMs / 1000) }}s · CURRENT
          {{ group.current }}
        </h4>
        <ul>
          <li v-for="item in group.shots" :key="item.shotId">
            <div class="vc-specs__row-head">
              <ElTag size="small">{{ item.specValidity }}</ElTag>
              <strong>{{ item.shotId }}</strong>
              <span>
                {{ modeLabels[item.suggestedSpec?.mode ?? ''] ?? '未知' }} ·
                {{ item.suggestedSpec?.expectedDurationMs }}ms ·
                {{ item.suggestedSpec?.outputAspectRatio }}
              </span>
            </div>
            <small>
              来源素材：
              {{
                item.suggestedSpec?.referenceAssetVersionIds?.join(' / ') ||
                '无'
              }}
              · 参考图：
              {{
                item.suggestedSpec?.referenceImageVersionIds?.join(' / ') ||
                '无'
              }}
              · {{ modelTier(item.suggestedSpec?.mode) }}
            </small>
            <small v-if="item.outdatedReasonCodes.length > 0" class="is-warn">
              {{ item.outdatedReasonCodes.join('、') }}
            </small>
            <ElButton
              v-if="item.suggestedSpec && item.specValidity !== 'CURRENT'"
              :loading="savingId === item.shotId"
              size="small"
              text
              type="primary"
              @click="saveItem(item)"
            >
              保存非付费建议
            </ElButton>
          </li>
        </ul>
      </section>
    </div>
    <div class="vc-specs__entry">
      <p class="vc-m2-muted">
        M3 会按实际模型/请求逐次报价；此处不展示未经支持的官方价格。
      </p>
      <ElButton
        :disabled="!canEnterM3"
        type="primary"
        @click="router.push(`/studio/${projectId}/generate`)"
      >
        进入镜头生产工作台（M3 占位）
      </ElButton>
      <span v-if="!canEnterM3" class="vc-specs__blocked">
        当前正式链仍有阻塞项，入口由 ProductionReadiness 决定。
      </span>
    </div>
  </section>
</template>

<style scoped>
.vc-specs {
  margin-top: 12px;
}

.vc-specs__head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.vc-specs__head p {
  margin: 2px 0 0;
  font-size: 12px;
}

.vc-specs__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--vc-text-weak);
}

.vc-specs__facts code {
  font-family: ui-monospace, monospace;
  color: var(--el-color-primary);
}

.vc-specs__entry {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid var(--vc-border);
}

.vc-specs__entry p {
  flex: 1;
  min-width: 240px;
  margin: 0;
  font-size: 11px;
}

.vc-specs__blocked {
  font-size: 11px;
  color: var(--el-color-danger);
}

.vc-specs__row-head {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.vc-specs__row-head span {
  font-size: 11px;
  color: var(--vc-text-weak);
}

.vc-specs__body small.is-warn {
  color: var(--el-color-danger);
}

.vc-specs__group h4 {
  margin: 12px 0 0;
  font-size: 12px;
}

.vc-specs__modes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 6px 0 0;
}

.vc-specs__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  justify-content: flex-end;
}

.vc-specs__body {
  margin-top: 10px;
}

.vc-specs__hint {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  font-size: 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
}

.vc-specs__body ul {
  padding: 0;
  margin: 10px 0 0;
  list-style: none;
}

.vc-specs__body li {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  align-items: center;
  padding: 8px 0;
  font-size: 12px;
  border-top: 1px solid var(--vc-border);
}

.vc-specs__body small {
  margin-left: auto;
  color: var(--vc-text-weak);
}
</style>
