<script lang="ts" setup>
import type {
  ResearchGap,
  ResearchQuestion,
  ResearchSessionView,
} from '#/types/creative-video';

import { computed, nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  ElAlert,
  ElButton,
  ElDrawer,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElTag,
} from 'element-plus';

import {
  answerResearchQuestion,
  confirmIngestion,
  confirmResearchFact,
  createResearchSession,
  dismissResearchQuestion,
  generateUnderstanding,
  getIngestion,
  getResearchGaps,
  getResearchHistory,
  getResearchSession,
  nextResearchQuestions,
  skipResearchQuestion,
} from '#/api/creative-video';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';
import { selectNextResearchGaps } from '#/utils/creative-video/research';

const props = defineProps<{
  highlightQuestionId?: string;
  projectId: string;
}>();
const router = useRouter();

const open = ref(false);
const loading = ref(false);
const gaps = ref<ResearchGap[]>([]);
const view = ref<null | ResearchSessionView>(null);
const answers = ref<Record<string, string>>({});
const fingerprint = ref('');
const history = ref<Awaited<ReturnType<typeof getResearchHistory>> | null>(
  null,
);
const confirmingFactId = ref('');

async function proposeFact(answerId: string) {
  confirmingFactId.value = answerId;
  try {
    const result = await confirmResearchFact(props.projectId, answerId, {
      title: '访谈中确认的事实（待审核）',
    });
    ElMessage.success(
      `已生成候选事实“${result.proposedFeature.title}”；仍需人工审核，不会自动 verified`,
    );
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    confirmingFactId.value = '';
  }
}
const savingId = ref('');
const confirming = ref(false);
const answeredCount = computed(
  () =>
    (view.value?.questions ?? []).filter((item) => item.status === 'ANSWERED')
      .length,
);

const openGaps = computed(
  () => gaps.value.filter((gap) => gap.state !== 'RESOLVED').length,
);
const priorityOrder = computed(() => {
  const current = view.value;
  if (!current) return new Map<string, number>();
  const ranked = selectNextResearchGaps(
    gaps.value,
    current.questions,
    current.answers,
    { fingerprint: fingerprint.value, sessionId: current.session.id },
    999,
  );
  return new Map(ranked.map((item, index) => [item.id, index]));
});
const selectedQuestion = computed(
  () =>
    (view.value?.questions ?? []).find(
      (question) => question.id === props.highlightQuestionId,
    ) ?? null,
);

const pendingQuestions = computed(() =>
  (view.value?.questions ?? [])
    .filter((question) =>
      ['ANSWER_DRAFT', 'ASKED', 'SUGGESTED'].includes(question.status),
    )
    .toSorted(
      (a, b) =>
        (priorityOrder.value.get(a.gapId) ?? 999) -
        (priorityOrder.value.get(b.gapId) ?? 999),
    ),
);

const severityType: Record<string, 'danger' | 'info' | 'warning'> = {
  BLOCKING_CLAIM: 'danger',
  IMPORTANT: 'warning',
  OPTIONAL: 'info',
};
const severityLabel: Record<string, string> = {
  BLOCKING_CLAIM: '高风险主张',
  IMPORTANT: '重要',
  OPTIONAL: '可选',
};

async function loadGaps() {
  const result = await getResearchGaps(props.projectId);
  gaps.value = result.gaps;
  fingerprint.value = result.context.sourceSetFingerprint ?? '';
  return result;
}

async function ensureSession() {
  const result = await loadGaps();
  const session = await createResearchSession(props.projectId, {
    basedOnIngestionVersion: result.context.ingestionStateVersion,
  });
  let current = await getResearchSession(props.projectId, session.id);
  if (current.questions.length === 0) {
    current = await nextResearchQuestions(props.projectId, session.id, {
      expectedVersion: current.session.version,
      maxCount: 3,
    });
  }
  view.value = current;
}

async function confirmAndGenerate() {
  confirming.value = true;
  try {
    const ingestion = await getIngestion(props.projectId);
    const includedSourceIds = ingestion.sources
      .filter((source) => source.includedInAnalysis)
      .map((source) => source.id);
    const snapshot = await confirmIngestion(props.projectId, {
      expectedVersion: ingestion.version,
      includedSourceIds,
    });
    const result = await generateUnderstanding(props.projectId, {
      ingestionSnapshotId: snapshot.id,
      scope: 'FULL',
    });
    open.value = false;
    ElMessage.success('已冻结 S2 并启动 R2 生成；旧 R1 保持不变');
    await router.push({
      path: `/studio/${props.projectId}/understanding`,
      query: { jobId: result.jobId },
    });
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    confirming.value = false;
  }
}

async function openPanel() {
  open.value = true;
  if (loading.value) return;
  loading.value = true;
  try {
    await ensureSession();
    history.value = await getResearchHistory(props.projectId);
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    loading.value = false;
  }
}

async function refreshSession() {
  if (!view.value) return;
  view.value = await getResearchSession(props.projectId, view.value.session.id);
  history.value = await getResearchHistory(props.projectId);
}

async function submitAnswer(question: ResearchQuestion) {
  const text = (answers.value[question.id] ?? '').trim();
  if (!text) {
    ElMessage.warning('请先填写回答');
    return;
  }
  savingId.value = question.id;
  try {
    await answerResearchQuestion(props.projectId, question.id, {
      answer: text,
      expectedVersion: question.version,
    });
    answers.value[question.id] = '';
    await refreshSession();
    ElMessage.success('回答已保存为 USER_NOTE；确认资料快照后才会进入产品理解');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    savingId.value = '';
  }
}

async function dismiss(question: ResearchQuestion) {
  try {
    const { value } = await ElMessageBox.prompt(
      '请说明为什么不适用（例如当前版本/地区/套餐不涉及）',
      '该问题不适用',
      {
        cancelButtonText: '取消',
        confirmButtonText: '确认不适用',
        inputPlaceholder: '填写适用范围或理由',
      },
    );
    if (!String(value ?? '').trim()) {
      ElMessage.warning('必须填写理由');
      return;
    }
    savingId.value = question.id;
    await dismissResearchQuestion(props.projectId, question.id, {
      expectedVersion: question.version,
      reason: String(value),
    });
    await refreshSession();
    ElMessage.info('已记录不适用理由；资料上下文变化后会重新评估');
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(friendlyErrorMessage(error));
    }
  } finally {
    savingId.value = '';
  }
}

async function skip(question: ResearchQuestion) {
  savingId.value = question.id;
  try {
    await skipResearchQuestion(props.projectId, question.id, {
      expectedVersion: question.version,
    });
    await refreshSession();
    ElMessage.info('本会话不再显示该问题，但缺口仍保留');
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    savingId.value = '';
  }
}

onMounted(async () => {
  try {
    await loadGaps();
    if (props.highlightQuestionId) {
      await openPanel();
      await nextTick();
      document
        .querySelector('.vc-research__question.is-highlighted')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } catch {
    // 资料页未加载完成时静默；打开抽屉会重试
  }
});
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <ElButton class="vc-research-trigger" type="primary" plain @click="openPanel">
    产品研究助手
    <ElTag v-if="openGaps > 0" class="ml-1" size="small" type="warning">
      {{ openGaps }}
    </ElTag>
  </ElButton>

  <ElDrawer v-model="open" size="440px" title="产品研究助手">
    <ElAlert
      :closable="false"
      show-icon
      title="回答只创建 USER_NOTE 草稿；必须重新确认资料快照并生成新理解修订，才会成为产品事实。"
      type="info"
    />
    <p class="vc-research__hint">
      缺口来自资料覆盖度，不是模型准确率。跳过只影响当前会话；DISMISSED
      仍需按风险重新评估。
    </p>

    <section v-if="pendingQuestions.length > 0" class="vc-research__block">
      <h3>建议优先回答</h3>
      <article
        v-for="question in pendingQuestions"
        :key="question.id"
        :class="{
          'is-highlighted': question.id === props.highlightQuestionId,
        }"
        class="vc-research__question"
      >
        <div class="vc-research__question-head">
          <strong>{{ question.question }}</strong>
          <ElTag size="small">{{ question.status }}</ElTag>
        </div>
        <ElInput
          v-model="answers[question.id]"
          :rows="2"
          placeholder="用具体客户场景回答，不要填写无法核实的百分比"
          type="textarea"
        />
        <div class="vc-research__actions">
          <ElButton size="small" text @click="dismiss(question)"
            >该问题不适用</ElButton
          >
          <ElButton size="small" text @click="skip(question)"
            >暂不回答</ElButton
          >
          <ElButton
            :loading="savingId === question.id"
            size="small"
            type="primary"
            @click="submitAnswer(question)"
          >
            保存回答
          </ElButton>
        </div>
      </article>
    </section>

    <article
      v-if="
        selectedQuestion &&
        !pendingQuestions.some((item) => item.id === selectedQuestion?.id)
      "
      class="vc-research__question is-highlighted"
    >
      <div class="vc-research__question-head">
        <strong>{{ selectedQuestion.question }}</strong>
        <ElTag size="small">{{ selectedQuestion.status }}</ElTag>
      </div>
      <p class="vc-m2-muted">
        从画布定位的问题；上下文 fingerprint：
        {{ selectedQuestion.contextFingerprint || '未记录' }}
      </p>
    </article>

    <section class="vc-research__block">
      <h3>资料缺口</h3>
      <ul class="vc-research__gaps">
        <li v-for="gap in gaps" :key="gap.id">
          <div class="vc-research__gap-head">
            <ElTag :type="severityType[gap.severity] ?? 'info'" size="small">
              {{ severityLabel[gap.severity] ?? gap.severity }}
            </ElTag>
            <strong>{{ gap.title }}</strong>
            <ElTag size="small" type="info">{{ gap.state }}</ElTag>
          </div>
          <p>{{ gap.whyItMatters }}</p>
        </li>
      </ul>
    </section>

    <section
      v-if="history && history.answers.length > 0"
      class="vc-research__block"
    >
      <h3>访谈记录</h3>
      <article
        v-for="answer in history.answers"
        :key="answer.id"
        class="vc-research__question"
      >
        <p>{{ answer.answer }}</p>
        <div class="vc-research__actions">
          <ElTag size="small">{{ answer.validity }}</ElTag>
          <ElButton
            :loading="confirmingFactId === answer.id"
            size="small"
            text
            @click="proposeFact(answer.id)"
          >
            提议为事实
          </ElButton>
        </div>
      </article>
      <p class="vc-research__hint">
        提议只生成待审核候选，不自动变成 verified，也不绕过 Claim 检查。
      </p>
    </section>

    <div class="vc-research__confirm">
      <ElButton
        :loading="confirming"
        type="primary"
        @click="confirmAndGenerate"
      >
        确认资料快照并生成 R2
      </ElButton>
      <p class="vc-research__hint">
        已保存 {{ answeredCount }} 条回答。确认后冻结新 S2
        并启动新的理解修订，不会覆盖旧 R1。
      </p>
    </div>
  </ElDrawer>
</template>

<style scoped>
.vc-research-trigger {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 20;
  box-shadow: 0 8px 20px rgb(15 23 42 / 16%);
}

.vc-research__hint {
  margin: 10px 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vc-text-weak);
}

.vc-research__block {
  margin-top: 16px;
}

.vc-research__block h3 {
  margin: 0 0 8px;
  font-size: 13px;
}

.vc-research__question.is-highlighted {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.vc-research__question {
  padding: 10px;
  margin-bottom: 10px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.vc-research__question-head,
.vc-research__gap-head {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
}

.vc-research__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.vc-research__gaps {
  padding: 0;
  margin: 0;
  list-style: none;
}

.vc-research__gaps li {
  padding: 10px 0;
  border-bottom: 1px solid var(--vc-border);
}

.vc-research__confirm {
  padding-top: 14px;
  margin-top: 16px;
  border-top: 1px solid var(--vc-border);
}

.vc-research__gaps p {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--vc-text-weak);
}
</style>
