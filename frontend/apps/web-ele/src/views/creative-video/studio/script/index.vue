<script lang="ts" setup>
import type {
  DurationPlan,
  ScriptRevision,
  StoryBeat,
  VideoProject,
} from '#/types/creative-video';

import { computed, onMounted, ref, toRaw, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  ElButton,
  ElDialog,
  ElDrawer,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElTag,
} from 'element-plus';

import {
  applyChangePlan,
  approveScript,
  createChangePlan,
  evaluateDuration,
  forkScript,
  generateScript,
  getScript,
  getScriptsState,
  patchDurationPlan,
  patchScript,
  rejectScript,
  submitScriptReview,
} from '#/api/creative-video';
import GuardNotice from '#/components/creative-video/m2/GuardNotice.vue';
import VersionConflictDialog from '#/components/creative-video/m2/VersionConflictDialog.vue';
import { useJobPolling } from '#/composables/creative-video/use-job-polling';
import { useM2JobId } from '#/composables/creative-video/use-m2-job';
import { useProjectAccess } from '#/composables/creative-video/use-project-access';
import {
  friendlyErrorMessage,
  isVersionConflict,
} from '#/utils/creative-video/errors';
import { formatMs } from '#/utils/creative-video/m2-timeline';
import JobProgress from '#/views/creative-video/studio/ingest/components/JobProgress.vue';

defineOptions({ name: 'VidCraftScript' });

const props = defineProps<{ project?: null | VideoProject }>();
const route = useRoute();
const router = useRouter();
const projectId = computed(() => String(route.params.id ?? ''));
const projectRef = computed(() => props.project ?? null);
const { canApprove, canEdit } = useProjectAccess(projectRef);

const loading = ref(true);
const errorMessage = ref('');
const needsConcept = ref(false);
const state = ref<Awaited<ReturnType<typeof getScriptsState>> | null>(null);
const script = ref<null | ScriptRevision>(null);
const beats = ref<StoryBeat[]>([]);
const plan = ref<DurationPlan | null>(null);
const { clearJob, jobId, setJob } = useM2JobId();
const acting = ref(false);
const versionOpen = ref(false);

const editOpen = ref(false);
const editIndex = ref(0);
const editForm = ref({
  newInformation: '',
  plot: '',
  productPlacement: '',
  title: '',
  voiceover: '',
  visualIntent: '',
});

const conflictOpen = ref(false);
const conflictLatest = ref<null | ScriptRevision>(null);
const conflictFields = ref<
  Array<{ label: string; latest: string; local: string }>
>([]);
const planOpen = ref(false);
const changePlan = ref<any>(null);
const feedback = ref('');

const { job } = useJobPolling(jobId, {
  onTerminal: async (result) => {
    if (result.status === 'SUCCEEDED') ElMessage.success('剧本草稿已生成');
    else ElMessage.error(result.errorMessage ?? '剧本生成失败，可重试');
    clearJob();
    await load();
  },
});

const targetMs = computed(() =>
  props.project?.durationSec ? props.project.durationSec * 1000 : 120_000,
);
const totalMs = computed(() =>
  beats.value.reduce((sum, beat) => sum + (Number(beat.durationMs) || 0), 0),
);
const diffMs = computed(() => totalMs.value - targetMs.value);
const canEditCurrent = computed(
  () => canEdit.value && script.value?.status !== 'APPROVED',
);
const strategies = [
  {
    code: 'NATURAL_STORY_EXPANSION',
    label: 'A：扩展为完整故事',
    desc: '增加背景、人物动机、冲突与价值深化',
  },
  {
    code: 'MULTI_CHAPTER',
    label: 'B：拆成多章节影片',
    desc: '同一产品从几个互相关联的角度展开',
  },
  {
    code: 'KEEP_SHORT',
    label: 'C：保留短片',
    desc: '不悄悄修改项目时长，需要明确接受交付差异',
  },
];

async function load() {
  loading.value = true;
  errorMessage.value = '';
  needsConcept.value = false;
  try {
    const result = await getScriptsState(projectId.value);
    state.value = result;
    if (!result.concept) {
      needsConcept.value = true;
      return;
    }
    plan.value =
      result.durationPlans.find(
        (item: DurationPlan) => item.conceptRevisionId === result.concept.id,
      ) ?? null;
    if (!plan.value) {
      plan.value = await evaluateDuration(projectId.value, {
        conceptRevisionId: result.concept.id,
        targetDurationMs: targetMs.value,
      });
    }
    script.value =
      result.scripts.find((item) => item.status !== 'APPROVED') ??
      result.active ??
      null;
    beats.value = script.value?.beats
      ? structuredClone(toRaw(script.value.beats))
      : [];
  } catch (error) {
    errorMessage.value = friendlyErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

function scriptStatusLabel(status?: string) {
  return (
    {
      APPROVED: '已确认',
      DRAFT: '草稿',
      REJECTED: '已退回',
      STALE: '已过期',
      WAITING_REVIEW: '待审核',
    }[status ?? ''] ?? '未开始'
  );
}

async function chooseStrategy(code: string) {
  if (!plan.value) return;
  acting.value = true;
  try {
    const acceptedRiskNotes =
      code === 'KEEP_SHORT'
        ? ['已明确接受实际交付时长与项目目标时长不一致']
        : [];
    if (code === 'KEEP_SHORT') {
      await ElMessageBoxConfirm();
    }
    plan.value = await patchDurationPlan(projectId.value, plan.value.id, {
      acceptedRiskNotes,
      expectedVersion: plan.value.version,
      selectedStrategy: code,
    });
    ElMessage.success('时长策略已保存，可生成剧本');
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(friendlyErrorMessage(error));
    }
  } finally {
    acting.value = false;
  }
}

let ElMessageBoxConfirm: () => Promise<unknown> = async () => {
  const { ElMessageBox } = await import('element-plus');
  return ElMessageBox.confirm(
    '保留短片会把实际交付时长改为创意的自然容量，而项目目标仍是当前时长。是否继续？',
    '确认保留短片',
    { cancelButtonText: '取消', confirmButtonText: '接受并保留短片' },
  );
};

async function generate() {
  if (!plan.value || !state.value?.concept) return;
  if (plan.value.status !== 'SUFFICIENT' && !plan.value.selectedStrategy) {
    ElMessage.warning('请先选择 A/B/C 时长策略');
    return;
  }
  acting.value = true;
  try {
    const result = await generateScript(projectId.value, {
      conceptRevisionId: state.value.concept.id,
      durationPlanId: plan.value.id,
    });
    setJob(result.jobId);
    ElMessage.info('已启动结构化剧本生成任务');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

function openEdit(index: number) {
  editIndex.value = index;
  const beat = beats.value[index];
  if (!beat) return;
  editForm.value = {
    newInformation: beat.newInformation,
    plot: beat.plot,
    productPlacement: beat.productPlacement,
    title: beat.title,
    voiceover: beat.voiceover,
    visualIntent: beat.visualIntent,
  };
  editOpen.value = true;
}

function applyEdit() {
  const beat = beats.value[editIndex.value];
  if (!beat) return;
  beats.value[editIndex.value] = { ...beat, ...editForm.value };
  editOpen.value = false;
}

function addBeat() {
  beats.value.push({
    audioMood: '',
    characterMotivation: '',
    conflictOrChange: '',
    dialogue: '',
    durationMs: 5000,
    emotionalIntensity: 3,
    evidenceIds: [],
    id: `beat_custom_${Date.now()}`,
    narrativeRole: 'OTHER',
    newInformation: '待补充：这一段给观众的新信息',
    onScreenText: '',
    order: beats.value.length + 1,
    plot: '新增故事节拍（待编辑）',
    productPlacement: '',
    relatedFeatureIds: [],
    relatedPainPointIds: [],
    reviewStatus: 'pending',
    riskNotes: [],
    title: '新增节拍',
    transitionToNext: '硬切',
    visualIntent: '',
    voiceover: '',
  });
}

function removeBeat(index: number) {
  if (beats.value.length <= 1) {
    ElMessage.warning('剧本至少保留一个故事节拍');
    return;
  }
  beats.value.splice(index, 1);
}

async function saveDraft() {
  if (!script.value) return;
  const invalid = beats.value.find(
    (beat) => !Number.isFinite(beat.durationMs) || beat.durationMs <= 0,
  );
  if (invalid) {
    ElMessage.warning('每个节拍时长必须大于 0');
    return;
  }
  acting.value = true;
  try {
    script.value = await patchScript(projectId.value, script.value.id, {
      expectedVersion: script.value.version,
      patch: { beats: beats.value },
    });
    beats.value = structuredClone(toRaw(script.value.beats));
    ElMessage.success('剧本草稿已保存');
  } catch (error) {
    if (isVersionConflict(error) && script.value) {
      try {
        const latest = await getScript(projectId.value, script.value.id);
        openScriptConflict(latest);
        return;
      } catch (fetchError) {
        ElMessage.error(friendlyErrorMessage(fetchError));
        return;
      }
    }
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

function openScriptConflict(latest: ScriptRevision) {
  const latestTotal = latest.beats.reduce(
    (sum, beat) => sum + beat.durationMs,
    0,
  );
  conflictLatest.value = latest;
  conflictFields.value = [
    {
      label: '节拍数',
      latest: `${latest.beats.length} 个`,
      local: `${beats.value.length} 个`,
    },
    {
      label: '总时长',
      latest: formatMs(latestTotal),
      local: formatMs(totalMs.value),
    },
    {
      label: '第一个节拍',
      latest: latest.beats[0]?.title ?? '—',
      local: beats.value[0]?.title ?? '—',
    },
    {
      label: '服务端版本',
      latest: `R${latest.revisionNo} · v${latest.version} · ${latest.status}`,
      local: `R${script.value?.revisionNo ?? '—'} · v${script.value?.version ?? '—'}`,
    },
  ];
  conflictOpen.value = true;
}

async function resolveConflictKeep() {
  if (!conflictLatest.value) return;
  if (conflictLatest.value.status === 'APPROVED') {
    ElMessage.warning('最新版本已审核通过，请选择另存为新草稿');
    return;
  }
  acting.value = true;
  try {
    script.value = await patchScript(projectId.value, conflictLatest.value.id, {
      expectedVersion: conflictLatest.value.version,
      patch: { beats: beats.value },
    });
    beats.value = structuredClone(toRaw(script.value.beats));
    conflictOpen.value = false;
    ElMessage.success('已保留你的编辑并保存到最新版本');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function resolveConflictFork() {
  if (!conflictLatest.value) return;
  acting.value = true;
  try {
    const forked = await forkScript(
      projectId.value,
      conflictLatest.value.id,
      conflictLatest.value.version,
    );
    script.value = await patchScript(projectId.value, forked.id, {
      expectedVersion: forked.version,
      patch: { beats: beats.value },
    });
    beats.value = structuredClone(toRaw(script.value.beats));
    conflictOpen.value = false;
    ElMessage.success('已另存为新草稿，旧版本保留');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function resolveConflictLatest() {
  conflictOpen.value = false;
  await load();
  ElMessage.info('已加载服务端最新版本，你的未保存编辑已放弃');
}

async function submitReview() {
  if (!script.value) return;
  acting.value = true;
  try {
    script.value = await submitScriptReview(
      projectId.value,
      script.value.id,
      script.value.version,
    );
    await load();
    ElMessage.success('剧本已提交审核');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function approve() {
  if (!script.value) return;
  try {
    await ElMessageBoxConfirmApprove();
    script.value = await approveScript(
      projectId.value,
      script.value.id,
      script.value.version,
    );
    await load();
    ElMessage.success('剧本已确认，可生成视觉规范与分镜');
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(friendlyErrorMessage(error));
    }
  }
}

let ElMessageBoxConfirmApprove: () => Promise<unknown> = async () => {
  const { ElMessageBox } = await import('element-plus');
  return ElMessageBox.confirm(
    '确认后该剧本版本冻结；继续修改需要派生新草稿，并会使下游分镜/预演需要复核。',
    '确认剧本',
    { cancelButtonText: '取消', confirmButtonText: '确认剧本' },
  );
};

async function reject() {
  if (!script.value) return;
  try {
    const { ElMessageBox } = await import('element-plus');
    const { value } = await ElMessageBox.prompt('请填写退回原因', '退回剧本', {
      cancelButtonText: '取消',
      confirmButtonText: '退回',
    });
    script.value = await rejectScript(
      projectId.value,
      script.value.id,
      script.value.version,
      value,
    );
    await load();
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(friendlyErrorMessage(error));
    }
  }
}

async function fork() {
  if (!script.value) return;
  acting.value = true;
  try {
    script.value = await forkScript(
      projectId.value,
      script.value.id,
      script.value.version,
    );
    beats.value = structuredClone(toRaw(script.value.beats));
    ElMessage.success('已派生新草稿，旧版本保留');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function selectVersion(revisionId: string) {
  const target = state.value?.scripts.find((item) => item.id === revisionId);
  if (!target) return;
  script.value = target;
  beats.value = structuredClone(toRaw(target.beats));
  versionOpen.value = false;
}

async function askDirector() {
  if (!script.value || !feedback.value.trim()) {
    ElMessage.warning('请输入修改意见');
    return;
  }
  const target = beats.value[editIndex.value];
  if (!target) {
    ElMessage.warning('请先选择一个节拍');
    return;
  }
  acting.value = true;
  try {
    changePlan.value = await createChangePlan(projectId.value, {
      scope: 'BEAT',
      targetId: target.id,
      userMessage: feedback.value,
    });
    planOpen.value = true;
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function applyPlan() {
  if (!changePlan.value) return;
  acting.value = true;
  try {
    await applyChangePlan(projectId.value, changePlan.value.id, {
      expectedVersion: changePlan.value.version,
    });
    planOpen.value = false;
    changePlan.value = null;
    feedback.value = '';
    await load();
    ElMessage.success('修改计划已应用为草稿');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

watch(
  () => props.project?.durationSec,
  () => {
    if (!state.value?.concept) return;
    void evaluateDuration(projectId.value, {
      conceptRevisionId: state.value.concept.id,
      targetDurationMs: targetMs.value,
    }).then((result) => {
      plan.value = result;
    });
  },
);

onMounted(load);
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <div class="vc-m2-page vc-script">
    <div v-if="loading" class="vc-m2-loading">
      正在读取创意、时长计划与剧本…
    </div>

    <GuardNotice
      v-else-if="needsConcept"
      description="剧本必须基于已确认的创意方案。请先选择并审核通过一套创意故事。"
      label="去选择创意"
      title="还没有已确认的创意方案"
      :to="`/studio/${projectId}/concepts`"
    />

    <section v-else-if="errorMessage" class="vc-script__panel vc-m2-error">
      <h2>无法加载剧本</h2>
      <p>{{ errorMessage }}</p>
      <ElButton @click="load">重试</ElButton>
    </section>

    <template v-else>
      <header class="vc-script__hero">
        <div class="vc-script__hero-copy">
          <p class="vc-m2-eyebrow">S4 · Script</p>
          <h1>{{ script?.title ?? '把创意变成可执行的故事' }}</h1>
          <p class="vc-m2-sub">
            目标 {{ formatMs(targetMs) }} · 当前 {{ beats.length }} 节拍 /
            {{ formatMs(totalMs) }} ·
            {{ scriptStatusLabel(script?.status) }}
          </p>
        </div>
        <div class="vc-m2-head__actions">
          <ElButton
            v-if="state && state.scripts.length > 1"
            @click="versionOpen = true"
          >
            历史版本
          </ElButton>
          <ElButton
            v-if="script?.status === 'APPROVED'"
            :disabled="!canEdit"
            @click="fork"
          >
            派生新草稿
          </ElButton>
          <ElButton
            :disabled="!canEditCurrent"
            :loading="acting"
            @click="saveDraft"
          >
            保存草稿
          </ElButton>
          <ElButton
            v-if="canEditCurrent && script?.status === 'DRAFT'"
            :loading="acting"
            @click="submitReview"
          >
            提交审核
          </ElButton>
          <ElButton
            v-if="script?.status === 'WAITING_REVIEW'"
            :disabled="!canApprove"
            type="primary"
            @click="approve"
          >
            确认剧本
          </ElButton>
        </div>
      </header>

      <JobProgress v-if="job" :job="job" title="剧本生成任务" />

      <section
        v-if="plan && plan.status !== 'SUFFICIENT'"
        class="vc-script__panel vc-duration"
      >
        <div class="vc-duration__head">
          <div>
            <h2>AI 时长建议</h2>
            <p>
              当前故事最适合约
              <strong
                >{{
                  Math.round((plan?.naturalDurationMs ?? 0) / 1000)
                }}
                秒</strong
              >， 但目标为
              <strong>{{ Math.round(plan.targetDurationMs / 1000) }} 秒</strong
              >。 直接放慢或重复卖点会降低吸引力，请选择处理方式。
            </p>
          </div>
          <ElTag type="warning" effect="plain">Mock 启发式评估</ElTag>
        </div>
        <div class="vc-duration__options">
          <button
            v-for="item in strategies"
            :key="item.code"
            :class="{ 'is-active': plan?.selectedStrategy === item.code }"
            type="button"
            @click="chooseStrategy(item.code)"
          >
            <strong>{{ item.label }}</strong>
            <span>{{ item.desc }}</span>
          </button>
        </div>
        <div class="vc-duration__foot">
          <p v-if="!plan?.selectedStrategy" class="vc-m2-muted">
            选择 A/B/C 后才能生成完整剧本。
          </p>
          <p v-else class="vc-m2-muted">
            已选择：{{
              strategies.find((item) => item.code === plan?.selectedStrategy)
                ?.label
            }}
          </p>
          <ElButton
            :disabled="!plan?.selectedStrategy"
            :loading="acting"
            type="primary"
            @click="generate"
          >
            {{ script ? '重新生成剧本' : '生成剧本' }}
          </ElButton>
        </div>
      </section>

      <section v-else-if="!script" class="vc-script__panel vc-m2-empty">
        <h2>还没有剧本</h2>
        <p class="vc-m2-muted">
          目标时长与创意容量匹配，可以直接生成结构化七节拍剧本。
        </p>
        <ElButton type="primary" :loading="acting" @click="generate">
          生成剧本
        </ElButton>
      </section>

      <div v-if="script" class="vc-m2-script-grid">
        <aside class="vc-script__panel vc-m2-script-side">
          <div class="vc-script__panel-head">
            <h3>创意指南</h3>
            <p class="vc-m2-muted">已确认创意，供节拍对照。</p>
          </div>
          <div class="vc-script__guide-card">
            <strong>{{ state?.concept?.title }}</strong>
            <p>{{ state?.concept?.logline }}</p>
          </div>
          <div class="vc-script__guide-block">
            <h4>时长规划</h4>
            <p>目标 {{ formatMs(targetMs) }} · 当前 {{ formatMs(totalMs) }}</p>
            <p
              class="vc-script__diff"
              :class="{ 'is-over': Math.abs(diffMs) > 2000 }"
            >
              差额 {{ diffMs > 0 ? '+' : '' }}{{ (diffMs / 1000).toFixed(1) }}s
            </p>
            <p class="vc-m2-muted">
              允许 ±2s 创作容差；M3/M4 会按真实镜头时间线重新校验。
            </p>
          </div>
          <div class="vc-script__guide-block vc-script__guide-block--risk">
            <h4>禁用主张</h4>
            <ul class="vc-script__claim-list">
              <li v-for="claim in state?.concept?.riskNotes ?? []" :key="claim">
                {{ claim }}
              </li>
            </ul>
          </div>
          <ElButton
            class="vc-script__side-btn"
            @click="router.push(`/studio/${projectId}/concepts`)"
          >
            返回创意
          </ElButton>
        </aside>

        <main class="vc-script__panel vc-m2-beats">
          <header class="vc-m2-beats-head">
            <div class="vc-script__section-title">
              <span class="vc-script__step">{{
                String(beats.length).padStart(2, '0')
              }}</span>
              <h3>故事节拍（{{ beats.length }}）</h3>
            </div>
            <ElButton v-if="canEditCurrent" size="small" @click="addBeat">
              + 新增节拍
            </ElButton>
          </header>
          <article
            v-for="(beat, index) in beats"
            :key="beat.id"
            class="vc-m2-beat"
          >
            <div class="vc-m2-beat__time">
              <span class="vc-m2-beat__index">{{
                String(index + 1).padStart(2, '0')
              }}</span>
              <span>{{
                formatMs(
                  beats
                    .slice(0, index)
                    .reduce((sum, item) => sum + item.durationMs, 0),
                )
              }}</span>
            </div>
            <div class="vc-m2-beat__main">
              <div class="vc-m2-beat__title-row">
                <ElTag size="small" effect="plain">{{
                  beat.narrativeRole
                }}</ElTag>
                <strong>{{ beat.title }}</strong>
              </div>
              <p class="vc-m2-beat__plot">{{ beat.plot }}</p>
              <div class="vc-m2-beat__meta">
                <p>新信息：{{ beat.newInformation || '未填写' }}</p>
                <p>旁白：{{ beat.voiceover || '—' }}</p>
              </div>
            </div>
            <div class="vc-m2-beat__duration">
              <div class="vc-m2-beat__duration-input">
                <ElInputNumber
                  v-model="beat.durationMs"
                  :disabled="!canEditCurrent"
                  :max="60000"
                  :min="1000"
                  :step="1000"
                  controls-position="right"
                  size="small"
                />
                <span class="vc-m2-muted">ms</span>
              </div>
              <div class="vc-m2-beat__actions">
                <ElButton size="small" @click="openEdit(index)">
                  编辑
                </ElButton>
                <ElButton
                  v-if="canEditCurrent"
                  size="small"
                  type="danger"
                  plain
                  @click="removeBeat(index)"
                >
                  删除
                </ElButton>
              </div>
            </div>
          </article>
          <p v-if="!canEditCurrent" class="vc-m2-muted vc-script__readonly">
            当前版本只读；修改已确认剧本请先派生新草稿。
          </p>
        </main>

        <aside class="vc-script__panel vc-m2-director-panel">
          <div class="vc-script__panel-head">
            <h3>AI 导演</h3>
            <p class="vc-m2-muted">针对选中节拍提出修改，先出计划再应用。</p>
          </div>
          <ElInput
            v-model="feedback"
            placeholder="例如：这段太平淡，加点反转"
            :rows="3"
            type="textarea"
          />
          <ElButton
            class="vc-script__side-btn"
            :loading="acting"
            @click="askDirector"
          >
            生成修改计划
          </ElButton>
          <div class="vc-m2-diff" v-if="changePlan">
            <p>
              <strong>{{ changePlan.intent }}</strong>
            </p>
            <p class="vc-m2-muted">{{ changePlan.mockReasoningSummary }}</p>
          </div>
          <div class="vc-script__checklist">
            <h4>审核要素</h4>
            <ul>
              <li>开头 3 秒钩子</li>
              <li>中段冲突/推进</li>
              <li>产品植入真实性</li>
              <li>CTA 与营销目标一致</li>
            </ul>
          </div>
          <div class="vc-script__review-actions">
            <ElButton
              v-if="script?.status === 'WAITING_REVIEW' && canApprove"
              class="vc-script__side-btn"
              type="primary"
              @click="approve"
            >
              确认剧本
            </ElButton>
            <ElButton
              v-if="script?.status === 'WAITING_REVIEW' && canEdit"
              class="vc-script__side-btn"
              type="danger"
              plain
              @click="reject"
            >
              退回
            </ElButton>
          </div>
        </aside>
      </div>

      <div class="vc-m2-footer">
        <span class="vc-m2-muted"
          >版本 R{{ script?.revisionNo ?? '—' }} · 最后保存
          {{ script?.updatedAt ?? '—' }}</span
        >
        <div class="vc-m2-footer__actions">
          <ElButton @click="router.push(`/studio/${projectId}/concepts`)"
            >返回创意</ElButton
          >
          <ElButton
            :disabled="!script || script.status !== 'APPROVED'"
            type="primary"
            @click="router.push(`/studio/${projectId}/storyboard`)"
          >
            进入图文分镜
          </ElButton>
        </div>
      </div>
    </template>

    <ElDrawer v-model="editOpen" title="编辑故事节拍" size="480px">
      <div class="vc-m2-form">
        <label>标题</label><ElInput v-model="editForm.title" />
        <label>剧情</label
        ><ElInput v-model="editForm.plot" :rows="3" type="textarea" />
        <label>画面意图</label
        ><ElInput v-model="editForm.visualIntent" :rows="2" type="textarea" />
        <label>旁白</label
        ><ElInput v-model="editForm.voiceover" :rows="2" type="textarea" />
        <label>新信息/价值</label
        ><ElInput v-model="editForm.newInformation" :rows="2" type="textarea" />
        <label>产品植入</label><ElInput v-model="editForm.productPlacement" />
      </div>
      <template #footer>
        <ElButton @click="editOpen = false">取消</ElButton>
        <ElButton type="primary" @click="applyEdit">应用到本地</ElButton>
      </template>
    </ElDrawer>

    <VersionConflictDialog
      v-model:open="conflictOpen"
      :busy="acting"
      :can-keep="conflictLatest?.status !== 'APPROVED'"
      :fields="conflictFields"
      title="剧本版本冲突"
      @fork="resolveConflictFork"
      @keep="resolveConflictKeep"
      @latest="resolveConflictLatest"
    />

    <ElDialog v-model="versionOpen" title="剧本版本" width="520px">
      <button
        v-for="item in state?.scripts ?? []"
        :key="item.id"
        class="vc-m2-version-row"
        type="button"
        @click="selectVersion(item.id)"
      >
        <span
          >R{{ item.revisionNo }} · {{ scriptStatusLabel(item.status) }}</span
        >
        <span class="vc-m2-muted">{{ item.title }}</span>
      </button>
    </ElDialog>

    <ElDialog
      v-model="planOpen"
      title="AI 修改计划（采用前不修改草稿）"
      width="620px"
    >
      <div v-if="changePlan">
        <p><strong>意图：</strong>{{ changePlan.intent }}</p>
        <p class="vc-m2-muted">{{ changePlan.mockReasoningSummary }}</p>
        <article
          v-for="(op, index) in changePlan.operations"
          :key="index"
          class="vc-m2-diff"
        >
          <div>
            <span>修改前</span>
            <p>{{ op.before }}</p>
          </div>
          <div>
            <span>修改后</span>
            <p>{{ op.after }}</p>
          </div>
        </article>
        <p class="vc-m2-muted">
          影响：{{ changePlan.invalidatedStageNames.join(' / ') }}
        </p>
      </div>
      <template #footer>
        <ElButton @click="planOpen = false">放弃计划</ElButton>
        <ElButton :loading="acting" type="primary" @click="applyPlan">
          采用并生成草稿
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.vc-script {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 88px;
}

.vc-m2-loading {
  padding: 24px;
  font-size: 13px;
  color: var(--vc-text-weak);
  background: var(--el-bg-color-overlay, #fff);
  border: 1px dashed var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-script__hero {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  align-items: flex-end;
  justify-content: space-between;
  padding: 18px 20px;
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

.vc-script__hero-copy {
  min-width: 0;
  max-width: 760px;
}

.vc-m2-eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 650;
  color: var(--vc-brand);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.vc-script__hero h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
  letter-spacing: -0.02em;
}

.vc-m2-sub,
.vc-m2-muted {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vc-text-weak);
}

.vc-m2-head__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.vc-script__panel {
  box-sizing: border-box;
  padding: 16px 18px;
  background: var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-script__panel-head {
  margin-bottom: 12px;
}

.vc-script__panel-head h3,
.vc-m2-beats-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-script__panel-head .vc-m2-muted {
  margin-top: 4px;
}

.vc-m2-empty,
.vc-m2-error {
  padding: 28px 20px;
  text-align: center;
}

.vc-m2-empty h2,
.vc-m2-error h2 {
  margin: 0 0 8px;
  font-size: 18px;
}

.vc-duration__head {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
}

.vc-duration__head h2 {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 650;
}

.vc-duration__head p {
  max-width: 68ch;
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-regular, #4b5563);
}

.vc-duration__options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 0 0 14px;
}

.vc-duration__options button {
  padding: 14px;
  text-align: left;
  cursor: pointer;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid transparent;
  border-radius: 12px;
  transition:
    border-color 0.16s ease,
    background 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.vc-duration__options button:hover {
  background: var(--vc-brand-soft);
  border-color: var(--vc-brand-border);
  transform: translateY(-1px);
}

.vc-duration__options button.is-active {
  background: var(--vc-brand-soft);
  border-color: var(--vc-brand);
  box-shadow: 0 0 0 2px rgb(103 87 215 / 14%);
}

.vc-duration__options strong {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-duration__options span {
  font-size: 12px;
  line-height: 1.6;
  color: var(--vc-text-weak);
}

.vc-duration__foot {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.vc-m2-script-grid {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 280px;
  gap: 16px;
  align-items: start;
}

.vc-m2-script-side,
.vc-m2-director-panel {
  position: sticky;
  top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.vc-script__guide-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background:
    linear-gradient(180deg, rgb(103 87 215 / 5%) 0%, transparent 70%),
    var(--el-bg-color-page, #f5f6f8);
  border: 1px solid var(--vc-brand-border);
  border-radius: 10px;
}

.vc-script__guide-card strong {
  font-size: 13px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-script__guide-card p,
.vc-script__guide-block p {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-regular, #4b5563);
}

.vc-script__guide-block {
  padding: 10px 12px;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-script__guide-block h4,
.vc-script__checklist h4 {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  color: var(--vc-text-weak);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.vc-script__guide-block--risk {
  background: #fff7f6;
  border: 1px solid #ffd6d1;
}

.vc-script__guide-block--risk h4 {
  color: #b42318;
}

.vc-script__diff {
  margin: 6px 0 !important;
  font-weight: 650;
  color: var(--vc-brand);
}

.vc-script__diff.is-over {
  color: var(--el-color-danger);
}

.vc-script__claim-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.vc-script__claim-list li {
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.5;
  color: #b42318;
  background: rgb(255 255 255 / 72%);
  border-radius: 8px;
}

.vc-script__side-btn {
  justify-content: center;
  width: 100%;
  margin: 0 !important;
}

.vc-m2-beats-head {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.vc-script__section-title {
  display: flex;
  gap: 10px;
  align-items: center;
}

.vc-script__step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  font-weight: 700;
  color: var(--vc-brand);
  background: var(--vc-brand-soft);
  border: 1px solid var(--vc-brand-border);
  border-radius: 9px;
}

.vc-m2-beat {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) 168px;
  gap: 12px;
  padding: 14px;
  margin-bottom: 10px;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid transparent;
  border-radius: 12px;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.vc-m2-beat:hover {
  border-color: var(--vc-brand-border);
  box-shadow: 0 8px 20px rgb(103 87 215 / 8%);
  transform: translateY(-1px);
}

.vc-m2-beat__time {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
  font-family: ui-monospace, monospace;
  font-size: 12px;
  color: var(--vc-brand);
}

.vc-m2-beat__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-weight: 700;
  background: var(--vc-brand-soft);
  border: 1px solid var(--vc-brand-border);
  border-radius: 8px;
}

.vc-m2-beat__title-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}

.vc-m2-beat__title-row strong {
  font-size: 14px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-m2-beat__plot {
  margin: 0 0 8px;
  font-size: 13px;
  line-height: 1.65;
  color: var(--el-text-color-regular, #4b5563);
}

.vc-m2-beat__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.vc-m2-beat__meta p {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--vc-text-weak);
}

.vc-m2-beat__duration {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: stretch;
  justify-content: flex-start;
}

.vc-m2-beat__duration-input {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: flex-end;
}

.vc-m2-beat__duration :deep(.el-input-number) {
  width: 112px;
}

.vc-m2-beat__duration .vc-m2-muted {
  margin: 0;
  font-size: 10px;
}

.vc-m2-beat__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.vc-script__readonly {
  padding: 10px 12px;
  margin-top: 4px;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-m2-director-panel {
  background:
    linear-gradient(180deg, rgb(103 87 215 / 5%) 0%, transparent 48%),
    var(--el-bg-color-overlay, #fff);
  border-color: var(--vc-brand-border);
}

.vc-m2-diff {
  padding: 10px 12px;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-m2-diff p {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
}

.vc-m2-diff .vc-m2-muted {
  margin-top: 4px;
}

.vc-script__checklist {
  padding: 10px 12px;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-script__checklist ul {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.vc-script__checklist li {
  position: relative;
  padding-left: 14px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-regular, #4b5563);
}

.vc-script__checklist li::before {
  position: absolute;
  top: 7px;
  left: 0;
  width: 6px;
  height: 6px;
  content: '';
  background: var(--vc-brand);
  border-radius: 50%;
}

.vc-script__review-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vc-m2-footer {
  position: sticky;
  bottom: 12px;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgb(255 255 255 / 92%);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-border-radius);
  box-shadow: 0 10px 28px rgb(15 23 42 / 8%);
  backdrop-filter: blur(8px);
}

.vc-m2-footer__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.vc-m2-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vc-m2-form label {
  font-size: 12px;
  color: var(--vc-text-weak);
}

.vc-m2-version-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 12px;
  margin-bottom: 8px;
  text-align: left;
  cursor: pointer;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 0;
  border-radius: 10px;
}

.vc-m2-version-row:hover {
  background: var(--vc-brand-soft);
}

@media (max-width: 1280px) {
  .vc-m2-script-grid {
    grid-template-columns: 1fr;
  }

  .vc-m2-script-side,
  .vc-m2-director-panel {
    position: static;
  }

  .vc-duration__options {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .vc-m2-beat {
    grid-template-columns: 1fr;
  }

  .vc-m2-beat__duration,
  .vc-m2-beat__duration-input,
  .vc-m2-beat__actions {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .vc-script {
    padding-bottom: 110px;
  }

  .vc-script__hero {
    padding: 16px;
  }

  .vc-m2-footer {
    bottom: 8px;
  }

  .vc-m2-footer__actions {
    width: 100%;
  }

  .vc-m2-footer__actions :deep(.el-button) {
    flex: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vc-duration__options button,
  .vc-m2-beat {
    transition: none;
  }

  .vc-duration__options button:hover,
  .vc-m2-beat:hover {
    transform: none;
  }
}
</style>
