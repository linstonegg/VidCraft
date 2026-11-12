# 侧栏切页 loading 恢复 + 页面滑入回退

> 时间：2026-11-09 18:39–20:04（Asia/Shanghai）  
> 日志：[`g4-transition-20261109.log`](./g4-transition-20261109.log)、[`m0-animation-20261109.log`](./m0-animation-20261109.log)

## 最终结论

用户要的是**侧栏切页时的 loading 动画**，不是整页滑入。

## 最终行为

- 侧栏切到不同页面时，内容区显示 VidCraft 品牌 loading：
  - 紫色方块跳动 + 阴影；
  - “VidCraft 创作平台”；
  - “正在加载演示数据…”；
  - 最小 500ms；
- 包括已经缓存的页面，每次路由切换都显示；
- 页面本身恢复原 Vben `fade-slide`（0.3s），不再使用自定义整页滑入、WAAPI 兜底或 Studio 阶段滑入；
- `BasicContent` 恢复仓库原有实现：`page-route-leave-active` 绝对定位 + overflow 处理，解决新旧页面重叠。

## 修改文件

- `apps/web-ele/src/preferences.ts`
  - `transition.enable=true`
  - `transition.loading=true`
- `apps/web-ele/src/main.ts`
  - 初始化后强制 `enable/loading/name`，避免旧偏好缓存
- `packages/effects/layouts/src/basic/content/content-spinner.vue`
  - 品牌 loading 覆盖层
- `packages/effects/layouts/src/basic/content/use-content-spinner.ts`
  - 每次路由切换都显示（不再跳过 `meta.loaded`）
- `packages/effects/layouts/src/basic/content/content.vue`
  - 恢复仓库原有实现
- `apps/web-ele/src/views/creative-video/studio/StudioShell.vue`
  - 恢复原嵌套 router-view，无自定义阶段滑入
- `apps/web-ele/src/styles/creative-video.css`
  - 保留 reduced-motion 对页面级节点的豁免，删除自定义滑入覆盖
- `tests/e2e/m0-smoke.mjs`
  - 增加 loading、已缓存页面 loading、原 fade-slide 断言

## 验证

| 环境/套件                     | 结果         |
| ----------------------------- | ------------ |
| M0（loading + 原 fade-slide） | **25/25**    |
| M0，`reduced-motion: reduce`  | **25/25**    |
| M1 API / UI                   | 43/43、14/14 |
| M2 API / UI                   | 40/40、14/14 |
| M11 API / UI                  | 54/54、19/19 |
| Vitest                        | 29/29        |
| typecheck / build / lint      | 通过         |

关键断言：

```text
PASS  M0-T04 页面切换 loading 动画保留
PASS  M0-T04 页面切换动画保留 — transitionDuration=0.3s（原 fade-slide）
PASS  M0-T04 已缓存页面切换仍显示 loading
```

复现 reduced-motion：

```bash
M0_REDUCED_MOTION=reduce node tests/e2e/m0-smoke.mjs
```
