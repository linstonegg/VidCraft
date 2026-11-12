import type {
  UnderstandingHandoff,
  UnderstandingRevision,
} from '#/types/creative-video';

import { computed, ref } from 'vue';

import { defineStore } from 'pinia';

import {
  addRevisionComment,
  approveRevision,
  forkRevision,
  generateUnderstanding,
  getActiveUnderstanding,
  getHandoff,
  listRevisions,
  rejectRevision,
  submitRevisionForReview,
  updateRevision,
} from '#/api/creative-video';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';

export const useCreativeVideoUnderstandingStore = defineStore(
  'creative-video-understanding',
  () => {
    const projectId = ref('');
    const revisions = ref<UnderstandingRevision[]>([]);
    const current = ref<null | UnderstandingRevision>(null);
    const active = ref<null | UnderstandingRevision>(null);
    const handoff = ref<null | UnderstandingHandoff>(null);
    const loading = ref(false);
    const saving = ref(false);
    const errorMessage = ref('');
    const saveStatus = ref('已保存');

    const isReadOnly = computed(
      () =>
        !current.value ||
        current.value.status === 'APPROVED' ||
        current.value.status === 'WAITING_REVIEW',
    );

    const hasApproved = computed(() => Boolean(handoff.value));

    const staleRevisions = computed(
      () => revisions.value.filter((item) => item.status === 'STALE').length,
    );

    async function load(id: string) {
      projectId.value = id;
      loading.value = true;
      errorMessage.value = '';
      try {
        const [activeResult, revisionList, handoffResult] = await Promise.all([
          getActiveUnderstanding(id),
          listRevisions(id),
          getHandoff(id),
        ]);
        active.value = activeResult.active;
        revisions.value = revisionList;
        handoff.value = handoffResult;
        const preferred =
          activeResult.draft ??
          revisionList.find((item) => item.status !== 'APPROVED') ??
          activeResult.active ??
          revisionList[0] ??
          null;
        current.value = preferred;
      } catch (error) {
        errorMessage.value = friendlyErrorMessage(error);
        throw error;
      } finally {
        loading.value = false;
      }
    }

    function selectRevision(revisionId: string) {
      const target = revisions.value.find((item) => item.id === revisionId);
      if (target) {
        current.value = target;
      }
    }

    async function applyPatch(patch: Record<string, any>) {
      if (!current.value) {
        throw new Error('当前没有可编辑的报告版本');
      }
      saving.value = true;
      saveStatus.value = '保存中';
      try {
        const updated = await updateRevision(
          projectId.value,
          current.value.id,
          {
            expectedVersion: current.value.version,
            patch,
          },
        );
        current.value = updated;
        await refreshLists();
        saveStatus.value = '已保存';
        return updated;
      } catch (error) {
        saveStatus.value = '保存失败，请重试';
        throw error;
      } finally {
        saving.value = false;
      }
    }

    async function refreshLists() {
      const [revisionList, activeResult, handoffResult] = await Promise.all([
        listRevisions(projectId.value),
        getActiveUnderstanding(projectId.value),
        getHandoff(projectId.value),
      ]);
      revisions.value = revisionList;
      active.value = activeResult.active;
      handoff.value = handoffResult;
    }

    async function forkCurrent() {
      if (!current.value) {
        throw new Error('当前没有可派生的版本');
      }
      saving.value = true;
      try {
        const forked = await forkRevision(projectId.value, current.value.id);
        await refreshLists();
        current.value = forked;
        return forked;
      } finally {
        saving.value = false;
      }
    }

    async function generate(
      scope: string,
      ingestionSnapshotId: string,
      scenario?: string,
    ) {
      return await generateUnderstanding(projectId.value, {
        ingestionSnapshotId,
        scenario,
        scope: scope as 'FULL' | 'PAIN_POINTS' | 'VALUE_ANGLES',
      });
    }

    async function approve(options: {
      acceptHypotheses: boolean;
      reviewerNote?: string;
    }) {
      if (!current.value) {
        throw new Error('当前没有可确认的版本');
      }
      saving.value = true;
      try {
        const result = await approveRevision(
          projectId.value,
          current.value.id,
          {
            acceptHypotheses: options.acceptHypotheses,
            expectedVersion: current.value.version,
            reviewerNote: options.reviewerNote,
          },
        );
        await load(projectId.value);
        return result;
      } finally {
        saving.value = false;
      }
    }

    async function reject(reason: string) {
      if (!current.value) {
        throw new Error('当前没有可驳回的版本');
      }
      saving.value = true;
      try {
        const result = await rejectRevision(
          projectId.value,
          current.value.id,
          reason,
        );
        await refreshLists();
        current.value = result.revision;
        return result;
      } finally {
        saving.value = false;
      }
    }

    async function comment(note: string) {
      if (!current.value) {
        throw new Error('当前没有可批注的版本');
      }
      saving.value = true;
      try {
        const updated = await addRevisionComment(
          projectId.value,
          current.value.id,
          { expectedVersion: current.value.version, note },
        );
        current.value = updated;
        await refreshLists();
        return updated;
      } finally {
        saving.value = false;
      }
    }

    async function submitForReview() {
      if (!current.value) {
        throw new Error('当前没有可提交的版本');
      }
      saving.value = true;
      try {
        const result = await submitRevisionForReview(
          projectId.value,
          current.value.id,
        );
        current.value = result;
        await refreshLists();
        return result;
      } finally {
        saving.value = false;
      }
    }

    function $reset() {
      projectId.value = '';
      revisions.value = [];
      current.value = null;
      active.value = null;
      handoff.value = null;
      loading.value = false;
      saving.value = false;
      errorMessage.value = '';
    }

    return {
      $reset,
      active,
      applyPatch,
      approve,
      comment,
      current,
      errorMessage,
      forkCurrent,
      generate,
      handoff,
      hasApproved,
      isReadOnly,
      load,
      loading,
      projectId,
      reject,
      revisions,
      saving,
      saveStatus,
      selectRevision,
      staleRevisions,
      submitForReview,
    };
  },
);
