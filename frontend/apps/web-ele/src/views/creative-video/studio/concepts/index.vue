<script lang="ts" setup>
import type {
  CanvasViewport,
  ConceptGroup,
  CreativeBrief,
  CreativeConceptRevision,
  MarketingAngle,
  VideoProject,
} from '#/types/creative-video';

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  ElAlert,
  ElButton,
  ElDialog,
  ElDrawer,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElTag,
} from 'element-plus';

import {
  applyChangePlan,
  approveConcept,
  createChangePlan,
  favoriteConcept,
  forkConcept,
  generateConcepts,
  getAngles,
  getAssetContentVersions,
  getConcept,
  getConceptGroup,
  getIngestion,
  listConceptGroups,
  patchConcept,
  patchConceptMoodboard,
  rejectConcept,
  selectConcept,
  submitConceptReview,
} from '#/api/creative-video';
import GuardNotice from '#/components/creative-video/m2/GuardNotice.vue';
import VersionConflictDialog from '#/components/creative-video/m2/VersionConflictDialog.vue';
import { useJobPolling } from '#/composables/creative-video/use-job-polling';
import { useM2JobId } from '#/composables/creative-video/use-m2-job';
import { usePresentationPreference } from '#/composables/creative-video/use-presentation-preference';
import { useProjectAccess } from '#/composables/creative-video/use-project-access';
import {
  friendlyErrorMessage,
  isVersionConflict,
} from '#/utils/creative-video/errors';
import JobProgress from '#/views/creative-video/studio/ingest/components/JobProgress.vue';

defineOptions({ name: 'VidCraftConcepts' });

const props = defineProps<{ project?: null | VideoProject }>();
const route = useRoute();
const router = useRouter();
const projectId = computed(() => String(route.params.id ?? ''));
const projectRef = computed(() => props.project ?? null);
const { canApprove, canEdit } = useProjectAccess(projectRef);

const loading = ref(true);
const errorMessage = ref('');
const needsBrief = ref(false);
const brief = ref<CreativeBrief | null>(null);
const briefAngles = ref<MarketingAngle[]>([]);
const groups = ref<ConceptGroup[]>([]);
const group = ref<ConceptGroup | null>(null);
const concepts = ref<CreativeConceptRevision[]>([]);
const activeGroupId = ref('');
const { clearJob, jobId, setJob } = useM2JobId();
const acting = ref(false);
const scenario = ref('NORMAL');
const conceptViewMode = ref<'COMPARE' | 'EXPLORATION'>('COMPARE');
const focusedConceptId = ref('');
const composeOpen = ref(false);
const composeBaseId = ref('');
const composeHookId = ref('');
const composeCharacterId = ref('');
const composeConflictId = ref('');
const composeCtaId = ref('');
const composing = ref(false);
const bindingSaving = ref(false);
const moodboardAssets = ref<any[]>([]);
const moodboardVersions = ref<any[]>([]);
const moodboardAssetId = ref('');
const moodboardVersionId = ref('');
const moodboardRole = ref<'CHARACTER_IDEA' | 'MOODBOARD' | 'SCENE_IDEA'>(
  'MOODBOARD',
);
const presentation = usePresentationPreference(projectId);
conceptViewMode.value =
  presentation.preference.value.viewMode === 'EXPLORATION'
    ? 'EXPLORATION'
    : 'COMPARE';
focusedConceptId.value =
  presentation.preference.value.focusedConceptRevisionId ?? '';
watch(conceptViewMode, (mode) => {
  presentation.update({
    viewMode: mode === 'EXPLORATION' ? 'EXPLORATION' : 'DIRECTOR',
  });
});
watch(focusedConceptId, (id) => {
  presentation.update({ focusedConceptRevisionId: id || undefined });
});
const conceptPositions = ref<Record<string, { x: number; y: number }>>({});
const conceptViewport = ref<CanvasViewport>({ panX: 0, panY: 0, scale: 1 });
let panState: null | {
  baseX: number;
  baseY: number;
  startX: number;
  startY: number;
} = null;
const contextKey = computed(() =>
  presentation.contextKey('concepts', group.value?.id ?? 'unknown'),
);
let dragState: null | {
  baseX: number;
  baseY: number;
  id: string;
  startX: number;
  startY: number;
} = null;

watch(
  contextKey,
  () => {
    conceptPositions.value = presentation.getLayout(contextKey.value);
    conceptViewport.value = presentation.getViewport(contextKey.value) ?? {
      panX: 0,
      panY: 0,
      scale: 1,
    };
  },
  { immediate: true },
);

function pointFor(conceptId: string) {
  return conceptPositions.value[conceptId] ?? { x: 0, y: 0 };
}

function startDrag(event: PointerEvent, conceptId: string) {
  if (conceptViewMode.value !== 'EXPLORATION') return;
  event.preventDefault();
  const point = pointFor(conceptId);
  dragState = {
    baseX: point.x,
    baseY: point.y,
    id: conceptId,
    startX: event.clientX,
    startY: event.clientY,
  };
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragEnd, { once: true });
}

function onDragMove(event: PointerEvent) {
  if (!dragState) return;
  const x = Math.max(
    -200,
    Math.min(200, dragState.baseX + event.clientX - dragState.startX),
  );
  const y = Math.max(
    -120,
    Math.min(240, dragState.baseY + event.clientY - dragState.startY),
  );
  conceptPositions.value = {
    ...conceptPositions.value,
    [dragState.id]: { x, y },
  };
}

function onDragEnd() {
  if (dragState) {
    presentation.setPoint(
      contextKey.value,
      dragState.id,
      pointFor(dragState.id),
    );
    dragState = null;
  }
  window.removeEventListener('pointermove', onDragMove);
}

function saveConceptViewport() {
  presentation.setViewport(contextKey.value, { ...conceptViewport.value });
}

function zoomConcept(delta: number) {
  conceptViewport.value = {
    ...conceptViewport.value,
    scale: Math.max(0.5, Math.min(1.6, conceptViewport.value.scale + delta)),
  };
  saveConceptViewport();
}

function startConceptPan(event: PointerEvent) {
  if (event.target !== event.currentTarget) return;
  panState = {
    baseX: conceptViewport.value.panX,
    baseY: conceptViewport.value.panY,
    startX: event.clientX,
    startY: event.clientY,
  };
  window.addEventListener('pointermove', onConceptPan);
  window.addEventListener('pointerup', onConceptPanEnd, { once: true });
}

function onConceptPan(event: PointerEvent) {
  if (!panState) return;
  conceptViewport.value = {
    ...conceptViewport.value,
    panX: panState.baseX + event.clientX - panState.startX,
    panY: panState.baseY + event.clientY - panState.startY,
  };
}

function onConceptPanEnd() {
  panState = null;
  saveConceptViewport();
  window.removeEventListener('pointermove', onConceptPan);
}

function resetConceptLayout() {
  presentation.reset();
  conceptPositions.value = {};
  conceptViewport.value = { panX: 0, panY: 0, scale: 1 };
  ElMessage.success('已恢复默认布局');
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onDragMove);
});

const editOpen = ref(false);
const editing = ref<CreativeConceptRevision | null>(null);
const editForm = ref({
  cta: '',
  hook: '',
  logline: '',
  title: '',
  twist: '',
});
const conflictOpen = ref(false);
const conflictConcept = ref<CreativeConceptRevision | null>(null);
const conflictFields = ref<
  Array<{ label: string; latest: string; local: string }>
>([]);
const planOpen = ref(false);
const plan = ref<any>(null);
const feedback = ref('');

const { job } = useJobPolling(jobId, {
  onTerminal: async (result) => {
    if (result.status === 'SUCCEEDED') ElMessage.success('三套创意方案已生成');
    else ElMessage.error(result.errorMessage ?? '创意生成失败，可重试');
    clearJob();
    await loadGroups();
  },
});

const objectiveLabels: Record<string, string> = {
  awareness: '品牌认知',
  consideration: '种草/考虑',
  conversion: '转化',
  retention: '复购/留存',
  signup: '注册/线索',
};
const primaryAngleTitle = computed(
  () =>
    briefAngles.value.find((item) => item.id === brief.value?.primaryAngleId)
      ?.title ??
    brief.value?.primaryAngleId ??
    '—',
);

const selectedConcept = computed(
  () =>
    concepts.value.find(
      (item) => item.id === group.value?.selectedConceptRevisionId,
    ) ??
    concepts.value[0] ??
    null,
);

function isFavorite(concept: CreativeConceptRevision) {
  return (group.value?.favoriteConceptRevisionIds ?? []).includes(concept.id);
}

async function load() {
  loading.value = true;
  errorMessage.value = '';
  needsBrief.value = false;
  try {
    const angles = await getAngles(projectId.value);
    brief.value = angles.activeBrief;
    briefAngles.value = angles.angleSet?.angles ?? [];
    if (!angles.activeBrief) {
      needsBrief.value = true;
      return;
    }
    await loadGroups();
  } catch (error) {
    errorMessage.value = friendlyErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function loadGroups() {
  groups.value = await listConceptGroups(projectId.value);
  group.value = groups.value[0] ?? null;
  activeGroupId.value = group.value?.id ?? '';
  if (group.value) {
    const detail = await getConceptGroup(projectId.value, group.value.id);
    concepts.value = detail.concepts;
    group.value = detail.group;
  } else {
    concepts.value = [];
  }
}

async function switchGroup(groupId: string) {
  const detail = await getConceptGroup(projectId.value, groupId);
  group.value = detail.group;
  concepts.value = detail.concepts;
  activeGroupId.value = groupId;
}

async function generate() {
  if (!brief.value) return;
  if (!canEdit.value) {
    ElMessage.warning('当前角色为只读，不能生成创意');
    return;
  }
  acting.value = true;
  try {
    const result = await generateConcepts(projectId.value, {
      briefId: brief.value.id,
      count: 3,
      scenario: scenario.value,
    });
    setJob(result.jobId);
    ElMessage.info('已启动模拟创意生成任务');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function loadMoodboardVersions() {
  moodboardVersions.value = [];
  moodboardVersionId.value = '';
  if (!moodboardAssetId.value) return;
  moodboardVersions.value = await getAssetContentVersions(
    projectId.value,
    moodboardAssetId.value,
  );
  moodboardVersionId.value =
    moodboardVersions.value.findLast((item) => item.status === 'READY')?.id ??
    '';
}

async function loadMoodboardAssets(_concept: CreativeConceptRevision) {
  const ingestion = await getIngestion(projectId.value);
  moodboardAssets.value = ingestion.assets.filter((asset) =>
    ['image', 'logo'].includes(asset.kind),
  );
  moodboardAssetId.value = moodboardAssets.value[0]?.id ?? '';
  moodboardRole.value = 'MOODBOARD';
  await loadMoodboardVersions();
}

watch(moodboardAssetId, () => {
  void loadMoodboardVersions();
});

async function addMoodboardBinding() {
  if (!editing.value || !moodboardVersionId.value) return;
  bindingSaving.value = true;
  try {
    const existing = editing.value.conceptMoodboardBindings ?? [];
    const updated = await patchConceptMoodboard(
      projectId.value,
      editing.value.id,
      {
        bindings: [
          ...existing,
          {
            assetContentVersionId: moodboardVersionId.value,
            assetId: moodboardAssetId.value,
            usageRole: moodboardRole.value,
          },
        ],
        expectedVersion: editing.value.version,
      },
    );
    editing.value = updated;
    await loadGroups();
    ElMessage.success('情绪板内容版本已绑定到当前草稿');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    bindingSaving.value = false;
  }
}

function openEdit(concept: CreativeConceptRevision) {
  editing.value = concept;
  editForm.value = {
    cta: concept.story.callToAction,
    hook: concept.story.openingHookText,
    logline: concept.logline,
    title: concept.title,
    twist: concept.story.twist,
  };
  editOpen.value = true;
  void loadMoodboardAssets(concept);
}

function conceptPatch() {
  return {
    logline: editForm.value.logline,
    story: {
      callToAction: editForm.value.cta,
      openingHookText: editForm.value.hook,
      twist: editForm.value.twist,
    },
    title: editForm.value.title,
  };
}

function openConceptConflict(latest: CreativeConceptRevision) {
  conflictConcept.value = latest;
  conflictFields.value = [
    {
      label: '标题',
      latest: latest.title,
      local: editForm.value.title,
    },
    {
      label: 'Logline',
      latest: latest.logline,
      local: editForm.value.logline,
    },
    {
      label: '开场 Hook',
      latest: latest.story.openingHookText,
      local: editForm.value.hook,
    },
    {
      label: '服务端版本',
      latest: `R${latest.revisionNo} · v${latest.version} · ${latest.status}`,
      local: `R${editing.value?.revisionNo ?? '—'} · v${editing.value?.version ?? '—'}`,
    },
  ];
  conflictOpen.value = true;
}

function conceptById(id: string) {
  return concepts.value.find((item) => item.id === id) ?? null;
}

function openCompose() {
  composeBaseId.value = concepts.value[0]?.id ?? '';
  composeHookId.value = concepts.value[1]?.id ?? composeBaseId.value;
  composeCharacterId.value = concepts.value[1]?.id ?? composeBaseId.value;
  composeConflictId.value = concepts.value[2]?.id ?? composeBaseId.value;
  composeCtaId.value = concepts.value[2]?.id ?? composeBaseId.value;
  composeOpen.value = true;
}

async function composeDraft() {
  const base = conceptById(composeBaseId.value);
  if (!base) return;
  composing.value = true;
  try {
    const fork = await forkConcept(
      projectId.value,
      base.id,
      base.version,
      group.value?.briefId,
    );
    const hook = conceptById(composeHookId.value) ?? base;
    const character = conceptById(composeCharacterId.value) ?? base;
    const conflict = conceptById(composeConflictId.value) ?? base;
    const cta = conceptById(composeCtaId.value) ?? base;
    const sources = [base, hook, character, conflict, cta];
    let sharedEvidence = new Set(sources[0]?.claimEvidenceIds);
    for (const source of sources.slice(1)) {
      sharedEvidence = new Set(
        [...sharedEvidence].filter((id) =>
          source.claimEvidenceIds.includes(id),
        ),
      );
    }
    await patchConcept(projectId.value, fork.id, {
      expectedVersion: fork.version,
      patch: {
        claimEvidenceIds: [...sharedEvidence],
        compositionProvenance: [
          { field: 'openingHookText', sourceConceptRevisionId: hook.id },
          { field: 'leadCharacter', sourceConceptRevisionId: character.id },
          { field: 'centralConflict', sourceConceptRevisionId: conflict.id },
          { field: 'callToAction', sourceConceptRevisionId: cta.id },
        ],
        maximumUsefulDurationSec: Math.min(
          ...sources.map((item) => item.maximumUsefulDurationSec),
        ),
        minimumViableDurationSec: Math.min(
          ...sources.map((item) => item.minimumViableDurationSec),
        ),
        missingAssets: [
          ...new Set(sources.flatMap((item) => item.missingAssets)),
        ],
        riskNotes: [
          ...new Set(sources.flatMap((item) => item.riskNotes)),
          sharedEvidence.size === 0
            ? '组合方案需重新核验证据：没有共同证据'
            : '组合方案需重新核验证据：仅继承共同证据，权属和时长仍需复核',
        ],
        suggestedDurationSec: Math.min(
          ...sources.map((item) => item.suggestedDurationSec),
        ),
        story: {
          ...base.story,
          callToAction: cta.story.callToAction,
          centralConflict: conflict.story.centralConflict,
          leadCharacter: character.story.leadCharacter,
          mainSetting: character.story.mainSetting,
          openingHookText: hook.story.openingHookText,
          openingVisualHook: hook.story.openingVisualHook,
          twist: conflict.story.twist,
        },
      },
    });
    composeOpen.value = false;
    await loadGroups();
    ElMessage.success(
      '已生成组合 D 草稿；必须走原提交/审核，不能直接成为 active',
    );
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    composing.value = false;
  }
}

async function saveEdit() {
  if (!editing.value) return;
  acting.value = true;
  try {
    let target = editing.value;
    if (target.status === 'APPROVED') {
      target = await forkConcept(
        projectId.value,
        target.id,
        target.version,
        group.value?.briefId,
      );
    }
    await patchConcept(projectId.value, target.id, {
      expectedVersion: target.version,
      patch: conceptPatch(),
    });
    editOpen.value = false;
    await loadGroups();
    ElMessage.success('创意草稿已保存');
  } catch (error) {
    if (isVersionConflict(error) && editing.value) {
      try {
        const latest = await getConcept(projectId.value, editing.value.id);
        openConceptConflict(latest);
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

async function resolveConceptKeep() {
  if (!conflictConcept.value) return;
  if (conflictConcept.value.status === 'APPROVED') {
    ElMessage.warning('最新方案已审核通过，请选择另存为新草稿');
    return;
  }
  acting.value = true;
  try {
    await patchConcept(projectId.value, conflictConcept.value.id, {
      expectedVersion: conflictConcept.value.version,
      patch: conceptPatch(),
    });
    conflictOpen.value = false;
    editOpen.value = false;
    await loadGroups();
    ElMessage.success('已保留你的编辑并保存到最新方案');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function resolveConceptFork() {
  if (!conflictConcept.value) return;
  acting.value = true;
  try {
    const forked = await forkConcept(
      projectId.value,
      conflictConcept.value.id,
      conflictConcept.value.version,
      group.value?.briefId,
    );
    await patchConcept(projectId.value, forked.id, {
      expectedVersion: forked.version,
      patch: conceptPatch(),
    });
    conflictOpen.value = false;
    editOpen.value = false;
    await loadGroups();
    ElMessage.success('已另存为新创意草稿，旧版本保留');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function resolveConceptLatest() {
  conflictOpen.value = false;
  editOpen.value = false;
  await loadGroups();
  ElMessage.info('已加载服务端最新方案，你的未保存编辑已放弃');
}

async function toggleFavorite(concept: CreativeConceptRevision) {
  if (!group.value) return;
  try {
    await favoriteConcept(
      projectId.value,
      group.value.id,
      concept.id,
      !isFavorite(concept),
    );
    await loadGroups();
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  }
}

async function select(concept: CreativeConceptRevision) {
  if (!group.value) return;
  try {
    await selectConcept(
      projectId.value,
      group.value.id,
      concept.id,
      group.value.version,
    );
    await loadGroups();
    ElMessage.success('已设为候选，尚未审核通过');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  }
}

async function submitReview(concept: CreativeConceptRevision) {
  acting.value = true;
  try {
    await submitConceptReview(projectId.value, concept.id, concept.version);
    await loadGroups();
    ElMessage.success('已提交审核');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function approve(concept: CreativeConceptRevision) {
  if (!group.value) return;
  if (!canApprove.value) {
    ElMessage.warning('当前角色没有审核权，请由项目拥有者或获授权审核员确认');
    return;
  }
  try {
    await ElMessageBox.confirm(
      '确认后该方案成为正式创意，另外两套仍保留为备选；进入剧本后如需换方案会触发下游复核。',
      '确认创意方案',
      { cancelButtonText: '取消', confirmButtonText: '确认方案' },
    );
    await selectConcept(
      projectId.value,
      group.value.id,
      concept.id,
      group.value.version,
    );
    await approveConcept(projectId.value, concept.id, concept.version);
    ElMessage.success('创意方案已确认');
    await router.push(`/studio/${projectId.value}/script`);
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(friendlyErrorMessage(error));
    }
  }
}

async function reject(concept: CreativeConceptRevision) {
  try {
    const { value } = await ElMessageBox.prompt('请填写退回原因', '退回方案', {
      cancelButtonText: '取消',
      confirmButtonText: '退回',
      inputPlaceholder: '例如：故事太像广告',
    });
    await rejectConcept(projectId.value, concept.id, concept.version, value);
    await loadGroups();
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(friendlyErrorMessage(error));
    }
  }
}

async function askDirector(concept: CreativeConceptRevision) {
  const message = feedback.value.trim();
  if (!message) {
    ElMessage.warning('请输入修改意见');
    return;
  }
  acting.value = true;
  try {
    plan.value = await createChangePlan(projectId.value, {
      scope: 'CONCEPT',
      targetId: concept.id,
      userMessage: message,
    });
    planOpen.value = true;
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function applyPlan() {
  if (!plan.value) return;
  acting.value = true;
  try {
    await applyChangePlan(projectId.value, plan.value.id, {
      expectedVersion: plan.value.version,
    });
    planOpen.value = false;
    plan.value = null;
    feedback.value = '';
    await loadGroups();
    ElMessage.success('修改计划已应用为草稿');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

const comparison = computed(() =>
  concepts.value.map((concept, index) => ({
    audience: index === 1 ? '痛点共鸣强' : '好奇/身份认同',
    capacity: `${concept.suggestedDurationSec}s`,
    complexity: concept.complexity,
    concept,
    novelty: index === 0 ? '高' : '中',
    truth: concept.riskNotes.length > 0 ? '需复核' : '较稳',
  })),
);

onMounted(load);
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <div class="vc-m2-page">
    <div v-if="loading" class="vc-m2-loading">正在读取创意 Brief 与方案…</div>

    <GuardNotice
      v-else-if="needsBrief"
      description="需要先在创意方向页确认主切口与创意 Brief，才能生成三套故事方案。"
      label="去确认创意 Brief"
      title="还没有已确认的创意 Brief"
      :to="`/studio/${projectId}/angles`"
    />

    <section v-else-if="errorMessage" class="vc-card vc-m2-error">
      <h2>无法加载创意方案</h2>
      <p>{{ errorMessage }}</p>
      <ElButton @click="load">重试</ElButton>
    </section>

    <template v-else>
      <header class="vc-m2-head">
        <div>
          <p class="vc-m2-eyebrow">S3 · 创意故事比较</p>
          <h1>同一产品，至少三种讲法</h1>
          <p class="vc-m2-sub">
            三套方案必须在人物/场景/冲突/结构/产品出现方式上形成实质差异；评分仅为
            Mock 启发式。
          </p>
        </div>
        <div class="vc-m2-head__actions">
          <ElButton
            :type="conceptViewMode === 'COMPARE' ? 'primary' : ''"
            size="small"
            @click="conceptViewMode = 'COMPARE'"
          >
            方案对比
          </ElButton>
          <ElButton
            :type="conceptViewMode === 'EXPLORATION' ? 'primary' : ''"
            size="small"
            @click="conceptViewMode = 'EXPLORATION'"
          >
            自由探索
          </ElButton>
          <ElButton
            v-if="conceptViewMode === 'EXPLORATION'"
            size="small"
            text
            @click="resetConceptLayout"
          >
            重置布局
          </ElButton>
          <template v-if="conceptViewMode === 'EXPLORATION'">
            <ElButton size="small" text @click="zoomConcept(-0.1)">
              −
            </ElButton>
            <span class="vc-concept-zoom">
              {{ Math.round(conceptViewport.scale * 100) }}%
            </span>
            <ElButton size="small" text @click="zoomConcept(0.1)">
              ＋
            </ElButton>
          </template>
          <ElSelect
            v-if="groups.length > 0"
            v-model="activeGroupId"
            size="small"
            style="width: 150px"
            @change="switchGroup"
          >
            <ElOption
              v-for="(item, index) in groups"
              :key="item.id"
              :label="`创意组 ${index + 1}`"
              :value="item.id"
            />
          </ElSelect>
          <ElSelect v-model="scenario" size="small" style="width: 160px">
            <ElOption label="正常生成" value="NORMAL" />
            <ElOption label="三套雷同（演示）" value="HOMOGENEOUS_CONCEPTS" />
            <ElOption label="模拟失败" value="FAIL_BEFORE_RESULT" />
          </ElSelect>
          <ElButton
            v-if="concepts.length > 1"
            size="small"
            @click="openCompose"
          >
            组合创意 D
          </ElButton>
          <ElButton :loading="acting" type="primary" @click="generate">
            {{ concepts.length > 0 ? '再生成三套' : '生成三套创意' }}
          </ElButton>
        </div>
      </header>

      <JobProgress v-if="job" :job="job" title="创意故事生成任务" />

      <section v-if="brief" class="vc-card vc-m2-brief">
        <div>
          <span class="vc-m2-muted">已确认 Brief</span>
          <strong>{{
            objectiveLabels[brief.marketingGoal] ?? brief.marketingGoal
          }}</strong>
        </div>
        <div>
          <span class="vc-m2-muted">主切口</span>
          <strong>{{ primaryAngleTitle }}</strong>
        </div>
        <div>
          <span class="vc-m2-muted">目标人群</span>
          <strong>{{ brief.targetPersonaIds.length }} 类</strong>
        </div>
        <div>
          <span class="vc-m2-muted">禁止主张</span>
          <strong>{{ brief.prohibitedClaims.length }} 条</strong>
        </div>
        <ElButton text @click="router.push(`/studio/${projectId}/angles`)">
          修改 Brief
        </ElButton>
      </section>

      <ElAlert
        v-if="group?.homogeneous"
        :closable="false"
        show-icon
        title="系统检测到三套方案创意同质化：人物/场景/冲突差异不足，建议重新构思差异化方案。"
        type="warning"
      />

      <div v-if="concepts.length === 0" class="vc-m2-empty vc-card">
        <h2>还没有创意方案</h2>
        <p class="vc-m2-muted">
          确认 Brief 后生成三套故事；每套都必须能被拍出来、讲清楚、可审核。
        </p>
        <ElButton type="primary" :loading="acting" @click="generate">
          生成三套创意
        </ElButton>
      </div>

      <div
        v-else
        :class="{
          'is-exploration': conceptViewMode === 'EXPLORATION',
        }"
        :style="{
          transform: `translate(${conceptViewport.panX}px, ${conceptViewport.panY}px) scale(${conceptViewport.scale})`,
          transformOrigin: 'top center',
        }"
        class="vc-m2-concept-grid"
        @pointerdown.self="startConceptPan"
      >
        <article
          v-for="(concept, index) in concepts"
          :key="concept.id"
          :class="{
            'is-focused': focusedConceptId === concept.id,
            'is-selected': concept.id === selectedConcept?.id,
          }"
          :style="
            conceptViewMode === 'EXPLORATION'
              ? {
                  transform: `translate(${pointFor(concept.id).x}px, ${pointFor(concept.id).y}px)`,
                }
              : undefined
          "
          class="vc-card vc-m2-concept"
        >
          <header>
            <span class="vc-m2-concept-index"
              >方案 {{ String.fromCharCode(65 + index) }}</span
            >
            <button
              v-if="conceptViewMode === 'EXPLORATION'"
              class="vc-m2-concept-drag"
              type="button"
              @pointerdown.stop="startDrag($event, concept.id)"
            >
              拖动
            </button>
            <div>
              <ElButton
                v-if="isFavorite(concept)"
                size="small"
                text
                @click="toggleFavorite(concept)"
              >
                ★ 已收藏
              </ElButton>
              <ElButton
                v-else
                size="small"
                text
                @click="toggleFavorite(concept)"
              >
                ☆ 收藏
              </ElButton>
              <ElButton
                size="small"
                text
                @click.stop="
                  focusedConceptId =
                    focusedConceptId === concept.id ? '' : concept.id
                "
              >
                {{ focusedConceptId === concept.id ? '取消聚焦' : '聚焦' }}
              </ElButton>
              <ElTag
                size="small"
                :type="
                  concept.status === 'APPROVED'
                    ? 'success'
                    : concept.status === 'WAITING_REVIEW'
                      ? 'warning'
                      : 'info'
                "
              >
                {{ concept.status }}
              </ElTag>
            </div>
          </header>
          <h2>{{ concept.title }}</h2>
          <p class="vc-m2-one-liner">{{ concept.logline }}</p>
          <div class="vc-m2-concept-cover">
            <span>{{ concept.story.openingVisualHook }}</span>
          </div>
          <dl>
            <dt>开场钩子</dt>
            <dd>{{ concept.story.openingHookText }}</dd>
            <dt>主角 / 场景</dt>
            <dd>
              {{ concept.story.leadCharacter }} ·
              {{ concept.story.mainSetting }}
            </dd>
            <dt>冲突</dt>
            <dd>{{ concept.story.centralConflict }}</dd>
            <dt>反转</dt>
            <dd>{{ concept.story.twist }}</dd>
            <dt>产品植入</dt>
            <dd>{{ concept.story.productReveal }}</dd>
            <dt>CTA</dt>
            <dd>{{ concept.story.callToAction }}</dd>
            <dt>建议时长</dt>
            <dd>
              {{ concept.suggestedDurationSec }}s / 复杂度
              {{ concept.complexity }}
            </dd>
          </dl>
          <p v-if="concept.moodboardAssetIds.length > 0" class="vc-m2-muted">
            情绪板资产：{{ concept.moodboardAssetIds.join(' / ') }}
          </p>
          <p v-if="concept.compositionProvenance?.length" class="vc-m2-muted">
            组合来源：
            {{
              concept.compositionProvenance
                .map((item) => `${item.field}←${item.sourceConceptRevisionId}`)
                .join(' / ')
            }}
          </p>
          <p v-if="concept.riskNotes.length > 0" class="vc-m2-muted">
            风险：{{ concept.riskNotes.join('；') }}
          </p>
          <footer class="vc-m2-concept-actions">
            <ElButton size="small" @click="openEdit(concept)">编辑</ElButton>
            <ElButton size="small" @click="select(concept)">设为候选</ElButton>
            <ElButton
              v-if="concept.status === 'DRAFT'"
              size="small"
              @click="submitReview(concept)"
            >
              提交审核
            </ElButton>
            <ElButton
              v-if="concept.status === 'WAITING_REVIEW' && canApprove"
              size="small"
              type="primary"
              @click="approve(concept)"
            >
              确认方案
            </ElButton>
            <ElButton
              v-if="concept.status === 'WAITING_REVIEW'"
              size="small"
              text
              type="danger"
              @click="reject(concept)"
            >
              退回
            </ElButton>
            <ElButton size="small" text @click="select(concept)">
              选中比较
            </ElButton>
          </footer>
        </article>
      </div>

      <section v-if="concepts.length > 0" class="vc-card vc-m2-compare">
        <h3>方案对比（Mock 启发式，不代表真实投放结果）</h3>
        <table>
          <thead>
            <tr>
              <th>方案</th>
              <th>受众共鸣</th>
              <th>新奇感</th>
              <th>真实性</th>
              <th>内容容量</th>
              <th>制作复杂度</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in comparison" :key="row.concept.id">
              <td>{{ row.concept.title }}</td>
              <td>{{ row.audience }}</td>
              <td>{{ row.novelty }}</td>
              <td>{{ row.truth }}</td>
              <td>{{ row.capacity }}</td>
              <td>{{ row.complexity }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-if="selectedConcept" class="vc-card vc-m2-director">
        <h3>AI 导演讨论 · {{ selectedConcept.title }}</h3>
        <p class="vc-m2-muted">
          先展示修改计划与前后差异，确认采用后才写入草稿；不调用真实模型。
        </p>
        <div class="vc-m2-director-input">
          <ElInput
            v-model="feedback"
            placeholder="例如：更关注用户痛点，减少广告味"
            @keyup.enter="askDirector(selectedConcept)"
          />
          <ElButton :loading="acting" @click="askDirector(selectedConcept)">
            生成修改计划
          </ElButton>
        </div>
      </section>

      <div class="vc-m2-footer">
        <span class="vc-m2-muted"
          >当前候选：{{ selectedConcept?.title ?? '未选择' }}</span
        >
        <span>
          <ElButton @click="router.push(`/studio/${projectId}/angles`)"
            >返回切口</ElButton
          >
          <ElButton
            :disabled="
              !canApprove ||
              !selectedConcept ||
              selectedConcept.status !== 'WAITING_REVIEW'
            "
            type="primary"
            @click="selectedConcept && approve(selectedConcept)"
          >
            确认选择该方案 → 剧本
          </ElButton>
        </span>
      </div>
    </template>

    <VersionConflictDialog
      v-model:open="conflictOpen"
      :busy="acting"
      :can-keep="conflictConcept?.status !== 'APPROVED'"
      :fields="conflictFields"
      title="创意方案版本冲突"
      @fork="resolveConceptFork"
      @keep="resolveConceptKeep"
      @latest="resolveConceptLatest"
    />

    <ElDrawer
      v-model="editOpen"
      title="编辑创意方案（生成新草稿）"
      size="480px"
    >
      <div v-if="editing" class="vc-m2-form">
        <label>标题</label><ElInput v-model="editForm.title" />
        <label>Logline</label
        ><ElInput v-model="editForm.logline" :rows="3" type="textarea" />
        <label>开场 Hook</label
        ><ElInput v-model="editForm.hook" :rows="2" type="textarea" />
        <label>反转</label
        ><ElInput v-model="editForm.twist" :rows="2" type="textarea" />
        <label>CTA</label
        ><ElInput v-model="editForm.cta" :rows="2" type="textarea" />
        <section class="vc-moodboard-bind">
          <h4>情绪板内容版本</h4>
          <ul v-if="(editing.conceptMoodboardBindings ?? []).length > 0">
            <li
              v-for="binding in editing.conceptMoodboardBindings"
              :key="binding.assetContentVersionId"
            >
              {{ binding.usageRole }} · {{ binding.assetId }} ·
              {{ binding.assetContentVersionId }}
            </li>
          </ul>
          <p v-else class="vc-m2-muted">尚未绑定精确内容版本。</p>
          <ElSelect
            v-model="moodboardAssetId"
            placeholder="选择素材"
            size="small"
          >
            <ElOption
              v-for="asset in moodboardAssets"
              :key="asset.id"
              :label="asset.filename"
              :value="asset.id"
            />
          </ElSelect>
          <ElSelect
            v-model="moodboardVersionId"
            placeholder="选择内容版本"
            size="small"
          >
            <ElOption
              v-for="version in moodboardVersions"
              :key="version.id"
              :disabled="version.status !== 'READY'"
              :label="`v${version.contentRevisionNo} · ${version.status}`"
              :value="version.id"
            />
          </ElSelect>
          <ElSelect v-model="moodboardRole" size="small">
            <ElOption label="情绪板" value="MOODBOARD" />
            <ElOption label="角色灵感" value="CHARACTER_IDEA" />
            <ElOption label="场景灵感" value="SCENE_IDEA" />
          </ElSelect>
          <ElButton
            :loading="bindingSaving"
            size="small"
            type="primary"
            @click="addMoodboardBinding"
          >
            绑定内容版本
          </ElButton>
        </section>
        <p class="vc-m2-muted">已批准方案会先 Fork 新草稿，旧版本永久保留。</p>
      </div>
      <template #footer>
        <ElButton @click="editOpen = false">取消</ElButton>
        <ElButton :loading="acting" type="primary" @click="saveEdit">
          保存草稿
        </ElButton>
      </template>
    </ElDrawer>

    <ElDialog
      v-model="planOpen"
      title="AI 修改计划（采用前不修改草稿）"
      width="620px"
    >
      <div v-if="plan">
        <p><strong>识别意图：</strong>{{ plan.intent }}</p>
        <p class="vc-m2-muted">{{ plan.mockReasoningSummary }}</p>
        <article
          v-for="(op, index) in plan.operations"
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
          影响：{{ plan.invalidatedStageNames.join(' / ') }} · 风险：{{
            plan.risks.join('；')
          }}
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
  <ElDialog v-model="composeOpen" title="组合创意 D" width="720px">
    <ElAlert
      :closable="false"
      show-icon
      title="组合只生成新草稿 D；原 A/B/C 不变。必须先 Fork 再 PATCH，最终走原提交/审核，不能直接 active。"
      type="warning"
    />
    <div class="vc-compose__grid">
      <label>
        基底方案
        <ElSelect v-model="composeBaseId" placeholder="选择基底">
          <ElOption
            v-for="(item, index) in concepts"
            :key="item.id"
            :label="`方案 ${String.fromCharCode(65 + index)}`"
            :value="item.id"
          />
        </ElSelect>
      </label>
      <label>
        开场钩子来自
        <ElSelect v-model="composeHookId">
          <ElOption
            v-for="(item, index) in concepts"
            :key="item.id"
            :label="`方案 ${String.fromCharCode(65 + index)}`"
            :value="item.id"
          />
        </ElSelect>
      </label>
      <label>
        主角/场景来自
        <ElSelect v-model="composeCharacterId">
          <ElOption
            v-for="(item, index) in concepts"
            :key="item.id"
            :label="`方案 ${String.fromCharCode(65 + index)}`"
            :value="item.id"
          />
        </ElSelect>
      </label>
      <label>
        冲突/反转来自
        <ElSelect v-model="composeConflictId">
          <ElOption
            v-for="(item, index) in concepts"
            :key="item.id"
            :label="`方案 ${String.fromCharCode(65 + index)}`"
            :value="item.id"
          />
        </ElSelect>
      </label>
      <label>
        CTA 来自
        <ElSelect v-model="composeCtaId">
          <ElOption
            v-for="(item, index) in concepts"
            :key="item.id"
            :label="`方案 ${String.fromCharCode(65 + index)}`"
            :value="item.id"
          />
        </ElSelect>
      </label>
    </div>
    <template #footer>
      <ElButton @click="composeOpen = false">取消</ElButton>
      <ElButton :loading="composing" type="primary" @click="composeDraft">
        生成 D 草稿
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.vc-m2-page {
  padding-bottom: 48px;
}

.vc-m2-head {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  justify-content: space-between;
}

.vc-m2-head h1 {
  margin: 2px 0 4px;
  font-size: 24px;
}

.vc-m2-head__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.vc-m2-eyebrow {
  margin: 0;
  font-size: 12px;
  color: var(--el-color-primary);
  letter-spacing: 0.08em;
}

.vc-m2-sub,
.vc-m2-muted {
  font-size: 12px;
  color: var(--vc-text-weak);
}

.vc-m2-brief {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: center;
  margin-top: 12px;
}

.vc-m2-brief > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.vc-m2-brief span {
  font-size: 11px;
}

.vc-m2-concept-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 14px;
}

.vc-concept-zoom {
  min-width: 40px;
  font-size: 11px;
  color: var(--vc-text-weak);
  text-align: center;
}

.vc-m2-concept-grid.is-exploration {
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  cursor: grab;
}

.vc-m2-concept-drag {
  padding: 2px 6px;
  font-size: 10px;
  color: var(--vc-text-weak);
  cursor: grab;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--vc-border);
  border-radius: 4px;
}

.vc-m2-concept-grid.is-exploration .vc-m2-concept {
  transition: box-shadow 0.2s ease;
}

.vc-m2-concept.is-focused {
  border-color: var(--el-color-warning);
  box-shadow: 0 0 0 2px var(--el-color-warning-light-9);
}

.vc-m2-concept {
  display: flex;
  flex-direction: column;
}

.vc-m2-concept.is-selected {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-9);
}

.vc-m2-concept header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.vc-m2-concept-index {
  font-size: 12px;
  color: var(--el-color-primary);
}

.vc-m2-concept h2 {
  margin: 8px 0 4px;
  font-size: 18px;
}

.vc-m2-one-liner {
  font-weight: 600;
  color: var(--el-color-primary-dark-2);
}

.vc-m2-concept-cover {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  padding: 14px;
  margin: 10px 0;
  font-size: 13px;
  color: #fff;
  text-align: center;
  background: linear-gradient(135deg, #6d5ae6, #b7a8f1);
  border-radius: 10px;
}

.vc-m2-concept dl {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 6px 8px;
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
}

.vc-m2-concept dt {
  color: var(--vc-text-weak);
}

.vc-m2-concept dd {
  margin: 0;
}

.vc-m2-concept-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-top: 12px;
  margin-top: auto;
}

.vc-m2-compare {
  margin-top: 14px;
  overflow-x: auto;
}

.vc-m2-compare table {
  width: 100%;
  font-size: 12px;
  border-collapse: collapse;
}

.vc-m2-compare th,
.vc-m2-compare td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid var(--vc-border);
}

.vc-m2-director {
  margin-top: 14px;
}

.vc-m2-director-input {
  display: flex;
  gap: 8px;
}

.vc-m2-empty {
  padding: 30px;
  text-align: center;
}

.vc-m2-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 14px;
  margin-top: 14px;
  border-top: 1px solid var(--vc-border);
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

.vc-m2-diff {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--vc-border);
}

.vc-m2-diff span {
  font-size: 11px;
  color: var(--vc-text-weak);
}

.vc-m2-diff p {
  margin: 4px 0;
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 1280px) {
  .vc-m2-concept-grid {
    grid-template-columns: 1fr;
  }
}

.vc-compose__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.vc-compose__grid label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--vc-text-weak);
}

.vc-moodboard-bind {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px solid var(--vc-border);
}

.vc-moodboard-bind h4 {
  margin: 0;
  font-size: 12px;
}

.vc-moodboard-bind ul {
  padding-left: 16px;
  margin: 0;
  font-size: 11px;
}

@media (max-width: 1366px) {
  .vc-m2-concept-grid.is-exploration {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
