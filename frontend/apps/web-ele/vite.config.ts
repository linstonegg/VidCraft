import process from 'node:process';

import { defineConfig } from '@vben/vite-config';

/**
 * VidCraft web-ele。
 * 说明：M1 起改用「一次性引入 Element Plus 主题 CSS」，不再依赖
 * unplugin-element-plus 的按组件样式注入，避免新增组件时 Vite 预构建
 * 产生未解析的 `element-plus/es/components/xxx/style/css` 裸导入。
 */
export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            // mock代理目标地址
            target:
              process.env.VITE_MOCK_PROXY_TARGET || 'http://localhost:5320/api',
            ws: true,
          },
        },
      },
    },
  };
});
