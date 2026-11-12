import { defineOverridesPreferences } from '@vben/preferences';

/**
 * @description VidCraft 项目配置覆盖（只在需要覆盖默认值时声明字段）
 * 修改后需清理浏览器偏好缓存，否则可能不生效。
 */
export const overridesPreferences = defineOverridesPreferences({
  app: {
    accessMode: 'frontend',
    authPageLayout: 'panel-right',
    defaultAvatar: '/brand/vidcraft-avatar.svg',
    defaultHomePath: '/dashboard',
    enableCheckUpdates: false,
    locale: 'zh-CN',
    name: import.meta.env.VITE_APP_TITLE,
  },
  copyright: {
    companyName: 'VidCraft',
    companySiteLink: '',
    date: '2026',
    enable: true,
    icp: '',
    icpLink: '',
    settingShow: false,
  },
  // 演示模式 Banner 位于布局顶部；布局内部固定定位元素以布局容器为基准（见 creative-video.css）
  header: {
    mode: 'fixed',
  },
  logo: {
    enable: true,
    // 使用自有品牌资产，避免依赖外部 CDN 图片
    source: '/brand/vidcraft-logo.svg',
    sourceDark: '/brand/vidcraft-logo.svg',
  },
  theme: {
    colorPrimary: 'hsl(249 60% 59%)',
    mode: 'light',
  },
  // 保留页面切换动画；BasicContent 已修复 KeepAlive + out-in 导致的空 RouterView。
  transition: {
    enable: true,
    loading: true,
    progress: false,
    name: 'fade-slide',
  },
  widget: {
    // M0 中文优先；保留国际化基础能力，不在工具栏暴露语言切换
    languageToggle: false,
    // M0 没有真实通知系统，避免头部出现空的铃铛按钮
    notification: false,
  },
});
