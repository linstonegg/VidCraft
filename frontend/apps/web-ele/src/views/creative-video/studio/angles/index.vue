<script lang="ts" setup>
import type {
  CreativeBrief,
  EvidenceRef,
  MarketingAngle,
  MarketingAngleSet,
  UnderstandingRevision,
  VideoProject,
} from '#/types/creative-video';

import { computed, onMounted, ref } from 'vue';
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
  approveCreativeBrief,
  createCreativeBrief,
  generateAngles,
  getAngles,
  getRevision,
  listEvidence,
  patchAngleSet,
  setAngleSetReferenceInsight,
} from '#/api/creative-video';
import GuardNotice from '#/components/creative-video/m2/GuardNotice.vue';
import ReferenceInspirationPanel from '#/components/creative-video/m11/ReferenceInspirationPanel.vue';
import { useJobPolling } from '#/composables/creative-video/use-job-polling';
import { useM2JobId } from '#/composables/creative-video/use-m2-job';
import { useProjectAccess } from '#/composables/creative-video/use-project-access';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';
import { formatDateTime } from '#/utils/creative-video/format';
import {
  EVIDENCE_LABELS,
  EVIDENCE_TAG_TYPES,
} from '#/utils/creative-video/project-stage';
import JobProgress from '#/views/creative-video/studio/ingest/components/JobProgress.vue';

defineOptions({ name: 'VidCraftAngles' });

const props = defineProps<{ project?: null | VideoProject }>();
const route = useRoute();
const router = useRouter();
const projectId = computed(() => String(route.params.id ?? ''));
const projectRef = computed(() => props.project ?? null);
const { canApprove, canEdit } = useProjectAccess(projectRef);

const loading = ref(true);
const errorMessage = ref('');
const needsUnderstanding = ref(false);
const state = ref<Awaited<ReturnType<typeof getAngles>> | null>(null);
const revision = ref<null | UnderstandingRevision>(null);
const evidence = ref<EvidenceRef[]>([]);

const primaryId = ref('');
const secondaryIds = ref<string[]>([]);
const scenario = ref('NORMAL');
const { clearJob, jobId, setJob } = useM2JobId();
const acting = ref(false);
const activeSetId = ref('');

const customOpen = ref(false);
const customForm = ref({
  assumption: '',
  hook: '',
  oneLiner: '',
  title: '',
});
const evidenceOpen = ref(false);
const selectedEvidence = ref<EvidenceRef[]>([]);
const evidenceTitle = ref('');

const { job } = useJobPolling(jobId, {
  onTerminal: async (result) => {
    if (result.status === 'SUCCEEDED') {
      ElMessage.success('传播切口已更新');
    } else {
      ElMessage.error(result.errorMessage ?? '模拟任务失败，可重试');
    }
    clearJob();
    await load();
  },
});

const angleLabels: Record<string, string> = {
  ASPIRATION: '梦想愿景',
  BEFORE_AFTER: '前后反差',
  BENEFIT: '效率收益',
  HUMOR: '幽默娱乐',
  IDENTITY: '身份表达',
  LIVE_WOW: '现场惊艳',
  MYSTERY: '悬念揭秘',
  PAIN_EMPATHY: '真实痛点',
  PROOF: '信任证明',
  UNCONVENTIONAL: '反常规',
};

const angles = computed<MarketingAngle[]>(
  () => state.value?.angleSet?.angles ?? [],
);
const brief = computed<CreativeBrief | null>(() => state.value?.brief ?? null);
const angleSet = computed<MarketingAngleSet | null>(
  () => state.value?.angleSet ?? null,
);
const primary = computed(
  () => angles.value.find((item) => item.id === primaryId.value) ?? null,
);
const secondary = computed(() =>
  angles.value.filter((item) => secondaryIds.value.includes(item.id)),
);
const canApproveBrief = computed(
  () =>
    canApprove.value &&
    Boolean(primary.value) &&
    (primary.value?.prohibitedClaimsHit.length ?? 0) === 0,
);

function angleEvidence(ids: string[]) {
  return evidence.value.filter((item) => ids.includes(item.id));
}

async function persistReferenceInsight(insightId: string) {
  if (!canEdit.value || !angleSet.value || !insightId) return;
  try {
    await setAngleSetReferenceInsight(projectId.value, angleSet.value.id, {
      expectedVersion: angleSet.value.version,
      insightId,
    });
    await load();
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  }
}

async function load() {
  loading.value = true;
  errorMessage.value = '';
  needsUnderstanding.value = false;
  try {
    const result = await getAngles(projectId.value);
    state.value = result;
    if (result.angleSet) {
      activeSetId.value = result.angleSet.id;
    }
    const revisionId = result.understanding.id;
    const [rev, evidenceList] = await Promise.all([
      getRevision(projectId.value, revisionId),
      listEvidence(projectId.value),
    ]);
    revision.value = rev;
    evidence.value = evidenceList;
    const draft = result.brief;
    primaryId.value =
      draft?.primaryAngleId ?? result.angleSet?.angles[0]?.id ?? '';
    secondaryIds.value = draft?.secondaryAngleIds ?? [];
  } catch (error) {
    const message = friendlyErrorMessage(error);
    errorMessage.value = message;
    needsUnderstanding.value =
      message.includes('产品理解') || message.includes('确认产品理解');
  } finally {
    loading.value = false;
  }
}

async function discover() {
  if (!state.value) return;
  acting.value = true;
  try {
    const result = await generateAngles(projectId.value, {
      scenario: scenario.value,
      understandingRevisionId: state.value.understanding.id,
    });
    setJob(result.jobId);
    ElMessage.info('已启动模拟传播切口发现任务');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

function togglePrimary(angle: MarketingAngle) {
  primaryId.value = angle.id;
  secondaryIds.value = secondaryIds.value.filter((id) => id !== angle.id);
}

function toggleSecondary(angle: MarketingAngle) {
  if (angle.id === primaryId.value) return;
  if (secondaryIds.value.includes(angle.id)) {
    secondaryIds.value = secondaryIds.value.filter((id) => id !== angle.id);
  } else if (secondaryIds.value.length >= 2) {
    ElMessage.warning('辅切口最多选择 2 个');
  } else {
    secondaryIds.value = [...secondaryIds.value, angle.id];
  }
}

function openEvidence(ids: string[], title: string) {
  selectedEvidence.value = angleEvidence(ids);
  evidenceTitle.value = title;
  evidenceOpen.value = true;
}

async function saveBrief(approve: boolean) {
  if (!angleSet.value || !canApproveBrief.value) {
    ElMessage.warning('请先选择一个没有宣传风险的主切口');
    return;
  }
  acting.value = true;
  try {
    const draft = await createCreativeBrief(projectId.value, {
      angleSetId: angleSet.value.id,
      primaryAngleId: primaryId.value,
      secondaryAngleIds: secondaryIds.value,
    });
    if (!approve) {
      const current = state.value;
      if (!current) return;
      state.value = { ...current, brief: draft };
      ElMessage.success('创意 Brief 草稿已保存');
      return;
    }
    await ElMessageBox.confirm(
      '确认后将锁定主/辅切口与创意边界，并进入三套创意故事生成。',
      '确认创意 Brief',
      { cancelButtonText: '再看看', confirmButtonText: '确认并进入创意' },
    );
    await approveCreativeBrief(projectId.value, draft.id, draft.version);
    ElMessage.success('创意 Brief 已确认');
    await router.push(`/studio/${projectId.value}/concepts`);
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(friendlyErrorMessage(error));
    }
  } finally {
    acting.value = false;
  }
}

function openCustom() {
  customForm.value = { assumption: '', hook: '', oneLiner: '', title: '' };
  customOpen.value = true;
}

async function addCustomAngle() {
  if (!angleSet.value) return;
  if (!customForm.value.title.trim() || !customForm.value.oneLiner.trim()) {
    ElMessage.warning('请填写切口名称和一句话价值');
    return;
  }
  const angle: MarketingAngle = {
    assumptions: [customForm.value.assumption || '自定义切口，依据待验证'],
    audienceReaction: '待验证',
    estimatedProductionComplexity: 'LOW',
    evidenceIds: [],
    evidenceLevel: 'hypothesis',
    expressionTags: [],
    id: `angle_custom_${Date.now()}`,
    missingAssets: [],
    oneLiner: customForm.value.oneLiner,
    openingHook: customForm.value.hook || customForm.value.oneLiner,
    primaryCode: 'OTHER' as any,
    prohibitedClaimsHit: [],
    rationale: '用户自定义切口，未自动升级为已验证事实。',
    relatedFeatureIds: [],
    relatedPainPointIds: [],
    score: {
      clarity: 3,
      novelty: 3,
      relevance: 3,
      trustworthiness: 3,
      visualPotential: 3,
    },
    secondaryCodes: [],
    targetPersonaIds: [],
    title: customForm.value.title,
    whyItMatters: customForm.value.assumption || '需要补充依据后再判断。',
  };
  acting.value = true;
  try {
    const updated = await patchAngleSet(projectId.value, angleSet.value.id, {
      expectedVersion: angleSet.value.version,
      patch: { angles: [...angles.value, angle] },
    });
    const current = state.value;
    if (!current) return;
    state.value = { ...current, angleSet: updated };
    primaryId.value =
      updated.angles.find((item) => item.id === angle.id)?.id ??
      primaryId.value;
    customOpen.value = false;
    ElMessage.success('自定义切口已加入，依据级别为待验证');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    acting.value = false;
  }
}

async function switchSet(setId: string) {
  const target = state.value?.sets.find((item) => item.id === setId);
  if (!target) return;
  activeSetId.value = setId;
  primaryId.value = target.angles[0]?.id ?? '';
  secondaryIds.value = [];
  const current = state.value;
  if (!current) return;
  state.value = { ...current, angleSet: target };
}

onMounted(load);
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <div class="vc-m2-page vc-angles">
    <ReferenceInspirationPanel
      :project-id="projectId"
      :selected-insight-id="angleSet?.referenceAdInsightId"
      @select-insight="persistReferenceInsight"
    />

    <div v-if="loading" class="vc-m2-loading">
      正在读取已确认产品理解与切口…
    </div>

    <GuardNotice
      v-else-if="needsUnderstanding"
      description="传播切口必须基于已确认的产品理解。请先回到理解页确认报告，再进入创意策划。"
      label="去确认产品理解"
      :title="errorMessage || '请先确认产品理解报告'"
      :to="`/studio/${projectId}/understanding`"
    />

    <section v-else-if="errorMessage" class="vc-angles__panel vc-m2-error">
      <h2>无法加载创意方向</h2>
      <p>{{ errorMessage }}</p>
      <ElButton @click="load">重试</ElButton>
    </section>

    <template v-else-if="state">
      <header class="vc-angles__hero">
        <div class="vc-angles__hero-copy">
          <p class="vc-m2-eyebrow">S3 · Angles</p>
          <h1>先找到“为什么值得拍”</h1>
          <p class="vc-m2-sub">
            基于产品理解 R{{ state.understanding.revisionNo }} ·
            {{ angleSet?.angles.length ?? 0 }} 个候选切口 · Mock
            启发式，不代表真实投放效果
          </p>
        </div>
        <div class="vc-m2-head__actions">
          <ElSelect
            v-if="state.sets.length > 1"
            v-model="activeSetId"
            size="small"
            class="vc-angles__select"
            @change="switchSet"
          >
            <ElOption
              v-for="item in state.sets"
              :key="item.id"
              :label="`候选集 R${item.revisionNo}`"
              :value="item.id"
            />
          </ElSelect>
          <ElSelect v-model="scenario" size="small" class="vc-angles__select">
            <ElOption label="正常发现" value="NORMAL" />
            <ElOption label="资料不足" value="NO_STRONG_ANGLE" />
            <ElOption label="模拟失败" value="FAIL_BEFORE_RESULT" />
          </ElSelect>
          <ElButton
            :disabled="!canEdit"
            :loading="acting"
            type="primary"
            @click="discover"
          >
            发现传播切口
          </ElButton>
        </div>
      </header>

      <JobProgress v-if="job" :job="job" title="传播切口 Mock 任务" />

      <section v-if="!angleSet" class="vc-angles__panel vc-m2-empty">
        <h2>还没有传播切口</h2>
        <p class="vc-m2-muted">
          产品理解已确认。现在可以让 Mock
          Agent根据目标用户、痛点和证据，发现值得拍的传播方向。
        </p>
        <ElButton
          :disabled="!canEdit"
          type="primary"
          :loading="acting"
          @click="discover"
        >
          发现传播切口
        </ElButton>
      </section>

      <ElAlert
        v-if="angleSet?.weak"
        :closable="false"
        show-icon
        class="vc-angles__alert"
        title="目前资料不足以支撑独特创意：建议补充差异化功能、实际场景或客户案例；你也可以接受风险继续。"
        type="warning"
      />

      <div class="vc-m2-grid">
        <aside class="vc-angles__panel vc-m2-facts">
          <div class="vc-angles__panel-head">
            <h3>产品事实</h3>
            <p class="vc-m2-muted">来自已确认产品理解，供切口对照。</p>
          </div>

          <section class="vc-angles__fact-block">
            <h4>目标用户</h4>
            <ul class="vc-angles__fact-list">
              <li
                v-for="persona in revision?.personas.slice(0, 2)"
                :key="persona.id"
                class="vc-angles__fact-item"
              >
                <strong>{{ persona.name }}</strong>
                <span>{{ persona.role }}</span>
              </li>
            </ul>
          </section>

          <section class="vc-angles__fact-block">
            <h4>核心功能</h4>
            <ul class="vc-angles__fact-list">
              <li
                v-for="feature in revision?.features.slice(0, 4)"
                :key="feature.id"
                class="vc-angles__fact-item vc-angles__fact-item--feature"
              >
                <span class="vc-angles__fact-title">{{ feature.title }}</span>
                <ElTag
                  :type="EVIDENCE_TAG_TYPES[feature.evidenceLevel]"
                  size="small"
                  effect="plain"
                  class="vc-angles__fact-tag"
                >
                  {{ EVIDENCE_LABELS[feature.evidenceLevel] }}
                </ElTag>
              </li>
            </ul>
          </section>

          <section class="vc-angles__fact-block">
            <h4>关键痛点</h4>
            <ul class="vc-angles__fact-list">
              <li
                v-for="pain in revision?.painPoints.slice(0, 3)"
                :key="pain.id"
                class="vc-angles__fact-item"
              >
                <span>{{ pain.painPoint }}</span>
              </li>
            </ul>
          </section>

          <section class="vc-angles__fact-block vc-angles__fact-block--risk">
            <h4>禁用宣传主张</h4>
            <ul class="vc-angles__fact-list">
              <li
                v-for="claim in revision?.prohibitedClaims.slice(0, 3)"
                :key="claim"
                class="vc-angles__fact-item vc-angles__fact-item--claim"
              >
                <span>{{ claim }}</span>
              </li>
            </ul>
          </section>

          <p class="vc-m2-muted vc-angles__fact-meta">
            理解版本：{{ state.understanding.id }} · v{{
              state.understanding.version
            }}
          </p>
        </aside>

        <main class="vc-m2-angles">
          <article
            v-for="(angle, index) in angles"
            :key="angle.id"
            :class="{
              'is-primary': angle.id === primaryId,
              'is-secondary': secondaryIds.includes(angle.id),
            }"
            class="vc-angles__panel vc-m2-angle"
          >
            <header>
              <div>
                <span class="vc-m2-index">{{
                  String(index + 1).padStart(2, '0')
                }}</span>
                <ElTag size="small">
                  {{ angleLabels[angle.primaryCode] ?? angle.primaryCode }}
                </ElTag>
                <ElTag
                  v-for="code in angle.secondaryCodes"
                  :key="code"
                  size="small"
                  type="info"
                >
                  {{ angleLabels[code] ?? code }}
                </ElTag>
              </div>
              <span class="vc-m2-muted vc-angles__complexity"
                >制作复杂度 {{ angle.estimatedProductionComplexity }}</span
              >
            </header>
            <h2>{{ angle.title }}</h2>
            <p class="vc-m2-one-liner">{{ angle.oneLiner }}</p>
            <p v-if="angle.oldApproach" class="vc-m2-contrast">
              {{ angle.oldApproach }} <span>→</span> {{ angle.newApproach }}
            </p>
            <div class="vc-angles__fields">
              <p><strong>观众反应</strong>{{ angle.audienceReaction }}</p>
              <p><strong>为什么值得拍</strong>{{ angle.whyItMatters }}</p>
              <p><strong>开场钩子</strong>{{ angle.openingHook }}</p>
            </div>
            <div class="vc-m2-tags">
              <ElTag
                :type="EVIDENCE_TAG_TYPES[angle.evidenceLevel]"
                effect="plain"
                size="small"
              >
                {{ EVIDENCE_LABELS[angle.evidenceLevel] }}
              </ElTag>
              <ElTag
                v-for="tag in angle.expressionTags"
                :key="tag"
                effect="plain"
                size="small"
                type="info"
              >
                {{ tag }}
              </ElTag>
              <ElTag
                v-if="(angle.prohibitedClaimsHit?.length ?? 0) > 0"
                size="small"
                type="danger"
              >
                含宣传风险
              </ElTag>
            </div>
            <div class="vc-m2-scores">
              <span>清晰 {{ angle.score.clarity }}</span>
              <span>新奇 {{ angle.score.novelty }}</span>
              <span>相关 {{ angle.score.relevance }}</span>
              <span>可信 {{ angle.score.trustworthiness }}</span>
              <span>视觉 {{ angle.score.visualPotential }}</span>
            </div>
            <footer>
              <ElButton
                :type="angle.id === primaryId ? 'primary' : 'default'"
                size="small"
                @click="togglePrimary(angle)"
              >
                {{ angle.id === primaryId ? '主切口' : '设为主切口' }}
              </ElButton>
              <ElButton
                :type="secondaryIds.includes(angle.id) ? 'warning' : 'default'"
                size="small"
                @click="toggleSecondary(angle)"
              >
                {{
                  secondaryIds.includes(angle.id) ? '已选辅切口' : '设为辅切口'
                }}
              </ElButton>
              <ElButton
                size="small"
                text
                @click="openEvidence(angle.evidenceIds, angle.title)"
              >
                查看依据
              </ElButton>
            </footer>
          </article>

          <div class="vc-angles__add">
            <button
              class="vc-angles__add-action"
              type="button"
              @click="openCustom"
            >
              <span class="vc-angles__add-icon" aria-hidden="true">+</span>
              <span class="vc-angles__add-copy">
                <strong>添加自定义切口</strong>
                <em>手动补充一个待验证方向</em>
              </span>
            </button>
            <button
              class="vc-angles__add-action vc-angles__add-action--ai"
              type="button"
              :disabled="acting"
              @click="discover"
            >
              <span class="vc-angles__add-icon" aria-hidden="true">AI</span>
              <span class="vc-angles__add-copy">
                <strong>{{
                  acting ? '正在补充方向…' : '让 AI 再给一些方向'
                }}</strong>
                <em>基于当前事实继续发散</em>
              </span>
            </button>
          </div>
        </main>

        <aside class="vc-m2-side">
          <section class="vc-angles__panel vc-angles__brief">
            <div class="vc-angles__panel-head">
              <h3>创意 Brief</h3>
              <p class="vc-m2-muted">主切口恰好 1 个，辅切口 0～2 个。</p>
            </div>
            <div class="vc-angles__brief-rows">
              <p>
                <span>主切口</span>
                <strong>{{ primary?.title ?? '未选择' }}</strong>
              </p>
              <p>
                <span>辅切口</span>
                <strong>{{
                  secondary.map((item) => item.title).join('、') || '无'
                }}</strong>
              </p>
            </div>
            <p
              v-if="(primary?.prohibitedClaimsHit.length ?? 0) > 0"
              class="vc-m2-danger"
            >
              主切口命中禁用主张，无法确认。
            </p>
            <div class="vc-m2-side-actions">
              <ElButton
                :disabled="!canEdit"
                :loading="acting"
                @click="saveBrief(false)"
              >
                保存 Brief 草稿
              </ElButton>
              <ElButton
                :disabled="!canApproveBrief"
                :loading="acting"
                type="primary"
                @click="saveBrief(true)"
              >
                确认 Brief → 创意故事
              </ElButton>
            </div>
          </section>

          <section class="vc-angles__panel vc-angles__meta-card">
            <div class="vc-angles__panel-head">
              <h3>证据与风险</h3>
              <p class="vc-m2-muted">
                正式宣传主张需可追溯到 M1 证据；AI 推测仅作创意假设。
              </p>
            </div>
            <div class="vc-angles__legend">
              <span class="vc-angles__legend-label">证据等级</span>
              <div class="vc-angles__evidence-tags">
                <ElTag
                  :type="EVIDENCE_TAG_TYPES.verified"
                  effect="plain"
                  size="small"
                >
                  有资料依据
                </ElTag>
                <ElTag
                  :type="EVIDENCE_TAG_TYPES.user_confirmed"
                  effect="plain"
                  size="small"
                >
                  客户已确认
                </ElTag>
                <ElTag
                  :type="EVIDENCE_TAG_TYPES.hypothesis"
                  effect="plain"
                  size="small"
                >
                  AI 推测
                </ElTag>
              </div>
            </div>
            <div class="vc-angles__meta-foot">
              <p class="vc-angles__meta-count">
                已选切口引用
                <strong>{{ primary?.evidenceIds.length ?? 0 }}</strong>
                条证据
              </p>
              <ElButton
                class="vc-angles__meta-btn"
                size="small"
                @click="
                  openEvidence(
                    primary?.evidenceIds ?? [],
                    primary?.title ?? '切口证据',
                  )
                "
              >
                查看主切口全部依据
              </ElButton>
            </div>
          </section>

          <section class="vc-angles__panel vc-angles__meta-card">
            <div class="vc-angles__panel-head">
              <h3>操作</h3>
              <p class="vc-m2-muted">
                修改资料或理解报告会使已有创意过期，需要重新复核。
              </p>
            </div>
            <div class="vc-angles__nav-actions">
              <ElButton
                class="vc-angles__meta-btn"
                @click="router.push(`/studio/${projectId}/understanding`)"
              >
                返回产品理解
              </ElButton>
              <ElButton
                class="vc-angles__meta-btn"
                @click="router.push(`/studio/${projectId}/ingest`)"
              >
                返回补充资料
              </ElButton>
            </div>
          </section>
        </aside>
      </div>

      <div class="vc-m2-footer">
        <span class="vc-m2-muted">
          {{
            brief?.status === 'DRAFT' ? 'Brief 草稿已保存' : '尚未确认 Brief'
          }}
          ·
          {{ formatDateTime(brief?.updatedAt) }}
        </span>
        <div class="vc-m2-footer__actions">
          <ElButton @click="router.push(`/studio/${projectId}/understanding`)"
            >返回理解</ElButton
          >
          <ElButton
            :disabled="!canApproveBrief"
            type="primary"
            @click="saveBrief(true)"
          >
            确认 Brief 并继续
          </ElButton>
        </div>
      </div>
    </template>

    <ElDrawer v-model="evidenceOpen" :title="evidenceTitle" size="420px">
      <div v-if="selectedEvidence.length === 0" class="vc-m2-muted">
        该切口暂无可追溯证据。
      </div>
      <article
        v-for="item in selectedEvidence"
        :key="item.id"
        class="vc-m2-evidence"
      >
        <div>
          <ElTag :type="EVIDENCE_TAG_TYPES[item.level]" size="small">
            {{ EVIDENCE_LABELS[item.level] }}
          </ElTag>
          <strong>{{ item.title }}</strong>
        </div>
        <p>{{ item.excerpt }}</p>
        <p class="vc-m2-muted">
          来源：{{ item.sourceId }} · 添加者：{{ item.addedBy }}
        </p>
      </article>
    </ElDrawer>

    <ElDialog v-model="customOpen" title="添加自定义切口" width="520px">
      <div class="vc-m2-form">
        <ElInput
          v-model="customForm.title"
          placeholder="切口名称，例如：把简历变成可参观的空间"
        />
        <ElInput
          v-model="customForm.oneLiner"
          placeholder="一句话价值切口（不是功能清单）"
        />
        <ElInput v-model="customForm.hook" placeholder="建议开场钩子（可选）" />
        <ElInput
          v-model="customForm.assumption"
          :rows="3"
          placeholder="依据/假设说明；不填写将标记为待验证"
          type="textarea"
        />
        <p class="vc-m2-muted">
          自定义切口不会被自动标为 verified，必须先补充证据才能用于正式宣传。
        </p>
      </div>
      <template #footer>
        <ElButton @click="customOpen = false">取消</ElButton>
        <ElButton :loading="acting" type="primary" @click="addCustomAngle">
          加入候选
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.vc-angles {
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

.vc-angles__hero {
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

.vc-angles__hero-copy {
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

.vc-angles__hero h1 {
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
  align-items: center;
  justify-content: flex-end;
}

.vc-angles__select {
  width: 150px;
}

.vc-angles__alert {
  margin: 0;
}

.vc-angles__panel {
  box-sizing: border-box;
  padding: 16px 18px;
  background: var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-angles__panel-head {
  margin-bottom: 12px;
}

.vc-angles__panel-head h3,
.vc-m2-facts h3,
.vc-m2-side h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-angles__panel-head .vc-m2-muted {
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

.vc-m2-grid {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 280px;
  gap: 16px;
  align-items: start;
}

.vc-m2-facts,
.vc-m2-side {
  position: sticky;
  top: 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.vc-m2-facts {
  gap: 10px;
  padding: 14px 16px;
}

.vc-m2-facts .vc-angles__panel-head {
  margin-bottom: 2px;
}

.vc-angles__fact-block {
  padding: 10px 12px;
  margin: 0;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid transparent;
  border-radius: 10px;
}

.vc-angles__fact-block h4 {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  color: var(--vc-text-weak);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.vc-angles__fact-block--risk {
  background: #fff7f6;
  border-color: #ffd6d1;
}

.vc-angles__fact-block--risk h4 {
  color: #b42318;
}

.vc-angles__fact-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.vc-angles__fact-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--el-text-color-regular, #4b5563);
  background: var(--el-bg-color-overlay, #fff);
  border-radius: 8px;
}

.vc-angles__fact-item strong {
  font-size: 12px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-angles__fact-item--feature {
  gap: 6px;
}

.vc-angles__fact-title {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-angles__fact-tag {
  align-self: flex-start;
  max-width: 100%;
  height: auto !important;
  padding: 0 8px !important;
  line-height: 20px !important;
  white-space: nowrap;
}

.vc-angles__fact-item--claim {
  color: #b42318;
  background: rgb(255 255 255 / 72%);
}

.vc-angles__fact-meta {
  padding-top: 8px;
  margin: 2px 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-top: 1px solid var(--vc-border);
}

.vc-m2-angles {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.vc-m2-angle {
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.vc-m2-angle:hover {
  box-shadow: 0 8px 22px rgb(103 87 215 / 10%);
  transform: translateY(-1px);
}

.vc-m2-angle.is-primary {
  border-color: var(--vc-brand);
  box-shadow: 0 0 0 2px rgb(103 87 215 / 14%);
}

.vc-m2-angle.is-secondary {
  border-color: #f5a623;
  border-style: dashed;
}

.vc-m2-angle header {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.vc-m2-angle header > div {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.vc-m2-index {
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

.vc-angles__complexity {
  padding: 2px 8px;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 999px;
}

.vc-m2-angle h2 {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
  letter-spacing: -0.01em;
}

.vc-m2-angle p {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
}

.vc-m2-one-liner {
  margin-bottom: 10px !important;
  font-weight: 650;
  color: var(--vc-brand);
}

.vc-m2-contrast {
  padding: 10px 12px;
  margin-bottom: 12px !important;
  background:
    linear-gradient(180deg, rgb(103 87 215 / 6%) 0%, transparent 80%),
    var(--el-bg-color-page, #f5f6f8);
  border: 1px solid var(--vc-brand-border);
  border-radius: 10px;
}

.vc-m2-contrast span {
  margin: 0 6px;
  font-weight: 700;
  color: var(--vc-brand);
}

.vc-angles__fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
}

.vc-angles__fields p {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 8px;
}

.vc-angles__fields strong {
  font-size: 12px;
  font-weight: 650;
  color: var(--vc-text-weak);
}

.vc-m2-tags,
.vc-m2-scores {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-top: 8px;
}

.vc-m2-scores {
  font-size: 11px;
  color: var(--vc-text-weak);
}

.vc-m2-scores span {
  padding: 3px 8px;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 999px;
}

.vc-m2-angle footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid var(--vc-border);
}

.vc-angles__add {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.vc-angles__add-action {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 14px 16px;
  text-align: left;
  cursor: pointer;
  background: var(--el-bg-color-overlay, #fff);
  border: 1px dashed var(--vc-border);
  border-radius: var(--vc-border-radius);
  transition:
    border-color 0.16s ease,
    background 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.vc-angles__add-action:hover {
  background: var(--el-bg-color-page, #f5f6f8);
  border-color: var(--vc-brand-border);
  transform: translateY(-1px);
}

.vc-angles__add-action:disabled {
  cursor: wait;
  opacity: 0.72;
  transform: none;
}

.vc-angles__add-action--ai {
  background:
    linear-gradient(135deg, rgb(103 87 215 / 6%) 0%, transparent 70%),
    var(--el-bg-color-overlay, #fff);
  border-color: var(--vc-brand-border);
  border-style: solid;
}

.vc-angles__add-action--ai:hover {
  background: var(--vc-brand-soft);
  box-shadow: 0 0 0 2px rgb(103 87 215 / 10%);
}

.vc-angles__add-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  color: var(--vc-brand);
  background: var(--vc-brand-soft);
  border: 1px solid var(--vc-brand-border);
  border-radius: 10px;
}

.vc-angles__add-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.vc-angles__add-copy strong {
  font-size: 13px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-angles__add-copy em {
  font-size: 12px;
  font-style: normal;
  line-height: 1.45;
  color: var(--vc-text-weak);
}

@media (max-width: 720px) {
  .vc-angles__add {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vc-angles__add-action {
    transition: none;
  }
}

.vc-angles__brief {
  background:
    linear-gradient(180deg, rgb(103 87 215 / 5%) 0%, transparent 58%),
    var(--el-bg-color-overlay, #fff);
  border-color: var(--vc-brand-border);
}

.vc-angles__brief-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.vc-angles__brief-rows p {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  margin: 0;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-angles__brief-rows span {
  font-size: 11px;
  color: var(--vc-text-weak);
}

.vc-angles__brief-rows strong {
  font-size: 13px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-m2-side-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.vc-angles__meta-card {
  padding: 14px 16px;
}

.vc-angles__meta-card .vc-angles__panel-head {
  margin-bottom: 10px;
}

.vc-angles__meta-card .vc-m2-muted {
  margin-top: 4px;
}

.vc-angles__legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-angles__legend-label {
  font-size: 11px;
  font-weight: 650;
  color: var(--vc-text-weak);
  letter-spacing: 0.02em;
}

.vc-angles__evidence-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
}

.vc-angles__meta-foot {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vc-angles__meta-count {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--vc-text-weak);
}

.vc-angles__meta-count strong {
  margin: 0 2px;
  font-size: 14px;
  font-weight: 700;
  color: var(--vc-brand);
}

.vc-angles__nav-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: stretch;
  width: 100%;
  margin: 0;
}

.vc-angles__meta-btn {
  justify-content: center;
  width: 100%;
  margin: 0 !important;
}

.vc-m2-danger {
  padding: 8px 10px;
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--el-color-danger);
  background: #fff1f0;
  border: 1px solid #ffccc7;
  border-radius: 8px;
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

.vc-m2-evidence {
  padding: 12px 0;
  border-bottom: 1px dashed var(--vc-border);
}

.vc-m2-evidence div {
  display: flex;
  gap: 8px;
  align-items: center;
}

.vc-m2-evidence p {
  margin: 6px 0;
  font-size: 12px;
  line-height: 1.6;
}

.vc-m2-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

@media (max-width: 1280px) {
  .vc-m2-grid {
    grid-template-columns: 1fr;
  }

  .vc-m2-facts,
  .vc-m2-side {
    position: static;
  }
}

@media (max-width: 720px) {
  .vc-angles {
    padding-bottom: 110px;
  }

  .vc-angles__hero {
    padding: 16px;
  }

  .vc-angles__fields p {
    grid-template-columns: 1fr;
    gap: 2px;
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
  .vc-m2-angle {
    transition: none;
  }

  .vc-m2-angle:hover {
    transform: none;
  }
}
</style>
