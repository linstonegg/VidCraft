<script lang="ts" setup>
import type { ResearchGapsResult } from '#/api/creative-video/research';
import type {
  ClaimAnchor,
  ClaimReadinessItem,
  ProductionReadiness,
  ResearchQuestion,
  UnderstandingDiff,
  UnderstandingRevision,
} from '#/types/creative-video';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { ElTag } from 'element-plus';

import {
  getAssetContentVersions,
  getClaimAnchors,
  getClaimReadiness,
  getIngestion,
  getProductionReadiness,
  getResearchGaps,
  getResearchQuestions,
  getUnderstandingDiff,
  listRevisions,
} from '#/api/creative-video';

const props = defineProps<{ projectId: string }>();
const router = useRouter();
function openQuestion(questionId: string) {
  void router.push({
    path: `/studio/${props.projectId}/ingest`,
    query: { question: questionId },
  });
}

const loading = ref(true);
const error = ref('');
const readiness = ref<null | ProductionReadiness>(null);
const research = ref<null | ResearchGapsResult>(null);
const questions = ref<ResearchQuestion[]>([]);
const revisions = ref<UnderstandingRevision[]>([]);
const claimDiff = ref<null | UnderstandingDiff>(null);
const claims = ref<ClaimReadinessItem[]>([]);
const anchors = ref<ClaimAnchor[]>([]);
const assetIssues = ref<
  Array<{ assetId: string; filename: string; status: string }>
>([]);

const openGaps = computed(() =>
  (research.value?.gaps ?? []).filter((gap) =>
    ['ANSWER_IN_PROGRESS', 'OPEN'].includes(gap.state),
  ),
);

const blockedClaims = computed(() => {
  const anchorMap = new Map(anchors.value.map((item) => [item.id, item]));
  return claims.value
    .filter((item) => item.status !== 'USABLE')
    .map((item) => ({
      label:
        anchorMap.get(item.claimAnchorId)?.statementSnapshot ??
        item.claimAnchorId,
      status: item.status,
    }));
});

const claimBlock = computed(
  () => readiness.value?.items.find((item) => item.key === 'claims') ?? null,
);
const affectedClaimShots = computed(
  () => claimBlock.value?.affectedShotIds ?? [],
);

const contextFingerprint = computed(
  () => research.value?.context?.sourceSetFingerprint ?? '未生成',
);
async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [ready, gaps, questionState, ingestion] = await Promise.all([
      getProductionReadiness(props.projectId),
      getResearchGaps(props.projectId),
      getResearchQuestions(props.projectId),
      getIngestion(props.projectId),
    ]);
    readiness.value = ready;
    research.value = gaps;
    questions.value = questionState.questions;
    revisions.value = await listRevisions(props.projectId);
    const current = revisions.value.find(
      (item) => item.id === ready.understandingRevisionId,
    );
    const previous = revisions.value
      .filter(
        (item) =>
          item.id !== ready.understandingRevisionId &&
          item.status === 'APPROVED' &&
          item.revisionNo < (current?.revisionNo ?? 0),
      )
      .toSorted((a, b) => b.revisionNo - a.revisionNo)[0];
    if (previous) {
      claimDiff.value = await getUnderstandingDiff(
        props.projectId,
        previous.id,
        ready.understandingRevisionId,
      );
    }
    const issues: Array<{
      assetId: string;
      filename: string;
      status: string;
    }> = [];
    for (const asset of ingestion.assets) {
      if (!['image', 'logo'].includes(asset.kind)) continue;
      const versions = await getAssetContentVersions(props.projectId, asset.id);
      const revoked = versions.find((item) =>
        ['REDACTED', 'UNAVAILABLE'].includes(item.status),
      );
      if (revoked) {
        issues.push({
          assetId: asset.id,
          filename: asset.filename,
          status: revoked.status,
        });
      }
    }
    assetIssues.value = issues;
    if (ready.understandingRevisionId) {
      const [claimReadiness, claimAnchors] = await Promise.all([
        getClaimReadiness(props.projectId, ready.understandingRevisionId),
        getClaimAnchors(props.projectId, ready.understandingRevisionId),
      ]);
      claims.value = claimReadiness;
      anchors.value = claimAnchors;
    }
  } catch (error_) {
    error.value = error_ instanceof Error ? error_.message : '读取失败';
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <section class="vc-signals">
    <header class="vc-signals__head">
      <div>
        <h3>画布约束</h3>
        <p class="vc-signals__desc">
          研究上下文、资产撤权、主张阻塞的只读投影；不改变镜头或正式链。
        </p>
      </div>
      <ElTag size="small" type="info" effect="plain" round>只读</ElTag>
    </header>

    <p v-if="loading" class="vc-signals__loading">正在读取画布约束…</p>
    <p v-else-if="error" class="vc-signals__error">{{ error }}</p>

    <template v-else>
      <section class="vc-signals__block">
        <h4 class="vc-signals__block-title">研究上下文</h4>
        <div class="vc-signals__rows">
          <div class="vc-signals__row">
            <span>Source fingerprint</span>
            <code :title="contextFingerprint">{{ contextFingerprint }}</code>
          </div>
          <div class="vc-signals__row">
            <span>Open gaps</span>
            <strong>
              {{ openGaps.length }}
              <em>· 最近：{{ openGaps[0]?.title ?? '无' }}</em>
            </strong>
          </div>
        </div>
        <p
          v-if="openGaps.some((gap) => gap.state === 'ANSWER_IN_PROGRESS')"
          class="vc-signals__note"
        >
          有访谈答案待确认；新上下文可能使旧问题重新出现。
        </p>
        <div class="vc-signals__subblock">
          <span class="vc-signals__sublabel">研究问题</span>
          <p v-if="questions.length === 0" class="vc-signals__empty">
            暂无研究问题
          </p>
          <div v-else class="vc-signals__questions">
            <button
              v-for="question in questions.slice(0, 4)"
              :key="question.id"
              class="vc-signals__question"
              type="button"
              @click="openQuestion(question.id)"
            >
              <ElTag size="small" effect="plain">{{ question.status }}</ElTag>
              <span>{{ question.question }}</span>
            </button>
          </div>
        </div>
      </section>

      <section class="vc-signals__block">
        <h4 class="vc-signals__block-title">资产撤权</h4>
        <p v-if="assetIssues.length === 0" class="vc-signals__empty">
          当前没有 REDACTED / UNAVAILABLE 资产
        </p>
        <ul v-else class="vc-signals__list">
          <li v-for="issue in assetIssues" :key="issue.assetId">
            <strong>{{ issue.filename }}</strong>
            <code>{{ issue.assetId }}</code>
            <ElTag size="small" type="danger" effect="plain">{{
              issue.status
            }}</ElTag>
          </li>
        </ul>
      </section>

      <section class="vc-signals__block">
        <h4 class="vc-signals__block-title">主张阻塞</h4>
        <p v-if="blockedClaims.length === 0" class="vc-signals__empty">
          当前没有非 USABLE 主张
        </p>
        <ul v-else class="vc-signals__list">
          <li v-for="claim in blockedClaims.slice(0, 5)" :key="claim.label">
            <strong>{{ claim.label }}</strong>
            <ElTag size="small" type="warning" effect="plain">{{
              claim.status
            }}</ElTag>
          </li>
        </ul>
        <p v-if="affectedClaimShots.length > 0" class="vc-signals__warn">
          受影响镜头：{{ affectedClaimShots.join(' / ') }}
        </p>
      </section>

      <section v-if="claimDiff" class="vc-signals__block">
        <h4 class="vc-signals__block-title">R2 主张回放</h4>
        <div class="vc-signals__rows">
          <div class="vc-signals__row">
            <span>版本</span>
            <strong
              >R{{ claimDiff.fromRevisionNo }} → R{{
                claimDiff.toRevisionNo
              }}</strong
            >
          </div>
        </div>
        <ul class="vc-signals__list">
          <li v-if="claimDiff.prohibitedClaims.added.length > 0">
            <span class="vc-signals__meta">新增禁用声明</span>
            <strong>{{ claimDiff.prohibitedClaims.added.join('；') }}</strong>
          </li>
          <li v-if="claimDiff.prohibitedClaims.removed.length > 0">
            <span class="vc-signals__meta">移除旧声明</span>
            <strong>{{ claimDiff.prohibitedClaims.removed.join('；') }}</strong>
          </li>
          <li v-if="claimDiff.evidence.removed.length > 0">
            <span class="vc-signals__meta">移除证据</span>
            <strong>{{ claimDiff.evidence.removed.join(' / ') }}</strong>
          </li>
        </ul>
        <p class="vc-signals__warn">{{ claimDiff.m2Impact.note }}</p>
      </section>
    </template>
  </section>
</template>

<style scoped>
.vc-signals {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  background: var(--el-bg-color-overlay, #fff);
  border: 1px solid var(--vc-border);
  border-radius: var(--vc-border-radius);
}

.vc-signals__head {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  justify-content: space-between;
}

.vc-signals__head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-signals__desc {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--vc-text-weak);
}

.vc-signals__loading,
.vc-signals__error {
  padding: 10px 12px;
  margin: 0;
  font-size: 12px;
  border-radius: 10px;
}

.vc-signals__loading {
  color: var(--vc-text-weak);
  background: var(--el-bg-color-page, #f5f6f8);
}

.vc-signals__error {
  color: var(--el-color-danger);
  background: #fff1f0;
  border: 1px solid #ffccc7;
}

.vc-signals__block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--vc-border);
}

.vc-signals__block-title {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: var(--vc-text-weak);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.vc-signals__rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vc-signals__row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-signals__row > span,
.vc-signals__meta {
  font-size: 11px;
  color: var(--vc-text-weak);
}

.vc-signals__row strong {
  font-size: 12px;
  font-weight: 650;
  line-height: 1.5;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-signals__row strong em {
  font-style: normal;
  font-weight: 500;
  color: var(--vc-text-weak);
}

.vc-signals__row code {
  display: block;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  line-height: 1.5;
  color: var(--el-text-color-regular, #4b5563);
  word-break: break-all;
  overflow-wrap: anywhere;
}

.vc-signals__note {
  padding: 8px 10px;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #8a4b00;
  background: var(--vc-mock-banner-bg);
  border: 1px solid var(--vc-mock-banner-border);
  border-radius: 8px;
}

.vc-signals__subblock {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vc-signals__sublabel {
  font-size: 11px;
  font-weight: 650;
  color: var(--vc-text-weak);
}

.vc-signals__empty {
  padding: 10px 12px;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--vc-text-weak);
  text-align: center;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-signals__questions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vc-signals__question {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  width: 100%;
  padding: 8px 10px;
  text-align: left;
  cursor: pointer;
  background: var(--el-bg-color-page, #f5f6f8);
  border: 1px solid transparent;
  border-radius: 10px;
  transition:
    background 0.16s ease,
    border-color 0.16s ease;
}

.vc-signals__question:hover {
  background: var(--vc-brand-soft);
  border-color: var(--vc-brand-border);
}

.vc-signals__question span {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-regular, #4b5563);
}

.vc-signals__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.vc-signals__list li {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  padding: 10px 12px;
  background: var(--el-bg-color-page, #f5f6f8);
  border-radius: 10px;
}

.vc-signals__list strong {
  font-size: 12px;
  font-weight: 650;
  line-height: 1.5;
  color: var(--el-text-color-primary, #1f2937);
}

.vc-signals__list code {
  font-family: ui-monospace, monospace;
  font-size: 10px;
  color: var(--vc-text-weak);
  word-break: break-all;
}

.vc-signals__warn {
  padding: 8px 10px;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: #b42318;
  background: #fff7f6;
  border: 1px solid #ffd6d1;
  border-radius: 8px;
}

@media (prefers-reduced-motion: reduce) {
  .vc-signals__question {
    transition: none;
  }
}
</style>
