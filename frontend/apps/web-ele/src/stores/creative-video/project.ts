import type {
  Platform,
  ProjectListQuery,
  ProjectSort,
  ProjectStage,
  ProjectStatus,
  VideoProject,
} from '#/types/creative-video';

import { computed, ref } from 'vue';

import { defineStore } from 'pinia';

import {
  archiveProject,
  createProject,
  deleteProject,
  duplicateProject,
  getProject,
  listProjects,
  resetDemoProjects,
  restoreProject,
  undeleteProject,
  updateProject,
} from '#/api/creative-video';
import { friendlyErrorMessage } from '#/utils/creative-video/errors';

import { useCreativeVideoIngestionStore } from './ingestion';
import { useCreativeVideoUnderstandingStore } from './understanding';

export const useCreativeVideoProjectStore = defineStore(
  'creative-video-project',
  () => {
    const items = ref<VideoProject[]>([]);
    const total = ref(0);
    const loading = ref(false);
    const errorMessage = ref('');
    const page = ref(1);
    const pageSize = ref(12);
    const includeDeleted = ref(false);
    const viewMode = ref<'card' | 'table'>('card');
    const loadedOnce = ref(false);
    const keyword = ref('');
    const status = ref<'' | ProjectStatus>('');
    const stage = ref<'' | ProjectStage>('');
    const platform = ref<'' | Platform>('');
    const sort = ref<ProjectSort>('updated');
    const scope = ref<'all' | 'archived' | 'mine' | 'recent'>('all');

    const inProgressCount = computed(
      () =>
        items.value.filter(
          (item) =>
            item.status === 'IN_PROGRESS' || item.status === 'WAITING_REVIEW',
        ).length,
    );

    const hasFilters = computed(
      () =>
        Boolean(keyword.value) ||
        Boolean(status.value) ||
        Boolean(stage.value) ||
        Boolean(platform.value),
    );

    function query(
      overrides: Partial<ProjectListQuery> = {},
    ): ProjectListQuery {
      return {
        scope: scope.value,
        includeDeleted: includeDeleted.value,
        keyword: keyword.value.trim() || undefined,
        page: page.value,
        pageSize: pageSize.value,
        platform: platform.value || undefined,
        sort: sort.value,
        stage: stage.value || undefined,
        status: status.value || undefined,
        ...overrides,
      };
    }

    async function fetchProjects(overrides: Partial<ProjectListQuery> = {}) {
      loading.value = true;
      errorMessage.value = '';
      try {
        const result = await listProjects(query(overrides));
        if (result.page !== page.value && result.total > 0) {
          const lastPage = Math.max(
            1,
            Math.ceil(result.total / pageSize.value),
          );
          if (page.value > lastPage) {
            page.value = lastPage;
            return await fetchProjects({ page: lastPage });
          }
        }
        items.value = result.items;
        total.value = result.total;
        loadedOnce.value = true;
        return result;
      } catch (error) {
        errorMessage.value = friendlyErrorMessage(error);
        throw error;
      } finally {
        loading.value = false;
      }
    }

    async function fetchProject(id: string) {
      return await getProject(id);
    }

    async function create(values: Record<string, any>, idempotencyKey: string) {
      return await createProject(values as any, idempotencyKey);
    }

    async function rename(id: string, title: string, expectedVersion: number) {
      return await updateProject(id, {
        expectedVersion,
        patch: { title },
      });
    }

    async function duplicate(id: string, expectedVersion?: number) {
      const project = await duplicateProject(id, { expectedVersion });
      await fetchProjects();
      return project;
    }

    async function archive(id: string, expectedVersion?: number) {
      const project = await archiveProject(id, expectedVersion);
      await fetchProjects();
      return project;
    }

    async function restore(id: string, expectedVersion?: number) {
      const project = await restoreProject(id, expectedVersion);
      await fetchProjects();
      return project;
    }

    async function remove(id: string, expectedVersion?: number) {
      const result = await deleteProject(id, expectedVersion);
      await fetchProjects();
      return result;
    }

    async function undelete(id: string, expectedVersion?: number) {
      const project = await undeleteProject(id, expectedVersion);
      await fetchProjects();
      return project;
    }

    async function resetDemo() {
      const result = await resetDemoProjects();
      useCreativeVideoIngestionStore().$reset();
      useCreativeVideoUnderstandingStore().$reset();
      resetFilters();
      includeDeleted.value = false;
      await fetchProjects();
      return result;
    }

    function setPage(value: number) {
      page.value = Math.max(1, value);
    }

    function setPageSize(value: number) {
      pageSize.value = value;
      page.value = 1;
    }

    function resetFilters() {
      keyword.value = '';
      status.value = '';
      stage.value = '';
      platform.value = '';
      sort.value = 'updated';
      scope.value = 'all';
      page.value = 1;
    }

    function $reset() {
      items.value = [];
      total.value = 0;
      loading.value = false;
      errorMessage.value = '';
      page.value = 1;
      pageSize.value = 12;
      includeDeleted.value = false;
      viewMode.value = 'card';
      loadedOnce.value = false;
      resetFilters();
    }

    return {
      $reset,
      archive,
      create,
      duplicate,
      errorMessage,
      fetchProject,
      fetchProjects,
      hasFilters,
      includeDeleted,
      inProgressCount,
      items,
      keyword,
      loadedOnce,
      loading,
      page,
      pageSize,
      platform,
      remove,
      rename,
      resetDemo,
      resetFilters,
      restore,
      setPage,
      setPageSize,
      scope,
      sort,
      stage,
      status,
      total,
      undelete,
      viewMode,
    };
  },
);
