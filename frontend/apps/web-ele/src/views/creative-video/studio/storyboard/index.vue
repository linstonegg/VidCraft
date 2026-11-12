<script lang="ts" setup>
import type { StoryboardState } from '#/api/creative-video/storyboard';
import type {
  CanvasViewport,
  ImageAssetVersion,
  ProductionReadiness,
  ScriptRevision,
  ShotRevision,
  StoryboardOverviewCardVM,
  VideoProject,
  VisualBibleRevision,
} from '#/types/creative-video';

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  ElButton,
  ElDialog,
  ElDrawer,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElTag,
} from 'element-plus';

import {
  addShot,
  applyChangePlan,
  approveShot,
  approveStoryboard,
  approveVisualBible,
  batchApproveShots,
  createChangePlan,
  createShotRevision,
  deleteShot,
  duplicateShot,
  generateReferenceImage,
  generateStoryboard,
  generateVisualBible,
  getProductionReadiness,
  getReferenceImages,
  getScriptsState,
  getShot,
  getShots,
  getStoryboardState,
  listVisualBibles,
  mergeShots,
  patchShot,
  patchVisualBible,
  reorderShots,
  selectReferenceImage,
  splitShot,
} from '#/api/creative-video';
import GuardNotice from '#/components/creative-video/m2/GuardNotice.vue';
import VersionConflictDialog from '#/components/creative-video/m2/VersionConflictDialog.vue';
import AssetReferencePicker from '#/components/creative-video/m21/AssetReferencePicker.vue';
import AssetRelationshipPanel from '#/components/creative-video/m21/AssetRelationshipPanel.vue';
import ProductionReadinessPanel from '#/components/creative-video/m21/ProductionReadinessPanel.vue';
import StudioContextSignalsPanel from '#/components/creative-video/m21/StudioContextSignalsPanel.vue';
import { useJobPolling } from '#/composables/creative-video/use-job-polling';
import { useM2JobId } from '#/composables/creative-video/use-m2-job';
import { usePresentationPreference } from '#/composables/creative-video/use-presentation-preference';
import { useProjectAccess } from '#/composables/creative-video/use-project-access';
import {
  friendlyErrorMessage,
  isVersionConflict,
} from '#/utils/creative-video/errors';
import { formatMs } from '#/utils/creative-video/m2-timeline';
import JobProgress from '#/views/creative-video/studio/ingest/components/JobProgress.vue';

defineOptions({ name: 'VidCraftStoryboard' });

const props = defineProps<{ project?: null | VideoProject }>();
const route = useRoute();
const router = useRouter();
const projectId = computed(() => String(route.params.id ?? ''));
const projectRef = computed(() => props.project ?? null);
const { canApprove, canEdit } = useProjectAccess(projectRef);

const loading = ref(true);
const errorMessage = ref('');
const needsScript = ref(false);
const state = ref<null | StoryboardState>(null);
const script = ref<null | ScriptRevision>(null);
const bibles = ref<VisualBibleRevision[]>([]);
const selectedShotId = ref('');
const readiness = ref<null | ProductionReadiness>(null);
const referenceImages = ref<ImageAssetVersion[]>([]);
const { clearJob, jobId, setJob } = useM2JobId();
const acting = ref(false);
const bibleOpen = ref(false);
const conflictOpen = ref(false);
const conflictShot = ref<null | ShotRevision>(null);
const conflictFields = ref<
  Array<{ label: string; latest: string; local: string }>
>([]);
const planOpen = ref(false);
const changePlan = ref<any>(null);
const feedback = ref('');

const editForm = ref({
  action: '',
  camera: '',
  dialogue: '',
  durationMs: 5000,
  narration: '',
  placement: '',
  scene: '',
  subtitles: '',
  title: '',
  transitionOverlap: 0,
});
const bibleForm = ref({
  characterLook: '',
  sceneLighting: '',
});

const { job } = useJobPolling(jobId, {
  onTerminal: async (result) => {
    if (result.status === 'SUCCEEDED') ElMessage.success('Mock 任务已完成');
    else ElMessage.error(result.errorMessage ?? '任务失败，旧数据仍保留');
    clearJob();
    await load();
  },
});

const viewMode = ref<'SHOT_DETAIL' | 'SHOT_OVERVIEW'>('SHOT_DETAIL');
const selectedStoryboardId = ref('');
const overviewShots = ref<ShotRevision[]>([]);
const overviewLoaded = ref(false);
const overviewLoading = ref(false);
const overviewError = ref('');
const orderOpen = ref(false);
const orderDraft = ref<ShotRevision[]>([]);
const orderSaving = ref(false);
const orderChanged = computed(() => {
  const currentIds = visibleOverviewShots.value.map((shot) => shot.shotId);
  return (
    orderDraft.value.length !== currentIds.length ||
    orderDraft.value.some((shot, index) => shot.shotId !== currentIds[index])
  );
});
const presentation = usePresentationPreference(projectId);
viewMode.value =
  presentation.preference.value.storyboardViewMode === 'SHOT_OVERVIEW'
    ? 'SHOT_OVERVIEW'
    : 'SHOT_DETAIL';
watch(viewMode, (mode) => {
  presentation.update({ storyboardViewMode: mode });
});
const overviewPositions = ref<Record<string, { x: number; y: number }>>({});
const overviewViewport = ref<CanvasViewport>({
  panX: 0,
  panY: 0,
  scale: 1,
});
let canvasPan: null | {
  baseX: number;
  baseY: number;
  startX: number;
  startY: number;
} = null;
const storyboardContext = computed(() =>
  presentation.contextKey(
    'storyboard',
    selectedStoryboardId.value || state.value?.latest?.id || 'latest',
  ),
);
let overviewDrag: null | {
  baseX: number;
  baseY: number;
  id: string;
  startX: number;
  startY: number;
} = null;

watch(
  storyboardContext,
  () => {
    overviewPositions.value = presentation.getLayout(storyboardContext.value);
    overviewViewport.value = presentation.getViewport(
      storyboardContext.value,
    ) ?? { panX: 0, panY: 0, scale: 1 };
  },
  { immediate: true },
);

function overviewPoint(id: string) {
  return overviewPositions.value[id] ?? { x: 0, y: 0 };
}

function startOverviewDrag(event: PointerEvent, id: string) {
  event.preventDefault();
  const point = overviewPoint(id);
  overviewDrag = {
    baseX: point.x,
    baseY: point.y,
    id,
    startX: event.clientX,
    startY: event.clientY,
  };
  window.addEventListener('pointermove', onOverviewDrag);
  window.addEventListener('pointerup', onOverviewDragEnd, { once: true });
}

function onOverviewDrag(event: PointerEvent) {
  if (!overviewDrag) return;
  overviewPositions.value = {
    ...overviewPositions.value,
    [overviewDrag.id]: {
      x: Math.max(
        -200,
        Math.min(200, overviewDrag.baseX + event.clientX - overviewDrag.startX),
      ),
      y: Math.max(
        -120,
        Math.min(240, overviewDrag.baseY + event.clientY - overviewDrag.startY),
      ),
    },
  };
}

function onOverviewDragEnd() {
  if (overviewDrag) {
    presentation.setPoint(
      storyboardContext.value,
      overviewDrag.id,
      overviewPoint(overviewDrag.id),
    );
    overviewDrag = null;
  }
  window.removeEventListener('pointermove', onOverviewDrag);
}

function saveOverviewViewport() {
  presentation.setViewport(storyboardContext.value, {
    ...overviewViewport.value,
  });
}

function zoomOverview(delta: number) {
  overviewViewport.value = {
    ...overviewViewport.value,
    scale: Math.max(0.5, Math.min(1.6, overviewViewport.value.scale + delta)),
  };
  saveOverviewViewport();
}

function startCanvasPan(event: PointerEvent) {
  if (event.target !== event.currentTarget) return;
  canvasPan = {
    baseX: overviewViewport.value.panX,
    baseY: overviewViewport.value.panY,
    startX: event.clientX,
    startY: event.clientY,
  };
  window.addEventListener('pointermove', onCanvasPan);
  window.addEventListener('pointerup', onCanvasPanEnd, { once: true });
}

function onCanvasPan(event: PointerEvent) {
  if (!canvasPan) return;
  overviewViewport.value = {
    ...overviewViewport.value,
    panX: canvasPan.baseX + event.clientX - canvasPan.startX,
    panY: canvasPan.baseY + event.clientY - canvasPan.startY,
  };
}

function onCanvasPanEnd() {
  canvasPan = null;
  saveOverviewViewport();
  window.removeEventListener('pointermove', onCanvasPan);
}

function resetOverviewLayout() {
  presentation.reset();
  overviewPositions.value = {};
  overviewViewport.value = { panX: 0, panY: 0, scale: 1 };
  ElMessage.success('已恢复默认布局');
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onOverviewDrag);
});
const overviewSelected = ref<null | StoryboardOverviewCardVM>(null);
const selectedStoryboard = computed(
  () =>
    (state.value?.storyboards ?? []).find(
      (item) => item.id === selectedStoryboardId.value,
    ) ?? state.value?.latest,
);
const viewingContext = computed(() => {
  const selected = selectedStoryboard.value;
  if (!selected) return 'WORKING_DRAFT';
  if (selected.status !== 'APPROVED') return 'WORKING_DRAFT';
  if (state.value?.latest?.id === selected.id) return 'APPROVED_BASELINE';
  return 'HISTORY';
});
const visibleOverviewShots = computed(() =>
  overviewLoaded.value ? overviewShots.value : shots.value,
);
const overviewCards = computed<StoryboardOverviewCardVM[]>(() => {
  const selected = selectedStoryboard.value;
  const context = viewingContext.value;
  return visibleOverviewShots.value.map((shot, index) => {
    const image = (state.value?.images ?? []).find(
      (item) => item.id === shot.activeReferenceImageId,
    );
    let baselineValidity: 'BLOCKED' | 'CURRENT' | 'REVIEW_REQUIRED' =
      'REVIEW_REQUIRED';
    if (readiness.value?.effectiveValidity === 'BLOCKED') {
      baselineValidity = 'BLOCKED';
    } else if (
      readiness.value?.effectiveValidity === 'CURRENT' &&
      selected?.status === 'APPROVED' &&
      context === 'APPROVED_BASELINE'
    ) {
      baselineValidity = 'CURRENT';
    }
    const imageInvalid =
      !shot.activeReferenceImageId ||
      !image ||
      image.status !== 'READY' ||
      image.shotId !== shot.shotId ||
      !shot.referenceImageVersionIds.includes(shot.activeReferenceImageId);
    return {
      approvedShotRevisionId:
        shot.reviewStatus === 'APPROVED' ? shot.id : undefined,
      displayedStoryboardRevisionId: selected?.id ?? '',
      draftShotRevisionId:
        shot.reviewStatus === 'APPROVED' ? undefined : shot.id,
      durationMs: shot.durationMs,
      effectiveValidity:
        imageInvalid || shot.reviewStatus === 'STALE'
          ? 'BLOCKED'
          : baselineValidity,
      orderIndex: index,
      referencedCharacterIds: shot.characterIds,
      referencedSceneIds: shot.sceneIds,
      reviewStatus: shot.reviewStatus,
      selectedReferenceImageVersionId: shot.activeReferenceImageId,
      shotId: shot.shotId,
      shotRevisionId: shot.id,
      storyBeatId: shot.storyBeatId,
      viewingContext: context,
      warnings: [
        shot.activeReferenceImageId ? '' : '缺少选定参考图',
        shot.activeReferenceImageId && !image ? '参考图不存在' : '',
        image && image.status !== 'READY' ? `参考图状态 ${image.status}` : '',
        image && image.shotId !== shot.shotId ? '参考图不属于该镜头' : '',
        shot.activeReferenceImageId &&
        !shot.referenceImageVersionIds.includes(shot.activeReferenceImageId)
          ? '选定参考图不属于该镜头版本'
          : '',
        shot.reviewStatus === 'STALE' ? '镜头修订已过期' : '',
        readiness.value?.canEnterM3 === false ? '正式链仍有阻塞' : '',
        shot.reviewStatus === 'APPROVED' ? '' : '镜头尚未批准',
      ].filter(Boolean),
    };
  });
});
const overviewGroups = computed(() => {
  const groups = new Map<
    string,
    { cards: StoryboardOverviewCardVM[]; id: string; title: string }
  >();
  for (const beat of script.value?.beats ?? []) {
    groups.set(beat.id, {
      cards: [],
      id: beat.id,
      title: beat.title ?? beat.id,
    });
  }
  for (const card of overviewCards.value) {
    const group = groups.get(card.storyBeatId) ?? {
      cards: [],
      id: card.storyBeatId,
      title: card.storyBeatId,
    };
    group.cards.push(card);
    groups.set(card.storyBeatId, group);
  }
  return [...groups.values()].filter((group) => group.cards.length > 0);
});
const shots = computed(() => state.value?.shots ?? []);
const current = computed(
  () =>
    shots.value.find((item) => item.shotId === selectedShotId.value) ??
    shots.value[0] ??
    null,
);
const currentImage = computed(() => {
  if (!current.value) return null;
  return (
    referenceImages.value.find(
      (item) => item.id === current.value?.activeReferenceImageId,
    ) ??
    referenceImages.value[0] ??
    null
  );
});
const approvedBible = computed(
  () => bibles.value.find((item) => item.status === 'APPROVED') ?? null,
);
const latestBible = computed(() => bibles.value[0] ?? null);
const bible = computed(() => approvedBible.value ?? latestBible.value);
const canGenerateStoryboard = computed(
  () => Boolean(script.value?.id) && Boolean(approvedBible.value),
);
const allApproved = computed(
  () =>
    shots.value.length > 0 &&
    shots.value.every((shot) => shot.reviewStatus === 'APPROVED'),
);
const selectedIndex = computed(() =>
  shots.value.findIndex((item) => item.shotId === current.value?.shotId),
);

async function load() {
  loading.value = true;
  errorMessage.value = '';
  needsScript.value = false;
  try {
    const [scriptState, biblesList] = await Promise.all([
      getScriptsState(projectId.value),
      listVisualBibles(projectId.value),
    ]);
    script.value = scriptState.active;
    bibles.value = biblesList;
    if (!scriptState.active) {
      needsScript.value = true;
      return;
    }
    state.value = await getStoryboardState(projectId.value);
    readiness.value = await getProductionReadiness(projectId.value);
    if (state.value.shots.length > 0) {
      if (
        !state.value.shots.some((item) => item.shotId === selectedShotId.value)
      ) {
        selectedShotId.value = state.value.shots[0]?.shotId ?? '';
      }
      await loadImages();
      syncForm();
    }
  } catch (error) {
    errorMessage.value = friendlyErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function loadImages() {
  if (!current.value) {
    referenceImages.value = [];
    return;
  }
  referenceImages.value = await getReferenceImages(
    projectId.value,
    current.value.shotId,
  );
}

function syncForm() {
  if (!current.value) return;
  editForm.value = {
    action: current.value.actionDescription,
    camera: current.value.cameraPlan,
    dialogue: current.value.dialogue,
    durationMs: current.value.durationMs,
    narration: current.value.narration,
    placement: current.value.productPlacement,
    scene: current.value.sceneDescription,
    subtitles: current.value.subtitles.join('\n'),
    title: current.value.title,
    transitionOverlap: current.value.transitionOverlapToNextMs,
  };
}

watch(current, () => {
  syncForm();
  void loadImages();
});

function openOverviewCard(card: StoryboardOverviewCardVM) {
  overviewSelected.value = card;
  if (card.viewingContext === 'HISTORY') {
    void router.replace({
      query: {
        ...route.query,
        sb: selectedStoryboardId.value,
        shot: card.shotId,
        shotRevision: card.shotRevisionId,
      },
    });
    return;
  }
  const shot = visibleOverviewShots.value.find(
    (item) => item.shotId === card.shotId,
  );
  if (shot) openShotFromOverview(shot);
}

function openOrderDialog() {
  orderDraft.value = [...visibleOverviewShots.value];
  orderOpen.value = true;
}

function moveOrderDraft(index: number, delta: number) {
  const target = index + delta;
  const item = orderDraft.value[index];
  const neighbor = orderDraft.value[target];
  if (!item || !neighbor || item.storyBeatId !== neighbor.storyBeatId) {
    ElMessage.warning('P1 只允许在同一个 StoryBeat 内调整顺序');
    return;
  }
  const next = [...orderDraft.value];
  next.splice(index, 1);
  next.splice(target, 0, item);
  orderDraft.value = next;
}

async function saveOrderDraft() {
  if (!state.value?.latest) return;
  orderSaving.value = true;
  try {
    const revision = await reorderShots(projectId.value, {
      expectedStoryboardVersion: state.value.latest.version,
      orderedShotIds: orderDraft.value.map((shot) => shot.shotId),
    });
    orderOpen.value = false;
    selectedStoryboardId.value = revision.id;
    overviewLoaded.value = false;
    await load();
    await selectOverviewRevision(revision.id);
    ElMessage.success('已创建新分镜草稿；旧正式版保留，需重新审核');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    orderSaving.value = false;
  }
}

function selectShotById(shotId: string) {
  const shot = shots.value.find((item) => item.shotId === shotId);
  if (!shot) return;
  viewMode.value = 'SHOT_DETAIL';
  void selectShot(shot);
}

function closeOverviewSelected() {
  overviewSelected.value = null;
}

function openShotFromOverview(shot: ShotRevision) {
  viewMode.value = 'SHOT_DETAIL';
  void selectShot(shot);
}

async function selectOverviewRevision(revisionId: string) {
  if (!revisionId) return;
  overviewLoading.value = true;
  overviewError.value = '';
  try {
    overviewShots.value = await getShots(projectId.value, revisionId);
    overviewLoaded.value = true;
  } catch (error) {
    overviewError.value = friendlyErrorMessage(error);
  } finally {
    overviewLoading.value = false;
  }
}

async function setViewMode(mode: 'SHOT_DETAIL' | 'SHOT_OVERVIEW') {
  viewMode.value = mode;
  if (mode !== 'SHOT_OVERVIEW') return;
  if (!selectedStoryboardId.value) {
    selectedStoryboardId.value =
      state.value?.latest?.id ?? state.value?.storyboards[0]?.id ?? '';
  }
  if (selectedStoryboardId.value && !overviewLoaded.value) {
    await selectOverviewRevision(selectedStoryboardId.value);
  }
}

async function selectShot(shot: ShotRevision) {
  selectedShotId.value = shot.shotId;
  syncForm();
  await loadImages();
}

async function generateBible() {
  if (!script.value) return;
  acting.value = true;
  try {
    const result = await generateVisualBible(projectId.value, {
      scriptRevisionId: script.value.id,
    });
    setJob(result.jobId);
    ElMessage.info('正在生成角色/场景/品牌视觉规范');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function approveBible() {
  if (!latestBible.value) return;
  acting.value = true;
  try {
    await approveVisualBible(
      projectId.value,
      latestBible.value.id,
      latestBible.value.version,
    );
    await load();
    ElMessage.success('视觉规范已确认');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function generateBoard() {
  if (!script.value || !approvedBible.value) return;
  acting.value = true;
  try {
    const result = await generateStoryboard(projectId.value, {
      scriptRevisionId: script.value.id,
      visualBibleVersionId: approvedBible.value.id,
    });
    setJob(result.jobId);
    ElMessage.info('正在生成图文分镜');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

function currentShotPatch() {
  return {
    actionDescription: editForm.value.action,
    cameraPlan: editForm.value.camera,
    dialogue: editForm.value.dialogue,
    durationMs: editForm.value.durationMs,
    narration: editForm.value.narration,
    productPlacement: editForm.value.placement,
    sceneDescription: editForm.value.scene,
    subtitles: editForm.value.subtitles.split('\n').filter(Boolean),
    title: editForm.value.title,
    transitionOverlapToNextMs: editForm.value.transitionOverlap,
  };
}

function openShotConflict(latest: ShotRevision) {
  conflictShot.value = latest;
  conflictFields.value = [
    {
      label: '标题',
      latest: latest.title,
      local: editForm.value.title,
    },
    {
      label: '时长',
      latest: `${latest.durationMs}ms`,
      local: `${editForm.value.durationMs}ms`,
    },
    {
      label: '动作',
      latest: latest.actionDescription,
      local: editForm.value.action,
    },
    {
      label: '服务端版本',
      latest: `R${latest.revisionNo} · v${latest.version} · ${latest.reviewStatus}`,
      local: `R${current.value?.revisionNo ?? '—'} · v${current.value?.version ?? '—'}`,
    },
  ];
  conflictOpen.value = true;
}

async function saveShot() {
  if (!current.value) return;
  acting.value = true;
  try {
    const patch = currentShotPatch();
    if (current.value.reviewStatus === 'APPROVED') {
      const forked = await createShotRevision(
        projectId.value,
        current.value.shotId,
        {
          baseRevisionId: current.value.id,
          expectedVersion: current.value.version,
          patch,
        },
      );
      selectedShotId.value = forked.shotId;
      ElMessage.success('已派生镜头新草稿，旧已确认版本保留');
    } else {
      await patchShot(projectId.value, current.value.shotId, current.value.id, {
        expectedVersion: current.value.version,
        patch,
      });
      ElMessage.success('镜头草稿已保存');
    }
    await load();
  } catch (error) {
    if (isVersionConflict(error) && current.value) {
      try {
        const latest = await getShot(projectId.value, current.value.shotId);
        openShotConflict(latest);
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

async function resolveShotKeep() {
  if (!conflictShot.value) return;
  if (conflictShot.value.reviewStatus === 'APPROVED') {
    ElMessage.warning('最新镜头已确认，请选择另存为新草稿');
    return;
  }
  acting.value = true;
  try {
    await patchShot(
      projectId.value,
      conflictShot.value.shotId,
      conflictShot.value.id,
      {
        expectedVersion: conflictShot.value.version,
        patch: currentShotPatch(),
      },
    );
    conflictOpen.value = false;
    await load();
    ElMessage.success('已保留你的编辑并保存到最新镜头版本');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function resolveShotFork() {
  if (!conflictShot.value) return;
  acting.value = true;
  try {
    const forked = await createShotRevision(
      projectId.value,
      conflictShot.value.shotId,
      {
        baseRevisionId: conflictShot.value.id,
        expectedVersion: conflictShot.value.version,
        patch: currentShotPatch(),
      },
    );
    selectedShotId.value = forked.shotId;
    conflictOpen.value = false;
    await load();
    ElMessage.success('已另存为新镜头草稿，旧版本保留');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function resolveShotLatest() {
  conflictOpen.value = false;
  await load();
  ElMessage.info('已加载服务端最新镜头，你的未保存编辑已放弃');
}

async function approveCurrent() {
  if (!current.value) return;
  acting.value = true;
  try {
    await approveShot(
      projectId.value,
      current.value.shotId,
      current.value.id,
      current.value.version,
    );
    await load();
    ElMessage.success(`镜头 ${current.value.order} 已确认`);
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function approveAll() {
  if (!state.value?.latest) return;
  try {
    await ElMessageBox.confirm(
      `将一次性确认 ${shots.value.length} 个镜头的当前修订；任何阻塞项都会导致整批失败。`,
      '批量确认镜头',
      { cancelButtonText: '取消', confirmButtonText: '原子确认全部' },
    );
    await batchApproveShots(projectId.value, {
      items: shots.value.map((shot) => ({
        expectedVersion: shot.version,
        revisionId: shot.id,
        shotId: shot.shotId,
      })),
      storyboardRevisionId: state.value.latest.id,
    });
    await load();
    ElMessage.success('全部镜头已确认');
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(friendlyErrorMessage(error));
    }
  }
}

async function approveBoard() {
  if (!state.value?.latest) return;
  acting.value = true;
  try {
    await approveStoryboard(
      projectId.value,
      state.value.latest.id,
      state.value.latest.version,
    );
    await load();
    ElMessage.success('分镜集合已确认，可以生成预演');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function move(index: number, delta: number) {
  const target = index + delta;
  if (!state.value?.latest || target < 0 || target >= shots.value.length)
    return;
  const next = [...shots.value];
  const [item] = next.splice(index, 1);
  if (!item) return;
  next.splice(target, 0, item);
  acting.value = true;
  try {
    await reorderShots(projectId.value, {
      expectedStoryboardVersion: state.value.latest.version,
      orderedShotIds: next.map((shot) => shot.shotId),
    });
    await load();
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function addNewShot() {
  acting.value = true;
  try {
    await addShot(projectId.value);
    await load();
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function removeCurrent() {
  if (!current.value) return;
  try {
    await ElMessageBox.confirm(
      `删除镜头 ${current.value.order} 会重算时间线，历史版本可从分镜历史恢复。`,
      '删除镜头',
      { cancelButtonText: '取消', confirmButtonText: '删除', type: 'warning' },
    );
    await deleteShot(projectId.value, current.value.shotId);
    await load();
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(friendlyErrorMessage(error));
    }
  }
}

async function duplicateCurrent() {
  if (!current.value) return;
  acting.value = true;
  try {
    await duplicateShot(
      projectId.value,
      current.value.shotId,
      current.value.version,
    );
    await load();
    ElMessage.success('已复制镜头，副本为独立 ID 的新草稿');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function splitCurrent() {
  if (!current.value) return;
  try {
    const { ElMessageBox: MessageBox } = await import('element-plus');
    const { value } = await MessageBox.prompt(
      `当前镜头 ${(current.value.durationMs / 1000).toFixed(1)}s，请输入拆分点（秒）`,
      '拆分镜头',
      {
        cancelButtonText: '取消',
        confirmButtonText: '拆分',
        inputValue: String(Math.round(current.value.durationMs / 2000)),
      },
    );
    const seconds = Number(value);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      ElMessage.warning('请输入有效的拆分点');
      return;
    }
    acting.value = true;
    await splitShot(projectId.value, current.value.shotId, {
      expectedVersion: current.value.version,
      splitAtMs: Math.round(seconds * 1000),
    });
    await load();
    ElMessage.success('镜头已拆分为前后两段，原镜头历史保留');
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(friendlyErrorMessage(error));
    }
  } finally {
    acting.value = false;
  }
}

async function mergeNext() {
  if (!current.value) return;
  const index = shots.value.findIndex(
    (shot) => shot.shotId === current.value?.shotId,
  );
  const next = shots.value[index + 1];
  if (!next) {
    ElMessage.warning('当前已是最后一个镜头');
    return;
  }
  try {
    await ElMessageBox.confirm(
      `将镜头 ${current.value.order} 与 ${next.order} 合并为一个镜头，时长相加；旧版本保留。`,
      '合并相邻镜头',
      { cancelButtonText: '取消', confirmButtonText: '合并' },
    );
    acting.value = true;
    await mergeShots(projectId.value, {
      expectedVersion: current.value.version,
      shotIds: [current.value.shotId, next.shotId],
    });
    await load();
    ElMessage.success('相邻镜头已合并');
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(friendlyErrorMessage(error));
    }
  } finally {
    acting.value = false;
  }
}

async function regenerateImage() {
  if (!current.value) return;
  acting.value = true;
  try {
    const result = await generateReferenceImage(
      projectId.value,
      current.value.shotId,
    );
    setJob(result.jobId);
    ElMessage.info('正在生成新的参考图候选，旧图保留');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function chooseImage(image: ImageAssetVersion) {
  if (!current.value) return;
  acting.value = true;
  try {
    await selectReferenceImage(
      projectId.value,
      current.value.shotId,
      image.id,
      {
        expectedVersion: current.value.version,
        revisionId: current.value.id,
      },
    );
    await load();
    ElMessage.success('已采用该参考图；如需复核请重新确认镜头');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

function openBible() {
  if (!bible.value) return;
  bibleForm.value = {
    characterLook: bible.value.characters[0]?.look ?? '',
    sceneLighting: bible.value.scenes[0]?.lighting ?? '',
  };
  bibleOpen.value = true;
}

async function onShotReferenceChanged() {
  await load();
}

async function onBibleReferenceChanged() {
  bibleOpen.value = false;
  await load();
}

async function saveBible() {
  if (!bible.value) return;
  acting.value = true;
  try {
    const characters = bible.value.characters.map((character, index) => ({
      ...character,
      look: index === 0 ? bibleForm.value.characterLook : character.look,
    }));
    const scenes = bible.value.scenes.map((scene, index) => ({
      ...scene,
      lighting: index === 0 ? bibleForm.value.sceneLighting : scene.lighting,
    }));
    await patchVisualBible(projectId.value, bible.value.id, {
      expectedVersion: bible.value.version,
      patch: { characters, scenes },
    });
    bibleOpen.value = false;
    await load();
    ElMessage.success('视觉规范草稿已更新，关联镜头需要复核');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function askDirector() {
  if (!current.value || !feedback.value.trim()) {
    ElMessage.warning('请输入修改要求');
    return;
  }
  acting.value = true;
  try {
    changePlan.value = await createChangePlan(projectId.value, {
      scope: 'SHOT',
      targetId: current.value.shotId,
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
    ElMessage.success('修改计划已应用为镜头草稿');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function restoreAnchor() {
  const sb = String(route.query.sb ?? '');
  if (!sb) return;
  if (!(state.value?.storyboards ?? []).some((item) => item.id === sb)) return;
  selectedStoryboardId.value = sb;
  viewMode.value = 'SHOT_OVERVIEW';
  await selectOverviewRevision(sb);
  const card = overviewCards.value.find(
    (item) => item.shotId === String(route.query.shot ?? ''),
  );
  if (card) overviewSelected.value = card;
}

onMounted(async () => {
  await load();
  await restoreAnchor();
});
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <div class="vc-m2-page vc-storyboard-page">
    <div v-if="loading" class="vc-m2-loading">
      正在读取剧本、视觉规范与分镜…
    </div>

    <GuardNotice
      v-else-if="needsScript"
      description="图文分镜必须基于已确认的剧本。请先完成剧本审核。"
      label="去确认剧本"
      title="还没有已确认剧本"
      :to="`/studio/${projectId}/script`"
    />

    <section v-else-if="errorMessage" class="vc-sb__panel vc-m2-error">
      <h2>无法加载图文分镜</h2>
      <p>{{ errorMessage }}</p>
      <ElButton @click="load">重试</ElButton>
    </section>

    <template v-else>
      <header class="vc-sb__hero">
        <div class="vc-sb__hero-copy">
          <p class="vc-m2-eyebrow">S5 · Storyboard</p>
          <h1>
            {{
              state?.latest
                ? `图文分镜 R${state.latest.revisionNo}`
                : '先建立视觉规范，再生成镜头'
            }}
          </h1>
          <p class="vc-m2-sub">
            {{ state?.approvedCount ?? 0 }}/{{ state?.totalCount ?? 0 }} 已确认
            · 净时长 {{ formatMs(state?.netDurationMs ?? 0) }} / 目标
            {{ formatMs(script?.targetDurationMs ?? 0) }} · 图片仅作 M3 参考
          </p>
        </div>
        <div class="vc-m2-head__actions">
          <ElButton
            v-if="!approvedBible && canEdit"
            :loading="acting"
            @click="generateBible"
          >
            生成视觉规范
          </ElButton>
          <ElButton
            v-if="latestBible && !approvedBible && canApprove"
            :loading="acting"
            @click="approveBible"
          >
            确认视觉规范
          </ElButton>
          <ElButton
            v-if="canGenerateStoryboard && canEdit"
            :loading="acting"
            type="primary"
            @click="generateBoard"
          >
            {{ state?.latest ? '重新生成分镜' : '生成图文分镜' }}
          </ElButton>
          <ElButton
            v-if="canApprove && shots.length > 0"
            :disabled="!allApproved"
            type="primary"
            @click="approveBoard"
          >
            确认整组分镜
          </ElButton>
        </div>
      </header>

      <JobProgress v-if="job" :job="job" title="分镜 Mock 任务" />

      <ProductionReadinessPanel :project-id="projectId" />

      <section v-if="!approvedBible" class="vc-sb__panel vc-m2-bible-setup">
        <div class="vc-sb__panel-head">
          <h2>视觉规范（Visual Bible）</h2>
          <p class="vc-m2-muted">
            先确认角色、场景、品牌色、字幕安全区与画幅；分镜的每条镜头都会引用该版本
            ID。
          </p>
        </div>
        <div v-if="bible" class="vc-m2-bible-preview">
          <div>
            <strong>角色</strong>
            <p>
              {{ bible.characters[0]?.name }} · {{ bible.characters[0]?.look }}
            </p>
          </div>
          <div>
            <strong>场景</strong>
            <p>{{ bible.scenes.map((item) => item.name).join(' / ') }}</p>
          </div>
          <div>
            <strong>画幅</strong>
            <p>
              {{ bible.aspectRatio }} · 字幕安全区
              {{ bible.subtitleSafeAreaPercent }}%
            </p>
          </div>
        </div>
        <p v-else class="vc-m2-muted">还没有视觉规范草稿，先执行生成任务。</p>
      </section>

      <section v-if="!state?.latest" class="vc-sb__panel vc-m2-empty">
        <h2>还没有图文分镜</h2>
        <p class="vc-m2-muted">
          {{
            approvedBible
              ? '视觉规范已确认，可以生成图文分镜。'
              : '请先确认视觉规范。'
          }}
        </p>
        <div class="vc-sb__empty-actions">
          <ElButton
            v-if="!approvedBible && canEdit"
            :loading="acting"
            @click="generateBible"
          >
            生成视觉规范
          </ElButton>
          <ElButton
            v-if="latestBible && !approvedBible && canApprove"
            @click="approveBible"
          >
            确认视觉规范
          </ElButton>
          <ElButton
            v-if="canGenerateStoryboard && canEdit"
            type="primary"
            :loading="acting"
            @click="generateBoard"
          >
            生成分镜
          </ElButton>
        </div>
      </section>

      <div v-else class="vc-m2-storyboard">
        <aside class="vc-sb__panel vc-shot-list">
          <header class="vc-shot-list__head">
            <h3>镜头（{{ shots.length }}）</h3>
            <div class="vc-shot-list__tools">
              <div class="vc-shot-list__views">
                <ElButton
                  :type="viewMode === 'SHOT_OVERVIEW' ? 'primary' : ''"
                  size="small"
                  @click="setViewMode('SHOT_OVERVIEW')"
                >
                  总览
                </ElButton>
                <ElButton
                  :type="viewMode === 'SHOT_DETAIL' ? 'primary' : ''"
                  size="small"
                  @click="setViewMode('SHOT_DETAIL')"
                >
                  编辑
                </ElButton>
              </div>
              <ElButton v-if="canEdit" size="small" @click="addNewShot">
                + 新增
              </ElButton>
            </div>
          </header>
          <div class="vc-shot-list__items">
            <button
              v-for="shot in shots"
              :key="shot.shotId"
              :class="{ 'is-active': shot.shotId === current?.shotId }"
              type="button"
              @click="selectShot(shot)"
            >
              <span class="vc-shot-list__no">{{
                String(shot.order).padStart(2, '0')
              }}</span>
              <span class="vc-shot-list__main">
                <strong>{{ shot.title }}</strong>
                <span
                  >{{ (shot.durationMs / 1000).toFixed(0) }}s ·
                  {{ shot.reviewStatus }}</span
                >
              </span>
              <span
                class="vc-shot-list__status"
                :data-status="shot.reviewStatus"
              ></span>
            </button>
          </div>
          <p class="vc-m2-muted vc-shot-list__count">
            已确认 {{ state.approvedCount }}/{{ state.totalCount }}
          </p>
        </aside>

        <main
          class="vc-sb__panel vc-shot-detail"
          v-if="current && viewMode === 'SHOT_DETAIL'"
        >
          <header class="vc-shot-detail__head">
            <div>
              <ElTag size="small" effect="plain">{{
                current.narrativePurpose
              }}</ElTag>
              <h2>
                镜头 {{ String(current.order).padStart(2, '0') }} ·
                {{ current.title }}
              </h2>
              <p class="vc-m2-muted">
                归属 {{ current.storyBeatId }} · 修订 R{{
                  current.revisionNo
                }}
                · {{ current.reviewStatus }}
              </p>
            </div>
            <div v-if="canEdit" class="vc-shot-detail__actions">
              <ElButton size="small" @click="move(selectedIndex, -1)">
                上移
              </ElButton>
              <ElButton size="small" @click="move(selectedIndex, 1)">
                下移
              </ElButton>
              <ElButton size="small" @click="duplicateCurrent"> 复制 </ElButton>
              <ElButton size="small" @click="splitCurrent"> 拆分 </ElButton>
              <ElButton
                :disabled="selectedIndex >= shots.length - 1"
                size="small"
                @click="mergeNext"
              >
                合并下一镜
              </ElButton>
              <ElButton size="small" type="danger" plain @click="removeCurrent">
                删除
              </ElButton>
            </div>
          </header>

          <div class="vc-shot-preview">
            <img
              v-if="currentImage"
              :alt="current.title"
              :src="currentImage.mockUrl"
            />
            <div v-else class="vc-shot-preview__empty">
              参考图缺失，可选择或生成新图
            </div>
            <div class="vc-shot-preview__safe">字幕安全区示意</div>
          </div>

          <div class="vc-shot-images">
            <div class="vc-shot-images__head">
              <h4>参考图版本</h4>
              <ElButton size="small" :loading="acting" @click="regenerateImage">
                生成新候选
              </ElButton>
            </div>
            <div class="vc-shot-images__list">
              <button
                v-for="image in referenceImages"
                :key="image.id"
                :class="{
                  'is-active': image.id === current.activeReferenceImageId,
                }"
                type="button"
                @click="chooseImage(image)"
              >
                <img
                  :alt="`${current.title} 参考图 V${image.versionNo}`"
                  :src="image.mockUrl"
                />
                <span
                  >V{{ image.versionNo }} ·
                  {{
                    image.id === current.activeReferenceImageId
                      ? '使用中'
                      : '采用'
                  }}</span
                >
              </button>
            </div>
            <p class="vc-m2-muted">
              生成候选不会覆盖旧图；只有点击“采用”才进入预演与 M3 输入。
            </p>
          </div>

          <AssetReferencePicker
            v-if="current"
            :project-id="projectId"
            :target="current"
            target-type="SHOT_REVISION"
            @changed="onShotReferenceChanged"
          />

          <div class="vc-shot-fields">
            <label>标题<ElInput v-model="editForm.title" /></label>
            <label
              >时长（ms）<ElInputNumber
                v-model="editForm.durationMs"
                :min="1000"
                :max="60000"
                :step="500"
            /></label>
            <label
              >转场重叠（ms）<ElInputNumber
                v-model="editForm.transitionOverlap"
                :min="0"
                :max="3000"
                :step="100"
            /></label>
            <label class="is-wide"
              >场景<ElInput v-model="editForm.scene" :rows="2" type="textarea"
            /></label>
            <label class="is-wide"
              >动作<ElInput v-model="editForm.action" :rows="2" type="textarea"
            /></label>
            <label>景别 / 运镜<ElInput v-model="editForm.camera" /></label>
            <label>产品植入<ElInput v-model="editForm.placement" /></label>
            <label
              >旁白<ElInput
                v-model="editForm.narration"
                :rows="2"
                type="textarea"
            /></label>
            <label
              >台词<ElInput
                v-model="editForm.dialogue"
                :rows="2"
                type="textarea"
            /></label>
            <label class="is-wide"
              >字幕（每行一条）<ElInput
                v-model="editForm.subtitles"
                :rows="2"
                type="textarea"
            /></label>
          </div>

          <div class="vc-shot-actions">
            <ElButton :disabled="!canEdit" :loading="acting" @click="saveShot">
              保存镜头草稿
            </ElButton>
            <ElButton
              :disabled="!canApprove || current.reviewStatus === 'APPROVED'"
              type="primary"
              :loading="acting"
              @click="approveCurrent"
            >
              确认当前镜头
            </ElButton>
            <ElButton
              v-if="current.reviewStatus !== 'APPROVED'"
              @click="feedback = '这个镜头动作不自然，调整为先破碎再出现'"
            >
              填入修改意见
            </ElButton>
          </div>
        </main>

        <section v-else class="vc-sb__panel vc-overview">
          <header class="vc-overview__head">
            <div>
              <h2>分镜总览</h2>
              <p class="vc-m2-muted">
                {{ visibleOverviewShots.length }} 镜 · 总时长
                {{
                  Math.round(
                    visibleOverviewShots.reduce(
                      (total, shot) => total + shot.durationMs,
                      0,
                    ) / 1000,
                  )
                }}s · 按 StoryBeat 分组 · 只读布局，不修改正式镜头顺序
              </p>
            </div>
            <div class="vc-overview__controls">
              <ElSelect
                v-model="selectedStoryboardId"
                placeholder="选择分镜版本"
                size="small"
                class="vc-overview__revision"
                @change="selectOverviewRevision"
              >
                <ElOption
                  v-for="revision in state.storyboards"
                  :key="revision.id"
                  :label="`R${revision.revisionNo} · ${revision.status}`"
                  :value="revision.id"
                />
              </ElSelect>
              <ElButton size="small" @click="resetOverviewLayout">
                重置布局
              </ElButton>
              <ElButton size="small" @click="zoomOverview(-0.1)"> − </ElButton>
              <span class="vc-overview__zoom">
                {{ Math.round(overviewViewport.scale * 100) }}%
              </span>
              <ElButton size="small" @click="zoomOverview(0.1)"> ＋ </ElButton>
              <ElButton
                v-if="canEdit"
                :disabled="viewingContext === 'HISTORY'"
                size="small"
                @click="openOrderDialog"
              >
                调整播放顺序
              </ElButton>
              <ElTag size="small" effect="plain">{{ viewingContext }}</ElTag>
              <ElTag size="small" effect="plain">
                {{ selectedStoryboard?.status ?? 'DRAFT' }}
              </ElTag>
            </div>
          </header>
          <p v-if="overviewError" class="vc-overview__error">
            {{ overviewError }}
          </p>
          <div
            v-loading="overviewLoading"
            :style="{
              transform: `translate(${overviewViewport.panX}px, ${overviewViewport.panY}px) scale(${overviewViewport.scale})`,
              transformOrigin: 'top center',
            }"
            class="vc-overview__groups"
            @pointerdown.self="startCanvasPan"
          >
            <section
              v-for="group in overviewGroups"
              :key="group.id"
              class="vc-overview__beat"
            >
              <h3>{{ group.title }} · {{ group.cards.length }} 镜</h3>
              <div class="vc-overview__grid">
                <button
                  v-for="card in group.cards"
                  :key="card.shotId"
                  :class="{ 'is-active': card.shotId === current?.shotId }"
                  :style="{
                    transform: `translate(${overviewPoint(card.shotId).x}px, ${overviewPoint(card.shotId).y}px)`,
                  }"
                  type="button"
                  @click="openOverviewCard(card)"
                >
                  <span class="vc-overview__order">
                    {{ String(card.orderIndex + 1).padStart(2, '0') }}
                  </span>
                  <strong>{{ card.shotId }}</strong>
                  <span class="vc-overview__meta">
                    {{ (card.durationMs / 1000).toFixed(1) }}s ·
                    {{ card.reviewStatus }}
                  </span>
                  <span class="vc-overview__beat">
                    {{ card.effectiveValidity }} · 图
                    {{ card.selectedReferenceImageVersionId ?? '缺失' }}
                  </span>
                  <span
                    class="vc-overview__drag"
                    @pointerdown.stop="startOverviewDrag($event, card.shotId)"
                  >
                    拖动
                  </span>
                  <span
                    v-if="card.warnings.length > 0"
                    class="vc-overview__warn"
                  >
                    {{ card.warnings.join('；') }}
                  </span>
                </button>
              </div>
            </section>
          </div>
          <div v-if="overviewSelected" class="vc-overview__detail">
            <header>
              <div>
                <strong>{{ overviewSelected.shotId }}</strong>
                <span>
                  {{ overviewSelected.viewingContext }} ·
                  {{ overviewSelected.effectiveValidity }} ·
                  {{ overviewSelected.reviewStatus }}
                </span>
              </div>
              <ElButton size="small" text @click="closeOverviewSelected">
                关闭
              </ElButton>
            </header>
            <p>
              ShotRevision：{{ overviewSelected.shotRevisionId }} · 已批准：
              {{ overviewSelected.approvedShotRevisionId ?? '无' }} · 草稿：
              {{ overviewSelected.draftShotRevisionId ?? '无' }}
            </p>
            <p>
              参考图：{{
                overviewSelected.selectedReferenceImageVersionId ?? '缺失'
              }}
              · 角色：
              {{ overviewSelected.referencedCharacterIds.join(' / ') || '无' }}
              · 场景：
              {{ overviewSelected.referencedSceneIds.join(' / ') || '无' }}
            </p>
            <p v-if="overviewSelected.warnings.length > 0" class="is-warn">
              {{ overviewSelected.warnings.join('；') }}
            </p>
            <p v-if="overviewSelected.viewingContext === 'HISTORY'">
              历史版本只读；编辑必须先 Fork 当前正式版本。
            </p>
          </div>
        </section>

        <aside class="vc-m2-story-side">
          <section class="vc-sb__panel vc-sb__side-card">
            <div class="vc-sb__panel-head">
              <h3>视觉规范</h3>
              <p class="vc-m2-muted">
                {{ bible?.status }} · v{{ bible?.version }}
              </p>
            </div>
            <div class="vc-sb__bible-rows">
              <p>
                <span>角色</span>
                <strong
                  >{{ bible?.characters[0]?.name }}
                  {{ bible?.characters[0]?.look }}</strong
                >
              </p>
              <p>
                <span>场景</span>
                <strong>{{
                  bible?.scenes.map((item) => item.name).join(' / ')
                }}</strong>
              </p>
              <p>
                <span>品牌色</span>
                <strong>{{ bible?.brandColors.join(' / ') }}</strong>
              </p>
            </div>
            <ElButton
              v-if="canEdit"
              class="vc-sb__side-btn"
              size="small"
              @click="openBible"
            >
              编辑视觉规范
            </ElButton>
          </section>

          <AssetRelationshipPanel
            :bible="bible"
            :project-id="projectId"
            :shots="shots"
            @select-shot="selectShotById"
          />

          <StudioContextSignalsPanel :project-id="projectId" />

          <section class="vc-sb__panel vc-director">
            <div class="vc-sb__panel-head">
              <h3>AI 创意导演</h3>
              <p class="vc-m2-muted">
                例如“纸张先炸开，再让人物出现”。先出计划，采用后生成新修订。
              </p>
            </div>
            <ElInput
              v-model="feedback"
              :rows="3"
              type="textarea"
              placeholder="说明你希望怎么改这个镜头"
            />
            <ElButton
              class="vc-sb__side-btn"
              :loading="acting"
              @click="askDirector"
            >
              生成修改计划
            </ElButton>
          </section>

          <section class="vc-sb__panel vc-sb__issues">
            <div class="vc-sb__panel-head">
              <h3>质检与阻塞</h3>
            </div>
            <p v-if="state.issues.length === 0" class="vc-m2-muted">
              暂无阻塞项
            </p>
            <ul v-else class="vc-sb__issue-list">
              <li
                v-for="issue in state.issues.slice(0, 8)"
                :key="issue.code + (issue.shotId ?? '')"
                class="vc-m2-issue"
              >
                {{ issue.message }}
              </li>
            </ul>
            <div class="vc-sb__issue-actions">
              <ElButton
                v-if="canApprove"
                :disabled="!allApproved"
                type="primary"
                size="small"
                class="vc-sb__side-btn"
                @click="approveBoard"
              >
                确认整组
              </ElButton>
              <ElButton
                v-if="canApprove && shots.length > 0"
                size="small"
                class="vc-sb__side-btn"
                @click="approveAll"
              >
                批量确认全部
              </ElButton>
            </div>
          </section>
        </aside>
      </div>

      <div v-if="state?.latest" class="vc-m2-timeline">
        <button
          v-for="shot in shots"
          :key="shot.shotId"
          :style="{
            width: `${Math.max(4, (shot.durationMs / Math.max(1, state.netDurationMs)) * 100)}%`,
          }"
          :class="{ 'is-active': shot.shotId === current?.shotId }"
          type="button"
          @click="selectShot(shot)"
        >
          <span>{{ String(shot.order).padStart(2, '0') }}</span>
          <span>{{ (shot.durationMs / 1000).toFixed(0) }}s</span>
        </button>
      </div>

      <div class="vc-m2-footer">
        <span class="vc-m2-muted">
          净时长 {{ formatMs(state?.netDurationMs ?? 0) }} · 目标
          {{ formatMs(script?.targetDurationMs ?? 0) }} ·
          {{
            Math.abs(
              (state?.netDurationMs ?? 0) - (script?.targetDurationMs ?? 0),
            ) <= 2000
              ? '时长通过'
              : '时长偏差超 2s'
          }}
        </span>
        <div class="vc-m2-footer__actions">
          <ElButton @click="$router.push(`/studio/${projectId}/script`)"
            >返回剧本</ElButton
          >
          <ElButton
            :disabled="!state?.latest || state.latest.status !== 'APPROVED'"
            type="primary"
            @click="$router.push(`/studio/${projectId}/animatic`)"
          >
            进入预演
          </ElButton>
        </div>
      </div>
    </template>

    <VersionConflictDialog
      v-model:open="conflictOpen"
      :busy="acting"
      :can-keep="conflictShot?.reviewStatus !== 'APPROVED'"
      :fields="conflictFields"
      title="镜头版本冲突"
      @fork="resolveShotFork"
      @keep="resolveShotKeep"
      @latest="resolveShotLatest"
    />

    <ElDialog v-model="planOpen" title="镜头修改计划" width="640px">
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
          影响镜头：{{ changePlan.impactedShotIds.join(' / ') }}
        </p>
        <p class="vc-m2-muted">
          影响阶段：{{ changePlan.invalidatedStageNames.join(' / ') }} ·
          {{ changePlan.risks.join('；') }}
        </p>
        <p class="vc-m2-muted">
          影响资产：{{ changePlan.affectedAssetIds?.join(' / ') || '无' }} ·
          复核快照：{{
            changePlan.affectedReviewSnapshotIds?.join(' / ') || '无'
          }}
        </p>
        <p class="vc-m2-muted">
          类别：{{ changePlan.changeCategory }} · 未来成本影响：{{
            changePlan.estimatedFutureCostImpact
          }}
          · 建议：{{ changePlan.suggestedActions?.join(' / ') }}
        </p>
      </div>
      <template #footer>
        <ElButton @click="planOpen = false">放弃计划</ElButton>
        <ElButton :loading="acting" type="primary" @click="applyPlan">
          采用并生成新草稿
        </ElButton>
      </template>
    </ElDialog>

    <ElDrawer v-model="bibleOpen" title="编辑视觉规范" size="480px">
      <div class="vc-m2-form">
        <label>主角形象</label
        ><ElInput v-model="bibleForm.characterLook" :rows="3" type="textarea" />
        <label>主场景灯光</label
        ><ElInput v-model="bibleForm.sceneLighting" :rows="2" type="textarea" />
        <p class="vc-m2-muted">
          修改全局角色/场景会把相关分镜标记为需复核，不覆盖旧批准记录。
        </p>
        <AssetReferencePicker
          v-if="bible"
          :project-id="projectId"
          :target="bible"
          target-type="VISUAL_BIBLE_REVISION"
          @changed="onBibleReferenceChanged"
        />
      </div>
      <template #footer>
        <ElButton @click="bibleOpen = false">取消</ElButton>
        <ElButton :loading="acting" type="primary" @click="saveBible">
          保存规范草稿
        </ElButton>
      </template>
    </ElDrawer>
  </div>
  <ElDialog v-model="orderOpen" title="调整影片播放顺序" width="620px">
    <p class="vc-m2-muted">
      P1 只允许同一 StoryBeat
      内调整；排序会创建新分镜草稿，旧正式版和预演快照保持不变。
    </p>
    <div class="vc-order-list">
      <div
        v-for="(shot, index) in orderDraft"
        :key="shot.shotId"
        class="vc-order-row"
      >
        <span>{{ String(index + 1).padStart(2, '0') }}</span>
        <strong>{{ shot.title }}</strong>
        <small>{{ shot.storyBeatId }}</small>
        <ElButton
          :disabled="index === 0"
          size="small"
          text
          @click="moveOrderDraft(index, -1)"
        >
          ↑
        </ElButton>
        <ElButton
          :disabled="index === orderDraft.length - 1"
          size="small"
          text
          @click="moveOrderDraft(index, 1)"
        >
          ↓
        </ElButton>
      </div>
    </div>
    <template #footer>
      <ElButton @click="orderOpen = false">取消</ElButton>
      <ElButton
        :disabled="!orderChanged"
        :loading="orderSaving"
        type="primary"
        @click="saveOrderDraft"
      >
        创建排序草稿
      </ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.vc-storyboard-page {
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

.vc-sb__hero {
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

.vc-sb__hero-copy {
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

.vc-sb__hero h1 {
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

.vc-sb__panel {
  box-sizing: border-box;
  padding: 16px 18px;
  background: var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-sb__panel-head {
  margin-bottom: 10px;
}

.vc-sb__panel-head h2,
.vc-sb__panel-head h3,
.vc-overview__head h2,
.vc-shot-list h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-sb__panel-head .vc-m2-muted {
  margin-top: 4px;
}

.vc-m2-bible-setup h2 {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 650;
}

.vc-m2-bible-preview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 12px 0 0;
}

.vc-m2-bible-preview div {
  padding: 12px;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-m2-bible-preview strong {
  font-size: 12px;
  color: var(--vc-text-weak);
}

.vc-m2-bible-preview p {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--el-text-color-regular, #4b5563);
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

.vc-sb__empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 12px;
}

.vc-m2-storyboard {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr) 280px;
  gap: 16px;
  align-items: start;
}

.vc-shot-list {
  position: sticky;
  top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: calc(100vh - 180px);
  padding: 14px;
  overflow: hidden;
}

.vc-shot-list__head {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.vc-shot-list__tools {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  justify-content: space-between;
}

.vc-shot-list__views {
  display: flex;
  gap: 6px;
}

.vc-shot-list__items {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  overflow-y: auto;
}

.vc-shot-list__items button {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 10px;
  text-align: left;
  cursor: pointer;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid transparent;
  border-radius: 10px;
  transition:
    background 0.16s ease,
    border-color 0.16s ease;
}

.vc-shot-list__items button:hover {
  background: var(--vc-brand-soft);
  border-color: var(--vc-brand-border);
}

.vc-shot-list__items button.is-active {
  background: var(--vc-brand-soft);
  border-color: var(--vc-brand);
  box-shadow: 0 0 0 1px rgb(103 87 215 / 18%);
}

.vc-shot-list__no {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  font-weight: 700;
  color: var(--vc-brand);
  background: #fff;
  border: 1px solid var(--vc-brand-border);
  border-radius: 8px;
}

.vc-shot-list__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.vc-shot-list__main strong {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
  white-space: nowrap;
}

.vc-shot-list__main span {
  font-size: 10px;
  color: var(--vc-text-weak);
}

.vc-shot-list__status {
  flex: none;
  width: 8px;
  height: 8px;
  background: var(--el-color-info);
  border-radius: 50%;
}

.vc-shot-list__status[data-status='APPROVED'] {
  background: var(--el-color-success);
}

.vc-shot-list__status[data-status='NEEDS_CHANGES'] {
  background: var(--el-color-danger);
}

.vc-shot-list__count {
  padding-top: 8px;
  margin: 0;
  border-top: 1px solid var(--vc-border);
}

.vc-overview__head {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.vc-overview__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  justify-content: flex-end;
}

.vc-overview__revision {
  width: 220px;
}

.vc-overview__beat h3 {
  margin: 16px 0 8px;
  font-size: 13px;
  font-weight: 650;
}

.vc-overview__drag {
  align-self: flex-end;
  padding: 2px 6px;
  font-size: 10px;
  color: var(--vc-text-weak);
  cursor: grab;
  background: var(--el-bg-color-overlay, #fff);
  border-radius: 999px;
}

.vc-overview__zoom {
  min-width: 40px;
  font-size: 11px;
  color: var(--vc-text-weak);
  text-align: center;
}

.vc-overview__groups {
  cursor: grab;
}

.vc-overview__warn {
  font-size: 10px;
  color: var(--el-color-danger);
}

.vc-overview__detail {
  padding: 12px 14px;
  margin-top: 14px;
  font-size: 12px;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid var(--vc-border);
  border-radius: 10px;
}

.vc-overview__detail header {
  display: flex;
  justify-content: space-between;
}

.vc-overview__detail header span {
  margin-left: 8px;
  font-size: 11px;
  color: var(--vc-text-weak);
}

.vc-overview__detail .is-warn {
  color: var(--el-color-danger);
}

.vc-overview__error {
  margin: 8px 0;
  font-size: 12px;
  color: var(--el-color-danger);
}

.vc-overview__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.vc-overview__grid button {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid transparent;
  border-radius: 10px;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease;
}

.vc-overview__grid button:hover {
  border-color: var(--vc-brand-border);
}

.vc-overview__grid button.is-active {
  border-color: var(--vc-brand);
  box-shadow: 0 0 0 1px rgb(103 87 215 / 16%);
}

.vc-overview__order {
  font-family: ui-monospace, monospace;
  font-size: 18px;
  font-weight: 700;
  color: var(--vc-brand);
}

.vc-overview__meta,
.vc-overview__beat {
  font-size: 11px;
  color: var(--vc-text-weak);
}

.vc-shot-detail__head {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.vc-shot-detail__head h2 {
  margin: 8px 0 4px;
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.vc-shot-detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.vc-shot-preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 440px;
  aspect-ratio: 9 / 16;
  margin: 0 auto 14px;
  overflow: hidden;
  background: #1c1a22;
  border-radius: 14px;
  box-shadow: 0 12px 28px rgb(15 23 42 / 18%);
}

.vc-shot-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.vc-shot-preview__empty {
  color: #aaa;
}

.vc-shot-preview__safe {
  position: absolute;
  inset: 12% 8%;
  font-size: 10px;
  color: rgb(255 255 255 / 40%);
  border: 1px dashed rgb(255 255 255 / 35%);
}

.vc-shot-images {
  padding: 12px;
  margin-bottom: 12px;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 12px;
}

.vc-shot-images__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.vc-shot-images__head h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
}

.vc-shot-images__list {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.vc-shot-images__list button {
  flex: 0 0 100px;
  padding: 6px;
  cursor: pointer;
  background: #fff;
  border: 2px solid transparent;
  border-radius: 10px;
}

.vc-shot-images__list button.is-active {
  border-color: var(--vc-brand);
}

.vc-shot-images__list img {
  width: 100%;
  aspect-ratio: 9 / 16;
  object-fit: cover;
  border-radius: 6px;
}

.vc-shot-images__list span {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  color: var(--vc-text-weak);
  text-align: center;
}

.vc-shot-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 12px;
  margin-top: 4px;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 12px;
}

.vc-shot-fields label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  font-weight: 650;
  color: var(--vc-text-weak);
}

.vc-shot-fields .is-wide {
  grid-column: span 2;
}

.vc-shot-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.vc-m2-story-side {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vc-sb__side-card {
  background:
    linear-gradient(180deg, rgb(103 87 215 / 5%) 0%, transparent 56%),
    var(--el-bg-color-overlay, #fff);
  border-color: var(--vc-brand-border);
}

.vc-sb__bible-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.vc-sb__bible-rows p {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  margin: 0;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-sb__bible-rows span {
  font-size: 11px;
  color: var(--vc-text-weak);
}

.vc-sb__bible-rows strong {
  font-size: 12px;
  font-weight: 650;
  line-height: 1.5;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-sb__side-btn {
  justify-content: center;
  width: 100%;
  margin: 0 !important;
}

.vc-director {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vc-sb__issue-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  margin: 0 0 10px;
  list-style: none;
}

.vc-m2-issue {
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.5;
  color: #8a4b00;
  background: var(--vc-mock-banner-bg);
  border: 1px solid var(--vc-mock-banner-border);
  border-radius: 8px;
}

.vc-sb__issue-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vc-m2-timeline {
  display: flex;
  gap: 2px;
  height: 56px;
  overflow: hidden;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid var(--vc-border);
  border-radius: 12px;
}

.vc-m2-timeline button {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  font-size: 9px;
  color: var(--vc-brand);
  cursor: pointer;
  background: var(--vc-brand-soft);
  border: 0;
  border-right: 1px solid #fff;
}

.vc-m2-timeline button.is-active {
  color: #fff;
  background: var(--vc-brand);
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

.vc-m2-diff {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 10px 0;
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

.vc-m2-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vc-m2-form label {
  font-size: 12px;
  color: var(--vc-text-weak);
}

.vc-order-list {
  max-height: 420px;
  overflow: auto;
}

.vc-order-row {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 6px;
  font-size: 12px;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-order-row strong {
  flex: 1;
}

.vc-order-row small {
  color: var(--vc-text-weak);
}

@media (max-width: 1280px) {
  .vc-m2-storyboard {
    grid-template-columns: 1fr;
  }

  .vc-shot-list {
    position: static;
    max-height: none;
  }

  .vc-m2-bible-preview {
    grid-template-columns: 1fr;
  }

  .vc-overview__grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 720px) {
  .vc-storyboard-page {
    padding-bottom: 110px;
  }

  .vc-sb__hero {
    padding: 16px;
  }

  .vc-shot-fields {
    grid-template-columns: 1fr;
  }

  .vc-shot-fields .is-wide {
    grid-column: auto;
  }

  .vc-overview__grid {
    grid-template-columns: 1fr;
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
  .vc-shot-list__items button,
  .vc-overview__grid button {
    transition: none;
  }
}
</style>
