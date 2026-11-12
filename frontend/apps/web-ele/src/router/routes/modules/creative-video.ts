import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

/**
 * VidCraft 业务路由（accessMode: 'frontend'）。
 * - 标准布局：工作台、项目中心、素材、任务、积分、设置；
 * - Studio 布局：顶级路由 + meta.noBasicLayout，内部由 StudioShell 渲染 router-view；
 * - meta.authority 与 userInfo.roles 对应，M0 只用于菜单/路由演示。
 */
const routes: RouteRecordRaw[] = [
  {
    name: 'VidCraftDashboard',
    path: '/dashboard',
    component: () => import('#/views/creative-video/dashboard/index.vue'),
    meta: {
      affixTab: true,
      icon: 'lucide:layout-dashboard',
      order: -1,
      title: $t('vidcraft.dashboardMenu'),
    },
  },
  {
    name: 'VidCraftProjects',
    path: '/projects',
    component: () => import('#/views/creative-video/projects/index.vue'),
    meta: {
      affixTab: true,
      icon: 'lucide:folder-open',
      order: 1,
      title: $t('vidcraft.projects'),
    },
  },
  {
    name: 'VidCraftProjectNew',
    path: '/projects/new',
    component: () => import('#/views/creative-video/projects/new.vue'),
    meta: {
      hideInMenu: true,
      icon: 'lucide:file-plus-2',
      order: 1.1,
      title: $t('vidcraft.projectsNew'),
    },
  },
  {
    name: 'VidCraftProjectDetail',
    path: '/projects/:id',
    component: () => import('#/views/creative-video/projects/detail.vue'),
    meta: {
      hideInMenu: true,
      icon: 'lucide:file-text',
      order: 1.2,
      title: '项目详情',
    },
  },
  {
    name: 'VidCraftAssets',
    path: '/assets',
    component: () => import('#/views/creative-video/assets/index.vue'),
    meta: {
      authority: ['admin', 'editor', 'owner'],
      icon: 'lucide:images',
      order: 2,
      title: $t('vidcraft.assets'),
    },
  },
  {
    name: 'VidCraftTasks',
    path: '/tasks',
    component: () => import('#/views/creative-video/tasks/index.vue'),
    meta: {
      icon: 'lucide:list-checks',
      order: 3,
      title: $t('vidcraft.tasks'),
    },
  },
  {
    name: 'VidCraftBilling',
    path: '/billing',
    component: () => import('#/views/creative-video/billing/index.vue'),
    meta: {
      // 菜单保持可见，页面内按角色给出 403 提示；避免 Vben 的
      // menuVisibleWithForbidden 对所有角色都替换为 403 组件
      icon: 'lucide:wallet',
      order: 4,
      title: $t('vidcraft.billing'),
      authority: ['admin', 'editor', 'owner', 'reviewer'],
    },
  },
  {
    name: 'VidCraftSettings',
    path: '/settings',
    redirect: '/settings/models',
    meta: {
      authority: ['admin', 'owner'],
      icon: 'lucide:settings',
      order: 5,
      title: $t('vidcraft.settings'),
    },
    children: [
      {
        name: 'VidCraftSettingsModels',
        path: 'models',
        component: () =>
          import('#/views/creative-video/settings/models/index.vue'),
        meta: {
          icon: 'lucide:cpu',
          title: $t('vidcraft.pages.modelsTitle'),
        },
      },
      {
        name: 'VidCraftSettingsBrand',
        path: 'brand',
        component: () =>
          import('#/views/creative-video/settings/brand/index.vue'),
        meta: {
          icon: 'lucide:palette',
          title: $t('vidcraft.pages.brandTitle'),
        },
      },
    ],
  },
  {
    name: 'VidCraftStudio',
    path: '/studio/:id',
    component: () => import('#/views/creative-video/studio/StudioShell.vue'),
    // 顶级路由不使用 Vben 基础布局，Studio 自己是全屏工作台
    meta: {
      hideInMenu: true,
      noBasicLayout: true,
      title: $t('vidcraft.studio'),
    },
    redirect: (to) => ({
      name: 'VidCraftStudioIngest',
      params: to.params,
    }),
    children: [
      {
        name: 'VidCraftStudioIngest',
        path: 'ingest',
        component: () =>
          import('#/views/creative-video/studio/ingest/index.vue'),
        meta: { hideInMenu: true, title: $t('vidcraft.stage.INGEST') },
      },
      {
        name: 'VidCraftStudioUnderstanding',
        path: 'understanding',
        component: () =>
          import('#/views/creative-video/studio/understanding/index.vue'),
        meta: { hideInMenu: true, title: $t('vidcraft.stage.UNDERSTANDING') },
      },
      {
        name: 'VidCraftStudioAngles',
        path: 'angles',
        component: () =>
          import('#/views/creative-video/studio/angles/index.vue'),
        meta: { hideInMenu: true, title: $t('vidcraft.stage.ANGLES') },
      },
      {
        name: 'VidCraftStudioConcepts',
        path: 'concepts',
        component: () =>
          import('#/views/creative-video/studio/concepts/index.vue'),
        meta: { hideInMenu: true, title: '创意故事比较' },
      },
      {
        name: 'VidCraftStudioScript',
        path: 'script',
        component: () =>
          import('#/views/creative-video/studio/script/index.vue'),
        meta: { hideInMenu: true, title: $t('vidcraft.stage.SCRIPT') },
      },
      {
        name: 'VidCraftStudioStoryboard',
        path: 'storyboard',
        component: () =>
          import('#/views/creative-video/studio/storyboard/index.vue'),
        meta: { hideInMenu: true, title: $t('vidcraft.stage.STORYBOARD') },
      },
      {
        name: 'VidCraftStudioAnimatic',
        path: 'animatic',
        component: () =>
          import('#/views/creative-video/studio/animatic/index.vue'),
        meta: { hideInMenu: true, title: $t('vidcraft.stage.ANIMATIC') },
      },
      {
        name: 'VidCraftStudioReferences',
        path: 'references',
        component: () =>
          import('#/views/creative-video/studio/references/index.vue'),
        meta: { hideInMenu: true, title: '参考广告' },
      },
      {
        name: 'VidCraftStudioGenerate',
        path: 'generate',
        component: () =>
          import('#/views/creative-video/studio/generate/index.vue'),
        meta: { hideInMenu: true, title: $t('vidcraft.stage.GENERATE') },
      },
      {
        name: 'VidCraftStudioRender',
        path: 'render',
        component: () =>
          import('#/views/creative-video/studio/render/index.vue'),
        meta: { hideInMenu: true, title: $t('vidcraft.stage.RENDER') },
      },
    ],
  },
];

export default routes;
