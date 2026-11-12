<script lang="ts" setup>
import type {
  EvidenceLevel,
  EvidenceRef,
  IngestionSnapshot,
  IngestionState,
  PainPoint,
  Persona,
  ProductFeature,
  UnderstandingDiff,
  UnderstandingRevision,
  ValueAngleSeed,
  VideoProject,
} from '#/types/creative-video';

import { computed, onMounted, reactive, ref, toRaw } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  ElAlert,
  ElButton,
  ElCheckbox,
  ElDialog,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElTag,
} from 'element-plus';

import {
  getIngestion,
  getProject,
  getUnderstandingDiff,
  listEvidence,
  listProjectJobs,
  listRevisions,
  listSnapshots,
} from '#/api/creative-video';
import EmptyState from '#/components/creative-video/EmptyState.vue';
import ErrorState from '#/components/creative-video/ErrorState.vue';
import LoadingState from '#/components/creative-video/LoadingState.vue';
import ClaimConflictDrawer from '#/components/creative-video/m11/ClaimConflictDrawer.vue';
import { useJobPolling } from '#/composables/creative-video/use-job-polling';
import { useProjectAccess } from '#/composables/creative-video/use-project-access';
import { useUnsavedChanges } from '#/composables/creative-video/use-unsaved-changes';
import { useCreativeVideoUnderstandingStore } from '#/stores/creative-video';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';
import { formatDateTime } from '#/utils/creative-video/format';
import {
  EVIDENCE_LABELS,
  EVIDENCE_TAG_TYPES,
} from '#/utils/creative-video/project-stage';

import JobProgress from '../ingest/components/JobProgress.vue';
import EvidenceDrawer from './components/EvidenceDrawer.vue';

defineOptions({ name: 'VidCraftUnderstanding' });

const route = useRoute();
const router = useRouter();
const store = useCreativeVideoUnderstandingStore();
const projectId = computed(() => String(route.params.id ?? ''));
const project = ref<null | VideoProject>(null);
const ingestion = ref<IngestionState | null>(null);
const evidence = ref<EvidenceRef[]>([]);
const snapshots = ref<IngestionSnapshot[]>([]);
const retained = ref(false);
const loading = ref(true);
const pageError = ref('');
const evidenceFilter = ref<'' | EvidenceLevel>('');
const evidenceOpen = ref(false);
const selectedEvidence = ref<EvidenceRef[]>([]);
const evidenceTitle = ref('证据来源');
const jobId = ref<null | string>(
  typeof route.query.jobId === 'string' ? route.query.jobId : null,
);
const baselineJson = ref('');
const { canApprove, canEdit, isReviewer } = useProjectAccess(project);

const editOpen = ref(false);
const editKind = ref<
  'feature' | 'lists' | 'pain' | 'persona' | 'seed' | 'summary'
>('summary');
const editIndex = ref(0);
const editForm = reactive<Record<string, string>>({});
const editUsableInMarketing = ref(false);
const editEvidenceIds = ref<string[]>([]);

const reanalyzeOpen = ref(false);
const reanalyzeScope = ref<'FULL' | 'PAIN_POINTS' | 'VALUE_ANGLES'>('FULL');
const reanalyzeScenario = ref('UNDERSTANDING_SUCCESS');
const approveOpen = ref(false);
const acceptHypotheses = ref(false);
const reviewerNote = ref('');
const acting = ref(false);
const firstScenario = ref('UNDERSTANDING_SUCCESS');
const commentOpen = ref(false);
const commentNote = ref('');
const commenting = ref(false);
const diffOpen = ref(false);
const diffLoading = ref(false);
const diff = ref<null | UnderstandingDiff>(null);
const revisions = ref<UnderstandingRevision[]>([]);
const fromRevisionId = ref('');
const toRevisionId = ref('');

const evidenceById = computed(() => {
  const map = new Map<string, EvidenceRef>();
  for (const item of evidence.value) {
    map.set(item.id, item);
  }
  return map;
});

const filteredEvidence = computed(() => {
  if (!evidenceFilter.value) {
    return evidence.value;
  }
  return evidence.value.filter((item) => item.level === evidenceFilter.value);
});

const current = computed(() => store.current);
const dirty = computed(
  () =>
    Boolean(current.value) &&
    JSON.stringify(current.value) !== baselineJson.value,
);
useUnsavedChanges(dirty);

const statusLabel: Record<string, string> = {
  APPROVED: '已确认',
  DRAFT: '草稿',
  REJECTED: '已驳回',
  STALE: '资料已变化，待复核',
  WAITING_REVIEW: '待审核',
};

const statusTagType: Record<string, 'danger' | 'info' | 'success' | 'warning'> =
  {
    APPROVED: 'success',
    DRAFT: 'info',
    REJECTED: 'danger',
    STALE: 'warning',
    WAITING_REVIEW: 'warning',
  };

const canEditCurrent = computed(
  () =>
    canEdit.value &&
    Boolean(current.value) &&
    ['DRAFT', 'REJECTED'].includes(current.value?.status ?? ''),
);

const canApproveCurrent = computed(
  () =>
    canApprove.value &&
    Boolean(current.value) &&
    ['DRAFT', 'WAITING_REVIEW'].includes(current.value?.status ?? ''),
);

const revisionOptions = computed(() =>
  store.revisions.map((item) => ({
    label: `R${item.revisionNo} · ${statusLabel[item.status] ?? item.status}`,
    value: item.id,
  })),
);

const reportSnapshot = computed(() =>
  snapshots.value.find(
    (item) => item.id === current.value?.ingestionSnapshotId,
  ),
);
const reportSources = computed(() => [
  ...(reportSnapshot.value?.sourceCopies ?? []),
  ...(ingestion.value?.sources ?? []).filter(
    (source) =>
      !reportSnapshot.value?.sourceCopies?.some(
        (copy) => copy.id === source.id,
      ),
  ),
]);
const reportAssets = computed(() => [
  ...(reportSnapshot.value?.assetCopies ?? []),
  ...(ingestion.value?.assets ?? []).filter(
    (asset) =>
      !reportSnapshot.value?.assetCopies?.some((copy) => copy.id === asset.id),
  ),
]);
function restoreDeleted(
  record: NonNullable<UnderstandingRevision['deletionHistory']>[number],
) {
  if (!current.value || !canEditCurrent.value) return;
  if (
    current.value[record.collection].some(
      (item) => item.id === record.content.id,
    )
  ) {
    ElMessage.info('该条目已在当前草稿中');
    return;
  }
  const content = structuredClone(toRaw(record.content));
  switch (record.collection) {
    case 'features': {
      current.value.features.push(content as ProductFeature);
      break;
    }
    case 'painPoints': {
      current.value.painPoints.push(content as PainPoint);
      break;
    }
    case 'personas': {
      current.value.personas.push(content as Persona);
      break;
    }
    case 'valueAngleSeeds': {
      current.value.valueAngleSeeds.push(content as ValueAngleSeed);
      break;
    }
  }
  ElMessage.success('已恢复到当前草稿，请保存报告');
}
function removedTitle(
  content: NonNullable<
    UnderstandingRevision['deletionHistory']
  >[number]['content'],
) {
  if ('title' in content) {
    return content.title;
  }
  if ('name' in content) {
    return content.name;
  }
  return content.painPoint;
}

const materialChanges = computed(() => {
  const snapshot = snapshots.value.find(
    (item) => item.id === current.value?.ingestionSnapshotId,
  );
  if (!snapshot || !ingestion.value) return [];
  const sources = ingestion.value.sources;
  const included = sources.filter((item) => item.includedInAnalysis);
  return [
    ...included
      .filter((item) => !snapshot.sourceIds.includes(item.id))
      .map((item) => `新增：${item.title}`),
    ...snapshot.sourceIds
      .filter((id) => !included.some((item) => item.id === id))
      .map(
        (id) =>
          `删除或排除：${sources.find((item) => item.id === id)?.title || id}`,
      ),
    ...included
      .filter(
        (item) =>
          snapshot.sourceVersions[item.id] !== undefined &&
          snapshot.sourceVersions[item.id] !== item.version,
      )
      .map((item) => `已修改：${item.title}`),
  ];
});
async function retainOld() {
  if (!current.value || dirty.value) {
    ElMessage.warning('请先保存或放弃本地修改');
    return;
  }
  try {
    await store.comment(
      '显式沿用旧报告供阅读，保留待复核标识，不作为最新已批准报告交给 M2',
    );
    baselineJson.value = JSON.stringify(store.current);
    retained.value = true;
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  }
}

const snapshotId = computed(
  () => ingestion.value?.lastConfirmedSnapshotId ?? '',
);

const { job } = useJobPolling(jobId, {
  onTerminal: async (finished) => {
    if (dirty.value) {
      store.revisions = await listRevisions(projectId.value);
      ElMessage.warning(
        '后台任务已结束，当前未保存修改已保留；请先保存再切换新版本',
      );
      return;
    }
    await load();
    if (finished.status === 'FAILED') {
      ElMessage.error(finished.errorMessage || '模拟分析失败，可重试');
    } else {
      ElMessage.success('模拟产品理解已生成草稿');
    }
  },
});

async function loadDiff() {
  if (!fromRevisionId.value || !toRevisionId.value) return;
  diffLoading.value = true;
  try {
    diff.value = await getUnderstandingDiff(
      projectId.value,
      fromRevisionId.value,
      toRevisionId.value,
    );
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    diffLoading.value = false;
  }
}

async function openDiff() {
  diffOpen.value = true;
  try {
    revisions.value = await listRevisions(projectId.value);
    const sorted = revisions.value.toSorted(
      (a, b) => b.revisionNo - a.revisionNo,
    );
    toRevisionId.value = current.value?.id ?? sorted[0]?.id ?? '';
    fromRevisionId.value =
      sorted.find((item) => item.id !== toRevisionId.value)?.id ?? '';
    await loadDiff();
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  }
}

function formatDiffValue(value: unknown) {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

async function load() {
  loading.value = true;
  pageError.value = '';
  try {
    const [projectDetail, ingestionDetail, evidenceList] = await Promise.all([
      getProject(projectId.value),
      getIngestion(projectId.value),
      listEvidence(projectId.value),
    ]);
    project.value = projectDetail;
    ingestion.value = ingestionDetail;
    evidence.value = evidenceList;
    snapshots.value = await listSnapshots(projectId.value);
    await store.load(projectId.value);
    baselineJson.value = JSON.stringify(store.current);
  } catch (error) {
    pageError.value = friendlyErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function selectRevision(value: string) {
  if (dirty.value) {
    try {
      await ElMessageBox.confirm(
        '切换版本会放弃当前未保存的修改，是否继续？',
        '未保存的修改',
        { confirmButtonText: '放弃修改并切换', cancelButtonText: '继续编辑' },
      );
    } catch {
      return;
    }
  }
  store.selectRevision(value);
  baselineJson.value = JSON.stringify(store.current);
}

async function startFullAnalysis() {
  if (job.value) {
    ElMessage.warning('已有产品理解任务正在运行');
    return;
  }
  if (!snapshotId.value) {
    ElMessage.warning('请先在资料采集页确认资料快照');
    return;
  }
  acting.value = true;
  try {
    const result = await store.generate(
      'FULL',
      snapshotId.value,
      firstScenario.value,
    );
    jobId.value = result.jobId;
    ElMessage.info('已启动模拟产品理解任务');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function saveDraft() {
  if (!current.value) {
    return;
  }
  acting.value = true;
  try {
    const updated = await store.applyPatch({
      brandGuidelines: current.value.brandGuidelines,
      category: current.value.category,
      competitorAlternatives: current.value.competitorAlternatives,
      features: current.value.features,
      missingInformation: current.value.missingInformation,
      painPoints: current.value.painPoints,
      personas: current.value.personas,
      productSummary: current.value.productSummary,
      prohibitedClaims: current.value.prohibitedClaims,
      riskNotes: current.value.riskNotes,
      valueAngleSeeds: current.value.valueAngleSeeds,
      whyThisAngle: current.value.whyThisAngle,
    });
    baselineJson.value = JSON.stringify(updated);
    evidence.value = await listEvidence(projectId.value);
    ingestion.value = await getIngestion(projectId.value);
    ElMessage.success(`报告草稿已保存（v${updated.version}）`);
    return true;
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
    return false;
  } finally {
    acting.value = false;
  }
}

async function forkDraft() {
  acting.value = true;
  try {
    const forked = await store.forkCurrent();
    baselineJson.value = JSON.stringify(forked);
    ElMessage.success(`已派生新草稿 R${forked.revisionNo}`);
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function submitReview() {
  acting.value = true;
  try {
    await store.submitForReview();
    baselineJson.value = JSON.stringify(store.current);
    ElMessage.success('已提交审核');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function approve() {
  if (!acceptHypotheses.value) {
    ElMessage.warning('请先勾选“知悉仍存在 AI 推测内容”');
    return;
  }
  acting.value = true;
  try {
    await store.approve({
      acceptHypotheses: acceptHypotheses.value,
      reviewerNote: reviewerNote.value || undefined,
    });
    // 审核成功后已确认版本是新的基线，避免离开页面时误判仍有未保存修改
    baselineJson.value = JSON.stringify(store.current);
    approveOpen.value = false;
    ElMessage.success('产品理解已确认，进入 M2 创意方向占位');
    await router.push(`/studio/${projectId.value}/angles`);
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function runReanalysis() {
  if (!snapshotId.value) {
    ElMessage.warning('缺少已确认的资料快照');
    return;
  }
  acting.value = true;
  try {
    const result = await store.generate(
      reanalyzeScope.value,
      snapshotId.value,
      reanalyzeScenario.value,
    );
    jobId.value = result.jobId;
    reanalyzeOpen.value = false;
    ElMessage.info('已启动模拟重新分析，完成后会生成新修订');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

function openEvidence(ids: string[], title = '证据来源') {
  const found: EvidenceRef[] = [];
  for (const id of ids) {
    const item = evidenceById.value.get(id);
    if (item) {
      found.push(item);
    }
  }
  selectedEvidence.value = found;
  if (selectedEvidence.value.length === 0) {
    ElMessage.info('该条目暂未绑定证据');
    return;
  }
  evidenceTitle.value = title;
  evidenceOpen.value = true;
}

function openEdit(
  kind: 'feature' | 'lists' | 'pain' | 'persona' | 'seed' | 'summary',
  index = 0,
) {
  editKind.value = kind;
  editIndex.value = index;
  for (const key of Object.keys(editForm)) {
    delete editForm[key];
  }
  if (!current.value) {
    return;
  }
  if (kind === 'summary') {
    editForm.productSummary = current.value.productSummary;
    editForm.category = current.value.category;
    editForm.whyThisAngle = current.value.whyThisAngle ?? '';
  }
  if (kind === 'feature') {
    const item = current.value.features[index] as ProductFeature;
    editForm.title = item.title;
    editForm.description = item.description;
    editForm.outcome = item.outcome;
    editForm.evidenceLevel = item.evidenceLevel;
    editForm.reviewStatus = item.reviewStatus;
    editUsableInMarketing.value = item.usableInMarketing;
    editForm.editorNote = item.editorNote ?? '';
  }
  if (kind === 'persona') {
    const item = current.value.personas[index] as Persona;
    editForm.name = item.name;
    editForm.role = item.role;
    editForm.currentApproach = item.currentApproach;
    editForm.jobsToBeDone = item.jobsToBeDone.join('\n');
    editForm.mainFrictions = item.mainFrictions.join('\n');
    editForm.purchaseMotivation = item.purchaseMotivation ?? '';
    editForm.evidenceLevel = item.evidenceLevel;
  }
  if (kind === 'pain') {
    const item = current.value.painPoints[index] as PainPoint;
    editForm.painPoint = item.painPoint;
    editForm.scenario = item.scenario;
    editForm.emotions = item.emotions.join('、');
    editForm.currentApproach = item.currentApproach ?? '';
    editForm.costOfProblem = item.costOfProblem ?? '';
    editForm.evidenceLevel = item.evidenceLevel;
    editForm.editorNote = item.editorNote ?? '';
  }
  if (kind === 'seed') {
    const item = current.value.valueAngleSeeds[index] as ValueAngleSeed;
    editForm.title = item.title;
    editForm.oldApproach = item.oldApproach ?? '';
    editForm.newApproach = item.newApproach ?? '';
    editForm.audienceReaction = item.audienceReaction;
    editForm.category = item.category;
    editForm.evidenceLevel = item.evidenceLevel;
  }
  if (kind === 'lists') {
    editForm.competitorAlternatives =
      current.value.competitorAlternatives.join('\n');
    editForm.brandGuidelines = current.value.brandGuidelines.join('\n');
    editForm.prohibitedClaims = current.value.prohibitedClaims.join('\n');
    editForm.missingInformation = current.value.missingInformation.join('\n');
    editForm.riskNotes = current.value.riskNotes.join('\n');
  }
  if (['feature', 'pain', 'persona'].includes(kind) && current.value) {
    let list: Array<{ sourceEvidenceIds?: string[] }> =
      current.value.painPoints;
    if (kind === 'feature') {
      list = current.value.features;
    } else if (kind === 'persona') {
      list = current.value.personas;
    }
    editEvidenceIds.value = [...(list[index]?.sourceEvidenceIds ?? [])];
  }
  editOpen.value = true;
}

function asText(value: boolean | string | undefined): string {
  return typeof value === 'string' ? value : '';
}

function saveEdit() {
  if (!current.value) {
    return;
  }
  const revision = current.value as unknown as Record<string, unknown>;
  if (editKind.value === 'summary') {
    revision.productSummary = asText(editForm.productSummary);
    revision.category = asText(editForm.category);
    revision.whyThisAngle = asText(editForm.whyThisAngle);
  }
  if (editKind.value === 'feature') {
    const item = current.value.features[editIndex.value] as ProductFeature;
    item.title = asText(editForm.title);
    item.description = asText(editForm.description);
    item.outcome = asText(editForm.outcome);
    item.evidenceLevel = asText(editForm.evidenceLevel) as EvidenceLevel;
    item.reviewStatus = asText(
      editForm.reviewStatus,
    ) as ProductFeature['reviewStatus'];
    item.usableInMarketing = editUsableInMarketing.value;
    item.editorNote = asText(editForm.editorNote);
  }
  if (editKind.value === 'persona') {
    const item = current.value.personas[editIndex.value] as Persona;
    item.name = asText(editForm.name);
    item.role = asText(editForm.role);
    item.currentApproach = asText(editForm.currentApproach);
    item.jobsToBeDone = asText(editForm.jobsToBeDone)
      .split('\n')
      .filter(Boolean);
    item.mainFrictions = asText(editForm.mainFrictions)
      .split('\n')
      .filter(Boolean);
    item.purchaseMotivation = asText(editForm.purchaseMotivation);
    item.evidenceLevel = asText(editForm.evidenceLevel) as EvidenceLevel;
  }
  if (editKind.value === 'pain') {
    const item = current.value.painPoints[editIndex.value] as PainPoint;
    item.painPoint = asText(editForm.painPoint);
    item.scenario = asText(editForm.scenario);
    item.emotions = asText(editForm.emotions)
      .split(/[、,，]/)
      .filter(Boolean);
    item.currentApproach = asText(editForm.currentApproach);
    item.costOfProblem = asText(editForm.costOfProblem);
    item.evidenceLevel = asText(editForm.evidenceLevel) as EvidenceLevel;
    item.editorNote = asText(editForm.editorNote);
  }
  if (editKind.value === 'seed') {
    const item = current.value.valueAngleSeeds[
      editIndex.value
    ] as ValueAngleSeed;
    item.title = asText(editForm.title);
    item.oldApproach = asText(editForm.oldApproach);
    item.newApproach = asText(editForm.newApproach);
    item.audienceReaction = asText(editForm.audienceReaction);
    item.category = asText(editForm.category) as ValueAngleSeed['category'];
    item.evidenceLevel = asText(editForm.evidenceLevel) as EvidenceLevel;
  }
  if (editKind.value === 'lists') {
    revision.competitorAlternatives = asText(editForm.competitorAlternatives)
      .split('\n')
      .filter(Boolean);
    revision.brandGuidelines = asText(editForm.brandGuidelines)
      .split('\n')
      .filter(Boolean);
    revision.prohibitedClaims = asText(editForm.prohibitedClaims)
      .split('\n')
      .filter(Boolean);
    revision.missingInformation = asText(editForm.missingInformation)
      .split('\n')
      .filter(Boolean);
    revision.riskNotes = asText(editForm.riskNotes).split('\n').filter(Boolean);
  }
  if (
    ['feature', 'pain', 'persona'].includes(editKind.value) &&
    current.value
  ) {
    let list: Array<{ sourceEvidenceIds?: string[] }> =
      current.value.painPoints;
    if (editKind.value === 'feature') {
      list = current.value.features;
    } else if (editKind.value === 'persona') {
      list = current.value.personas;
    }
    const editTarget = list[editIndex.value];
    if (editTarget) {
      editTarget.sourceEvidenceIds = editEvidenceIds.value.filter((id) =>
        evidence.value.some((item) => item.id === id),
      );
    }
  }
  editOpen.value = false;
}

function addEntity(kind: 'feature' | 'pain' | 'persona' | 'seed') {
  if (!current.value) {
    return;
  }
  if (kind === 'feature') {
    current.value.features.push({
      description: '',
      evidenceLevel: 'user_confirmed',
      id: `feature_user_${Date.now()}`,
      outcome: '',
      reviewStatus: 'pending',
      sourceEvidenceIds: [],
      title: '用户新增功能',
      usableInMarketing: false,
    });
    openEdit('feature', current.value.features.length - 1);
  }
  if (kind === 'persona') {
    current.value.personas.push({
      currentApproach: '',
      evidenceLevel: 'user_confirmed',
      id: `persona_user_${Date.now()}`,
      jobsToBeDone: [],
      mainFrictions: [],
      name: '新增用户画像',
      reviewStatus: 'pending',
      role: '',
      sourceEvidenceIds: [],
    });
    openEdit('persona', current.value.personas.length - 1);
  }
  if (kind === 'pain') {
    current.value.painPoints.push({
      currentApproach: '',
      emotions: [],
      evidenceLevel: 'user_confirmed',
      id: `pain_user_${Date.now()}`,
      linkedFeatureIds: [],
      painPoint: '用户新增痛点',
      personaIds: [],
      reviewStatus: 'pending',
      scenario: '',
      sourceEvidenceIds: [],
    });
    openEdit('pain', current.value.painPoints.length - 1);
  }
  if (kind === 'seed') {
    current.value.valueAngleSeeds.push({
      audienceReaction: '',
      category: 'novelty',
      evidenceLevel: 'hypothesis',
      id: `seed_user_${Date.now()}`,
      relatedFeatureIds: [],
      relatedPainPointIds: [],
      title: '用户新增价值线索',
    });
    openEdit('seed', current.value.valueAngleSeeds.length - 1);
  }
}

async function removeEntity(
  kind: 'feature' | 'pain' | 'persona' | 'seed',
  index: number,
) {
  if (!current.value) {
    return;
  }
  try {
    await ElMessageBox.confirm(
      '从当前草稿中移除该条目？保存草稿后才会写入服务端。',
      '移除条目',
      {
        cancelButtonText: '取消',
        confirmButtonText: '移除',
        type: 'warning',
      },
    );
    if (kind === 'feature') {
      current.value.features.splice(index, 1);
    }
    if (kind === 'persona') {
      current.value.personas.splice(index, 1);
    }
    if (kind === 'pain') {
      current.value.painPoints.splice(index, 1);
    }
    if (kind === 'seed') {
      current.value.valueAngleSeeds.splice(index, 1);
    }
  } catch {
    // 用户取消
  }
}

function markUnsupported(feature: ProductFeature) {
  feature.evidenceLevel = 'unsupported';
  feature.usableInMarketing = false;
  feature.reviewStatus = 'rejected';
  feature.editorNote = '用户标记：产品不支持此能力';
}

function painToSeed(pain: PainPoint) {
  if (!current.value) return;
  const id = `user_seed_${pain.id}`;
  if (current.value.valueAngleSeeds.some((seed) => seed.id === id)) {
    ElMessage.info('已加入候选线索');
    return;
  }
  current.value.valueAngleSeeds.push({
    id,
    title: pain.painPoint,
    category: 'pain',
    evidenceLevel: pain.evidenceLevel,
    oldApproach: pain.currentApproach,
    newApproach: '具体解决能力需依据功能审核',
    audienceReaction: '传播判断待验证，不代表投放效果',
    relatedFeatureIds: [...pain.linkedFeatureIds],
    relatedPainPointIds: [pain.id],
  });
}
function markHypothesis(pain: PainPoint) {
  pain.evidenceLevel = 'hypothesis';
}

function openEvidenceForPain(pain: PainPoint) {
  openEvidence(pain.sourceEvidenceIds, `痛点证据：${pain.painPoint}`);
}

async function resumeActiveJob() {
  if (jobId.value) {
    return;
  }
  try {
    const jobs = await listProjectJobs(projectId.value);
    const active = jobs.find(
      (item) =>
        item.kind === 'UNDERSTANDING' &&
        ['CREATED', 'QUEUED', 'RUNNING'].includes(item.status),
    );
    if (active) {
      jobId.value = active.id;
    }
  } catch {
    // 任务恢复失败不阻塞页面，用户仍可重新发起分析
  }
}

async function openReanalyze() {
  if (!dirty.value) {
    reanalyzeOpen.value = true;
    return;
  }
  try {
    await ElMessageBox.confirm(
      '有未保存的修改。重新分析会基于最后保存的版本，是否先保存草稿？',
      '未保存的修改',
      {
        cancelButtonText: '直接继续',
        confirmButtonText: '保存并继续',
        distinguishCancelAndClose: true,
        type: 'warning',
      },
    );
    if (await saveDraft()) reanalyzeOpen.value = true;
  } catch (error) {
    if (error === 'cancel') {
      reanalyzeOpen.value = true;
    }
  }
}

function openComment() {
  commentNote.value = current.value?.reviewerNotes ?? '';
  commentOpen.value = true;
}

async function submitComment() {
  const note = commentNote.value.trim();
  if (!note) {
    ElMessage.warning('请输入审核意见');
    return;
  }
  commenting.value = true;
  try {
    const updated = await store.comment(note);
    baselineJson.value = JSON.stringify(updated);
    commentOpen.value = false;
    ElMessage.success('审核意见已记录');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    commenting.value = false;
  }
}

onMounted(async () => {
  await load();
  await resumeActiveJob();
});
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <div class="vc-page vc-understanding">
    <LoadingState v-if="loading" :rows="6" />

    <ErrorState
      v-else-if="pageError"
      class="vc-understanding__error"
      :message="pageError"
      :show-retry="false"
      title="无法加载产品理解"
    >
      <ElButton type="primary" plain @click="router.push('/projects')">
        返回项目中心
      </ElButton>
      <ElButton @click="load">重试</ElButton>
    </ErrorState>

    <template v-else-if="project">
      <header class="vc-understanding__hero">
        <div class="vc-understanding__hero-copy">
          <p class="vc-understanding__eyebrow">Understanding · S2</p>
          <h1 class="vc-page__title">产品理解与用户洞察</h1>
          <p class="vc-page__subtitle">
            {{ project.title }} · 资料快照 {{ snapshotId || '未确认' }} ·
            <strong>本报告为 Mock 演示数据，需人工审核</strong>
          </p>
        </div>
        <div class="vc-m1-actions">
          <ElSelect
            v-if="revisionOptions.length > 0"
            :model-value="store.current?.id"
            class="vc-m1-understanding__revision"
            placeholder="选择修订"
            @change="selectRevision"
          >
            <ElOption
              v-for="item in revisionOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </ElSelect>
          <ElButton @click="router.push(`/studio/${projectId}/ingest`)">
            返回补充资料
          </ElButton>
          <ElButton
            :disabled="!canEditCurrent"
            :loading="acting"
            @click="saveDraft"
          >
            保存报告草稿
          </ElButton>
          <ElButton :disabled="!canApproveCurrent" @click="approveOpen = true">
            确认产品理解
          </ElButton>
        </div>
      </header>

      <ElAlert
        v-if="store.staleRevisions > 0"
        :closable="false"
        class="vc-m1-understanding__alert"
        show-icon
        title="资料发生变化：已有报告被标记为 STALE，部分结论可能不适用，请重新分析或复核。"
        type="warning"
      />
      <section
        v-if="store.staleRevisions > 0"
        class="vc-understanding__panel vc-understanding__stale"
        aria-label="资料变更影响"
      >
        <div class="vc-understanding__stale-head">
          <div>
            <div class="vc-understanding__stale-title-row">
              <h3>资料变更摘要</h3>
              <ElTag type="warning" effect="plain" round>待复核</ElTag>
            </div>
            <p class="vc-m1-understanding__weak">
              新资料已进入，旧结论需复核后再确认。
            </p>
          </div>
        </div>

        <ul
          v-if="materialChanges.length > 0"
          class="vc-understanding__stale-list"
        >
          <li v-for="change in materialChanges" :key="change">{{ change }}</li>
        </ul>

        <div class="vc-understanding__stale-impact">
          <span>受影响的结论需复核</span>
          <p>
            {{
              current?.features.map((item) => item.title).join('、') || '—'
            }}；相关痛点和价值线索也需重新判断。
          </p>
        </div>

        <div class="vc-understanding__stale-actions">
          <ElButton :disabled="!canEdit" @click="retainOld"
            >沿用旧报告（待复核）</ElButton
          >
          <ElButton :disabled="!canEdit" type="primary" @click="openReanalyze"
            >根据新资料重新分析</ElButton
          >
        </div>

        <p v-if="retained" class="vc-understanding__status" role="status">
          已记录沿用选择。旧版保持待复核，M2
          门禁继续生效；确认最新资料并审核新报告后才能继续。
        </p>
      </section>
      <ElAlert
        v-if="!canEdit"
        :closable="false"
        class="vc-m1-understanding__alert"
        show-icon
        title="当前角色只读：可以查看证据与报告、提交审核意见，但不能修改内容或启动分析。"
        type="info"
      />

      <JobProgress v-if="job" :job="job" title="产品理解任务" />

      <EmptyState
        v-if="!current"
        class="vc-m1-understanding__empty"
        description="资料确认后，可以启动一次模拟产品理解任务；结果会以草稿修订展示，并等待人工审核。"
        title="还没有产品理解报告"
      >
        <ElSelect
          v-model="firstScenario"
          :disabled="Boolean(job)"
          class="vc-m1-understanding__scenario"
        >
          <ElOption label="分析成功" value="UNDERSTANDING_SUCCESS" />
          <ElOption label="分析失败（可重试）" value="UNDERSTANDING_FAILED" />
          <ElOption label="慢任务（可观察进度）" value="UNDERSTANDING_SLOW" />
        </ElSelect>
        <ElButton
          :disabled="!canEdit || !snapshotId || Boolean(job)"
          :loading="acting"
          type="primary"
          @click="startFullAnalysis"
        >
          开始产品分析
        </ElButton>
        <ElButton @click="router.push(`/studio/${projectId}/ingest`)">
          去补充资料
        </ElButton>
      </EmptyState>

      <div v-else class="vc-m1-understanding">
        <aside class="vc-understanding__panel vc-m1-understanding__evidence">
          <div class="vc-understanding__panel-head">
            <h3>证据来源</h3>
            <p class="vc-m1-understanding__weak">
              按证据等级筛选，点击查看出处。
            </p>
          </div>
          <ElSelect
            v-model="evidenceFilter"
            clearable
            placeholder="按证据等级筛选"
            size="small"
            class="vc-understanding__evidence-filter"
          >
            <ElOption label="有资料依据" value="verified" />
            <ElOption label="客户已确认" value="user_confirmed" />
            <ElOption label="AI 推测" value="hypothesis" />
            <ElOption label="不可作为主张" value="unsupported" />
          </ElSelect>
          <ul class="vc-m1-understanding__evidence-list">
            <li v-for="item in filteredEvidence" :key="item.id">
              <button
                type="button"
                @click="openEvidence([item.id], item.title)"
              >
                <ElTag
                  :type="EVIDENCE_TAG_TYPES[item.level]"
                  effect="plain"
                  size="small"
                >
                  {{ EVIDENCE_LABELS[item.level] }}
                </ElTag>
                <span>{{ item.title }}</span>
              </button>
            </li>
          </ul>
          <p
            v-if="filteredEvidence.length === 0"
            class="vc-m1-understanding__weak"
          >
            当前筛选下没有证据。
          </p>
        </aside>

        <main class="vc-m1-understanding__report">
          <section class="vc-understanding__panel">
            <div class="vc-m1-understanding__section-head">
              <div class="vc-understanding__section-title">
                <span class="vc-understanding__step">01</span>
                <h3>产品定位</h3>
              </div>
              <ElButton
                :disabled="!canEditCurrent"
                size="small"
                text
                @click="openEdit('summary')"
              >
                编辑
              </ElButton>
            </div>
            <p class="vc-m1-understanding__summary">
              {{ current.productSummary }}
            </p>
            <p class="vc-m1-understanding__weak">
              行业 / 类型：{{ current.category || '待确认' }} · 审核状态：{{
                statusLabel[current.status]
              }}
            </p>
            <p v-if="current.whyThisAngle" class="vc-m1-understanding__why">
              为什么这样判断：{{ current.whyThisAngle }}
            </p>
          </section>

          <section class="vc-understanding__panel">
            <div class="vc-m1-understanding__section-head">
              <div class="vc-understanding__section-title">
                <span class="vc-understanding__step">02</span>
                <h3>目标人群（{{ current.personas.length }}）</h3>
              </div>
              <ElButton
                :disabled="!canEditCurrent"
                size="small"
                @click="addEntity('persona')"
              >
                添加用户群
              </ElButton>
            </div>
            <div class="vc-m1-understanding__cards">
              <article
                v-for="(persona, index) in current.personas"
                :key="persona.id"
                class="vc-m1-understanding__card"
              >
                <header>
                  <strong>{{ persona.name }}</strong>
                  <ElTag
                    :type="EVIDENCE_TAG_TYPES[persona.evidenceLevel]"
                    effect="plain"
                    size="small"
                  >
                    {{ EVIDENCE_LABELS[persona.evidenceLevel] }}
                  </ElTag>
                </header>
                <p class="vc-m1-understanding__weak">{{ persona.role }}</p>
                <p>想完成：{{ persona.jobsToBeDone.join('；') || '—' }}</p>
                <p>当前做法：{{ persona.currentApproach || '—' }}</p>
                <p>主要困难：{{ persona.mainFrictions.join('；') || '—' }}</p>
                <footer class="vc-m1-understanding__card-actions">
                  <ElButton
                    :disabled="!canEditCurrent"
                    size="small"
                    text
                    @click="openEdit('persona', index)"
                  >
                    编辑
                  </ElButton>
                  <ElButton
                    size="small"
                    text
                    @click="
                      openEvidence(persona.sourceEvidenceIds, persona.name)
                    "
                  >
                    证据
                  </ElButton>
                  <ElButton
                    :disabled="!canEditCurrent"
                    size="small"
                    text
                    type="danger"
                    @click="removeEntity('persona', index)"
                  >
                    删除
                  </ElButton>
                </footer>
              </article>
            </div>
          </section>

          <section class="vc-understanding__panel">
            <div class="vc-m1-understanding__section-head">
              <div class="vc-understanding__section-title">
                <span class="vc-understanding__step">03</span>
                <h3>核心功能（{{ current.features.length }}）</h3>
              </div>
              <div class="vc-understanding__section-meta">
                <span class="vc-understanding__save-status" role="status">{{
                  store.saving
                    ? '保存中'
                    : dirty
                      ? store.saveStatus.startsWith('保存失败')
                        ? store.saveStatus
                        : '有未保存修改'
                      : store.saveStatus
                }}</span>
                <ElButton
                  :disabled="!canEditCurrent"
                  size="small"
                  @click="addEntity('feature')"
                >
                  添加功能
                </ElButton>
              </div>
            </div>
            <div class="vc-m1-understanding__cards">
              <article
                v-for="(feature, index) in current.features"
                :key="feature.id"
                class="vc-m1-understanding__card"
              >
                <header>
                  <strong>{{ feature.title }}</strong>
                  <ElTag
                    :type="EVIDENCE_TAG_TYPES[feature.evidenceLevel]"
                    effect="plain"
                    size="small"
                  >
                    {{ EVIDENCE_LABELS[feature.evidenceLevel] }}
                  </ElTag>
                  <ElTag
                    v-if="feature.usableInMarketing"
                    type="success"
                    size="small"
                  >
                    可用于宣传
                  </ElTag>
                  <ElTag v-else type="danger" size="small">不可用于宣传</ElTag>
                </header>
                <p>{{ feature.description }}</p>
                <p class="vc-m1-understanding__weak">
                  审核状态：{{ feature.reviewStatus }} · 对用户的价值：{{
                    feature.outcome || '—'
                  }}
                </p>
                <footer class="vc-m1-understanding__card-actions">
                  <ElButton
                    :disabled="!canEditCurrent"
                    size="small"
                    text
                    @click="openEdit('feature', index)"
                  >
                    编辑
                  </ElButton>
                  <ElButton
                    size="small"
                    text
                    @click="
                      openEvidence(feature.sourceEvidenceIds, feature.title)
                    "
                  >
                    查看证据
                  </ElButton>
                  <ElButton
                    :disabled="!canEditCurrent"
                    size="small"
                    text
                    type="danger"
                    @click="markUnsupported(feature)"
                  >
                    标记不支持
                  </ElButton>
                </footer>
              </article>
            </div>
          </section>

          <section class="vc-understanding__panel">
            <div class="vc-m1-understanding__section-head">
              <div class="vc-understanding__section-title">
                <span class="vc-understanding__step">04</span>
                <h3>用户痛点（{{ current.painPoints.length }} 个候选）</h3>
              </div>
              <ElButton
                :disabled="!canEditCurrent"
                size="small"
                @click="addEntity('pain')"
              >
                添加痛点
              </ElButton>
            </div>
            <p class="vc-m1-understanding__weak">
              候选痛点允许保持
              hypothesis；请勿把没有证据的推测直接确认成真实问题。
            </p>
            <div class="vc-m1-understanding__cards">
              <article
                v-for="(pain, index) in current.painPoints"
                :key="pain.id"
                class="vc-m1-understanding__card"
              >
                <header>
                  <strong>{{ pain.painPoint }}</strong>
                  <ElTag
                    :type="EVIDENCE_TAG_TYPES[pain.evidenceLevel]"
                    effect="plain"
                    size="small"
                  >
                    {{ EVIDENCE_LABELS[pain.evidenceLevel] }}
                  </ElTag>
                </header>
                <p class="vc-m1-understanding__weak">
                  场景：{{ pain.scenario || '—' }}
                </p>
                <p>情绪：{{ pain.emotions.join('、') || '—' }}</p>
                <p
                  v-if="pain.currentApproach"
                  class="vc-m1-understanding__weak"
                >
                  当前做法：{{ pain.currentApproach }}
                </p>
                <p>
                  传播潜力（模拟）：{{
                    pain.linkedFeatureIds.length > 0
                      ? '有产品关联，可进一步策划'
                      : '待验证，请先补充产品依据'
                  }}，不代表投放效果。
                </p>
                <p
                  v-if="
                    pain.linkedFeatureIds.some((id) =>
                      current?.features.some(
                        (feature) =>
                          feature.id === id &&
                          feature.evidenceLevel === 'unsupported',
                      ),
                    )
                  "
                  role="status"
                >
                  依据已变更：关联功能被标记为不支持，请重新审核此痛点与传播主张。
                </p>
                <ElButton
                  :disabled="!canEditCurrent"
                  size="small"
                  @click="
                    pain.evidenceLevel = 'user_confirmed';
                    pain.reviewStatus = 'approved';
                  "
                  >确认真实</ElButton
                >
                <ElButton
                  :disabled="!canEditCurrent"
                  size="small"
                  @click="
                    pain.reviewStatus = 'rejected';
                    pain.evidenceLevel = 'unsupported';
                  "
                  >不适用</ElButton
                >
                <ElButton
                  :disabled="!canEditCurrent"
                  size="small"
                  @click="painToSeed(pain)"
                  >加入创意线索</ElButton
                >
                <p>审核状态：{{ pain.reviewStatus }}</p>
                <p v-if="pain.costOfProblem">
                  问题成本：{{ pain.costOfProblem }}
                </p>
                <p>
                  关联功能：{{
                    pain.linkedFeatureIds
                      .map(
                        (id) =>
                          current?.features.find((feature) => feature.id === id)
                            ?.title || id,
                      )
                      .join('、') || '尚未关联'
                  }}
                </p>
                <p>
                  价值线索：{{
                    current.valueAngleSeeds
                      .filter((seed) =>
                        seed.relatedPainPointIds.includes(pain.id),
                      )
                      .map((seed) => seed.title)
                      .join('、') || '尚未关联'
                  }}
                </p>
                <footer class="vc-m1-understanding__card-actions">
                  <ElButton
                    :disabled="!canEditCurrent"
                    size="small"
                    text
                    @click="openEdit('pain', index)"
                  >
                    编辑
                  </ElButton>
                  <ElButton
                    size="small"
                    text
                    @click="openEvidenceForPain(pain)"
                  >
                    查看证据
                  </ElButton>
                  <ElButton
                    :disabled="!canEditCurrent"
                    size="small"
                    text
                    @click="markHypothesis(pain)"
                  >
                    保留为推测
                  </ElButton>
                  <ElButton
                    :disabled="!canEditCurrent"
                    size="small"
                    text
                    type="danger"
                    @click="removeEntity('pain', index)"
                  >
                    移除
                  </ElButton>
                </footer>
              </article>
            </div>
          </section>

          <section class="vc-understanding__panel">
            <div class="vc-m1-understanding__section-head">
              <div class="vc-understanding__section-title">
                <span class="vc-understanding__step">05</span>
                <h3>非寻常价值与传播线索</h3>
              </div>
              <ElButton
                :disabled="!canEditCurrent"
                size="small"
                @click="addEntity('seed')"
              >
                添加价值线索
              </ElButton>
            </div>
            <div class="vc-m1-understanding__cards">
              <article
                v-for="(seed, index) in current.valueAngleSeeds"
                :key="seed.id"
                class="vc-m1-understanding__card"
              >
                <header>
                  <strong>{{ seed.title }}</strong>
                  <ElTag
                    :type="EVIDENCE_TAG_TYPES[seed.evidenceLevel]"
                    effect="plain"
                    size="small"
                  >
                    {{ EVIDENCE_LABELS[seed.evidenceLevel] }}
                  </ElTag>
                  <ElTag size="small">{{ seed.category }}</ElTag>
                </header>
                <p v-if="seed.oldApproach" class="vc-m1-understanding__weak">
                  旧方式：{{ seed.oldApproach }}
                </p>
                <p v-if="seed.newApproach">新方式：{{ seed.newApproach }}</p>
                <p class="vc-m1-understanding__weak">
                  观众反应：{{ seed.audienceReaction || '—' }}
                </p>
                <footer class="vc-m1-understanding__card-actions">
                  <ElButton
                    :disabled="!canEditCurrent"
                    size="small"
                    text
                    @click="openEdit('seed', index)"
                  >
                    编辑
                  </ElButton>
                </footer>
              </article>
            </div>
          </section>

          <section class="vc-understanding__panel">
            <div class="vc-m1-understanding__section-head">
              <div class="vc-understanding__section-title">
                <span class="vc-understanding__step">06</span>
                <h3>传统替代方案 / 品牌与宣传禁区</h3>
              </div>
              <ElButton
                :disabled="!canEditCurrent"
                size="small"
                text
                @click="openEdit('lists')"
              >
                编辑约束
              </ElButton>
            </div>
            <div class="vc-m1-understanding__lists">
              <div class="vc-understanding__list-card">
                <h4>传统替代方案</h4>
                <p>{{ current.competitorAlternatives.join('、') || '—' }}</p>
              </div>
              <div class="vc-understanding__list-card">
                <h4>品牌规范</h4>
                <p>{{ current.brandGuidelines.join('；') || '—' }}</p>
              </div>
              <div class="vc-understanding__list-card">
                <h4>宣传禁区</h4>
                <ul>
                  <li v-for="claim in current.prohibitedClaims" :key="claim">
                    {{ claim }}
                  </li>
                </ul>
              </div>
              <div class="vc-understanding__list-card">
                <h4>缺失信息</h4>
                <ul>
                  <li v-for="item in current.missingInformation" :key="item">
                    {{ item }}
                  </li>
                </ul>
              </div>
              <div class="vc-understanding__list-card">
                <h4>风险提示</h4>
                <ul>
                  <li v-for="item in current.riskNotes" :key="item">
                    {{ item }}
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </main>

        <aside class="vc-m1-understanding__review">
          <div class="vc-understanding__panel vc-understanding__review-card">
            <div class="vc-understanding__panel-head">
              <h3>审核与版本</h3>
              <p class="vc-m1-understanding__weak">
                当前 R{{ current.revisionNo }} · 版本 v{{ current.version }}
              </p>
            </div>
            <div class="vc-understanding__status-row">
              <ElTag :type="statusTagType[current.status]" effect="light">
                {{ statusLabel[current.status] }}
              </ElTag>
              <ElTag
                v-if="dirty"
                class="vc-m1-understanding__dirty"
                type="warning"
                size="small"
              >
                有未保存修改
              </ElTag>
            </div>
            <p v-if="current.approvedAt" class="vc-m1-understanding__weak">
              已确认：{{ formatDateTime(current.approvedAt) }} ·
              {{ current.approvedBy }}
            </p>
            <div class="vc-m1-understanding__review-actions">
              <ElButton
                v-if="['APPROVED', 'STALE'].includes(current.status)"
                :disabled="!canEdit"
                :loading="acting"
                @click="forkDraft"
              >
                派生新草稿
              </ElButton>
              <ElButton @click="openDiff">版本对比</ElButton>
              <ElButton
                v-if="canEditCurrent"
                :loading="acting"
                @click="saveDraft"
              >
                保存草稿
              </ElButton>
              <ElButton
                v-if="canEditCurrent && current.status === 'DRAFT'"
                :loading="acting"
                @click="submitReview"
              >
                提交审核
              </ElButton>
              <ElButton
                v-if="canEdit || isReviewer"
                :loading="commenting"
                @click="openComment"
              >
                提出审核意见
              </ElButton>
              <ElButton
                v-if="canApproveCurrent"
                type="primary"
                @click="approveOpen = true"
              >
                确认产品理解
              </ElButton>
              <ElButton :disabled="!canEdit" @click="openReanalyze">
                重新分析
              </ElButton>
              <ElButton @click="router.push(`/studio/${projectId}/ingest`)">
                返回补充资料
              </ElButton>
            </div>
            <div
              v-if="(current.reviewLog?.length ?? 0) > 0"
              class="vc-m1-understanding__review-log"
            >
              <h4>审核记录</h4>
              <ul>
                <li
                  v-for="entry in current.reviewLog"
                  :key="entry.at + entry.by"
                >
                  <span>{{ formatDateTime(entry.at) }} · {{ entry.by }}</span>
                  <p>{{ entry.note }}</p>
                </li>
              </ul>
            </div>
            <p class="vc-m1-understanding__weak">
              确认前需知悉报告中的 AI 推测；确认后旧修订不可修改，M2
              只能读取已确认版本。
            </p>
          </div>

          <div class="vc-understanding__panel">
            <div class="vc-understanding__panel-head">
              <h3>证据与风险</h3>
            </div>
            <p class="vc-m1-understanding__weak">
              报告引用 {{ current.usedEvidenceIds.length }} 条证据 ·
              {{
                current.painPoints.filter(
                  (item) => item.evidenceLevel === 'hypothesis',
                ).length
              }}
              个痛点仍为推测
            </p>
            <ElButton
              size="small"
              @click="
                openEvidence(current.usedEvidenceIds, '报告使用的全部证据')
              "
            >
              查看全部证据
            </ElButton>
          </div>
        </aside>
      </div>

      <ElDialog v-model="editOpen" title="编辑报告字段" width="600px">
        <div class="vc-m1-understanding__form">
          <template v-if="editKind === 'summary'">
            <label>产品一句话定位</label>
            <ElInput
              v-model="editForm.productSummary"
              :rows="3"
              type="textarea"
            />
            <label>行业 / 业务类型</label>
            <ElInput v-model="editForm.category" />
            <label>为什么这样判断</label>
            <ElInput
              v-model="editForm.whyThisAngle"
              :rows="3"
              type="textarea"
            />
          </template>
          <template v-if="editKind === 'feature'">
            <label>审核状态</label>
            <ElSelect v-model="editForm.reviewStatus">
              <ElOption label="待审核" value="pending" />
              <ElOption label="已确认" value="approved" />
              <ElOption label="已驳回" value="rejected" />
            </ElSelect>
            <label>功能名称</label>
            <ElInput v-model="editForm.title" />
            <label>说明</label>
            <ElInput v-model="editForm.description" :rows="3" type="textarea" />
            <label>对用户的价值</label>
            <ElInput v-model="editForm.outcome" />
            <label>证据等级</label>
            <ElSelect v-model="editForm.evidenceLevel">
              <ElOption label="有资料依据" value="verified" />
              <ElOption label="客户已确认" value="user_confirmed" />
              <ElOption label="AI 推测" value="hypothesis" />
              <ElOption label="不可作为确定主张" value="unsupported" />
            </ElSelect>
            <ElCheckbox v-model="editUsableInMarketing">
              允许用于宣传
            </ElCheckbox>
            <label>编辑备注</label>
            <ElInput v-model="editForm.editorNote" />
          </template>
          <template v-if="editKind === 'persona'">
            <label>用户群名称</label>
            <ElInput v-model="editForm.name" />
            <label>身份 / 场景</label>
            <ElInput v-model="editForm.role" />
            <label>想完成什么（每行一条）</label>
            <ElInput
              v-model="editForm.jobsToBeDone"
              :rows="3"
              type="textarea"
            />
            <label>当前做法</label>
            <ElInput v-model="editForm.currentApproach" />
            <label>主要困难（每行一条）</label>
            <ElInput
              v-model="editForm.mainFrictions"
              :rows="3"
              type="textarea"
            />
            <label>购买动机</label>
            <ElInput v-model="editForm.purchaseMotivation" />
            <label>证据等级</label>
            <ElSelect v-model="editForm.evidenceLevel">
              <ElOption label="有资料依据" value="verified" />
              <ElOption label="客户已确认" value="user_confirmed" />
              <ElOption label="AI 推测" value="hypothesis" />
              <ElOption label="不可作为确定主张" value="unsupported" />
            </ElSelect>
          </template>
          <template v-if="editKind === 'pain'">
            <label>痛点描述</label>
            <ElInput v-model="editForm.painPoint" />
            <label>发生场景</label>
            <ElInput v-model="editForm.scenario" />
            <label>情绪（用、分隔）</label>
            <ElInput v-model="editForm.emotions" />
            <label>当前做法</label>
            <ElInput v-model="editForm.currentApproach" />
            <label>问题成本</label>
            <ElInput v-model="editForm.costOfProblem" />
            <label>证据等级</label>
            <ElSelect v-model="editForm.evidenceLevel">
              <ElOption label="有资料依据" value="verified" />
              <ElOption label="客户已确认" value="user_confirmed" />
              <ElOption label="AI 推测" value="hypothesis" />
              <ElOption label="不可作为确定主张" value="unsupported" />
            </ElSelect>
            <label>编辑备注</label>
            <ElInput v-model="editForm.editorNote" />
          </template>
          <template v-if="editKind === 'seed'">
            <label>价值线索标题</label>
            <ElInput v-model="editForm.title" />
            <label>旧方式</label>
            <ElInput v-model="editForm.oldApproach" />
            <label>新方式</label>
            <ElInput v-model="editForm.newApproach" />
            <label>观众可能反应</label>
            <ElInput v-model="editForm.audienceReaction" />
            <label>类别</label>
            <ElInput v-model="editForm.category" />
            <label>证据等级</label>
            <ElSelect v-model="editForm.evidenceLevel">
              <ElOption label="有资料依据" value="verified" />
              <ElOption label="客户已确认" value="user_confirmed" />
              <ElOption label="AI 推测" value="hypothesis" />
              <ElOption label="不可作为确定主张" value="unsupported" />
            </ElSelect>
          </template>
          <template v-if="editKind === 'lists'">
            <label>传统替代方案（每行一条）</label>
            <ElInput
              v-model="editForm.competitorAlternatives"
              :rows="3"
              type="textarea"
            />
            <label>品牌规范（每行一条）</label>
            <ElInput
              v-model="editForm.brandGuidelines"
              :rows="3"
              type="textarea"
            />
            <label>宣传禁区（每行一条）</label>
            <ElInput
              v-model="editForm.prohibitedClaims"
              :rows="3"
              type="textarea"
            />
            <label>缺失信息（每行一条）</label>
            <ElInput
              v-model="editForm.missingInformation"
              :rows="3"
              type="textarea"
            />
            <label>风险提示（每行一条）</label>
            <ElInput v-model="editForm.riskNotes" :rows="3" type="textarea" />
          </template>
        </div>
        <div v-if="['feature', 'persona', 'pain'].includes(editKind)">
          <label>补充证据</label
          ><ElSelect
            v-model="editEvidenceIds"
            multiple
            filterable
            aria-label="补充证据"
            ><ElOption
              v-for="item in evidence"
              :key="item.id"
              :label="item.title"
              :value="item.id"
          /></ElSelect>
        </div>
        <template #footer>
          <ElButton @click="editOpen = false">取消</ElButton>
          <ElButton type="primary" @click="saveEdit">应用到草稿</ElButton>
        </template>
      </ElDialog>

      <ElDialog v-model="reanalyzeOpen" title="重新分析" width="520px">
        <div class="vc-m1-understanding__form">
          <p>选择范围后会生成新的修订，旧版本保留，不会静默覆盖。</p>
          <ElRadioGroup v-model="reanalyzeScope">
            <ElRadio value="PAIN_POINTS">仅重新分析痛点</ElRadio>
            <ElRadio value="VALUE_ANGLES">仅重新分析差异化亮点</ElRadio>
            <ElRadio value="FULL">完整重新分析</ElRadio>
          </ElRadioGroup>
          <label>演示场景</label>
          <ElSelect v-model="reanalyzeScenario">
            <ElOption label="成功" value="UNDERSTANDING_SUCCESS" />
            <ElOption label="失败（可重试）" value="UNDERSTANDING_FAILED" />
            <ElOption label="慢任务" value="UNDERSTANDING_SLOW" />
          </ElSelect>
          <p class="vc-m1-understanding__weak">
            重新分析会基于当前资料快照与已确认功能；未保存的修改请先保存。
          </p>
        </div>
        <template #footer>
          <ElButton @click="reanalyzeOpen = false">取消</ElButton>
          <ElButton :loading="acting" type="primary" @click="runReanalysis">
            开始重新分析
          </ElButton>
        </template>
      </ElDialog>

      <ElDialog v-model="approveOpen" title="确认产品理解" width="560px">
        <div class="vc-m1-understanding__form">
          <p>
            确认后当前修订 R{{ current?.revisionNo }} 将变为不可变版本，项目进入
            M2 创意方向占位。
          </p>
          <ul class="vc-m1-understanding__weak">
            <li>
              功能 {{ current?.features.length }} 个，其中可用
              {{
                current?.features.filter((item) => item.usableInMarketing)
                  .length
              }}
              个
            </li>
            <li>
              用户画像 {{ current?.personas.length }} 个，痛点候选
              {{ current?.painPoints.length }} 个
            </li>
            <li>
              宣传禁区 {{ current?.prohibitedClaims.length }} 条，未解决缺失
              {{ current?.missingInformation.length }} 项
            </li>
          </ul>
          <ElCheckbox v-model="acceptHypotheses">
            我知悉报告中仍有 AI
            推测（hypothesis），并同意在明确标注的前提下继续。
          </ElCheckbox>
          <label>审核意见（可选）</label>
          <ElInput
            v-model="reviewerNote"
            :rows="2"
            placeholder="例如：功能已确认，痛点保留待验证"
            type="textarea"
          />
        </div>
        <template #footer>
          <ElButton @click="approveOpen = false">取消</ElButton>
          <ElButton :loading="acting" type="primary" @click="approve">
            确认并进入 M2 占位
          </ElButton>
        </template>
      </ElDialog>

      <ElDialog v-model="commentOpen" title="审核意见" width="520px">
        <div class="vc-m1-understanding__form">
          <p>审核意见会记录在当前修订的审核记录中，不会修改报告内容。</p>
          <label>意见内容</label>
          <ElInput
            v-model="commentNote"
            :rows="4"
            maxlength="500"
            placeholder="例如：痛点 2 缺少资料依据，建议保留为推测并补充用户访谈"
            show-word-limit
            type="textarea"
          />
        </div>
        <template #footer>
          <ElButton @click="commentOpen = false">取消</ElButton>
          <ElButton :loading="commenting" type="primary" @click="submitComment">
            保存审核意见
          </ElButton>
        </template>
      </ElDialog>

      <section
        v-if="current?.deletionHistory?.length"
        class="vc-card"
        aria-label="已移除条目历史"
      >
        <h3>已移除条目历史</h3>
        <article v-for="record in current.deletionHistory" :key="record.id">
          <strong>{{ removedTitle(record.content) }}</strong>
          <p>
            移除时间：{{ formatDateTime(record.at) }} · 操作者：{{ record.by }}
          </p>
          <details>
            <summary>查看原内容</summary>
            <p v-if="'description' in record.content">
              说明：{{ record.content.description }}
            </p>
            <p v-if="'scenario' in record.content">
              场景：{{ record.content.scenario }}
            </p>
            <p v-if="'role' in record.content">
              用户角色：{{ record.content.role }}
            </p>
            <p>证据等级：{{ record.content.evidenceLevel }}</p>
          </details>
          <ElButton
            :disabled="
              !canEditCurrent ||
              current[record.collection].some(
                (item) => item.id === record.content.id,
              )
            "
            @click="restoreDeleted(record)"
            >恢复到草稿</ElButton
          >
        </article>
      </section>
      <p v-if="reportSnapshot?.completeness === 'LEGACY_PARTIAL'" role="status">
        这是旧版资料快照，部分历史内容无法可靠还原；已保留可确认的记录，请勿将当前资料视作原始版本。
      </p>
      <EvidenceDrawer
        v-model:open="evidenceOpen"
        :evidence="selectedEvidence"
        :assets="reportAssets"
        :revision="current"
        :sources="reportSources"
        :title="evidenceTitle"
      />
    </template>

    <ClaimConflictDrawer :can-approve="canApprove" :project-id="projectId" />
  </div>
  <ElDialog v-model="diffOpen" title="理解报告字段级对比" width="900px">
    <div class="vc-diff__selectors">
      <ElSelect
        v-model="fromRevisionId"
        placeholder="起始修订"
        @change="loadDiff"
      >
        <ElOption
          v-for="revision in revisions"
          :key="revision.id"
          :label="`R${revision.revisionNo} · ${revision.status}`"
          :value="revision.id"
        />
      </ElSelect>
      <span>→</span>
      <ElSelect
        v-model="toRevisionId"
        placeholder="目标修订"
        @change="loadDiff"
      >
        <ElOption
          v-for="revision in revisions"
          :key="revision.id"
          :label="`R${revision.revisionNo} · ${revision.status}`"
          :value="revision.id"
        />
      </ElSelect>
    </div>
    <p v-if="diff" class="vc-m1-understanding__weak">
      R{{ diff.fromRevisionNo }} → R{{ diff.toRevisionNo }} · 新增
      {{ diff.summary.added }} · 修改 {{ diff.summary.changed }} · 删除
      {{ diff.summary.removed }}
    </p>
    <ElAlert
      :closable="false"
      show-icon
      :title="diff?.m2Impact.note ?? 'Diff 只读，不会自动覆盖 M2 正式内容。'"
      type="info"
    />
    <div v-loading="diffLoading" class="vc-diff__body">
      <section v-for="section in diff?.sections ?? []" :key="section.key">
        <h4>{{ section.label }}（{{ section.items.length }}）</h4>
        <p v-if="section.items.length === 0" class="vc-m1-understanding__weak">
          无差异
        </p>
        <article
          v-for="item in section.items"
          :key="`${section.key}:${item.id}`"
          class="vc-diff__item"
        >
          <div class="vc-diff__item-head">
            <ElTag size="small">{{ item.change }}</ElTag>
            <strong>{{ item.label }}</strong>
          </div>
          <div
            v-for="field in item.fields"
            :key="field.field"
            class="vc-diff__field"
          >
            <code>{{ field.field }}</code>
            <span>{{ formatDiffValue(field.before) }}</span>
            <span>→</span>
            <span>{{ formatDiffValue(field.after) }}</span>
          </div>
        </article>
      </section>
      <section v-if="diff">
        <h4>禁语变化</h4>
        <p class="vc-m1-understanding__weak">
          新增：{{ diff.prohibitedClaims.added.join('、') || '无' }} · 移除：{{
            diff.prohibitedClaims.removed.join('、') || '无'
          }}
        </p>
        <h4>证据变化</h4>
        <p class="vc-m1-understanding__weak">
          新增：{{ diff.evidence.added.join('、') || '无' }} · 移除：{{
            diff.evidence.removed.join('、') || '无'
          }}
        </p>
      </section>
    </div>
    <template #footer>
      <ElButton @click="diffOpen = false">关闭</ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.vc-understanding {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.vc-understanding__error {
  padding: 8px 0;
}

.vc-understanding__hero {
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

.vc-understanding__hero-copy {
  min-width: 0;
  max-width: 760px;
}

.vc-understanding__eyebrow {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 650;
  color: var(--vc-brand);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.vc-understanding__hero .vc-page__title {
  font-size: 22px;
  letter-spacing: -0.02em;
}

.vc-m1-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.vc-m1-understanding__revision {
  width: 180px;
}

.vc-m1-understanding__alert {
  margin: 0;
}

.vc-understanding__stale {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background:
    linear-gradient(180deg, rgb(255 247 230 / 80%) 0%, transparent 70%),
    var(--el-bg-color-overlay, #fff);
  border-color: var(--vc-mock-banner-border);
}

.vc-understanding__stale-head {
  margin: 0;
}

.vc-understanding__stale-title-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.vc-understanding__stale-title-row h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-understanding__stale-head .vc-m1-understanding__weak {
  margin: 4px 0 0;
}

.vc-understanding__stale-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.vc-understanding__stale-list li {
  position: relative;
  padding: 10px 12px 10px 28px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular, #4b5563);
  background: rgb(255 255 255 / 72%);
  border: 1px solid var(--vc-mock-banner-border);
  border-radius: 10px;
}

.vc-understanding__stale-list li::before {
  position: absolute;
  top: 14px;
  left: 12px;
  width: 6px;
  height: 6px;
  content: '';
  background: #d9891b;
  border-radius: 50%;
}

.vc-understanding__stale-impact {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  background: rgb(255 255 255 / 72%);
  border: 1px solid var(--vc-mock-banner-border);
  border-radius: 10px;
}

.vc-understanding__stale-impact > span {
  font-size: 11px;
  font-weight: 700;
  color: #8a4b00;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.vc-understanding__stale-impact p {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: var(--el-text-color-regular, #4b5563);
}

.vc-understanding__stale-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding-top: 4px;
}

.vc-understanding__status {
  padding: 10px 12px;
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #8a4b00;
  background: var(--vc-mock-banner-bg);
  border: 1px solid var(--vc-mock-banner-border);
  border-radius: 10px;
}

.vc-m1-understanding__empty {
  padding: 28px 16px;
  margin: 0;
  background: var(--el-bg-color-overlay, #fff);
  border: 1px dashed var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-m1-understanding {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 280px;
  gap: 16px;
  align-items: start;
}

.vc-understanding__panel {
  box-sizing: border-box;
  padding: 16px 18px;
  background: var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-understanding__panel-head {
  margin-bottom: 12px;
}

.vc-understanding__panel-head h3,
.vc-m1-understanding__evidence h3,
.vc-m1-understanding__review h3,
.vc-m1-understanding__report h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-understanding__panel-head .vc-m1-understanding__weak {
  margin-top: 4px;
}

.vc-understanding__step {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  font-size: 11px;
  font-weight: 700;
  color: var(--vc-brand);
  background: var(--vc-brand-soft);
  border: 1px solid var(--vc-brand-border);
  border-radius: 9px;
}

.vc-understanding__section-title {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.vc-understanding__section-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.vc-understanding__save-status {
  font-size: 12px;
  color: var(--vc-text-weak);
}

.vc-m1-understanding__evidence,
.vc-m1-understanding__review {
  position: sticky;
  top: 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.vc-understanding__evidence-filter {
  width: 100%;
}

.vc-m1-understanding__evidence-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  margin: 10px 0 0;
  list-style: none;
}

.vc-m1-understanding__evidence-list button {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 8px 10px;
  font-size: 12px;
  color: var(--el-text-color-regular, #4b5563);
  text-align: left;
  cursor: pointer;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid transparent;
  border-radius: 10px;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease;
}

.vc-m1-understanding__evidence-list button:hover {
  color: var(--vc-brand);
  background: var(--vc-brand-soft);
  border-color: var(--vc-brand-border);
}

.vc-m1-understanding__report {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.vc-m1-understanding__section-head {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.vc-m1-understanding__summary {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 650;
  line-height: 1.65;
  color: var(--el-text-color-primary, #1f2937);
  letter-spacing: -0.01em;
}

.vc-m1-understanding__why {
  padding: 10px 12px;
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--vc-text-weak);
  background:
    linear-gradient(180deg, rgb(103 87 215 / 5%) 0%, transparent 80%),
    var(--el-bg-color-page, #f5f6f8);
  border: 1px solid var(--vc-brand-border);
  border-radius: 10px;
}

.vc-m1-understanding__cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.vc-m1-understanding__card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  font-size: 13px;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid transparent;
  border-radius: 12px;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.vc-m1-understanding__card:hover {
  background: var(--vc-brand-soft);
  border-color: var(--vc-brand-border);
  box-shadow: 0 8px 20px rgb(103 87 215 / 8%);
  transform: translateY(-1px);
}

.vc-m1-understanding__card header {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.vc-m1-understanding__card header strong {
  font-size: 14px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-m1-understanding__card p {
  margin: 0;
  line-height: 1.6;
}

.vc-m1-understanding__card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding-top: 8px;
  margin-top: auto;
  border-top: 1px solid var(--vc-border);
}

.vc-m1-understanding__lists {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  font-size: 13px;
}

.vc-understanding__list-card {
  padding: 12px 14px;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-m1-understanding__lists h4 {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-m1-understanding__lists p,
.vc-m1-understanding__lists ul {
  padding-left: 0;
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--vc-text-weak);
}

.vc-m1-understanding__lists ul {
  padding-left: 16px;
  list-style: disc;
}

.vc-m1-understanding__weak {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vc-text-weak);
}

.vc-understanding__review-card {
  background:
    linear-gradient(180deg, rgb(103 87 215 / 5%) 0%, transparent 58%),
    var(--el-bg-color-overlay, #fff);
  border-color: var(--vc-brand-border);
}

.vc-understanding__status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.vc-m1-understanding__dirty {
  margin-left: 0;
}

.vc-m1-understanding__review-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.vc-m1-understanding__scenario {
  width: 210px;
}

.vc-m1-understanding__review-log {
  padding-top: 12px;
  margin-top: 14px;
  border-top: 1px solid var(--vc-border);
}

.vc-m1-understanding__review-log h4 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 650;
}

.vc-m1-understanding__review-log ul {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.vc-m1-understanding__review-log li {
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vc-text-weak);
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-m1-understanding__review-log p {
  margin: 4px 0 0;
  color: var(--el-text-color-regular, #4b5563);
}

.vc-m1-understanding__form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
}

.vc-m1-understanding__form label {
  margin-top: 6px;
  font-size: 12px;
  color: var(--vc-text-weak);
}

@media (max-width: 1280px) {
  .vc-m1-understanding {
    grid-template-columns: 1fr;
  }

  .vc-m1-understanding__evidence,
  .vc-m1-understanding__review {
    position: static;
  }
}

@media (max-width: 720px) {
  .vc-understanding__hero {
    padding: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vc-m1-understanding__evidence-list button,
  .vc-m1-understanding__card {
    transition: none;
  }

  .vc-m1-understanding__card:hover {
    transform: none;
  }
}

.vc-diff__selectors {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

.vc-diff__selectors :deep(.el-select) {
  flex: 1;
}

.vc-diff__body {
  max-height: 55vh;
  padding-right: 6px;
  margin-top: 10px;
  overflow: auto;
}

.vc-diff__body h4 {
  margin: 16px 0 6px;
  font-size: 13px;
}

.vc-diff__item {
  padding: 10px 12px;
  margin-bottom: 8px;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-diff__item-head {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}

.vc-diff__field {
  display: grid;
  grid-template-columns: 160px 1fr 20px 1fr;
  gap: 6px;
  padding: 3px 0;
  font-size: 12px;
  border-top: 1px dashed var(--vc-border);
}

.vc-diff__field code {
  color: var(--vc-text-weak);
}
</style>
