<script lang="ts" setup>
import type {
  ClaimConflict,
  ConflictDecision,
  ConflictResolution,
  ConflictResolutionPreview,
  EvidenceLocatorSnapshot,
} from '#/types/creative-video';

import { computed, onMounted, ref } from 'vue';

import {
  ElAlert,
  ElButton,
  ElDrawer,
  ElMessage,
  ElOption,
  ElSelect,
  ElTag,
} from 'element-plus';

import {
  approveConflictResolution,
  createConflictResolution,
  getActiveUnderstanding,
  getClaimConflict,
  getClaimConflicts,
  getClaimReadiness,
  getEvidenceSnapshots,
  previewConflictResolution,
} from '#/api/creative-video';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';

const props = defineProps<{ canApprove: boolean; projectId: string }>();

const open = ref(false);
const loading = ref(false);
const conflicts = ref<ClaimConflict[]>([]);
const readiness = ref<any[]>([]);
const selected = ref<null | {
  anchors: any[];
  conflict: ClaimConflict;
  resolution?: ConflictResolution;
}>(null);
const snapshots = ref<EvidenceLocatorSnapshot[]>([]);
const decision = ref<ConflictDecision>('REWRITE_SAFE');
const reason = ref('');
const safeStatement = ref('');
const applicability = ref('');
const preview = ref<ConflictResolutionPreview | null>(null);
const saving = ref(false);

const activeConflict = computed(() => selected.value?.conflict ?? null);
const decisionOptions: Array<{ label: string; value: ConflictDecision }> = [
  { label: '改写为可证实的安全表述', value: 'REWRITE_SAFE' },
  { label: '确认证据 A', value: 'CONFIRM_A' },
  { label: '确认证据 B', value: 'CONFIRM_B' },
  { label: '排除该宣称', value: 'EXCLUDE_CLAIM' },
  { label: '需要补充证据', value: 'NEEDS_EVIDENCE' },
  { label: '不是冲突（需说明范围）', value: 'NOT_A_CONFLICT' },
];

async function load(openAfter = false) {
  loading.value = true;
  try {
    const [conflictList, activeView] = await Promise.all([
      getClaimConflicts(props.projectId),
      getActiveUnderstanding(props.projectId),
    ]);
    conflicts.value = conflictList;
    if (activeView?.active?.id) {
      readiness.value = await getClaimReadiness(
        props.projectId,
        activeView.active.id,
      );
      snapshots.value = await getEvidenceSnapshots(
        props.projectId,
        activeView.active.id,
      );
    }
    if (openAfter) open.value = true;
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    loading.value = false;
  }
}

async function openPanel() {
  open.value = true;
  await load();
}

async function inspect(conflict: ClaimConflict) {
  try {
    selected.value = await getClaimConflict(props.projectId, conflict.id);
    decision.value = 'REWRITE_SAFE';
    reason.value = '';
    safeStatement.value = conflict.candidateSafeStatement ?? '';
    applicability.value = '';
    preview.value = null;
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  }
}

async function runPreview() {
  if (!activeConflict.value) return;
  try {
    preview.value = await previewConflictResolution(
      props.projectId,
      activeConflict.value.id,
      {
        applicabilityNotes: applicability.value,
        decision: decision.value,
        proposedSafeStatement: safeStatement.value,
      },
    );
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  }
}

async function submitResolution() {
  if (!activeConflict.value) return;
  if (!reason.value.trim()) {
    ElMessage.warning('请填写裁决原因');
    return;
  }
  saving.value = true;
  try {
    const resolution = await createConflictResolution(
      props.projectId,
      activeConflict.value.id,
      {
        applicabilityNotes: applicability.value,
        decision: decision.value,
        expectedVersion: activeConflict.value.version,
        proposedSafeStatement: safeStatement.value,
        reason: reason.value,
      },
    );
    ElMessage.success('裁决提议已提交，等待审核批准');
    await load();
    await inspect({
      ...activeConflict.value,
      activeResolutionId: resolution.id,
    });
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    saving.value = false;
  }
}

async function approveResolution() {
  const resolution = selected.value?.resolution;
  if (!resolution) return;
  saving.value = true;
  try {
    const result = await approveConflictResolution(
      props.projectId,
      resolution.id,
      resolution.version,
    );
    ElMessage.success(
      `裁决已批准；已生成理解草稿 R${result.draft.revisionNo}，旧批准报告不变`,
    );
    await load();
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error));
  } finally {
    saving.value = false;
  }
}

const validityType: Record<string, 'danger' | 'success' | 'warning'> = {
  BLOCKED: 'danger',
  NEEDS_REVIEW: 'warning',
  USABLE: 'success',
};

onMounted(() => {
  void load();
});
</script>

<template>
  <!-- eslint-disable vue/html-closing-bracket-newline, vue/multiline-html-element-content-newline -->
  <ElButton class="vc-claim-trigger" type="warning" plain @click="openPanel">
    宣称冲突与裁决
    <ElTag v-if="conflicts.length > 0" class="ml-1" size="small" type="danger">
      {{ conflicts.length }}
    </ElTag>
  </ElButton>

  <ElDrawer v-model="open" size="560px" title="宣称冲突与裁决">
    <ElAlert
      :closable="false"
      show-icon
      title="裁决批准只会派生新的理解草稿，不会把当前 R1 直接覆盖，也不会立即解锁 M2 镜头。"
      type="warning"
    />

    <section class="vc-claim__block">
      <h3>当前主张可用性</h3>
      <ul class="vc-claim__readiness">
        <li v-for="item in readiness" :key="item.claimAnchorId">
          <ElTag :type="validityType[item.status] ?? 'info'" size="small">
            {{ item.status }}
          </ElTag>
          <span>{{ item.claimAnchorId }}</span>
          <small>{{ item.reasonCodes.join(' / ') || '证据可用' }}</small>
        </li>
      </ul>
      <p v-if="snapshots.length > 0" class="vc-claim__hint">
        已冻结 {{ snapshots.length }} 条证据定位快照；历史报告不会被新文本追认。
      </p>
    </section>

    <section class="vc-claim__block">
      <h3>冲突列表</h3>
      <button
        v-for="conflict in conflicts"
        :key="conflict.id"
        class="vc-claim__conflict"
        type="button"
        @click="inspect(conflict)"
      >
        <span>
          <ElTag
            :type="conflict.severity === 'HIGH' ? 'danger' : 'warning'"
            size="small"
          >
            {{ conflict.severity }}
          </ElTag>
          {{ conflict.title }}
        </span>
        <small>{{ conflict.conflictType }} · {{ conflict.status }}</small>
      </button>
    </section>

    <section v-if="selected" class="vc-claim__block vc-claim__detail">
      <h3>{{ selected.conflict.title }}</h3>
      <p>{{ selected.conflict.explanation }}</p>
      <p v-if="selected.conflict.statementA" class="vc-claim__statement">
        证据 A：{{ selected.conflict.statementA }}
        <small>{{ selected.conflict.evidenceIdsA.join('、') || '无' }}</small>
      </p>
      <p v-if="selected.conflict.statementB" class="vc-claim__statement">
        证据 B：{{ selected.conflict.statementB }}
        <small>{{
          selected.conflict.evidenceIdsB.join('、') || '无（不伪造反证）'
        }}</small>
      </p>

      <div v-if="selected.resolution" class="vc-claim__resolution">
        <ElTag size="small" type="info">
          {{ selected.resolution.approvalStatus }}
        </ElTag>
        <span>{{ selected.resolution.decision }}</span>
        <span v-if="selected.resolution.proposedUnderstandingRevisionId">
          R2 草稿
          {{
            selected.resolution.proposedUnderstandingRevisionId
          }}，尚未批准生效
        </span>
        <ElButton
          v-if="
            canApprove && selected.resolution.approvalStatus === 'SUBMITTED'
          "
          :loading="saving"
          size="small"
          type="primary"
          @click="approveResolution"
        >
          批准裁决并生成 R2 草稿
        </ElButton>
      </div>

      <div v-else class="vc-claim__form">
        <ElSelect v-model="decision" placeholder="选择裁决">
          <ElOption
            v-for="option in decisionOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </ElSelect>
        <ElInput
          v-model="safeStatement"
          :rows="2"
          placeholder="安全表述（REWRITE_SAFE 必填）"
          type="textarea"
        />
        <ElInput
          v-model="applicability"
          placeholder="适用范围：版本/地区/套餐"
        />
        <ElInput
          v-model="reason"
          :rows="2"
          placeholder="裁决原因（必填）"
          type="textarea"
        />
        <div class="vc-claim__actions">
          <ElButton size="small" text @click="runPreview">预览影响</ElButton>
          <ElButton
            :loading="saving"
            size="small"
            type="primary"
            @click="submitResolution"
          >
            提交裁决提议
          </ElButton>
        </div>
        <div v-if="preview" class="vc-claim__preview">
          <strong>{{ preview.revisionDraftImpact }}</strong>
          <p v-for="warning in preview.warnings" :key="warning">
            {{ warning }}
          </p>
          <p>仍需 R2 批准后才会改变主张可用性。</p>
        </div>
      </div>
    </section>
  </ElDrawer>
</template>

<style scoped>
.vc-claim-trigger {
  position: fixed;
  right: 24px;
  bottom: 76px;
  z-index: 20;
  box-shadow: 0 8px 20px rgb(15 23 42 / 16%);
}

.vc-claim__block {
  margin-top: 16px;
}

.vc-claim__block h3 {
  margin: 0 0 8px;
  font-size: 13px;
}

.vc-claim__readiness {
  padding: 0;
  margin: 0;
  list-style: none;
}

.vc-claim__readiness li {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 0;
  font-size: 12px;
  border-bottom: 1px solid var(--vc-border);
}

.vc-claim__readiness small {
  margin-left: auto;
  color: var(--vc-text-weak);
}

.vc-claim__hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--vc-text-weak);
}

.vc-claim__conflict {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 8px;
  margin-bottom: 6px;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--vc-border);
  border-radius: 8px;
}

.vc-claim__conflict small {
  color: var(--vc-text-weak);
}

.vc-claim__detail {
  padding: 10px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.vc-claim__detail p {
  margin: 4px 0;
  font-size: 12px;
  line-height: 1.55;
}

.vc-claim__statement {
  display: flex;
  flex-direction: column;
  padding: 6px 8px;
  background: var(--el-bg-color);
  border-radius: 6px;
}

.vc-claim__statement small {
  color: var(--vc-text-weak);
}

.vc-claim__form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.vc-claim__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.vc-claim__resolution {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
}

.vc-claim__preview {
  padding: 8px;
  font-size: 12px;
  color: var(--el-color-warning-dark-2);
  background: var(--el-color-warning-light-9);
  border-radius: 6px;
}
</style>
